// v1 → v2 migration. RELEASE-BLOCKING. The fixtures in lib/fixtures/v1 are
// REAL storage captured from the 1.0 web build (onboarding, intake, rerolls,
// proofs, weaves), including the two traps the critique named: a reroll-heavy
// user (chapter 9, one proof, eight open actions) and a user with several open
// actions whose newest proof was never woven.
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { paragraphsForDaypart, type ArcSnapshot, type V1RawStorage } from "@/contexts/arc.types";
import { checkArcInvariants, migrateV1 } from "./migrate";
import { chaptersOf, latestChapterOf, loopStateOf, openBridgeOf, proofsOf, seasonProgressOf } from "./store/arcSelectors";
import { applyArcAction } from "./store/arc";
import { buildBackup, parseBackup, serializeBackup } from "./backup";

interface Fixture {
  raw: V1RawStorage;
}
const load = (name: string): V1RawStorage => (JSON.parse(fs.readFileSync(path.join(import.meta.dir, "fixtures", "v1", `${name}.json`), "utf8")) as Fixture).raw;
const NOW = new Date("2026-10-16T08:00:00.000Z");
const migrate = (raw: V1RawStorage) => migrateV1(raw, { now: NOW, name: "Maya" });
const v1 = (raw: V1RawStorage) => JSON.parse(raw.stories!) as {
  intents: { id: string; chapter: number }[];
  stories: { id: string; intentId: string; paragraphs: { text: string }[] }[];
  actions: { id: string; intentId: string; state: string; createdAt: string; completedAt?: string; evidence?: string; evidenceKind?: string }[];
};
const only = (s: ArcSnapshot) => s.index.dreams[0];

describe("every real fixture", () => {
  for (const name of ["reroll-heavy", "open-actions-proof-unwoven", "nine-proofs", "plus-two-dreams", "profile-only"]) {
    test(`${name}: valid v2, no warnings, ids kept, input untouched`, () => {
      const raw = load(name);
      const before = JSON.stringify(raw);
      const { snapshot, report } = migrate(raw);
      expect(report.warnings).toEqual([]);
      expect(checkArcInvariants(snapshot)).toEqual([]);
      expect(JSON.stringify(raw)).toBe(before);
      if (raw.stories) {
        const old = v1(raw);
        expect(snapshot.index.dreams.map((d) => d.id)).toEqual(old.intents.map((i) => i.id));
        for (const story of old.stories) expect(snapshot.index.chapters.some((c) => c.id === story.id)).toBe(true);
        expect(snapshot.index.activeDreamId).toBe(old.intents[0].id);
      }
      // deterministic: a retry after a crash produces the same snapshot
      expect(migrate(raw).snapshot).toEqual(snapshot);
    });
  }
});

describe("reroll-heavy (1.0 chapter 9, one proof, eight open actions)", () => {
  const raw = load("reroll-heavy");
  const { snapshot, report } = migrate(raw);
  const old = v1(raw);
  const dream = only(snapshot);

  test("the stage comes from proofs, never from the inflated counter", () => {
    expect(old.intents[0].chapter).toBe(9);
    const latest = latestChapterOf(snapshot.index, dream.id)!;
    expect(latest.id).toBe(old.stories[0].id);
    expect([dream.season, latest.number, latest.stage]).toEqual([1, 2, 2]);
    expect(proofsOf(snapshot.index, dream.id)).toHaveLength(1);
    expect(seasonProgressOf(snapshot.index, dream.id)).toMatchObject({ stars: 1, stage: 2, complete: false });
  });

  test("only the newest open action survives as the live bridge; the rest lapse", () => {
    const newestOpen = old.actions.filter((a) => a.state !== "completed").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    expect(openBridgeOf(snapshot.index, dream.id)?.id).toBe(newestOpen.id);
    expect(report.openBridges).toBe(1);
    expect(report.lapsedBridges).toBe(7);
    expect(snapshot.index.bridges.filter((b) => b.status === "lapsed")).toHaveLength(7);
    expect(loopStateOf(snapshot.index, dream.id, NOW, false)).toMatchObject({ kind: "bridge-open", bridgeId: newestOpen.id });
  });

  test("the 1.0 story text is kept word for word in both daypart slots", () => {
    const chapter = snapshot.chapters[old.stories[0].id];
    expect(chapter.source).toBe("migrated-v1");
    expect(paragraphsForDaypart(chapter, "morning").map((p) => p.text)).toEqual(paragraphsForDaypart(chapter, "evening").map((p) => p.text));
    const story = old.stories[0].paragraphs;
    expect(chapter.opening.morning.text).toBe(story[0].text);
    // 1.0 appended its proof line after the closing, with a doubled stop: it moves before the closing, fixed.
    expect(story[story.length - 1].text).toContain("I admire.. It is small");
    expect(chapter.closing.morning.text).toBe(story[story.length - 2].text);
    const proofLine = chapter.body.find((p) => p.beat === "recall")!;
    expect(proofLine.text).toContain("I admire. It is small");
    expect(paragraphsForDaypart(chapter, "evening")).toHaveLength(story.length);
  });
});

