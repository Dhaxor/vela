// The ONE home for loop side effects (docs/CONTRACTS.md §11).
//
// OWNER: A6. Mounted exactly once by A1 inside RootNavigator (below every
// provider, after all stores are ready). Screens never schedule notifications
// or touch the asks session themselves.
//
// - Builds a NotificationSnapshot from useUser() (ProfileV2), useArc()
//   (weaving dreams, loopState, latest chapter, open bridge, latest proof,
//   seasonProgress) and useProgress() (pausedUntil, nightsShownUp, days).
// - Calls lib/notifications rebuild(snapshot), debounced by
//   NOTIFICATION_LIMITS.rebuildDebounceMs, whenever the snapshot's signature
//   changes, whenever AppState becomes 'active', and on requestRebuild() (an
//   OS permission answer, a legacy Settings call). Never overlaps two
//   rebuilds (lib/notifications/rebuilder.ts).
// - Forwards every AppState change to lib/asks onAppStateChange, which starts
//   a new asks session after ≥ ASK_RULES.sessionGapMs in the background.
// - No widget writes in 1.1 (widgets are deferred to 1.1.1).

import { useEffect, useRef } from "react";
import type { Dream } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { useProgress } from "@/contexts/RitualContext";
import { useUser } from "@/contexts/UserContext";
import { onAppStateChange } from "@/lib/asks";
import { now } from "@/lib/clock";
import {
  buildNotificationSnapshot,
  NOTIFICATION_LIMITS,
  onRebuildRequest,
  rebuild,
  snapshotKey,
  type NotificationSnapshot,
  type SnapshotProfile,
} from "@/lib/notifications";
import { createRebuilder, type Rebuilder } from "@/lib/notifications/rebuilder";
import { shapeDesire } from "@/lib/story/shaper";

/** {desire.np} from the shaper; templates that need it are skipped when it can only fall back. */
function desireNp(dream: Dream): string | null {
  const shaped = shapeDesire(dream.desire);
  return shaped.fallback ? null : shaped.np;
}

export function useLoopEffects(): void {
  const user = useUser();
  const arc = useArc();
  const progress = useProgress();
  const profile: SnapshotProfile | null = user.profile;
  const ready = user.ready && arc.ready && progress.ready;

  // A side effect must never take the app down: a snapshot that cannot be built is skipped.
  const build = (): NotificationSnapshot | null => {
    if (!ready || !profile) return null;
    try {
      return buildNotificationSnapshot({ profile, arc, progress: progress.state, now: now(), desireNp });
    } catch {
      return null;
    }
  };
  // Rebuilds read the latest state when they run, not when they were requested.
  const read = useRef(build);
  read.current = build;
  const current = build();
  const key = current ? snapshotKey(current) : null;

  // Created lazily inside effects and disposed on unmount (StrictMode-safe).
  const rebuilder = useRef<Rebuilder | null>(null);
  const requestRebuild = () => {
    rebuilder.current ??= createRebuilder(() => read.current(), rebuild, NOTIFICATION_LIMITS.rebuildDebounceMs);
    rebuilder.current.request();
  };

  // State changes, by signature: re-renders without a change cost nothing.
  useEffect(() => {
    if (key !== null) requestRebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Foreground, explicit requests, and the asks session clock.
  useEffect(() => {
    const unsubscribe = onRebuildRequest(requestRebuild);
    let removeAppState: (() => void) | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppState } = require("react-native") as typeof import("react-native");
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active" || state === "background" || state === "inactive") onAppStateChange(state, now());
        if (state === "active") requestRebuild();
      });
      removeAppState = () => subscription.remove();
    } catch {
      // no AppState here: state changes still rebuild
    }
    return () => {
      unsubscribe();
      removeAppState?.();
      rebuilder.current?.dispose();
      rebuilder.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
