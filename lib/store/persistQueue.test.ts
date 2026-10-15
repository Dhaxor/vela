import { describe, expect, test } from "bun:test";
import { createPersistQueue, type PersistStorage } from "./persistQueue";

/** In-memory storage that records every call, optionally failing the first n writes. */
function fakeStorage(failFirst = 0) {
  const data = new Map<string, string>();
  const log: string[] = [];
  let failures = failFirst;
  const maybeFail = () => {
    if (failures > 0) {
      failures -= 1;
      throw new Error("disk full");
    }
  };
  const storage: PersistStorage = {
    multiSet: async (entries) => {
      maybeFail();
      for (const [k, v] of entries) {
        data.set(k, v);
        log.push(`set ${k}`);
      }
    },
    setItem: async (k, v) => {
      maybeFail();
      data.set(k, v);
      log.push(`head ${k}`);
    },
    multiRemove: async (keys) => {
      for (const k of keys) {
        data.delete(k);
        log.push(`rm ${k}`);
      }
    },
  };
  return { storage, data, log };
}

describe("persist queue", () => {
  test("items are written before the head (I15), and values are serialized at run time", async () => {
    const { storage, data, log } = fakeStorage();
    const q = createPersistQueue({ storage });
    const chapter = { text: "v1" };
    q.enqueue({ items: [["ch.1", chapter]], head: ["index", { chapters: ["ch.1"] }] });
    chapter.text = "v2"; // mutated before the run: the run serializes what is current
    await q.flush();
    expect(log).toEqual(["set ch.1", "head index"]);
    expect(JSON.parse(data.get("ch.1")!)).toEqual({ text: "v2" });
    expect(q.size).toBe(0);
  });

  test("coalesces: many index writes become one, the newest wins", async () => {
    const { storage, data, log } = fakeStorage();
    const q = createPersistQueue({ storage });
    for (let i = 0; i < 20; i += 1) q.enqueue({ head: ["index", { v: i }] });
    await q.flush();
    expect(log.filter((l) => l === "head index")).toHaveLength(1);
    expect(JSON.parse(data.get("index")!)).toEqual({ v: 19 });
  });

  test("writes are serialized: a write enqueued mid-flight runs after, never interleaved", async () => {
    const { storage, data, log } = fakeStorage();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: PersistStorage = { ...storage, setItem: async (k, v) => { await gate; await storage.setItem(k, v); } };
    const q = createPersistQueue({ storage: slow });
    q.enqueue({ head: ["index", { v: 1 }] });
    await Promise.resolve();
    await Promise.resolve();
    q.enqueue({ items: [["ch.2", "two"]], head: ["index", { v: 2 }] });
    release();
    await q.flush();
    expect(log).toEqual(["head index", "set ch.2", "head index"]);
    expect(JSON.parse(data.get("index")!)).toEqual({ v: 2 });
  });

  test("a failed write is retried; the index is never written ahead of its chapters", async () => {
    const { storage, data, log } = fakeStorage(1);
    const q = createPersistQueue({ storage, backoffMs: 1 });
    q.enqueue({ items: [["ch.1", "one"]], head: ["index", ["ch.1"]] });
    await q.flush();
    expect(log).toEqual(["set ch.1", "head index"]);
    expect(data.has("index")).toBe(true);
  });

  test("after retries give up, the writes wait for the next run instead of being lost", async () => {
    const errors: unknown[] = [];
    const { storage, data } = fakeStorage(3);
    const q = createPersistQueue({ storage, retries: 2, backoffMs: 1, onError: (e) => errors.push(e) });
    q.enqueue({ items: [["ch.1", "one"]], head: ["index", ["ch.1"]] });
    await q.flush();
    expect(errors).toHaveLength(1);
    expect(data.size).toBe(0);
    q.enqueue({ head: ["other", 1] });
    await q.flush();
    expect([...data.keys()].sort()).toEqual(["ch.1", "index", "other"]);
  });

  test("removals run last and cancel an earlier pending write of the same key", async () => {
    const { storage, data, log } = fakeStorage();
    const q = createPersistQueue({ storage });
    q.enqueue({ items: [["orphan", 1]] });
    q.enqueue({ head: ["index", {}], remove: ["orphan"] });
    await q.flush();
    expect(log).toEqual(["head index", "rm orphan"]);
    expect(data.has("orphan")).toBe(false);
  });

  test("the run waits for the scheduler (ceremonies) before serializing anything", async () => {
    const { storage, log } = fakeStorage();
    let run: (() => void) | null = null;
    const q = createPersistQueue({ storage, schedule: (fn) => (run = fn) });
    q.enqueue({ head: ["index", 1] });
    await Promise.resolve();
    expect(log).toEqual([]);
    expect(q.size).toBe(1);
    run!();
    await q.flush();
    expect(log).toEqual(["head index"]);
  });
});
