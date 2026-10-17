// ARC LAUNCH LOAD: what ArcProvider reads at launch and what it may write
// back, with storage injected so every rule that stands between a bad read
// and data loss is tested (arcLoad.test.ts), not only commented.
//
// - absent (the read SUCCEEDED and found no index): first launch of 1.1.
//   Migrate from the v1 keys (also read successfully), or start empty.
// - readable: load it. Chapter keys it does not point at are orphans from a
//   crash between a chapter write and its index write, and are collected.
// - unreadable (present but corrupt, of another schema, or with malformed
//   rows): the raw string is quarantined before anything can write the index,
//   and no chapter key is collected while a quarantine exists.
// - A read that FAILS throws (StorageReadError from storage.readKeys) and
//   this load writes nothing: the provider retries (lib/store/storageRead).
//   It never migrates, repairs a chapter or collects a key from a failed read.
//
// Pure apart from the injected storage. Writes are returned (toWrite, orphans,
// indexChanged) for the provider to enqueue once the whole load succeeded; the
// only write made here is the quarantine's safety copy.

import {
  ARC_SCHEMA_VERSION,
  EMPTY_ARC_INDEX,
  type ArcIndex,
  type Chapter,
  type ChapterId,
  type ChapterMeta,
  type MigrationReport,
  type V1RawStorage,
} from "@/contexts/arc.types";
import { migrateV1 } from "@/lib/migrate";
import { rebaseIndexPhotos, type PhotoUriResolver } from "@/lib/photos";
import { localDateKey } from "@/lib/progress";
import { STORAGE_KEYS, V1_KEYS, chapterStorageKey } from "@/lib/storageKeys";
import { writeChapter } from "@/lib/story/engine";
import { hash32 } from "@/lib/story/text";
import { dreamOf, latestChapterOf, proofsOf } from "./arcSelectors";
import { classifyIndexRead, orphanChapterKeys, type IndexRead } from "./indexLoad";
import { chapterShapeProblems, indexShapeProblems } from "./shape";
import { StorageReadError } from "./storageRead";

export interface ArcLoadStorage {
  /** Raw values in key order (null = nothing stored). MUST throw when storage could not be read. */
  readKeys(keys: readonly string[]): Promise<(string | null)[]>;
  /** Every key, or null when the listing failed (then nothing is collected). */
  listKeys(): Promise<readonly string[] | null>;
  /** One immediate write (the quarantine copy). false = it failed. */
  writeRaw(key: string, value: string): Promise<boolean>;
}

export interface ArcLoadContext {
  readonly now: Date;
  /** {name} for any chapter written here (migration, repair). */
  readonly name: string;
  /** This install's photo URI rebase (lib/photos photoUriResolver). */
  readonly resolvePhoto: PhotoUriResolver;
  readonly onMigrationReport?: (report: MigrationReport) => void;
  readonly onWarning?: (message: string, detail?: unknown) => void;
}

export interface ArcLoadResult {
  readonly read: IndexRead;
  readonly index: ArcIndex;
  readonly texts: Record<ChapterId, Chapter>;
  /** Chapter keys to write (migrated or repaired texts), before the index. */
  readonly toWrite: readonly ChapterId[];
  /** Orphan chapter keys to remove, after the index. */
  readonly orphans: readonly string[];
  /** The index differs from what is stored (migrated, or photo URIs rebased): write it. */
  readonly indexChanged: boolean;
}

/**
 * Stored index → ArcIndex, or null when unusable. Every row's field types are
 * checked (lib/store/shape): an index with `constellations: {}` would crash
 * Today on every launch, so it is treated as unreadable (quarantined) instead.
 */
export function parseStoredIndex(raw: unknown): ArcIndex | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<ArcIndex>;
  if (r.schemaVersion !== ARC_SCHEMA_VERSION) return null;
  if (![r.dreams, r.chapters, r.bridges, r.proofs].every(Array.isArray)) return null;
  const index = { ...EMPTY_ARC_INDEX, ...r } as ArcIndex;
  return indexShapeProblems(index).length === 0 ? index : null;
}

/** A stored chapter text for `meta`, or null when missing, stale or malformed. */
export function parseStoredChapter(raw: unknown, meta: ChapterMeta): Chapter | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Chapter;
  return c.id === meta.id && c.revision >= meta.revision && chapterShapeProblems(c).length === 0 ? c : null;
}

