// CEREMONY GATE. Persistence waits while a ceremony (Star Birth, Named Sky,
// the Weave) is animating, so a chapter is never serialized mid-animation.
// React Native 0.86 turned InteractionManager into a stub (its handles do
// nothing and runAfterInteractions is setImmediate), so the app keeps its own
// gate. A forgotten release can never block storage for long: every hold
// expires on its own after `maxMs`.
//
// That expiry is a JS timer, and iOS suspends JS timers once the app is in the
// background. A proof saved just before the user swipes home would then live
// only in memory until the app came back, and be lost if iOS killed it
// meanwhile. So leaving the foreground ends every ceremony at once:
// releaseAllCeremonies() (contexts/persist calls it on AppState 'inactive' and
// 'background') drops every hold and runs the waiting writes synchronously.

type Run = () => void;

let holds = 0;
let waiting: Run[] = [];
/** One `end` per hold still running, so releaseAllCeremonies can end them all. */
const active = new Set<() => boolean>();

function drain(): void {
  if (holds > 0) return;
  const runs = waiting;
  waiting = [];
  for (const run of runs) run();
}

/** Start a ceremony. Call the returned function when it ends (idempotent). */
export function holdForCeremony(maxMs = 8000): () => void {
  holds += 1;
  let released = false;
  const end = (): boolean => {
    if (released) return false;
    released = true;
    clearTimeout(timer);
    active.delete(end);
    holds = Math.max(0, holds - 1);
    return true;
  };
  const release = () => {
    // Let the last frame of the ceremony paint before writing.
    if (end()) setTimeout(drain, 0);
  };
  const timer = setTimeout(release, maxMs);
  active.add(end);
  return release;
}

/**
 * The app is leaving the foreground: end every ceremony now and run the writes
 * that were waiting for them, synchronously (no timer may fire before iOS
 * suspends the app). Later calls to the released holds' functions are no-ops.
 * Returns how many writes were started.
 */
export function releaseAllCeremonies(): number {
  for (const end of [...active]) end();
  active.clear();
  holds = 0;
  const started = waiting.length;
  drain();
  return started;
}

/** Run `fn` once no ceremony is in progress (on a later tick, never synchronously). */
export function whenNoCeremony(fn: Run): void {
  waiting.push(fn);
  setTimeout(drain, 0);
}

export function ceremonyInProgress(): boolean {
  return holds > 0;
}
