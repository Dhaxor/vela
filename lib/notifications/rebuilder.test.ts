import { describe, expect, test } from "bun:test";
import { createRebuilder } from "./rebuilder";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > end) throw new Error("condition never became true");
    await sleep(2);
  }
}

describe("createRebuilder", () => {
  test("a burst of requests is one rebuild, on the latest state", async () => {
    let state = 0;
    const runs: number[] = [];
    const r = createRebuilder(() => state, async (s) => runs.push(s), 10);
    for (let i = 1; i <= 5; i += 1) {
      state = i;
      r.request();
    }
    await waitUntil(() => runs.length > 0);
    await sleep(30);
    expect(runs).toEqual([5]);
    r.dispose();
  });

  test("never two at once: requests during a run cause exactly one more run, on fresh state", async () => {
    let state = 0;
    let active = 0;
    let maxActive = 0;
    const runs: number[] = [];
    let release: () => void = () => {};
    const r = createRebuilder(
      () => state,
      async (s) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        runs.push(s);
        await new Promise<void>((done) => {
          release = done;
        });
        active -= 1;
      },
      1
    );
    r.request();
    await waitUntil(() => runs.length === 1);
    state = 1;
    r.request();
    await sleep(15);
    state = 2;
    r.request();
    await sleep(15);
    expect(runs).toEqual([0]); // the first run is still in flight

    release();
    await waitUntil(() => runs.length === 2);
    release();
    await sleep(15);
    expect(runs).toEqual([0, 2]);
    expect(maxActive).toBe(1);
    r.dispose();
  });

  test("no snapshot (stores not ready) → nothing runs; dispose cancels a pending rebuild", async () => {
    const runs: number[] = [];
    const idle = createRebuilder<number>(() => null, async (s) => runs.push(s), 1);
    idle.request();
    const disposed = createRebuilder(() => 1, async (s) => runs.push(s), 1);
    disposed.request();
    disposed.dispose();
    disposed.request();
    await sleep(20);
    expect(runs).toEqual([]);
  });

  test("a failing read never escapes", async () => {
    let reads = 0;
    const r = createRebuilder(
      () => {
        reads += 1;
        throw new Error("boom");
      },
      async () => undefined,
      1
    );
    r.request();
    await waitUntil(() => reads === 1);
    r.dispose();
  });
});
