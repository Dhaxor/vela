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
// - A storage read that FAILS is never 'absent': the load retries (staying not
//   ready, writing nothing) until storage answers, so a bad read can never
//   re-run the migration over 1.1 data or collect its chapter keys
//   (lib/store/storageRead). `storageError` reports the outage meanwhile.
// - Photo URIs are rebased into this install's document directory on load and
//   on import (lib/photos): iOS moves the app container on every update.
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ARC_SCHEMA_VERSION,
  ArcError,
  EMPTY_ARC_INDEX,
  canCreateDream as canCreateDreamRule,
  type ArcSnapshot,
  type ArcValue,
  type Chapter,
  type ChapterId,
} from "./arc.types";
import { ArcCtx, ArcStateCtx } from "./arcCtx";
import { createStoreQueue, listKeys, loadUntilRead, parseJson, readKey, readKeys, writeRaw } from "./persist";
import { useUser } from "./UserContext";
import { usePlus } from "./PlusContext";
import { useRitualStore } from "./RitualContext";
import { now } from "@/lib/clock";
import { persistPhoto, photoUriResolver, rebaseIndexPhotos } from "@/lib/photos";
import { STORAGE_KEYS, chapterStorageKey } from "@/lib/storageKeys";
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
import { loadArcState, parseStoredChapter, repairChapter } from "@/lib/store/arcLoad";

/** False: this is the real provider. */
export const ARC_IS_STUB: boolean = false;

/** Hold storage writes while a ceremony animates (Star Birth, Named Sky, the Weave). */
export { holdForCeremony } from "@/lib/store/ceremony";

const EMPTY: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };

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
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    if (!userReady || !plusReady || readyRef.current) return;
    // The load only READS (plus the quarantine's safety copy; lib/store/arcLoad).
    // Its writes are enqueued in onLoaded, after every read succeeded: a load that
    // fails part way is retried from scratch and never leaves a write behind.
    const job = loadUntilRead(
      () =>
        loadArcState(
          { readKeys, listKeys, writeRaw },
          {
            now: now(),
            name: live.current.name,
            resolvePhoto: photoUriResolver(),
            onMigrationReport: (report) => {
              if (__DEV__) console.warn("[vela] migration", report);
            },
            onWarning: (message, detail) => {
              if (__DEV__) console.warn(`[vela] ${message}`, detail ?? "");
            },
          }
        ),
      {
        onLoaded: ({ index, texts, toWrite, orphans, indexChanged }) => {
          const next: ArcState = { index, texts };
          ref.current = next;
          setState(next);
          if (toWrite.length > 0 || orphans.length > 0 || indexChanged) {
            queue.enqueue({ items: toWrite.map((id) => [chapterStorageKey(id), texts[id]] as const), head: [STORAGE_KEYS.arcs, index], remove: orphans });
          }
          readyRef.current = true;
          setStorageError(false);
          setReady(true);
        },
        onFailure: (e) => {
          if (__DEV__) console.warn("[vela] arc storage could not be read; retrying", e);
          setStorageError(true);
        },
      }
    );
    return () => job.cancel();
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

  /** Text from cache or storage. Throws StorageReadError when storage could not be read (null = no such text). */
  const readChapter = useCallback(async (chapterId: ChapterId): Promise<Chapter | null> => {
    const cached = ref.current.texts[chapterId];
    if (cached) return cached;
    const meta = chapterMetaOf(ref.current.index, chapterId);
    if (!meta) return null;
    const text = parseStoredChapter(parseJson(await readKey(chapterStorageKey(chapterId))), meta);
    if (!text) return null;
    // Cache only: nothing to persist.
    const next = { ...ref.current, texts: { ...ref.current.texts, [chapterId]: text } };
    ref.current = next;
    setState(next);
    return text;
  }, []);

  const loadChapter = useCallback(
    async (chapterId: ChapterId): Promise<Chapter | null> => {
      try {
        return await readChapter(chapterId);
      } catch {
        return null; // the reader shows its missing state; nothing is written
      }
    },
    [readChapter]
  );

  /**
   * Index + every chapter text. A storage error throws (no half backup is
   * made). A text that is truly gone (storage answered, nothing usable) is
   * rewritten from its meta, as at launch, so the file still imports (I15).
   */
  const exportSnapshot = useCallback(async (): Promise<ArcSnapshot> => {
    const { index } = ref.current;
    const chapters: Record<ChapterId, Chapter> = {};
    for (const meta of index.chapters) {
      const text = (await readChapter(meta.id)) ?? repairChapter(index, meta, live.current.name, now());
      if (!text) throw new ArcError("storage", `chapter ${meta.id} could not be read`);
      chapters[meta.id] = text;
    }
    return { index, chapters };
  }, [readChapter]);

  const importSnapshot = useCallback(
    async (incoming: ArcSnapshot) => {
      if (!readyRef.current) throw new ArcError("not-ready");
      const prev = ref.current;
      // A backup carries the photo URIs of the install it came from: rebase the ones whose file is here.
      const snapshot: ArcSnapshot = { ...incoming, index: rebaseIndexPhotos(incoming.index, photoUriResolver()) };
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
      storageError,
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
  }, [ready, storageError, index, texts, isPlus, act, loadChapter, exportSnapshot, importSnapshot, queue]);

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
