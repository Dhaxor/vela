// Launch reads: a storage error is retried and reported, never read as 'absent'.
import { describe, expect, test } from "bun:test";
import { isStorageReadError, loadUntilRead, readWithRetry, retryDelayMs, StorageReadError, type Timers } from "./storageRead";

const instant: Timers = { setTimeout: (fn) => (fn(), 0), clearTimeout: () => {} };
const settle = () => new Promise((r) => setTimeout(r, 0));

function manual() {
  const queue: { fn: () => void; ms: number }[] = [];
  const timers: Timers = {
    setTimeout: (fn, ms) => (queue.push({ fn, ms }), queue.length),
    clearTimeout: () => void queue.splice(0, queue.length),
  };
  return { timers, queue, tick: () => queue.shift()?.fn() };
}

describe("readWithRetry", () => {
  test("a read that fails twice then answers is a success", async () => {
    let calls = 0;
    const v = await readWithRetry(async () => {
      calls += 1;
      if (calls < 3) throw new Error("Failed to read storage file.");
      return null;
    }, { timers: instant });
    expect(v).toBeNull(); // null here is a real 'nothing stored'
    expect(calls).toBe(3);
  });

  test("a read that keeps failing throws StorageReadError (never null)", async () => {
    let error: unknown = null;
    await readWithRetry(async () => {
      throw new Error("Incorrect encoding of storage file");
    }, { timers: instant }).catch((e) => (error = e));
    expect(isStorageReadError(error)).toBe(true);
    expect((error as StorageReadError).reason).toBeInstanceOf(Error);
  });
});

describe("loadUntilRead", () => {
  test("retries with growing delays, reports each failure, loads once", async () => {
    const { timers, queue, tick } = manual();
    let attempts = 0;
    const failures: number[] = [];
    const loaded: string[] = [];
    loadUntilRead(
      async () => {
        attempts += 1;
        if (attempts <= 3) throw new StorageReadError(null);
        return "data";
      },
      { onLoaded: (v) => loaded.push(v), onFailure: (_e, n) => failures.push(n) },
      timers
    );
    for (let i = 0; i < 3; i++) {
      await settle();
      expect(loaded).toEqual([]);
      expect(queue.map((q) => q.ms)).toEqual([retryDelayMs(i)]);
      tick();
    }
    await settle();
    expect(failures).toEqual([0, 1, 2]);
    expect(loaded).toEqual(["data"]);
    expect(queue).toEqual([]);
  });

  test("a load that throws anything (a bug, not storage) is retried too, never treated as empty", async () => {
    const { timers, tick } = manual();
    let n = 0;
    let value: number[] | null = null;
    loadUntilRead(async () => {
      n += 1;
      if (n === 1) throw new TypeError("x is not a function");
      return [1];
    }, { onLoaded: (v) => (value = v) }, timers);
    await settle();
    expect(value).toBeNull();
    tick();
    await settle();
    expect(value!).toEqual([1]);
  });

  test("cancel stops the retries and drops a late result", async () => {
    const { timers, queue } = manual();
    let loaded = false;
    const job = loadUntilRead(async () => {
      throw new Error("nope");
    }, { onLoaded: () => (loaded = true) }, timers);
    await settle();
    expect(queue.length).toBe(1);
    job.cancel();
    expect(queue.length).toBe(0);

    let resolve: (v: string) => void = () => {};
    const late = loadUntilRead(() => new Promise<string>((r) => (resolve = r)), { onLoaded: () => (loaded = true) }, timers);
    late.cancel();
    resolve("x");
    await settle();
    expect(loaded).toBe(false);
  });

  test("retry delays double from 250 ms and cap at 10 s", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(retryDelayMs)).toEqual([250, 500, 1000, 2000, 4000, 8000, 10000, 10000]);
  });
});
