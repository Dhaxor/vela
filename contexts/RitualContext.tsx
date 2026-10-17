// Forgiving progress (lib/progress, CONTRACTS §10): nights shown up that never
// reset, the weekly rhythm with rest nights, and 'Pause my sky'. Persisted
// under 'vela.progress.v2'; the 1.0 ritual days migrate once from
// 'vela.ritual.v1' (read-only) into lifetime counters.
//
// useProgress() is the API screens use.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArcCtx } from "./arcCtx";
import { createStoreQueue, parseJson, readRaw } from "./persist";
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
    let stale = false;
    void (async () => {
      const raw = await readRaw(STORAGE_KEYS.progress);
      let loaded: ProgressState;
      if (raw) loaded = parseProgress(parseJson(raw));
      else {
        loaded = progressFromRitualV1(parseJson(await readRaw(V1_KEYS.ritual)));
        if (loaded.nightsShownUp > 0) queue.enqueue({ head: [STORAGE_KEYS.progress, loaded] });
      }
      if (stale) return;
      // RootNavigator renders no screen before every store is ready, so nothing was recorded yet.
      ref.current = loaded;
      setState(loaded);
      setReady(true);
    })();
    return () => {
      stale = true;
    };
  }, [queue]);

  const store = useMemo<RitualStore>(
    () => ({
      ready,
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
    [ready, state, update, queue]
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
    () => ({ ready: s.ready, state: s.state, summary, recordAct: s.recordAct, setRhythmTarget: s.setRhythmTarget, pauseUntil: s.pauseUntil, resume: s.resume }),
    [s, summary]
  );
}
