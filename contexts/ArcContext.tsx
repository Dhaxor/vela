// ArcContext: dreams, chapters, bridges and proofs (contract: arc.types.ts
// ArcValue, docs/CONTRACTS.md §3–§5).
//
// - Every action is one atomic transition of the pure reducer (lib/store/arc)
//   applied to the CURRENT state held in a ref, so two quick actions can never
//   read a stale snapshot (the 1.0 bug that could drop a proof).
// - Storage: a small index under 'vela.arcs.v2' plus one immutable key per
//   chapter. Writes go through a serialized queue that waits for ceremonies
//   (lib/store/ceremony) and writes chapter keys before the index (I15).
// - First launch of 1.1 migrates 1.0 data (lib/migrate); the five v1 keys are
//   read, never written or deleted.
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ARC_SCHEMA_VERSION,
  ArcError,
  EMPTY_ARC_INDEX,
  canCreateDream as canCreateDreamRule,
  type ArcIndex,
  type ArcSnapshot,
  type ArcValue,
  type Chapter,
  type ChapterId,
  type ChapterMeta,
  type V1RawStorage,
} from "./arc.types";
import { ArcCtx, ArcStateCtx } from "./arcCtx";
import { allKeys, createStoreQueue, parseJson, readMany, readRaw, writeRaw } from "./persist";
import { useUser } from "./UserContext";
import { usePlus } from "./PlusContext";
import { useRitualStore } from "./RitualContext";
import { now } from "@/lib/clock";
import { migrateV1 } from "@/lib/migrate";
import { persistPhoto } from "@/lib/photos";
import { localDateKey } from "@/lib/progress";
import { STORAGE_KEYS, V1_KEYS, chapterStorageKey } from "@/lib/storageKeys";
import { applyArcAction, changedChapterIds, type ArcAction, type ArcResults, type ArcState } from "@/lib/store/arc";
import {
  bridgesOf,
  chapterMetaOf,
  chaptersOf,
  dreamOf,
  latestChapterOf,
  loopStateOf,
  offersFor,
  openBridgeOf,
  planLockedOf,
  proofsOf,
  seasonProgressOf,
  suggestConstellationNameOf,
  totalStarsOf,
  weavingOf,
} from "@/lib/store/arcSelectors";
import { newId, randomSeed } from "@/lib/store/ids";
import { classifyIndexRead, orphanChapterKeys } from "@/lib/store/indexLoad";
import { writeChapter } from "@/lib/story/engine";
import { hash32 } from "@/lib/story/text";

/** False: this is the real provider. */
export const ARC_IS_STUB: boolean = false;

/** Hold storage writes while a ceremony animates (Star Birth, Named Sky, the Weave). */
export { holdForCeremony } from "@/lib/store/ceremony";

const EMPTY: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };

/** Stored index → ArcIndex, or null when unusable. */
function parseIndex(raw: unknown): ArcIndex | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<ArcIndex>;
  if (r.schemaVersion !== ARC_SCHEMA_VERSION) return null;
  if (![r.dreams, r.chapters, r.bridges, r.proofs].every(Array.isArray)) return null;
  return { ...EMPTY_ARC_INDEX, ...r } as ArcIndex;
}

function parseChapter(raw: unknown, meta: ChapterMeta): Chapter | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Chapter;
  return c.id === meta.id && c.opening && c.closing && Array.isArray(c.body) && c.revision >= meta.revision ? c : null;
}

/** Latest chapter of every non-released dream: these are always cached once ready. */
function liveLatest(index: ArcIndex): ChapterMeta[] {
  return index.dreams
    .filter((d) => d.status !== "released")
    .map((d) => latestChapterOf(index, d.id))
    .filter((c): c is ChapterMeta => !!c);
}

/**
 * A latest chapter whose text vanished (cleared web storage): rewrite it from
 * its meta so Today never shows an empty card. Same id, number, stage and woven proof.
 */
