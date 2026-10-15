// The debounce-and-coalesce loop behind useLoopEffects, kept free of React so
// it is tested directly. Requests within `debounceMs` collapse into one
// rebuild; a request while a rebuild runs triggers exactly one more run
// afterwards, on whatever the state is by then (never two rebuilds at once).

export interface Rebuilder {
  request(): void;
  dispose(): void;
}

export function createRebuilder<S>(
  read: () => S | null,
  run: (snapshot: S) => Promise<unknown>,
  debounceMs: number
): Rebuilder {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let dirty = false;
  let disposed = false;

  async function flush(): Promise<void> {
    if (running) {
      dirty = true;
      return;
    }
    running = true;
    try {
      do {
        dirty = false;
        const snapshot = read();
        if (snapshot !== null && !disposed) await run(snapshot);
      } while (dirty && !disposed);
    } catch {
      // rebuild never throws; a reader failure just skips this round
    } finally {
      running = false;
    }
  }

  return {
    request() {
      if (disposed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void flush();
      }, debounceMs);
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
