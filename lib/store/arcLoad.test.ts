// The arc's launch load against storage that can FAIL. Release-blocking: a
// 1.0.1 upgrader keeps their v1 keys for the life of 1.1, so if one failed read
// of 'vela.arcs.v2' counted as 'absent', the 1.0 data would be migrated again
// and written over every 1.1 proof, and the next launch would delete the 1.1
// chapter keys the stale index does not list (review: data-safety-read-error).
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { ArcSnapshot, V1RawStorage } from "@/contexts/arc.types";
import { keepPhotoUri, rebasePhotoUri } from "@/lib/photos";
import { STORAGE_KEYS, V1_KEYS, chapterStorageKey } from "@/lib/storageKeys";
import { applyArcAction, type ArcEnv, type ArcState } from "./arc";
import { loadArcState, type ArcLoadResult, type ArcLoadStorage } from "./arcLoad";
import { chaptersOf, latestChapterOf, offersFor, proofsOf } from "./arcSelectors";
import { checkArcInvariants } from "./invariants";
import { isStorageReadError, loadUntilRead, type Timers } from "./storageRead";

const NOW = new Date(2026, 9, 16, 21, 0);
const fixture = (name: string): V1RawStorage =>
  JSON.parse(fs.readFileSync(path.join(import.meta.dir, "..", "fixtures", "v1", `${name}.json`), "utf8")).raw;

/** AsyncStorage stand-in: a key map, a log of every write, and reads that can be made to fail. */
function device(raw: V1RawStorage) {
  const data = new Map<string, string>();
  const writes: string[] = [];
  let failReads: ((keys: readonly string[]) => boolean) | null = null;
  let failList = false;
  let failWrites = false;
  const v1: [string, string | null][] = [
    [V1_KEYS.stories, raw.stories],
    [V1_KEYS.ritual, raw.ritual],
    [V1_KEYS.profile, raw.profile],
    [V1_KEYS.journal, raw.journal],
    [V1_KEYS.board, raw.board],
  ];
  for (const [k, v] of v1) if (v !== null) data.set(k, v);
  const storage: ArcLoadStorage = {
    readKeys: async (keys) => {
      if (failReads?.(keys)) throw new Error("Failed to read storage file.");
      return keys.map((k) => data.get(k) ?? null);
    },
    listKeys: async () => (failList ? null : [...data.keys()]),
    writeRaw: async (k, v) => {
      if (failWrites) return false;
      writes.push(`raw ${k}`);
      data.set(k, v);
      return true;
    },
  };
  /** What ArcProvider's onLoaded enqueues (chapter keys, then the index, then removals). */
  const persist = (r: ArcLoadResult) => {
    if (!r.indexChanged) return;
    for (const id of r.toWrite) {
      writes.push(`set ${chapterStorageKey(id)}`);
      data.set(chapterStorageKey(id), JSON.stringify(r.texts[id]));
    }
    writes.push(`set ${STORAGE_KEYS.arcs}`);
    data.set(STORAGE_KEYS.arcs, JSON.stringify(r.index));
    for (const k of r.orphans) {
      writes.push(`rm ${k}`);
      data.delete(k);
    }
  };
  /** A committed 1.1 state, written the way the persist queue does. */
  const commit = (state: ArcState) => {
    for (const [id, text] of Object.entries(state.texts)) data.set(chapterStorageKey(id), JSON.stringify(text));
    data.set(STORAGE_KEYS.arcs, JSON.stringify(state.index));
  };
  return {
    data,
    writes,
    storage,
    persist,
    commit,
    failReadsWhen: (f: ((keys: readonly string[]) => boolean) | null) => (failReads = f),
    failListing: (v: boolean) => (failList = v),
    failWrites: (v: boolean) => (failWrites = v),
    chapterKeys: () => [...data.keys()].filter((k) => k.startsWith(STORAGE_KEYS.chapterPrefix)).sort(),
  };
}

const ctx = { now: NOW, name: "Maya", resolvePhoto: keepPhotoUri };

