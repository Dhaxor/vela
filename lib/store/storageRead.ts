// LAUNCH-TIME READS. A storage read that FAILS is not a read that found
// nothing. AsyncStorage on iOS can reject a read ('Failed to read storage
// file', an encoding error, data protection while the device is locked). If
// that counted as 'absent', a store would migrate its v1 key again (or start
// empty) and write the result over the user's real 1.1 data, and the arc's
// next launch would garbage-collect every chapter key the stale index does not
// list. So:
//
// - readWithRetry retries a read a few times, then throws StorageReadError.
// - loadUntilRead runs a store's whole launch load until it succeeds. Between
//   attempts the store stays NOT ready (the root keeps the splash up and no
//   screen can act), writes nothing, and reports the outage through
//   onFailure, so the UI can say that Vela couldn't open the data. A
//   transient failure heals on its own a moment later.
//
// Pure (timers are injectable), so the policy is tested, not only commented.

/** Storage answered with an error, not with 'nothing stored'. Never migrate or write over it. */
export class StorageReadError extends Error {
  /** The error storage answered with. */
  readonly reason: unknown;
  constructor(reason: unknown, message = "storage could not be read") {
    super(message);
    this.name = "StorageReadError";
    this.reason = reason;
  }
}

export function isStorageReadError(e: unknown): e is StorageReadError {
  return e instanceof StorageReadError || (typeof e === "object" && e !== null && (e as { name?: unknown }).name === "StorageReadError");
}

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const realTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

const sleep = (ms: number, timers: Timers) => new Promise<void>((r) => void timers.setTimeout(r, ms));

/** Quick in-place retries of one read (60 ms, 180 ms), then StorageReadError. */
export async function readWithRetry<T>(read: () => Promise<T>, opts: { attempts?: number; backoffMs?: number; timers?: Timers } = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const backoff = opts.backoffMs ?? 60;
  const timers = opts.timers ?? realTimers;
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await read();
    } catch (e) {
      last = e;
      if (i < attempts - 1) await sleep(backoff * 3 ** i, timers);
    }
  }
  throw new StorageReadError(last);
}

/** Delay before launch-load attempt `attempt + 1` (attempt 0 just failed): 250 ms doubling, capped at 10 s. */
export function retryDelayMs(attempt: number): number {
  const n = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  return Math.min(250 * 2 ** n, 10_000);
}

export interface LoadHandlers<T> {
  /** The load succeeded. Called once, never after cancel(). */
  onLoaded(value: T): void;
  /** One attempt failed (storage error or anything the load threw). Nothing may be written. */
  onFailure?(error: unknown, attempt: number): void;
}

/**
 * Run `load` until it resolves, retrying with retryDelayMs. Any throw counts as
 * a failed read: a store never falls back to 'absent' or 'empty' because a
 * read went wrong. Returns cancel() for the provider's effect cleanup.
 */
export function loadUntilRead<T>(load: () => Promise<T>, handlers: LoadHandlers<T>, timers: Timers = realTimers): { cancel(): void } {
  let cancelled = false;
  let timer: unknown = null;
  const attempt = (n: number) => {
    timer = null;
    void (async () => {
      let value: T;
      try {
        value = await load();
      } catch (e) {
        if (cancelled) return;
        handlers.onFailure?.(e, n);
        timer = timers.setTimeout(() => attempt(n + 1), retryDelayMs(n));
        return;
      }
      if (!cancelled) handlers.onLoaded(value);
    })();
  };
  attempt(0);
  return {
    cancel() {
      cancelled = true;
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
    },
  };
}