describe("several open actions and an unwoven proof", () => {
  const raw = load("open-actions-proof-unwoven");
  const { snapshot, report } = migrate(raw);
  const old = v1(raw);
  const dream = only(snapshot);
  const [proof] = proofsOf(snapshot.index, dream.id);

  test("the proof keeps its id, LOCAL date, kind and loses the '..'", () => {
    const action = old.actions.find((a) => a.state === "completed")!;
    expect(action.evidence).toBe("Paid an extra 50 toward the card..");
    expect(proof.id).toBe(action.id);
    expect(proof.text).toBe("Paid an extra 50 toward the card.");
    expect(proof.kind).toBe("moved");
    expect(proof.migratedFromV1).toBe(true);
    const d = new Date(action.completedAt!);
    expect(proof.dateKey).toBe(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  });

  test("the story's bridge is crossed, the next chapter is woven from the proof (I5), older opens lapse", () => {
    const [story, next] = chaptersOf(snapshot.index, dream.id);
    expect(story.id).toBe(old.stories[0].id);
    expect(snapshot.index.bridges.find((b) => b.id === story.bridgeId)).toMatchObject({ status: "crossed", proofId: proof.id });
    expect(story.heardAt).not.toBeNull();
    expect([next.number, next.stage, next.wovenProofId, next.source]).toEqual([2, 2, proof.id, "engine"]);
    expect(proof.wovenInChapterId).toBe(next.id);
    const woven = snapshot.chapters[next.id].body.filter((p) => p.wovenProofId === proof.id);
    expect(woven).toHaveLength(1);
    expect(report.lapsedBridges).toBe(3);
    expect(openBridgeOf(snapshot.index, dream.id)).toBeUndefined();
    expect(loopStateOf(snapshot.index, dream.id, NOW, false)).toMatchObject({ kind: "chapter-waiting", heard: false, chapterId: next.id });
  });
});

describe("nine proofs: Season 2 · Stage III", () => {
  const { snapshot } = migrate(load("nine-proofs"));
  const dream = only(snapshot);

  test("seven stars complete Season 1 (unnamed), two open Season 2", () => {
    expect(dream.season).toBe(2);
    expect(dream.constellations).toEqual([]);
    expect(proofsOf(snapshot.index, dream.id, 1).map((p) => p.starIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(proofsOf(snapshot.index, dream.id, 2).map((p) => p.starIndex)).toEqual([1, 2]);
    const latest = latestChapterOf(snapshot.index, dream.id)!;
    expect([latest.season, latest.number, latest.stage]).toEqual([2, 3, 3]);
    expect(openBridgeOf(snapshot.index, dream.id)?.chapterId).toBe(latest.id);
    expect(dream.motifIds.length).toBeGreaterThan(0);
  });

  test("1.0 library wording that 1.1 bans is rewritten on the live bridge", () => {
    const open = openBridgeOf(snapshot.index, dream.id)!;
    expect(open.text).toBe("Protect twenty focused minutes for the skill this work relies on.");
    for (const b of snapshot.index.bridges) expect(b.text.toLowerCase()).not.toMatch(/future (self|you)/u);
  });
});

describe("two dreams (a Plus user)", () => {
  const { snapshot } = migrate(load("plus-two-dreams"));

  test("each dream keeps its own state; the newest is focused", () => {
    const [sea, clients] = snapshot.index.dreams;
    expect(sea.desire).toBe("A home by the sea");
    expect(snapshot.index.activeDreamId).toBe(sea.id);
    expect(openBridgeOf(snapshot.index, sea.id)).toBeDefined();
    expect(chaptersOf(snapshot.index, clients.id).map((c) => c.number)).toEqual([1, 2]);
    expect(proofsOf(snapshot.index, clients.id)[0].wovenInChapterId).toBe(chaptersOf(snapshot.index, clients.id)[1].id);
  });

  test("without Plus nothing is lost: the other dream is plan-locked, still readable", () => {
    const [, clients] = snapshot.index.dreams;
    expect(loopStateOf(snapshot.index, clients.id, NOW, false)).toMatchObject({ kind: "resting", reason: "plan-locked" });
    expect(loopStateOf(snapshot.index, clients.id, NOW, true).kind).not.toBe("resting");
  });
});

/* -------------------------------------------------- season boundaries (derived from the real nine-proofs capture) */

/** The nine-proofs capture cut to n proofs, with the newest action open (A) or a just-saved proof (B). */
function cut(n: number, newestOpen: boolean): V1RawStorage {
  const raw = load("nine-proofs");
  const data = v1(raw);
  const completed = data.actions.filter((a) => a.state === "completed").sort((a, b) => a.completedAt!.localeCompare(b.completedAt!)).slice(0, n);
  const open = data.actions.find((a) => a.state === "open")!;
  const last = completed[completed.length - 1];
  const story = data.stories[0];
  const actions = newestOpen
    ? [{ ...open, createdAt: new Date(Date.parse(last.completedAt!) + 1000).toISOString() }, ...completed.reverse()]
    : [...completed.reverse()];
  const storyCreated = newestOpen ? Date.parse(last.completedAt!) + 1000 : Date.parse(last.createdAt);
  return { ...raw, stories: JSON.stringify({ ...data, stories: [{ ...story, createdAt: new Date(storyCreated).toISOString() }], actions: actions.map((a) => ({ ...a, storyId: story.id })) }) };
}

describe("season boundaries", () => {
  test("7 proofs, newest open (A): Chapter VII, season complete, the open action lapses", () => {
    const { snapshot } = migrate(cut(7, true));
    const d = only(snapshot);
    expect(checkArcInvariants(snapshot)).toEqual([]);
    expect([d.season, latestChapterOf(snapshot.index, d.id)!.stage]).toEqual([1, 7]);
    expect(seasonProgressOf(snapshot.index, d.id)?.complete).toBe(true);
    expect(openBridgeOf(snapshot.index, d.id)).toBeUndefined();
  });

  test("7 proofs, newest just saved (B): Chapter VII crossed by star 7, nothing woven yet", () => {
    const { snapshot } = migrate(cut(7, false));
    const d = only(snapshot);
    expect(checkArcInvariants(snapshot)).toEqual([]);
    const chapters = chaptersOf(snapshot.index, d.id);
    expect(chapters.map((c) => c.stage)).toEqual([7]);
    expect(proofsOf(snapshot.index, d.id).at(-1)?.wovenInChapterId).toBeNull();
  });

  test("8 proofs, newest just saved (B): the story is Season 2 · Chapter I and Chapter II is woven", () => {
    const { snapshot } = migrate(cut(8, false));
    const d = only(snapshot);
    expect(checkArcInvariants(snapshot)).toEqual([]);
    expect(d.season).toBe(2);
    expect(chaptersOf(snapshot.index, d.id).map((c) => [c.season, c.stage])).toEqual([[2, 1], [2, 2]]);
  });

  test("1 proof, newest open (A): Chapter II with a live bridge", () => {
    const { snapshot } = migrate(cut(1, true));
    const d = only(snapshot);
    expect(checkArcInvariants(snapshot)).toEqual([]);
    expect(latestChapterOf(snapshot.index, d.id)!.stage).toBe(2);
    expect(openBridgeOf(snapshot.index, d.id)).toBeDefined();
  });
});

describe("damaged input never throws", () => {
  test("missing, invalid or hostile values migrate to something valid", () => {
    const cases: (string | null)[] = [
      null,
      "",
      "not json",
      "[]",
      JSON.stringify({ intents: "x" }),
      JSON.stringify({ intents: [{ id: "i1", focus: "nope", desire: "x" }], stories: [], actions: [] }),
      JSON.stringify({ intents: [{ id: "i1", focus: "love", desire: "Find my soulmate", feeling: "loved", createdAt: "2026-01-01T00:00:00Z", chapter: 40 }], stories: [], actions: [{ id: "a1", intentId: "i1", state: "completed", evidence: "  " }] }),
    ];
    for (const stories of cases) {
      const { snapshot, report } = migrateV1({ stories, ritual: null, profile: null, journal: null, board: null }, { now: NOW, name: "" });
      expect(checkArcInvariants(snapshot)).toEqual([]);
      expect(report.warnings.every((w) => !w.startsWith("invariant"))).toBe(true);
    }
  });

  test("an intent whose story is missing gets a fresh chapter at the right stage", () => {
    const stories = JSON.stringify({
      intents: [{ id: "i1", focus: "career", desire: "my own design studio", feeling: "proud", createdAt: "2026-10-01T09:00:00Z", chapter: 3 }],
      stories: [],
      actions: [{ id: "a1", intentId: "i1", storyId: "gone", text: "Send it.", state: "completed", createdAt: "2026-10-02T09:00:00Z", completedAt: "2026-10-02T10:00:00Z", evidence: "Sent it.", evidenceKind: "did" }],
    });
    const { snapshot, report } = migrateV1({ stories, ritual: null, profile: null, journal: null, board: null }, { now: NOW, name: "Maya" });
    expect(report.warnings.some((w) => w.includes("no readable story"))).toBe(true);
    expect(checkArcInvariants(snapshot)).toEqual([]);
    expect(snapshot.index.chapters.length).toBeGreaterThanOrEqual(1);
  });
});

describe("constructed 1.0.1 shapes (exact 1.0 StoryContext rules)", () => {
  for (const name of ["board-photo", "two-proofs-one-story"]) {
    test(`${name}: valid v2, no warnings, input untouched`, () => {
      const raw = load(name);
      const before = JSON.stringify(raw);
      const { snapshot, report } = migrate(raw);
      expect(report.warnings).toEqual([]);
      expect(checkArcInvariants(snapshot)).toEqual([]);
      expect(JSON.stringify(raw)).toBe(before);
    });
  }
});

describe("two proofs against one 1.0 story, then 'Rewrite this chapter' (review r05b)", () => {
  const { snapshot } = migrate(load("two-proofs-one-story"));
  const dream = only(snapshot);
  const latest = latestChapterOf(snapshot.index, dream.id)!;
  const rewrite = (index: ArcSnapshot["index"], texts: ArcSnapshot["chapters"]) =>
    applyArcAction({ index, texts }, { type: "RERENDER_CHAPTER", chapterId: latest.id }, { now: new Date("2026-10-17T20:00:00.000Z"), isPlus: false, name: "Maya", newId: () => "x", seed: 7 }).state;
  const roundTrip = (s: ArcSnapshot) =>
    parseBackup(serializeBackup(buildBackup({ arcs: s, profile: null, progress: null, journal: null, scenes: null }, NOW, "1.1.0")), NOW);

  test("the migrated story is staged from all seven proofs, though two came after its 1.0 createdAt", () => {
    expect(latest).toMatchObject({ source: "migrated-v1", stage: 7 });
    expect(proofsOf(snapshot.index, dream.id).filter((p) => p.createdAt > latest.createdAt)).toHaveLength(2);
    expect(roundTrip(snapshot).ok).toBe(true);
  });

  test("the rewrite keeps the migration's provenance, so I3 still holds and the user's backups stay importable", () => {
    const after = rewrite(snapshot.index, snapshot.chapters);
    const meta = after.index.chapters.find((c) => c.id === latest.id)!;
    expect(meta).toMatchObject({ source: "migrated-v1", stage: 7, number: 7, revision: 2 });
    const snap = { index: after.index, chapters: after.texts };
    expect(checkArcInvariants(snap)).toEqual([]);
    expect(roundTrip(snap)).toMatchObject({ ok: true });
  });

  test("an index an earlier build already relabelled 'engine' is still valid (the chapter predates the migration)", () => {
    const after = rewrite(snapshot.index, snapshot.chapters);
    const poisoned = { ...after.index, chapters: after.index.chapters.map((c) => (c.id === latest.id ? { ...c, source: "engine" as const } : c)) };
    expect(checkArcInvariants({ index: poisoned, chapters: after.texts })).toEqual([]);
    expect(roundTrip({ index: poisoned, chapters: after.texts }).ok).toBe(true);
  });
});
