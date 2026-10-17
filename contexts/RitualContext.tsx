// Forgiving progress (lib/progress, CONTRACTS §10): nights shown up that never
// reset, the weekly rhythm with rest nights, and 'Pause my sky'. Persisted
// under 'vela.progress.v2'; the 1.0 ritual days migrate once from
// 'vela.ritual.v1' (read-only) into lifetime counters. A failed read is
// retried, never taken as 'absent' (which would re-migrate 1.0 days over 1.1 progress).
//
// useProgress() is the API screens use.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArcCtx } from "./arcCtx";
import { createStoreQueue, loadUntilRead, parseJson, readKey } from "./persist";
import { STORAGE_KEYS, V1_KEYS } from "@/lib/storageKeys";
import { now } from "@/lib/clock";
import {
  emptyProgress,
  localDateKey,
  parseProgress,
  pauseUntil as pauseUntilFn,
  progressFromRitualV1,
  recordAct as recordActFn,
  resumeProgress,
  setRhythmTarget as setRhythmTargetFn,
  summarize,
  type LoopAct,
  type ProgressState,
  type ProgressSummary,
} from "@/lib/progress";
import type { DateKey } from "./arc.types";

interface RitualStore {
  ready: boolean;
  /** A launch read failed and is being retried (still not ready, nothing written). */
  storageError: boolean;
  state: ProgressState;
  recordAct: (act: LoopAct) => void;
  setRhythmTarget: (target: number) => void;
  pauseUntil: (until: DateKey) => void;
  resume: () => void;
  /** Backup import: replace the whole progress state. */
  replaceProgress: (state: ProgressState) => Promise<void>;
}

export interface ProgressValue {
  readonly ready: boolean;
  /** A launch read failed and is being retried (still not ready, nothing written). */
  readonly storageError: boolean;
  readonly state: ProgressState;
  /** Chip label, weekly rhythm, pause and today's acts; stars from useArc().totalStars. */
  readonly summary: ProgressSummary;
  recordAct(act: LoopAct): void;
  setRhythmTarget(target: number): void;
  pauseUntil(until: DateKey): void;
  resume(): void;
}

const Ctx = createContext<RitualStore | null>(null);

export function RitualProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const ref = useRef<ProgressState>(state);
  const queue = useMemo(createStoreQueue, []);

  const update = useCallback(
    (fn: (s: ProgressState) => ProgressState) => {
      const next = fn(ref.current);
      if (next === ref.current) return;
      ref.current = next;
      setState(next);
      queue.enqueue({ head: [STORAGE_KEYS.progress, next] });
    },
    [queue]
  );

  useEffect(() => {
    const job = loadUntilRead(
      async () => {
        const raw = await readKey(STORAGE_KEYS.progress);
        if (raw) return { loaded: parseProgress(parseJson(raw)), migrated: false };
        const loaded = progressFromRitualV1(parseJson(await readKey(V1_KEYS.ritual)));
        return { loaded, migrated: loaded.nightsShownUp > 0 };
      },
      {
        onLoaded: ({ loaded, migrated }) => {
          if (migrated) queue.enqueue({ head: [STORAGE_KEYS.progress, loaded] });
          // RootNavigator renders no screen before every store is ready, so nothing was recorded yet.
          ref.current = loaded;
          setState(loaded);
          setStorageError(false);
          setReady(true);
        },
        onFailure: () => setStorageError(true),
      }
    );
    return () => job.cancel();
  }, [queue]);

  const store = useMemo<RitualStore>(
    () => ({
      ready,
      storageError,
      state,
      recordAct: (act) => update((s) => recordActFn(s, act, now())),
      setRhythmTarget: (target) => update((s) => setRhythmTargetFn(s, target)),
      pauseUntil: (until) => update((s) => pauseUntilFn(s, until, now())),
      resume: () => update(resumeProgress),
      replaceProgress: async (next) => {
        update(() => parseProgress(next));
        await queue.flush();
      },
    }),
    [ready, storageError, state, update, queue]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

function useStore(): RitualStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProgress must be used inside RitualProvider");
  return v;
}

/** Internal: ArcProvider records 'chapter-heard' and 'proof' itself; backup import replaces state. */
export function useRitualStore(): RitualStore {
  return useStore();
}

export function useProgress(): ProgressValue {
  const s = useStore();
  const stars = useContext(ArcCtx)?.totalStars ?? 0;
  // Recomputed when the state, the stars or the local day change.
  const dayKey = localDateKey(now());
  const summary = useMemo(() => summarize(s.state, stars, now()), [s.state, stars, dayKey]);
  return useMemo(
    () => ({ ready: s.ready, storageError: s.storageError, state: s.state, summary, recordAct: s.recordAct, setRhythmTarget: s.setRhythmTarget, pauseUntil: s.pauseUntil, resume: s.resume }),
    [s, summary]
  );
}
