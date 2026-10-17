// PRIVATE BACKUP. Everything the user made, in one versioned JSON file they
// keep: dreams, every chapter, bridges, proofs, the profile, progress, the
// journal and Scenes. No server, no account. Device-local keys (Plus cache,
// ask ledger, notification history) are not included.
//
// Pure core: build → serialize → parse/validate → plan (merge or replace) →
// apply. The file IO at the bottom is a thin seam over expo-file-system,
// expo-sharing and expo-document-picker (a download/upload on web), required
// lazily so bun can test this module.
//
// PHOTOS ARE NOT IN THE FILE. Proof and Scenes photos travel as references to
// files on the phone that took them (web keeps its data: URIs inline). On the
// same phone they are found again (lib/photos rebases them into the current
// container); on a new phone they are not, so the summary counts them
// (devicePhotos) and the UI must not promise that 'everything' moved.

import type { ArcIndex, ArcSnapshot, Chapter, Dream, DreamId, IsoTime } from "@/contexts/arc.types";
import type { ProfileV2 } from "@/contexts/user.types";
import { parseJournal, type JournalData } from "./journal";
import { DAYS_KEPT, parseProgress, type ProgressState } from "./progress";
import { checkArcInvariants } from "./store/invariants";
import { parseProfileV2 } from "./store/profile";
import { parseScenes, type ScenesData } from "./store/scenes";
import { snapshotShapeProblems } from "./store/shape";

export const BACKUP_KIND = "vela-backup" as const;
export const BACKUP_VERSION = 1 as const;
/** Larger files are refused before parsing (a year of chapters is well under 2 MB). */
export const BACKUP_MAX_BYTES = 15 * 1024 * 1024;

export interface BackupData {
  readonly arcs: ArcSnapshot;
  readonly profile: ProfileV2 | null;
  readonly progress: ProgressState | null;
  readonly journal: JournalData | null;
  readonly scenes: ScenesData | null;
}

export interface BackupFile {
  readonly kind: typeof BACKUP_KIND;
  readonly version: typeof BACKUP_VERSION;
  readonly exportedAt: IsoTime;
  readonly appVersion: string | null;
  readonly data: BackupData;
}

export interface BackupSummary {
  readonly dreams: number;
  readonly chapters: number;
  readonly proofs: number;
  readonly pages: number;
  readonly scenes: number;
  readonly name: string | null;
  /** Photos the file only points at (files on the phone that took them): they do not move to another phone. Always set by summarizeBackup. */
  readonly devicePhotos?: number;
}

export type BackupError = "too-large" | "not-json" | "not-a-backup" | "newer-version" | "invalid-arcs";

export type ParsedBackup =
  | { readonly ok: true; readonly backup: BackupFile; readonly summary: BackupSummary }
  | { readonly ok: false; readonly error: BackupError; readonly detail?: string };

/** Plain-language reason for each refusal (shown on the import screen). */
export const BACKUP_ERROR_COPY: Readonly<Record<BackupError, string>> = {
  "too-large": "That file is too large to be a Vela backup.",
  "not-json": "That file is not a Vela backup.",
  "not-a-backup": "That file is not a Vela backup.",
  "newer-version": "This backup comes from a newer version of Vela. Update the app, then import it again.",
  "invalid-arcs": "This backup is damaged, so nothing was changed.",
};

/* =========================================================================
 * Build and parse
 * ========================================================================= */

export function buildBackup(data: BackupData, now: Date, appVersion: string | null): BackupFile {
  return { kind: BACKUP_KIND, version: BACKUP_VERSION, exportedAt: now.toISOString(), appVersion, data };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 1);
}