export function parseJsonOrNull(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Latest chapter of every non-released dream: these are always cached once ready. */
export function liveLatest(index: ArcIndex): ChapterMeta[] {
  return index.dreams
    .filter((d) => d.status !== "released")
    .map((d) => latestChapterOf(index, d.id))
    .filter((c): c is ChapterMeta => !!c);
}

/**
 * A latest chapter whose text vanished (cleared web storage): rewrite it from
 * its meta so Today never shows an empty card. Same id, number, stage and woven proof.
 */
export function repairChapter(index: ArcIndex, meta: ChapterMeta, name: string, now: Date): Chapter | null {
  const dream = dreamOf(index, meta.dreamId);
  if (!dream) return null;
  const proofs = proofsOf(index, dream.id);
  const woven = meta.wovenProofId ? proofs.find((p) => p.id === meta.wovenProofId) : undefined;
  return writeChapter({
    chapterId: meta.id, dreamId: dream.id, season: meta.season, number: meta.number, stage: meta.stage,
    mode: "engine", revision: meta.revision, name, focus: dream.focus, desire: dream.desire, feeling: dream.feeling,
    motifIds: dream.motifIds, recentIds: dream.usedIds, previousIds: [],
    woven: woven ? { id: woven.id, kind: woven.kind, text: woven.text, dateKey: woven.dateKey, origin: woven.origin } : null,
    history: proofs.filter((p) => p.id !== woven?.id && p.createdAt <= meta.createdAt),
    totalProofs: proofs.filter((p) => p.createdAt <= meta.createdAt).length,
    seed: hash32(meta.id), now, todayKey: localDateKey(now),
  }).chapter;
}

/** Read the arc at launch. Throws (writing nothing but a quarantine copy) when storage could not be read. */
export async function loadArcState(storage: ArcLoadStorage, ctx: ArcLoadContext): Promise<ArcLoadResult> {
  const [rawIndex, quarantine] = await storage.readKeys([STORAGE_KEYS.arcs, STORAGE_KEYS.arcsUnreadable]);
  let index = parseStoredIndex(parseJsonOrNull(rawIndex));
  const read = classifyIndexRead(rawIndex, index);
  let quarantined = !!quarantine;
  let texts: Record<ChapterId, Chapter> = {};
  let toWrite: ChapterId[] = [];
  let indexChanged = false;
  if (read === "absent") {
    // First launch of 1.1 (the read succeeded and found no index): migrate 1.0. v1 keys are only read.
    const [stories, ritual, profile, journal, board] = await storage.readKeys([V1_KEYS.stories, V1_KEYS.ritual, V1_KEYS.profile, V1_KEYS.journal, V1_KEYS.board]);
    const raw: V1RawStorage = { stories, ritual, profile, journal, board };
    if (stories) {
      try {
        const { snapshot, report } = migrateV1(raw, { now: ctx.now, name: ctx.name });
        if (report.warnings.length > 0) ctx.onMigrationReport?.(report);
        index = snapshot.index;
        texts = { ...snapshot.chapters };
        toWrite = Object.keys(texts);
        indexChanged = true;
      } catch (e) {
        // Never write a half migration: the next launch retries from the untouched v1 keys.
        ctx.onWarning?.("migration failed", e);
      }
    }
  } else if (read === "unreadable") {
    // Keep the unreadable index before any action can write over it. The first
    // copy wins: a later unreadable write never replaces the original.
    if (!quarantined) quarantined = await storage.writeRaw(STORAGE_KEYS.arcsUnreadable, rawIndex!);
    // No safety copy, no start: an empty index would later be written over the only copy.
    if (!quarantined) throw new StorageReadError(null, "could not keep the unreadable arc index");
    ctx.onWarning?.(`arc index unreadable; kept under ${STORAGE_KEYS.arcsUnreadable}`);
  }
  let loadedIndex = index ?? EMPTY_ARC_INDEX;

  // iOS moved the app container since these URIs were stored (every update does): point them at it again.
  const rebased = rebaseIndexPhotos(loadedIndex, ctx.resolvePhoto);
  if (rebased !== loadedIndex) indexChanged = true;
  loadedIndex = rebased;

  const latest = liveLatest(loadedIndex).filter((m) => !texts[m.id]);
  const stored = await storage.readKeys(latest.map((m) => chapterStorageKey(m.id)));
  latest.forEach((meta, i) => {
    const text = parseStoredChapter(parseJsonOrNull(stored[i]), meta);
    // Only a text that is truly missing (or malformed) is rewritten from its meta. A repair that
    // fails leaves the reader's missing state; it never holds the whole app on its splash.
    let final = text;
    if (!final) {
      try {
        final = repairChapter(loadedIndex, meta, ctx.name, ctx.now);
      } catch (e) {
        ctx.onWarning?.(`chapter ${meta.id} could not be repaired`, e);
      }
    }
    if (!final) return;
    texts[meta.id] = final;
    if (!text) toWrite.push(meta.id);
  });

  // Orphans are collected only from an index that was read, and only when the key listing worked.
  const keys = read === "readable" ? await storage.listKeys() : null;
  const orphans = orphanChapterKeys(keys ?? [], loadedIndex, {
    read,
    quarantined,
    chapterKey: chapterStorageKey,
    prefix: STORAGE_KEYS.chapterPrefix,
  });
  return { read, index: loadedIndex, texts, toWrite, orphans, indexChanged: indexChanged || toWrite.length > 0 || orphans.length > 0 };
}