const env = (t: Date, n: { i: number }): ArcEnv => ({ now: t, isPlus: false, name: "Maya", newId: () => `v11-${++n.i}`, seed: 4242 + n.i });

/** The 1.0.1 upgrader: migrate on first launch, then chart a 1.1 proof that weaves a new chapter. */
async function upgradedWithA11Proof() {
  const d = device(fixture("reroll-heavy"));
  const first = await loadArcState(d.storage, ctx);
  expect(first.read).toBe("absent");
  d.persist(first);
  const dreamId = first.index.activeDreamId!;
  let state: ArcState = { index: first.index, texts: first.texts };
  const ids = { i: 0 };
  const latest = latestChapterOf(state.index, dreamId)!;
  if (!state.index.bridges.some((b) => b.dreamId === dreamId && b.status === "open")) {
    const offer = offersFor(state.index, latest.id, false)[0];
    state = applyArcAction(state, { type: "CHOOSE_BRIDGE", input: { chapterId: latest.id, choice: { tier: offer.tier, libraryId: offer.libraryId } } }, env(new Date(2026, 9, 17, 20), ids)).state;
  }
  state = applyArcAction(state, { type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind: "did", text: "Called the landlord about the studio space." } }, env(new Date(2026, 9, 17, 21), ids)).state;
  expect(checkArcInvariants({ index: state.index, chapters: state.texts })).toEqual([]);
  d.commit(state);
  return { d, dreamId, state };
}

const manualTimers = () => {
  const queue: (() => void)[] = [];
  const timers: Timers = { setTimeout: (fn) => (queue.push(fn), queue.length), clearTimeout: () => {} };
  return { timers, tick: () => queue.shift()?.() };
};
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("a failed read is never 'absent'", () => {
  test("a failing index read throws and writes nothing: no migration, no index, no chapter key removed", async () => {
    const { d, dreamId } = await upgradedWithA11Proof();
    const keysBefore = d.chapterKeys();
    const dataBefore = new Map(d.data);
    d.writes.length = 0;
    d.failReadsWhen((keys) => keys.includes(STORAGE_KEYS.arcs));

    let error: unknown = null;
    await loadArcState(d.storage, ctx).catch((e) => (error = e));
    expect(isStorageReadError(error) || (error as Error)?.message === "Failed to read storage file.").toBe(true);
    expect(d.writes).toEqual([]);
    expect(new Map(d.data)).toEqual(dataBefore);

    // Storage answers again on the retry: the 1.1 proof and its chapter are all there, nothing collected.
    d.failReadsWhen(null);
    const again = await loadArcState(d.storage, ctx);
    expect(again.read).toBe("readable");
    expect(again.orphans).toEqual([]);
    expect(proofsOf(again.index, dreamId).map((p) => p.text)).toContain("Called the landlord about the studio space.");
    d.persist(again);
    expect(d.chapterKeys()).toEqual(keysBefore);
  });

  test("the provider's retry loop: not ready (and no write) until a read succeeds", async () => {
    const { d, dreamId } = await upgradedWithA11Proof();
    d.writes.length = 0;
    let fails = 2;
    d.failReadsWhen(() => fails-- > 0);
    const { timers, tick } = manualTimers();
    const failures: number[] = [];
    let loaded: ArcLoadResult | null = null;
    loadUntilRead(() => loadArcState(d.storage, ctx), { onLoaded: (r) => (loaded = r), onFailure: (_e, n) => failures.push(n) }, timers);
    await settle();
    expect(loaded).toBeNull();
    tick();
    await settle();
    expect(loaded).toBeNull();
    tick();
    await settle();
    expect(failures).toEqual([0, 1]);
    expect(loaded!.read).toBe("readable");
    expect(chaptersOf(loaded!.index, dreamId).length).toBeGreaterThan(1);
    expect(d.writes).toEqual([]);
  });

  test("the v1 keys failing on a first launch never start an empty arc", async () => {
    const d = device(fixture("nine-proofs"));
    d.failReadsWhen((keys) => keys.includes(V1_KEYS.stories));
    let threw = false;
    await loadArcState(d.storage, ctx).catch(() => (threw = true));
    expect(threw).toBe(true);
    expect(d.writes).toEqual([]);
    expect(d.data.has(STORAGE_KEYS.arcs)).toBe(false);
  });

  test("a failing chapter-text read never rewrites the real chapter from its meta", async () => {
    const { d, state, dreamId } = await upgradedWithA11Proof();
    const latest = latestChapterOf(state.index, dreamId)!;
    const before = d.data.get(chapterStorageKey(latest.id));
    d.writes.length = 0;
    d.failReadsWhen((keys) => keys.includes(chapterStorageKey(latest.id)));
    let threw = false;
    await loadArcState(d.storage, ctx).catch(() => (threw = true));
    expect(threw).toBe(true);
    expect(d.writes).toEqual([]);
    expect(d.data.get(chapterStorageKey(latest.id))).toBe(before);
  });

  test("a failing key listing collects nothing", async () => {
    const { d } = await upgradedWithA11Proof();
    d.data.set(chapterStorageKey("orphan-from-a-crash"), "{}");
    d.failListing(true);
    expect((await loadArcState(d.storage, ctx)).orphans).toEqual([]);
    d.failListing(false);
    expect((await loadArcState(d.storage, ctx)).orphans).toEqual([chapterStorageKey("orphan-from-a-crash")]);
  });
});