/** 'vela-backup-2026-10-15.json' (LOCAL date). */
export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `vela-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** A photo reference that names a file on one phone (not inline data a browser keeps). */
const isDevicePhoto = (uri: string | null | undefined) => typeof uri === "string" && uri.startsWith("file://");

export function summarizeBackup(data: BackupData): BackupSummary {
  const proofPhotos = data.arcs.index.proofs.filter((p) => isDevicePhoto(p.photoUri)).map((p) => p.photoUri);
  const scenePhotos = (data.scenes?.cards ?? []).flatMap((c) => (c.kind === "photo" && isDevicePhoto(c.uri) ? [c.uri] : []));
  return {
    dreams: data.arcs.index.dreams.length,
    chapters: data.arcs.index.chapters.length,
    proofs: data.arcs.index.proofs.length,
    pages: data.journal?.entries.length ?? 0,
    scenes: data.scenes?.cards.length ?? 0,
    name: data.profile?.name ?? null,
    // A proof photo also shows in Scenes: count each file once.
    devicePhotos: new Set([...proofPhotos, ...scenePhotos]).size,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Validate a backup file's text. Never throws (anything unexpected is
 * 'invalid-arcs'); nothing is applied here. Field types are checked before
 * the I1–I15 invariants (lib/store/shape): a damaged file that passed would
 * be stored as the index and crash Today on every launch.
 */
export function parseBackup(text: string, now: Date): ParsedBackup {
  try {
    return parseBackupUnsafe(text, now);
  } catch (e) {
    return { ok: false, error: "invalid-arcs", detail: e instanceof Error ? e.message : String(e) };
  }
}

function parseBackupUnsafe(text: string, now: Date): ParsedBackup {
  if (typeof text !== "string") return { ok: false, error: "not-a-backup" };
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: "too-large" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (!isRecord(raw) || raw.kind !== BACKUP_KIND || typeof raw.version !== "number" || !isRecord(raw.data)) {
    return { ok: false, error: "not-a-backup" };
  }
  if (raw.version > BACKUP_VERSION) return { ok: false, error: "newer-version" };
  const d = raw.data;
  if (!isRecord(d.arcs) || !isRecord(d.arcs.index) || !isRecord(d.arcs.chapters)) return { ok: false, error: "invalid-arcs", detail: "missing arcs" };
  const shape = snapshotShapeProblems(d.arcs);
  if (shape.length > 0) return { ok: false, error: "invalid-arcs", detail: shape.slice(0, 3).join("; ") };
  const index = d.arcs.index as Record<string, unknown>;
  // An index written before migratedFromV1At existed reads as 'never migrated'.
  const arcs = { index: { migratedFromV1At: null, ...index }, chapters: d.arcs.chapters } as unknown as ArcSnapshot;
  const problems = checkArcInvariants(arcs);
  if (problems.length > 0) return { ok: false, error: "invalid-arcs", detail: problems.slice(0, 3).join("; ") };
  const data: BackupData = {
    arcs,
    profile: parseProfileV2(d.profile, now),
    progress: isRecord(d.progress) ? parseProgress(d.progress) : null,
    journal: isRecord(d.journal) ? parseJournal(d.journal) : null,
    scenes: isRecord(d.scenes) ? parseScenes(d.scenes) : null,
  };
  const backup: BackupFile = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : now.toISOString(),
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion : null,
    data,
  };
  return { ok: true, backup, summary: summarizeBackup(data) };
}

/* =========================================================================
 * Merge or replace
 * ========================================================================= */

export type ImportMode = "replace" | "merge";

export interface ImportPlan {
  /** Nothing on this device yet: replace without asking. */
  readonly needsChoice: boolean;
  readonly recommended: ImportMode;
  /**
   * The file holds nothing this device does not already have: no dream,
   * chapter (or newer rewrite of one), bridge, proof, page or Scene that is
   * missing here. Newer work on a dream both sides share counts as new.
   */
  readonly nothingNew: boolean;
  /** The file and this device differ in any way (Replace would change something). */
  readonly differs: boolean;
  /** Dreams on both sides where the file carries on from this device's history (a merge takes the file's). */
  readonly dreamsUpdated: number;
  /** Dreams on both sides whose histories went separate ways (a merge keeps this device's; Replace takes the file's). */
  readonly dreamsDiverged: number;
  readonly current: BackupSummary;
  readonly incoming: BackupSummary;
}

const isEmpty = (d: BackupData) =>
  d.arcs.index.dreams.length === 0 && (d.journal?.entries.length ?? 0) === 0 && (d.scenes?.cards.length ?? 0) === 0;

const newIds = <T extends { readonly id: string }>(mine: readonly T[], theirs: readonly T[]) => {
  const have = new Set(mine.map((x) => x.id));
  return theirs.filter((x) => !have.has(x.id));
};

/** Every chapter, bridge and proof id of one dream ('c:…', 'b:…', 'p:…'). */
function dreamRows(index: ArcIndex, dreamId: DreamId): Set<string> {
  const rows = new Set<string>();
  for (const c of index.chapters) if (c.dreamId === dreamId) rows.add(`c:${c.id}`);
  for (const b of index.bridges) if (b.dreamId === dreamId) rows.add(`b:${b.id}`);
  for (const p of index.proofs) if (p.dreamId === dreamId) rows.add(`p:${p.id}`);
  return rows;
}

const isSubset = (a: ReadonlySet<string>, b: ReadonlySet<string>) => [...a].every((x) => b.has(x));

type DreamRelation = "added" | "same" | "device-ahead" | "file-ahead" | "diverged";

/** How the file's copy of each of its dreams relates to this device's copy. */
function relateDreams(mine: ArcIndex, theirs: ArcIndex): Map<DreamId, DreamRelation> {
  const have = new Set(mine.dreams.map((d) => d.id));
  const out = new Map<DreamId, DreamRelation>();
  for (const d of theirs.dreams) {
    if (!have.has(d.id)) {
      out.set(d.id, "added");
      continue;
    }
    const a = dreamRows(mine, d.id);
    const b = dreamRows(theirs, d.id);
    const fileHasAll = isSubset(a, b);
    const deviceHasAll = isSubset(b, a);
    out.set(d.id, fileHasAll && deviceHasAll ? "same" : fileHasAll ? "file-ahead" : deviceHasAll ? "device-ahead" : "diverged");
  }
  return out;
}

/** Stable text of a list of rows, order-independent (by id). */
const rowsKey = <T extends { readonly id: string }>(rows: readonly T[]) =>
  JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id)));

function sameArcs(a: ArcSnapshot, b: ArcSnapshot): boolean {
  const ia = a.index;
  const ib = b.index;
  if (ia.activeDreamId !== ib.activeDreamId) return false;
  if (rowsKey(ia.dreams) !== rowsKey(ib.dreams) || rowsKey(ia.chapters) !== rowsKey(ib.chapters)) return false;
  if (rowsKey(ia.bridges) !== rowsKey(ib.bridges) || rowsKey(ia.proofs) !== rowsKey(ib.proofs)) return false;
  return ia.chapters.every((c) => (a.chapters[c.id]?.revision ?? 0) === (b.chapters[c.id]?.revision ?? 0));
}

function differs(current: BackupData, incoming: BackupData): boolean {
  if (!sameArcs(current.arcs, incoming.arcs)) return true;
  if (rowsKey(current.journal?.entries ?? []) !== rowsKey(incoming.journal?.entries ?? [])) return true;
  if (rowsKey(current.scenes?.cards ?? []) !== rowsKey(incoming.scenes?.cards ?? [])) return true;
  return JSON.stringify(current.profile) !== JSON.stringify(incoming.profile);
}

/** A chapter the file holds a newer rewrite of ('Rewrite this chapter' on the other side). */
function newerRewrites(current: ArcSnapshot, incoming: ArcSnapshot): number {
  const mine = new Map(current.index.chapters.map((c) => [c.id, c.revision]));
  return incoming.index.chapters.filter((c) => mine.has(c.id) && c.revision > (mine.get(c.id) ?? 0)).length;
}

/**
 * The decision the import screen shows. Merge is recommended whenever both
 * sides hold data: it keeps everything from both, and only adds what is new.
 */
export function planImport(current: BackupData, incoming: BackupData): ImportPlan {
  const relations = [...relateDreams(current.arcs.index, incoming.arcs.index).values()];
  const ci = current.arcs.index;
  const ti = incoming.arcs.index;
  const nothingNew =
    newIds(ci.dreams, ti.dreams).length === 0 &&
    newIds(ci.chapters, ti.chapters).length === 0 &&
    newIds(ci.bridges, ti.bridges).length === 0 &&
    newIds(ci.proofs, ti.proofs).length === 0 &&
    newerRewrites(current.arcs, incoming.arcs) === 0 &&
    newIds(current.journal?.entries ?? [], incoming.journal?.entries ?? []).length === 0 &&
    newIds(current.scenes?.cards ?? [], incoming.scenes?.cards ?? []).length === 0;
  const empty = isEmpty(current);
  return {
    needsChoice: !empty && !isEmpty(incoming),
    recommended: empty ? "replace" : "merge",
    nothingNew: !empty && nothingNew,
    differs: differs(current, incoming),
    dreamsUpdated: relations.filter((r) => r === "file-ahead").length,
    dreamsDiverged: relations.filter((r) => r === "diverged").length,
    current: summarizeBackup(current),
    incoming: summarizeBackup(incoming),
  };
}

/** I14 after a merge: focus stays on a dream that is not released. */
function liveFocus(dreams: readonly Dream[], preferred: readonly (DreamId | null)[]): DreamId | null {
  for (const id of preferred) {
    const d = id ? dreams.find((x) => x.id === id) : undefined;
    if (d && d.status !== "released") return d.id;
  }
  const newest = (status: Dream["status"]) =>
    [...dreams].filter((d) => d.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return (newest("active") ?? newest("resting"))?.id ?? null;
}

interface ArcMerge {
  readonly snapshot: ArcSnapshot;
  /** Dreams the device had, replaced by the file's longer history. */
  readonly updated: readonly DreamId[];
  /** Dreams whose histories diverged: the device's version was kept. */
  readonly kept: readonly DreamId[];
  /** checkArcInvariants of the merged arcs ([] = safe to import). */
  readonly problems: readonly string[];
}

/**
 * Dreams are self-contained (their chapters, bridges and proofs reference only
 * them), so a merge picks each dream WHOLE from one side: a dream only in the
 * file is added; a dream whose history the file carries on (every chapter,
 * bridge and proof the device has, plus more) is taken from the file; a dream
 * where the device is ahead, or the two went separate ways, keeps the
 * device's. Nothing is ever dropped silently: diverged dreams are reported.
 */
function mergeArcs(mine: ArcSnapshot, theirs: ArcSnapshot): ArcMerge {
  const relations = relateDreams(mine.index, theirs.index);
  const fromFile = new Set([...relations].filter(([, r]) => r === "added" || r === "file-ahead").map(([id]) => id));
  const updated = [...relations].filter(([, r]) => r === "file-ahead").map(([id]) => id);
  const kept = [...relations].filter(([, r]) => r === "diverged").map(([id]) => id);
  const pick = <T extends { readonly dreamId: string }>(own: readonly T[], file: readonly T[]) => [
    ...own.filter((r) => !fromFile.has(r.dreamId)),
    ...file.filter((r) => fromFile.has(r.dreamId)),
  ];
  const chapters: Record<string, Chapter> = {};
  for (const meta of mine.index.chapters) if (!fromFile.has(meta.dreamId)) chapters[meta.id] = mine.chapters[meta.id];
  for (const meta of theirs.index.chapters) if (fromFile.has(meta.dreamId)) chapters[meta.id] = theirs.chapters[meta.id];
  const dreams = [...mine.index.dreams.filter((d) => !fromFile.has(d.id)), ...theirs.index.dreams.filter((d) => fromFile.has(d.id))].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const index: ArcIndex = {
    ...mine.index,
    dreams,
    chapters: pick(mine.index.chapters, theirs.index.chapters),
    bridges: pick(mine.index.bridges, theirs.index.bridges),
    proofs: pick(mine.index.proofs, theirs.index.proofs),
    activeDreamId: liveFocus(dreams, [mine.index.activeDreamId, theirs.index.activeDreamId]),
    migratedFromV1At: mine.index.migratedFromV1At ?? theirs.index.migratedFromV1At ?? null,
  };
  const snapshot: ArcSnapshot = { index, chapters };
  return { snapshot, updated, kept, problems: checkArcInvariants(snapshot) };
}

function mergeProgress(mine: ProgressState | null, theirs: ProgressState | null): ProgressState | null {
  if (!mine || !theirs) return mine ?? theirs;
  const days = [...new Set([...mine.days, ...theirs.days])].sort().slice(-DAYS_KEPT);
  const lifetime = Object.fromEntries(
    Object.keys(mine.lifetime).map((k) => [k, Math.max(mine.lifetime[k as keyof typeof mine.lifetime], theirs.lifetime[k as keyof typeof theirs.lifetime] ?? 0)])
  );
  return parseProgress({ ...mine, days, lifetime, nightsShownUp: Math.max(mine.nightsShownUp, theirs.nightsShownUp, days.length) });
}

/** Every page from both sides (none is ever dropped). */
function mergeJournal(mine: JournalData | null, theirs: JournalData | null): JournalData | null {
  if (!mine || !theirs) return mine ?? theirs;
  const entries = [...mine.entries, ...newIds(mine.entries, theirs.entries)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...mine, entries, phrase369: mine.phrase369 || theirs.phrase369, sheet: mine.sheet ?? theirs.sheet };
}

/** Every Scene from both sides (none is ever dropped). */
function mergeScenes(mine: ScenesData | null, theirs: ScenesData | null): ScenesData | null {
  if (!mine || !theirs) return mine ?? theirs;
  return {
    version: 2,
    cards: [...mine.cards, ...newIds(mine.cards, theirs.cards)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    importedProofIds: [...new Set([...mine.importedProofIds, ...theirs.importedProofIds])],
  };
}

export interface ImportResolution {
  /** What the device holds after the import. */
  readonly data: BackupData;
  readonly mode: ImportMode;
  /** Merge: dreams added from the file. */
  readonly dreamsAdded: number;
  /** Merge: dreams whose longer history in the file replaced this device's. */
  readonly dreamsUpdated: number;
  /** Merge: dreams whose histories diverged; this device's version was kept. */
  readonly dreamsKept: number;
  /** Problems that make the result unsafe to import ([] = apply it). Never silently replaced by 'keep mine'. */
  readonly problems: readonly string[];
}

/** Replace = the file wins; merge = keep everything, add what is new, carry each dream's longer history. */
export function resolveImportDetailed(current: BackupData, incoming: BackupData, mode: ImportMode): ImportResolution {
  if (mode === "replace") {
    return { data: incoming, mode, dreamsAdded: 0, dreamsUpdated: 0, dreamsKept: 0, problems: checkArcInvariants(incoming.arcs) };
  }
  const arcs = mergeArcs(current.arcs, incoming.arcs);
  const have = new Set(current.arcs.index.dreams.map((d) => d.id));
  return {
    data: {
      arcs: arcs.snapshot,
      profile: current.profile ?? incoming.profile,
      progress: mergeProgress(current.progress, incoming.progress),
      journal: mergeJournal(current.journal, incoming.journal),
      scenes: mergeScenes(current.scenes, incoming.scenes),
    },
    mode,
    dreamsAdded: incoming.arcs.index.dreams.filter((d) => !have.has(d.id)).length,
    dreamsUpdated: arcs.updated.length,
    dreamsKept: arcs.kept.length,
    problems: arcs.problems,
  };
}

/** What the device holds after the import (see resolveImportDetailed for what happened). */
export function resolveImport(current: BackupData, incoming: BackupData, mode: ImportMode): BackupData {
  return resolveImportDetailed(current, incoming, mode).data;
}

/* =========================================================================
 * File IO (thin seam; native modules required lazily)
 * ========================================================================= */

export type ExportOutcome = "shared" | "downloaded" | "unavailable";

/** Hand the backup to the share sheet (native) or download it (web). */
export async function shareBackupFile(file: BackupFile, now: Date): Promise<ExportOutcome> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Platform } = require("react-native") as typeof import("react-native");
  const name = backupFileName(now);
  const text = serializeBackup(file);
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return "unavailable";
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  }
  try {
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) return "unavailable";
    const out = new File(Paths.cache, name);
    out.create({ overwrite: true });
    out.write(text);
    await Sharing.shareAsync(out.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Save your Vela backup" });
    return "shared";
  } catch {
    return "unavailable";
  }
}

/** Let the user pick a backup file. Resolves to its text, or null when cancelled or unreadable. */
export async function pickBackupText(): Promise<string | null> {
  try {
    const Picker = require("expo-document-picker") as typeof import("expo-document-picker");
    const res = await Picker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return null;
    const asset = res.assets[0];
    if (asset.file) return await asset.file.text();
    const { File } = require("expo-file-system") as typeof import("expo-file-system");
    /* eslint-enable @typescript-eslint/no-require-imports */
    return await new File(asset.uri).text();
  } catch {
    return null;
  }
}