function repairChapter(index: ArcIndex, meta: ChapterMeta, name: string): Chapter | null {
  const dream = dreamOf(index, meta.dreamId);
  if (!dream) return null;
  const proofs = proofsOf(index, dream.id);
  const woven = meta.wovenProofId ? proofs.find((p) => p.id === meta.wovenProofId) : undefined;
  const t = now();
  return writeChapter({
    chapterId: meta.id, dreamId: dream.id, season: meta.season, number: meta.number, stage: meta.stage,
    mode: "engine", revision: meta.revision, name, focus: dream.focus, desire: dream.desire, feeling: dream.feeling,
    motifIds: dream.motifIds, recentIds: dream.usedIds, previousIds: [],
    woven: woven ? { id: woven.id, kind: woven.kind, text: woven.text, dateKey: woven.dateKey, origin: woven.origin } : null,
    history: proofs.filter((p) => p.id !== woven?.id && p.createdAt <= meta.createdAt),
    totalProofs: proofs.filter((p) => p.createdAt <= meta.createdAt).length,
    seed: hash32(meta.id), now: t, todayKey: localDateKey(t),
  }).chapter;
}

export function ArcProvider({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const plus = usePlus();
  const ritual = useRitualStore();
  const [state, setState] = useState<ArcState>(EMPTY);
  const [ready, setReady] = useState(false);
  const ref = useRef<ArcState>(EMPTY);
  const readyRef = useRef(false);
  const queue = useMemo(createStoreQueue, []);

  // Values the actions read at call time (never captured in stale closures).
  const live = useRef({ isPlus: plus.isPlus, name: user.profile?.name ?? "", recordAct: ritual.recordAct });
  live.current = { isPlus: plus.isPlus, name: user.profile?.name ?? "", recordAct: ritual.recordAct };

  /** Commit a new state and queue its writes: changed chapter keys first, then the index. */
  const commit = useCallback(
    (prev: ArcState, next: ArcState, remove: readonly string[] = []) => {
      ref.current = next;
      setState(next);
      queue.enqueue({
        items: changedChapterIds(prev, next).map((id) => [chapterStorageKey(id), next.texts[id]] as const),
        head: [STORAGE_KEYS.arcs, next.index],
        remove,
      });
    },
    [queue]
  );

  /* ------------------------------------------------------------- load */

  const userReady = user.ready;
  const plusReady = plus.ready;
  useEffect(() => {
    if (!userReady || !plusReady || readyRef.current) return;
    let stale = false;
    void (async () => {
      const [rawIndex, quarantine] = await readMany([STORAGE_KEYS.arcs, STORAGE_KEYS.arcsUnreadable]);
      let index = parseIndex(parseJson(rawIndex));
      const read = classifyIndexRead(rawIndex, index);
      let quarantined = !!quarantine;
      let texts: Record<ChapterId, Chapter> = {};
      let toWrite: ChapterId[] = [];
      if (read === "absent") {
        // First launch of 1.1: migrate 1.0 (v1 keys are only read).
        const [stories, ritualRaw, profile, journal, board] = await readMany([V1_KEYS.stories, V1_KEYS.ritual, V1_KEYS.profile, V1_KEYS.journal, V1_KEYS.board]);
        const raw: V1RawStorage = { stories, ritual: ritualRaw, profile, journal, board };
        if (stories) {
          try {
            const { snapshot, report } = migrateV1(raw, { now: now(), name: live.current.name });
            if (__DEV__ && report.warnings.length > 0) console.warn("[vela] migration", report);
            index = snapshot.index;
            texts = { ...snapshot.chapters };
            toWrite = Object.keys(texts);
          } catch (e) {
            // Never write a half migration: the next launch retries from the untouched v1 keys.
            if (__DEV__) console.warn("[vela] migration failed", e);
          }
        }
      } else if (read === "unreadable") {
        // Keep the unreadable index before any action can write over it. The first
        // copy wins: a later unreadable write never replaces the original.
        if (!quarantined) quarantined = await writeRaw(STORAGE_KEYS.arcsUnreadable, rawIndex!);
        if (__DEV__) console.warn("[vela] arc index unreadable; kept under", STORAGE_KEYS.arcsUnreadable);
      }
      index = index ?? EMPTY_ARC_INDEX;

      const latest = liveLatest(index).filter((m) => !texts[m.id]);
      const loaded = await readMany(latest.map((m) => chapterStorageKey(m.id)));
      latest.forEach((meta, i) => {
        const stored = parseChapter(parseJson(loaded[i]), meta);
        const text = stored ?? repairChapter(index!, meta, live.current.name);
        if (!text) return;
        texts[meta.id] = text;
        if (!stored) toWrite.push(meta.id);
      });

      // Orphan chapter keys (a crash between a chapter write and its index write) are
      // garbage-collected, but only from an index that was read (lib/store/indexLoad).
      const orphans = orphanChapterKeys(read === "readable" ? await allKeys() : [], index, {
        read,
        quarantined,
        chapterKey: chapterStorageKey,
        prefix: STORAGE_KEYS.chapterPrefix,
      });
      if (stale) return;
      const next: ArcState = { index, texts };
      ref.current = next;
      setState(next);
      if (toWrite.length > 0 || orphans.length > 0) {
        queue.enqueue({ items: toWrite.map((id) => [chapterStorageKey(id), texts[id]] as const), head: [STORAGE_KEYS.arcs, index], remove: orphans });
      }
      readyRef.current = true;
      setReady(true);
    })();
    return () => {
      stale = true;
    };
  }, [userReady, plusReady, queue]);

  /* ------------------------------------------------------------- actions */

  const run = useCallback(
    <A extends ArcAction>(action: A): ArcResults[A["type"]] => {
      if (!readyRef.current) throw new ArcError("not-ready");
      const prev = ref.current;
      const out = applyArcAction(prev, action, {
        now: now(),
        isPlus: live.current.isPlus,
        name: live.current.name,
        newId,
        seed: randomSeed(),
      });
      if (out.state !== prev) commit(prev, out.state);
      return out.result;
    },
    [commit]
  );

  /** Actions resolve after the in-memory commit and reject with ArcError, state untouched. */
  const act = useCallback(
    <A extends ArcAction>(action: A): Promise<ArcResults[A["type"]]> => {
      try {
        return Promise.resolve(run(action));
      } catch (e) {
        return Promise.reject(e);
      }
    },
    [run]
  );

  const loadChapter = useCallback(async (chapterId: ChapterId): Promise<Chapter | null> => {
    const cached = ref.current.texts[chapterId];
    if (cached) return cached;
    const meta = chapterMetaOf(ref.current.index, chapterId);
    if (!meta) return null;
    const text = parseChapter(parseJson(await readRaw(chapterStorageKey(chapterId))), meta);
    if (!text) return null;
    // Cache only: nothing to persist.
    const next = { ...ref.current, texts: { ...ref.current.texts, [chapterId]: text } };
    ref.current = next;
    setState(next);
    return text;
  }, []);

  const exportSnapshot = useCallback(async (): Promise<ArcSnapshot> => {
    const { index } = ref.current;
    const chapters: Record<ChapterId, Chapter> = {};
    for (const meta of index.chapters) {
      const text = await loadChapter(meta.id);
      if (text) chapters[meta.id] = text;
    }
    return { index, chapters };
  }, [loadChapter]);

  const importSnapshot = useCallback(
    async (snapshot: ArcSnapshot) => {
      if (!readyRef.current) throw new ArcError("not-ready");
      const prev = ref.current;
      const out = applyArcAction(prev, { type: "IMPORT", snapshot }, { now: now(), isPlus: live.current.isPlus, name: live.current.name, newId, seed: randomSeed() });
      const keep = new Set(out.state.index.chapters.map((c) => c.id));
      const removed = prev.index.chapters.filter((c) => !keep.has(c.id)).map((c) => chapterStorageKey(c.id));
      commit(prev, out.state, removed);
      await queue.flush();
    },
    [commit, queue]
  );

  /* ------------------------------------------------------------- value */

  const { index, texts } = state;
  const isPlus = plus.isPlus;
  const value = useMemo<ArcValue>(() => {
    const weaving = weavingOf(index, isPlus);
    const activeDream = dreamOf(index, index.activeDreamId) ?? null;
    return {
      ready,
      schemaVersion: ARC_SCHEMA_VERSION,
      dreams: index.dreams,
      activeDreamId: index.activeDreamId,
      activeDream,
      weavingDreamIds: weaving,
      planLockedDreamIds: planLockedOf(index, isPlus),
      canCreateDream: canCreateDreamRule(index.dreams, isPlus),
      totalStars: totalStarsOf(index),

      dream: (id) => dreamOf(index, id),
      chapters: (id) => chaptersOf(index, id),
      chapterMeta: (id) => chapterMetaOf(index, id),
      latestChapter: (id) => latestChapterOf(index, id),
      bridges: (id) => bridgesOf(index, id),
      bridge: (id) => index.bridges.find((b) => b.id === id),
      openBridge: (id) => openBridgeOf(index, id),
      proofs: (id, season) => proofsOf(index, id, season),
      proof: (id) => index.proofs.find((p) => p.id === id),
      seasonProgress: (id) => seasonProgressOf(index, id),
      bridgeOffers: (chapterId) => offersFor(index, chapterId, isPlus),
      loopState: (id, at) => loopStateOf(index, id, at ?? now(), isPlus),
      suggestConstellationName: (id) => {
        const d = dreamOf(index, id);
        return d ? suggestConstellationNameOf(d) : "";
      },

      peekChapter: (id) => texts[id],
      loadChapter,

      createDream: async (input) => {
        const photo = input.seedProof?.photoUri ? await persistPhoto(input.seedProof.photoUri, `proof-${newId()}`) : null;
        return act({ type: "CREATE_DREAM", input: input.seedProof ? { ...input, seedProof: { ...input.seedProof, photoUri: photo } } : input });
      },
      chooseBridge: (input) => act({ type: "CHOOSE_BRIDGE", input }),
      saveProofAndWeave: async (input) => {
        const photoUri = input.photoUri ? await persistPhoto(input.photoUri, `proof-${newId()}`) : null;
        const result = await act({ type: "SAVE_PROOF_AND_WEAVE", input: { ...input, photoUri } });
        live.current.recordAct("proof");
        return result;
      },
      rerenderChapter: (chapterId) => act({ type: "RERENDER_CHAPTER", chapterId }),
      markHeard: async (chapterId) => {
        if (await act({ type: "MARK_HEARD", chapterId })) live.current.recordAct("chapter-heard");
      },
      saveForRitual: (chapterId, at) => act({ type: "SAVE_FOR_RITUAL", chapterId, at }),
      nameConstellation: (dreamId, season, name) => act({ type: "NAME_CONSTELLATION", dreamId, season, name }),
      beginNextSeason: (dreamId, input) => act({ type: "BEGIN_NEXT_SEASON", dreamId, input }),
      renameDream: (dreamId, label) => act({ type: "RENAME_DREAM", dreamId, label }),
      restDream: (dreamId) => act({ type: "REST_DREAM", dreamId }),
      releaseDream: (dreamId) => act({ type: "RELEASE_DREAM", dreamId }),
      setActiveDream: (dreamId) => act({ type: "SET_ACTIVE_DREAM", dreamId }),

      flush: () => queue.flush(),
      exportSnapshot,
      importSnapshot,
    };
  }, [ready, index, texts, isPlus, act, loadChapter, exportSnapshot, importSnapshot, queue]);

  return (
    <ArcStateCtx.Provider value={ref}>
      <ArcCtx.Provider value={value}>{children}</ArcCtx.Provider>
    </ArcStateCtx.Provider>
  );
}

export function useArc(): ArcValue {
  const v = useContext(ArcCtx);
  if (!v) throw new Error("useArc must be used inside ArcProvider");
  return v;
}
