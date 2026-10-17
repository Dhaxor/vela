// Field-type checks for arc data crossing a trust boundary (backup files, the
// stored index at launch). They must accept everything Vela itself writes and
// refuse, without throwing, anything that would crash a screen later
// (review: data-safety-malformed-backup-crash-loop).
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { ArcSnapshot, Chapter, V1RawStorage } from "@/contexts/arc.types";
import { buildBackup, parseBackup, serializeBackup } from "@/lib/backup";
import { migrateV1 } from "@/lib/migrate";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { applyArcAction } from "./arc";
import { chaptersOf, latestChapterOf, loopStateOf, offersFor, seasonProgressOf, suggestConstellationNameOf } from "./arcSelectors";
import { chapterShapeProblems, indexShapeProblems, snapshotShapeProblems } from "./shape";
import { paragraphsForDaypart } from "@/contexts/arc.types";

const NOW = new Date(2026, 9, 16, 9);
const FIXTURES = path.join(import.meta.dir, "..", "fixtures", "v1");
const SEEDS = path.join(import.meta.dir, "..", "..", "scripts", "shots", "seeds");
const raw = (name: string): V1RawStorage => JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.json`), "utf8")).raw;

/** Every persona the screenshot seeder wrote: real reducer output, as the app persisted it. */
function personas(): [string, ArcSnapshot][] {
  return fs
    .readdirSync(SEEDS)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => {
      const seed = JSON.parse(fs.readFileSync(path.join(SEEDS, f), "utf8")) as Record<string, string>;
      const index = seed[STORAGE_KEYS.arcs] ? JSON.parse(seed[STORAGE_KEYS.arcs]) : null;
      const chapters: Record<string, Chapter> = {};
      for (const [k, v] of Object.entries(seed)) if (k.startsWith(STORAGE_KEYS.chapterPrefix)) chapters[k.slice(STORAGE_KEYS.chapterPrefix.length)] = JSON.parse(v);
      return [f, { index, chapters } as ArcSnapshot] as [string, ArcSnapshot];
    })
    .filter(([, s]) => s.index !== null);
}

describe("accepts everything Vela writes", () => {
  for (const name of fs.readdirSync(FIXTURES).map((f) => f.replace(/\.json$/u, ""))) {
    test(`v1 migration: ${name}`, () => {
      const { snapshot } = migrateV1(raw(name), { now: NOW, name: "Ana" });
      expect(snapshotShapeProblems(snapshot)).toEqual([]);
    });
  }

  test("every seeded persona (reducer output: seasons, Named Sky, Plus, if-thens, photos, rewrites)", () => {
    const all = personas();
    expect(all.length).toBeGreaterThanOrEqual(8);
    for (const [name, snapshot] of all) {
      expect({ name, problems: snapshotShapeProblems(snapshot) }).toEqual({ name, problems: [] });
    }
  });
});

describe("refuses wrong field types, and parseBackup never throws", () => {
  const good = () => {
    const { snapshot } = migrateV1(raw("open-actions-proof-unwoven"), { now: NOW, name: "Ana" });
    return JSON.parse(serializeBackup(buildBackup({ arcs: snapshot, profile: null, progress: null, journal: null, scenes: null }, NOW, "1.1.0")));
  };
  const firstText = (f: { data: { arcs: { chapters: Record<string, Record<string, unknown>> } } }) => Object.values(f.data.arcs.chapters)[0];

  const cases: Record<string, (f: any) => void> = {
    "dream.constellations = {} (seasonProgressOf threw on every launch)": (f) => (f.data.arcs.index.dreams[0].constellations = {}),
    "dream.motifIds = null": (f) => (f.data.arcs.index.dreams[0].motifIds = null),
    "dream.usedIds = 'x'": (f) => (f.data.arcs.index.dreams[0].usedIds = "x"),
    "dream.focus = 'romance'": (f) => (f.data.arcs.index.dreams[0].focus = "romance"),
    "dream.status = 'paused'": (f) => (f.data.arcs.index.dreams[0].status = "paused"),
    "dream.desire = 7": (f) => (f.data.arcs.index.dreams[0].desire = 7),
    "dream row = null": (f) => (f.data.arcs.index.dreams[0] = null),
    "proof.text = 42": (f) => (f.data.arcs.index.proofs[0].text = 42),
    "proof.kind = 'won'": (f) => (f.data.arcs.index.proofs[0].kind = "won"),
    "proof.createdAt = null": (f) => (f.data.arcs.index.proofs[0].createdAt = null),
    "bridge.ifThen = 'at 9'": (f) => (f.data.arcs.index.bridges[0].ifThen = "at 9"),
    "bridge.tier = 'huge'": (f) => (f.data.arcs.index.bridges[0].tier = "huge"),
    "chapter meta stage 9": (f) => (f.data.arcs.index.chapters[0].stage = 9),
    "chapter meta title = {}": (f) => (f.data.arcs.index.chapters[0].title = {}),
    "chapter text without opening (invariants threw on text.opening.morning)": (f) => delete firstText(f).opening,
    "chapter text body = {}": (f) => (firstText(f).body = {}),
    "paragraph spans = null": (f) => ((firstText(f).closing as any).evening.spans = null),
    "paragraph text = 3": (f) => ((firstText(f).opening as any).morning.text = 3),
    "chapter text = null": (f) => (f.data.arcs.chapters[Object.keys(f.data.arcs.chapters)[0]] = null),
    "activeDreamId = 5": (f) => (f.data.arcs.index.activeDreamId = 5),
  };

  test("the untouched file is accepted", () => {
    expect(parseBackup(JSON.stringify(good()), NOW).ok).toBe(true);
  });

  for (const [name, mutate] of Object.entries(cases)) {
    test(name, () => {
      const f = good();
      mutate(f);
      let parsed: ReturnType<typeof parseBackup> | null = null;
      expect(() => (parsed = parseBackup(JSON.stringify(f), NOW))).not.toThrow();
      expect(parsed!).toMatchObject({ ok: false, error: "invalid-arcs" });
    });
  }

  test("random damage anywhere in the arcs: always a typed answer, never a throw", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const junk = [null, 0, -1, 1.5, "", "x", [], {}, true, [1, 2], { a: 1 }];
    const paths = (v: unknown, at: (string | number)[] = []): (string | number)[][] =>
      typeof v !== "object" || v === null ? [at] : [at, ...Object.entries(v).flatMap(([k, x]) => paths(x, [...at, Array.isArray(v) ? Number(k) : k]))];
    const base = good();
    const all = paths(base.data.arcs).filter((p) => p.length > 0);
    for (let i = 0; i < 400; i++) {
      const f = structuredClone(base);
      const p = all[Math.floor(rand() * all.length)];
      let node = f.data.arcs;
      for (const k of p.slice(0, -1)) node = node[k];
      node[p[p.length - 1]] = junk[Math.floor(rand() * junk.length)];
      let r: ReturnType<typeof parseBackup> | null = null;
      expect(() => (r = parseBackup(JSON.stringify(f), NOW))).not.toThrow();
      const parsed = r as unknown as ReturnType<typeof parseBackup>;
      if (!parsed.ok) continue;
      // Whatever is accepted imports and renders: Today's selectors and the reader never throw on it.
      const state = applyArcAction({ index: parsed.backup.data.arcs.index, texts: {} }, { type: "IMPORT", snapshot: parsed.backup.data.arcs }, { now: NOW, isPlus: false, name: "Ana", newId: () => "n", seed: 1 }).state;
      for (const dream of state.index.dreams) {
        expect(() => {
          seasonProgressOf(state.index, dream.id);
          loopStateOf(state.index, dream.id, NOW, false);
          suggestConstellationNameOf(dream);
          for (const c of chaptersOf(state.index, dream.id)) {
            offersFor(state.index, c.id, false);
            const text = state.texts[c.id];
            if (text) paragraphsForDaypart(text, "evening").map((x) => x.text.slice(0, 1) + x.spans.length);
          }
          latestChapterOf(state.index, dream.id);
        }).not.toThrow();
      }
    }
  });

  test("index and chapter checks report, they do not throw, on non-objects", () => {
    for (const v of [null, 1, "x", [], undefined]) {
      expect(indexShapeProblems(v).length).toBeGreaterThan(0);
      expect(chapterShapeProblems(v).length).toBeGreaterThan(0);
      expect(snapshotShapeProblems(v).length).toBeGreaterThan(0);
    }
  });
});
