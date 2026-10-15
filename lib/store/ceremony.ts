// CEREMONY GATE. Persistence waits while a ceremony (Star Birth, Named Sky,
// the Weave) is animating, so a chapter is never serialized mid-animation.
// React Native 0.86 turned InteractionManager into a stub (its handles do
// nothing and runAfterInteractions is setImmediate), so the app keeps its own
// gate. A forgotten release can never block storage for long: every hold
// expires on its own after `maxMs`.

type Run = () => void;

let holds = 0;
let waiting: Run[] = [];

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
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(timer);
    holds -= 1;
    // Let the last frame of the ceremony paint before writing.
    setTimeout(drain, 0);
  };
  const timer = setTimeout(release, maxMs);
  return release;
}

/** Run `fn` once no ceremony is in progress (on a later tick, never synchronously). */
export function whenNoCeremony(fn: Run): void {
  waiting.push(fn);
  setTimeout(drain, 0);
}

export function ceremonyInProgress(): boolean {
  return holds > 0;
}
