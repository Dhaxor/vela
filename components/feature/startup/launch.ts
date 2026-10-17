// What the root shows while the stores load (app/_layout RootNavigator).
// Pure (launch.test.ts).
//
// - 'loading': the splash stays up (a beat of night sky beats a flash of the
//   wrong route).
// - 'storage-error': a store's launch read failed and is being retried
//   (lib/store/storageRead loadUntilRead). The splash comes down and a calm
//   screen says so, instead of the splash hanging forever. Nothing has been
//   written: a store that failed to read stays not ready and writes nothing.
//   If a later retry succeeds, the phase moves on to 'ready' by itself.
// - 'ready': every store answered.

export type LaunchPhase = "loading" | "storage-error" | "ready";

/** What every launch-loaded store reports (useUser, useArc, useProgress, useJournal, useScenes). */
export interface StoreLaunchStatus {
  readonly ready: boolean;
  /** A launch read failed and is being retried. Optional: ArcValue.storageError is optional. */
  readonly storageError?: boolean;
}

export function launchPhase(stores: readonly StoreLaunchStatus[]): LaunchPhase {
  if (stores.every((s) => s.ready)) return "ready";
  if (stores.some((s) => !s.ready && s.storageError === true)) return "storage-error";
  return "loading";
}

/** The storage-error screen's words (one line to read, one thing to do). */
export const STORAGE_ERROR_COPY = {
  title: "Vela couldn't open your data just now.",
  /** The title as set: an explicit break, so no width leaves 'now.' alone on a line. */
  titleLines: "Vela couldn't open\nyour data just now.",
  body: "Nothing has been changed. Close Vela completely and open it again.",
} as const;
