// Rebuild requests that are not state changes: an OS permission answer, or a
// legacy 1.0 Settings call that wiped every scheduled notification. The one
// listener is useLoopEffects, which runs its debounced rebuild (N2: screens
// never schedule; they may only ask for the queue to be rebuilt).

type Listener = () => void;

const listeners = new Set<Listener>();

export function requestRebuild(): void {
  for (const listener of [...listeners]) listener();
}

/** Returns the unsubscribe function. */
export function onRebuildRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