describe("unreadable indexes are quarantined, never overwritten", () => {
  test("a malformed row (constellations: {}) is unreadable: kept under the quarantine key, nothing collected", async () => {
    const { d, state } = await upgradedWithA11Proof();
    const bad = { ...state.index, dreams: state.index.dreams.map((x) => ({ ...x, constellations: {} })) };
    d.data.set(STORAGE_KEYS.arcs, JSON.stringify(bad));
    const r = await loadArcState(d.storage, ctx);
    expect(r.read).toBe("unreadable");
    expect(d.data.get(STORAGE_KEYS.arcsUnreadable)).toBe(JSON.stringify(bad));
    expect(r.orphans).toEqual([]);
    expect(r.index.dreams).toEqual([]);
  });

  test("no safety copy, no start", async () => {
    const d = device(fixture("profile-only"));
    d.data.set(STORAGE_KEYS.arcs, '{"schemaVersion":2,"dreams":');
    d.failWrites(true);
    let threw = false;
    await loadArcState(d.storage, ctx).catch(() => (threw = true));
    expect(threw).toBe(true);
  });
});

describe("photo URIs follow the app container", () => {
  test("a proof photo stored under the old container is rebased on load, and the index is rewritten", async () => {
    const { d, state, dreamId } = await upgradedWithA11Proof();
    const proof = proofsOf(state.index, dreamId).at(-1)!;
    const OLD = "file:///var/mobile/Containers/Data/Application/AAAA-1111/Documents/";
    const NEW = "file:///var/mobile/Containers/Data/Application/BBBB-2222/Documents/";
    const withPhoto: ArcSnapshot["index"] = {
      ...state.index,
      proofs: state.index.proofs.map((p) => (p.id === proof.id ? { ...p, photoUri: `${OLD}proof-${p.id}.jpg` } : p)),
    };
    d.data.set(STORAGE_KEYS.arcs, JSON.stringify(withPhoto));
    const onDisk = new Set([`proof-${proof.id}.jpg`]);
    const r = await loadArcState(d.storage, { ...ctx, resolvePhoto: (u) => rebasePhotoUri(u, NEW, (n) => onDisk.has(n)) });
    expect(r.indexChanged).toBe(true);
    expect(r.index.proofs.find((p) => p.id === proof.id)!.photoUri).toBe(`${NEW}proof-${proof.id}.jpg`);
    // Same install, nothing moved: nothing to write.
    d.persist(r);
    const again = await loadArcState(d.storage, { ...ctx, resolvePhoto: (u) => rebasePhotoUri(u, NEW, (n) => onDisk.has(n)) });
    expect(again.indexChanged).toBe(false);
  });
});
