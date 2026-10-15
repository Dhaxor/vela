// PRIVATE BACKUP. Everything the user made, in one versioned JSON file they
// keep: dreams, every chapter, bridges, proofs, the profile, progress, the
// journal and Scenes. No server, no account. Device-local keys (Plus cache,
// ask ledger, notification history) are not included.
//
// Pure core: build → serialize → parse/validate → plan (merge or replace) →
// apply. The file IO at the bottom is a thin seam over expo-file-system,
// expo-sharing and expo-document-picker (a download/upload on web), required
// lazily so bun can test this module.

import type { ArcIndex, ArcSnapshot, Chapter, IsoTime } from "@/contexts/arc.types";
import type { ProfileV2 } from "@/contexts/user.types";
import { parseJournal, MAX_ENTRIES, type JournalData } from "./journal";
import { DAYS_KEPT, parseProgress, type ProgressState } from "./progress";
import { checkArcInvariants } from "./store/invariants";
import { parseProfileV2 } from "./store/profile";
import { MAX_SCENES, parseScenes, type ScenesData } from "./store/scenes";

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

export function summarizeBackup(data: BackupData): BackupSummary {
  return {
    dreams: data.arcs.index.dreams.length,
    chapters: data.arcs.index.chapters.length,
    proofs: data.arcs.index.proofs.length,
    pages: data.journal?.entries.length ?? 0,
    scenes: data.scenes?.cards.length ?? 0,
    name: data.profile?.name ?? null,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Validate a backup file's text. Never throws; nothing is applied here. */
export function parseBackup(text: string, now: Date): ParsedBackup {
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
  const arcs = d.arcs as unknown as ArcSnapshot;
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
  /** The file holds nothing this device does not already have. */
  readonly nothingNew: boolean;
  readonly current: BackupSummary;
  readonly incoming: BackupSummary;
}

const isEmpty = (d: BackupData) =>
  d.arcs.index.dreams.length === 0 && (d.journal?.entries.length ?? 0) === 0 && (d.scenes?.cards.length ?? 0) === 0;

const newIds = <T extends { readonly id: string }>(mine: readonly T[], theirs: readonly T[]) => {
  const have = new Set(mine.map((x) => x.id));
  return theirs.filter((x) => !have.has(x.id));
};

/**
 * The decision the import screen shows. Merge is recommended whenever both
 * sides hold data: it keeps everything from both, and only adds what is new.
 */
export function planImport(current: BackupData, incoming: BackupData): ImportPlan {
  const nothingNew =
    newIds(current.arcs.index.dreams, incoming.arcs.index.dreams).length === 0 &&
    newIds(current.journal?.entries ?? [], incoming.journal?.entries ?? []).length === 0 &&
    newIds(current.scenes?.cards ?? [], incoming.scenes?.cards ?? []).length === 0;
  const empty = isEmpty(current);
  return {
    needsChoice: !empty && !isEmpty(incoming),
    recommended: empty ? "replace" : "merge",
    nothingNew: !empty && nothingNew,
    current: summarizeBackup(current),
    incoming: summarizeBackup(incoming),
  };
}

/** Dreams are self-contained (their chapters, bridges and proofs reference only them), so a union by dream is safe. */
function mergeArcs(mine: ArcSnapshot, theirs: ArcSnapshot): ArcSnapshot {
  const added = new Set(newIds(mine.index.dreams, theirs.index.dreams).map((d) => d.id));
  const from = <T extends { readonly dreamId: string }>(rows: readonly T[]) => rows.filter((r) => added.has(r.dreamId));
  const chapters: Record<string, Chapter> = { ...mine.chapters };
  for (const meta of from(theirs.index.chapters)) chapters[meta.id] = theirs.chapters[meta.id];
  const index: ArcIndex = {
    ...mine.index,
    dreams: [...mine.index.dreams, ...theirs.index.dreams.filter((d) => added.has(d.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    chapters: [...mine.index.chapters, ...from(theirs.index.chapters)],
    bridges: [...mine.index.bridges, ...from(theirs.index.bridges)],
    proofs: [...mine.index.proofs, ...from(theirs.index.proofs)],
    activeDreamId: mine.index.activeDreamId ?? theirs.index.activeDreamId,
  };
  const merged: ArcSnapshot = { index, chapters };
  return checkArcInvariants(merged).length === 0 ? merged : mine;
}

function mergeProgress(mine: ProgressState | null, theirs: ProgressState | null): ProgressState | null {
  if (!mine || !theirs) return mine ?? theirs;
  const days = [...new Set([...mine.days, ...theirs.days])].sort().slice(-DAYS_KEPT);
  const lifetime = Object.fromEntries(
    Object.keys(mine.lifetime).map((k) => [k, Math.max(mine.lifetime[k as keyof typeof mine.lifetime], theirs.lifetime[k as keyof typeof theirs.lifetime] ?? 0)])
  );
  return parseProgress({ ...mine, days, lifetime, nightsShownUp: Math.max(mine.nightsShownUp, theirs.nightsShownUp, days.length) });
}

function mergeJournal(mine: JournalData | null, theirs: JournalData | null): JournalData | null {
  if (!mine || !theirs) return mine ?? theirs;
  const entries = [...mine.entries, ...newIds(mine.entries, theirs.entries)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ENTRIES);
  return { ...mine, entries, phrase369: mine.phrase369 || theirs.phrase369, sheet: mine.sheet ?? theirs.sheet };
}

function mergeScenes(mine: ScenesData | null, theirs: ScenesData | null): ScenesData | null {
  if (!mine || !theirs) return mine ?? theirs;
  return {
    version: 2,
    cards: [...mine.cards, ...newIds(mine.cards, theirs.cards)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_SCENES),
    importedProofIds: [...new Set([...mine.importedProofIds, ...theirs.importedProofIds])],
  };
}

/** What the device holds after the import. Replace = the file wins; merge = keep everything, add what is new. */
export function resolveImport(current: BackupData, incoming: BackupData, mode: ImportMode): BackupData {
  if (mode === "replace") return incoming;
  return {
    arcs: mergeArcs(current.arcs, incoming.arcs),
    profile: current.profile ?? incoming.profile,
    progress: mergeProgress(current.progress, incoming.progress),
    journal: mergeJournal(current.journal, incoming.journal),
    scenes: mergeScenes(current.scenes, incoming.scenes),
  };
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
