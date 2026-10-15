// SERIALIZED PERSIST QUEUE. Every write to storage goes through one queue
// per store, so writes never interleave and a slow write can never land after
// a newer one. Transactions are coalesced: item keys keep their newest value,
// and the head key (the arc index) is written once per run, LAST, after every
// item it may reference (I15: chapter keys first, index last).
//
// Values are serialized when the run starts, not when enqueued: the run is
// scheduled with InteractionManager.runAfterInteractions in the app, so a
// 3 KB chapter is never stringified while Star Birth animates. A failed run is
// retried with backoff and its writes are kept for the next run, so the index
// can never be written ahead of a chapter it points at.

export interface PersistStorage {
  multiSet(entries: [string, string][]): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export interface PersistTx {
  /** Written first (e.g. chapter texts). */
  readonly items?: readonly (readonly [string, unknown])[];
  /** Written last; coalesced to the newest value per key (e.g. the arc index). */
  readonly head?: readonly [string, unknown];
  /** Removed after the head (e.g. orphaned chapter keys). */
  readonly remove?: readonly string[];
}

export interface PersistQueue {
  enqueue(tx: PersistTx): void;
  /** Resolves when everything enqueued so far has been written (or has failed for good). */
  flush(): Promise<void>;
  /** Writes waiting or in flight. */
  readonly size: number;
}

export interface PersistQueueOptions {
  readonly storage: PersistStorage;
  /** When to start a run. App: InteractionManager.runAfterInteractions. Default: next microtask. */
  readonly schedule?: (run: () => void) => void;
  readonly retries?: number;
  readonly backoffMs?: number;
  readonly serialize?: (value: unknown) => string;
  readonly onError?: (error: unknown) => void;
}

interface Batch {
  items: Map<string, unknown>;
  heads: Map<string, unknown>;
  removes: Set<string>;
}

const emptyBatch = (): Batch => ({ items: new Map(), heads: new Map(), removes: new Set() });
const batchSize = (b: Batch) => b.items.size + b.heads.size + b.removes.size;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createPersistQueue(opts: PersistQueueOptions): PersistQueue {
  const schedule = opts.schedule ?? ((run: () => void) => void Promise.resolve().then(run));
  const retries = opts.retries ?? 3;
  const backoff = opts.backoffMs ?? 80;
  const serialize = opts.serialize ?? ((v: unknown) => JSON.stringify(v));
  let pending = emptyBatch();
  let inFlight: Batch | null = null;
  let scheduled = false;
  let idle: Promise<void> = Promise.resolve();
  let resolveIdle: (() => void) | null = null;

  const merge = (into: Batch, from: Batch, fromIsNewer: boolean) => {
    for (const [k, v] of from.items) if (fromIsNewer || !into.items.has(k)) into.items.set(k, v);
    for (const [k, v] of from.heads) if (fromIsNewer || !into.heads.has(k)) into.heads.set(k, v);
    for (const k of from.removes) if (!into.items.has(k)) into.removes.add(k);
  };

  const write = async (b: Batch) => {
    if (b.items.size > 0) await opts.storage.multiSet([...b.items].map(([k, v]) => [k, serialize(v)]));
    for (const [k, v] of b.heads) await opts.storage.setItem(k, serialize(v));
    if (b.removes.size > 0) await opts.storage.multiRemove([...b.removes]);
  };

  const run = async () => {
    scheduled = false;
    while (batchSize(pending) > 0) {
      inFlight = pending;
      pending = emptyBatch();
      let ok = false;
      for (let attempt = 0; attempt <= retries && !ok; attempt += 1) {
        try {
          await write(inFlight);
          ok = true;
        } catch (e) {
          if (attempt === retries) opts.onError?.(e);
          else await sleep(backoff * 2 ** attempt);
        }
      }
      if (!ok) {
        // Keep the failed writes (older than anything enqueued since) for the next run.
        const keep = inFlight;
        inFlight = null;
        merge(pending, keep, false);
        break;
      }
      inFlight = null;
    }
    // Drained (or failed for good: the next enqueue retries). Nothing can be scheduled here:
    // kick() never schedules while a run is in flight.
    const done = resolveIdle;
    resolveIdle = null;
    done?.();
  };

  const kick = () => {
    if (scheduled || inFlight) return;
    scheduled = true;
    if (!resolveIdle) idle = new Promise<void>((r) => (resolveIdle = r));
    schedule(() => void run());
  };

  return {
    enqueue(tx) {
      const b = emptyBatch();
      for (const [k, v] of tx.items ?? []) b.items.set(k, v);
      if (tx.head) b.heads.set(tx.head[0], tx.head[1]);
      for (const k of tx.remove ?? []) {
        b.removes.add(k);
        pending.items.delete(k);
      }
      for (const k of b.items.keys()) pending.removes.delete(k);
      merge(pending, b, true);
      kick();
    },
    flush() {
      return batchSize(pending) === 0 && !inFlight && !scheduled ? Promise.resolve() : idle;
    },
    get size() {
      return batchSize(pending) + (inFlight ? batchSize(inFlight) : 0);
    },
  };
}
