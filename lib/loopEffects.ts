// The ONE home for loop side effects (docs/CONTRACTS.md §11).
//
// OWNER: A6. Mounted exactly once by A1 inside RootNavigator (below every
// provider, after all stores are ready). Screens never schedule notifications
// or touch the asks session themselves.
//
// What the real hook does (A6):
// - Builds a NotificationSnapshot from useUser() (ProfileV2), useArc()
//   (weaving dreams, loopState, latest chapter, open bridge, latest proof,
//   seasonProgress) and useProgress() (pausedUntil, nightsShownUp, days).
// - Calls lib/notifications rebuild(snapshot), debounced by
//   NOTIFICATION_LIMITS.rebuildDebounceMs, whenever the snapshot changes and
//   whenever AppState becomes 'active'. Never overlaps two rebuilds.
// - Forwards every AppState change to lib/asks onAppStateChange, which starts
//   a new asks session after ≥ ASK_RULES.sessionGapMs in the background.
// - No widget writes in 1.1 (widgets are deferred to 1.1.1).
//
// STUB: does nothing. The signature is frozen.

export function useLoopEffects(): void {
  // STUB (A6)
}
