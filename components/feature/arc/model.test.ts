// Memory Book model: the timeline reads in the order things happened, for a
// seeded season, a season that rolls over, a migrated 1.0 book and a released
// dream. Data comes from the real reducer and the real v1 migration.
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { EMPTY_ARC_INDEX, type ArcIndex, type DreamId } from "@/contexts/arc.types";
import { migrateV1 } from "@/lib/migrate";
import { applyArcAction, type ArcAction, type ArcResults, type ArcState } from "@/lib/store/arc";
import { bridgesOf, chaptersOf, offersFor, proofsOf } from "@/lib/store/arcSelectors";
import { buildTimeline, dreamShortName, nightsSince, orderDreams, relativeDate, shortDate, weekdayDate, type TimelineRow } from "./model";

function world() {
  let t = new Date(2026, 9, 1, 21, 0).getTime();
  let n = 0;
  let state: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };
  const run = <A extends ArcAction>(action: A): ArcResults[A["type"]] => {
    t += 26 * 60 * 60 * 1000; // a day and a bit per step
    const out = applyArcAction(state, action, { now: new Date(t), isPlus: true, name: "Maya", newId: () => `id${++n}`, seed: n * 7919 + 1 });
    state = out.state;
    return out.result;
  };
  return {
    run,
    get index(): ArcIndex {
      return state.index;
    },
  };
}

type World = ReturnType<typeof world>;

function cross(w: World, dreamId: DreamId, kind: "did" | "moved" | "learned" = "did") {
  const latest = chaptersOf(w.index, dreamId).at(-1)!;
  w.run({ type: "MARK_HEARD", chapterId: latest.id });
  const offers = offersFor(w.index, latest.id, true);
  w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: latest.id, choice: { tier: offers[1].tier, libraryId: offers[1].libraryId } } });
  return w.run({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind, text: `Proof after chapter ${latest.number}.` } });
}

function timeline(w: World, dreamId: DreamId) {
  const dream = w.index.dreams.find((d) => d.id === dreamId)!;
  return buildTimeline({ dream, chapters: chaptersOf(w.index, dreamId), bridges: bridgesOf(w.index, dreamId), proofs: proofsOf(w.index, dreamId) });
}

/** 'S1 seed proof' style shorthand for asserting order. */
function shape(rows: readonly TimelineRow[]): string[] {
  return rows.map((r) => {
    switch (r.kind) {
      case "season":
        return `season ${r.season}${r.name ? ` ${r.name}` : ""} ${r.stars}★`;
      case "book-start":
        return `start ${r.firstChapter} (${r.earlierProofs} earlier)`;
      case "chapter":
        return `ch ${r.meta.number} lit ${r.lit}${r.latest ? " latest" : ""}`;
      case "bridge":
        return `bridge ${r.bridge.status}`;
      case "proof":
        return `proof ${r.proof.origin} ★${r.proof.starIndex}${r.wovenIntoNumber ? ` → ${r.wovenIntoNumber}` : ""}`;
      case "course":
        return `course ${r.nextStage}${r.final ? " final" : ""} (${r.starsLeft} left)`;
    }
  });
}

describe("buildTimeline", () => {
  test("a seeded season reads seed → I → bridge → proof → II …", () => {
    const w = world();
    const ch1 = w.run({ type: "CREATE_DREAM", input: { focus: "career", desire: "my own design studio", feeling: "proud", seedProof: { text: "Bought the domain name." } } });
    cross(w, ch1.dreamId);
    cross(w, ch1.dreamId, "learned");
    expect(shape(timeline(w, ch1.dreamId))).toEqual([
      "season 1 3★",
      "proof onboarding ★1 → 1",
      "ch 1 lit 1",
      "bridge crossed",
      "proof bridge ★2 → 2",
      "ch 2 lit 2",
      "bridge learned",
      "proof bridge ★3 → 3",
      "ch 3 lit 3 latest",
      "course 4 (4 left)",
    ]);
  });

  test("an open bridge follows the newest chapter; the course is hidden while resting", () => {
    const w = world();
    const ch1 = w.run({ type: "CREATE_DREAM", input: { focus: "love", desire: "a calm home", feeling: "calm" } });
    const offers = offersFor(w.index, ch1.id, true);
    w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch1.id, choice: { tier: offers[0].tier, libraryId: offers[0].libraryId } } });
    expect(shape(timeline(w, ch1.dreamId))).toEqual(["season 1 0★", "ch 1 lit 0 latest", "bridge open", "course 2 (7 left)"]);
    w.run({ type: "REST_DREAM", dreamId: ch1.dreamId });
    expect(shape(timeline(w, ch1.dreamId))).toEqual(["season 1 0★", "ch 1 lit 0 latest", "bridge open"]);
  });

  test("a completed, named season rolls into Season 2 with every proof kept once", () => {
    const w = world();
    const ch1 = w.run({ type: "CREATE_DREAM", input: { focus: "career", desire: "my own design studio", feeling: "proud" } });
    for (let i = 0; i < 7; i++) cross(w, ch1.dreamId);
    w.run({ type: "MARK_HEARD", chapterId: chaptersOf(w.index, ch1.dreamId).at(-1)!.id });
    w.run({ type: "NAME_CONSTELLATION", dreamId: ch1.dreamId, season: 1, name: "The Studio" });
    w.run({ type: "BEGIN_NEXT_SEASON", dreamId: ch1.dreamId });
    const rows = timeline(w, ch1.dreamId);
    const s = shape(rows);
    expect(s[0]).toBe("season 1 The Studio 7★");
    expect(s.filter((x) => x.startsWith("proof")).length).toBe(7);
    expect(s.filter((x) => x.startsWith("ch")).length).toBe(8);
    // Chapter VII's bridge and the 7th star close Season 1; Season 2 opens with its Chapter I, woven from that star.
    const s2 = s.indexOf("season 2 0★");
    expect(s.slice(s2 - 3, s2)).toEqual(["ch 7 lit 6", "bridge crossed", "proof bridge ★7 → 1"]);
    expect(s.slice(s2)).toEqual(["season 2 0★", "ch 1 lit 0 latest", "course 2 (7 left)"]);
    const season1 = rows[0];
    expect(season1.kind === "season" && season1.complete && season1.namedOn !== null).toBe(true);
  });

  test("the last chapter of an unseeded season shows a final course", () => {
    const w = world();
    const ch1 = w.run({ type: "CREATE_DREAM", input: { focus: "career", desire: "my own design studio", feeling: "proud" } });
    for (let i = 0; i < 6; i++) cross(w, ch1.dreamId);
    expect(shape(timeline(w, ch1.dreamId)).at(-1)).toBe("course 7 final (1 left)");
  });

  test("a released dream keeps its book but shows no course", () => {
    const w = world();
    const ch1 = w.run({ type: "CREATE_DREAM", input: { focus: "career", desire: "my own design studio", feeling: "proud" } });
    cross(w, ch1.dreamId);
    w.run({ type: "RELEASE_DREAM", dreamId: ch1.dreamId });
    expect(shape(timeline(w, ch1.dreamId))).toEqual(["season 1 1★", "ch 1 lit 0", "bridge crossed", "proof bridge ★1 → 2", "ch 2 lit 1 latest"]);
  });

  test("a migrated 1.0 book opens with 'Your book starts here' and keeps every 1.0 proof", () => {
    for (const file of ["nine-proofs.json", "reroll-heavy.json", "open-actions-proof-unwoven.json", "plus-two-dreams.json"]) {
      const raw = JSON.parse(fs.readFileSync(path.join(import.meta.dir, "../../../lib/fixtures/v1", file), "utf8")).raw;
      const { snapshot } = migrateV1(raw, { now: new Date(2026, 9, 16, 9, 0), name: "Maya" });
      for (const dream of snapshot.index.dreams) {
        const rows = buildTimeline({
          dream,
          chapters: chaptersOf(snapshot.index, dream.id),
          bridges: bridgesOf(snapshot.index, dream.id),
          proofs: proofsOf(snapshot.index, dream.id),
        });
        expect(rows[0].kind).toBe("season");
        expect(rows[1].kind).toBe("book-start");
        const proofs = rows.filter((r) => r.kind === "proof").map((r) => (r.kind === "proof" ? r.proof.id : ""));
        expect(new Set(proofs).size).toBe(proofsOf(snapshot.index, dream.id).length);
        expect(rows.some((r) => r.kind === "bridge" && r.bridge.status === "lapsed")).toBe(false);
        expect(rows.filter((r) => r.kind === "chapter").length).toBe(chaptersOf(snapshot.index, dream.id).length);
      }
    }
  });
});

describe("helpers", () => {
  test("nights since a dream began", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-09"];
    expect(nightsSince("2026-10-01", days, 4)).toBe(4);
    expect(nightsSince("2026-10-03", days, 4)).toBe(2);
    // The dream predates the 400-day window: the pruned lifetime nights count too.
    expect(nightsSince("2025-01-01", days, 10)).toBe(10);
    expect(nightsSince("not a day", days, 7)).toBe(7);
  });

  test("dates", () => {
    expect(shortDate("2026-10-05", "2026-10-21")).toBe("5 Oct");
    expect(shortDate("2025-12-31", "2026-10-21")).toBe("31 Dec 2025");
    expect(weekdayDate("2026-10-05", "2026-10-21")).toBe("Mon 5 Oct");
    expect(relativeDate("2026-10-21", "2026-10-21")).toBe("Today");
    expect(relativeDate("2026-10-20", "2026-10-21")).toBe("Yesterday");
    expect(relativeDate("2026-10-19", "2026-10-21")).toBe("Mon 19 Oct");
  });

  test("dreams keep the order they began in, whatever their status", () => {
    const d = (id: string, createdAt: string, status: string) => ({ id, createdAt, status }) as never;
    const order = orderDreams([d("b", "2026-10-02", "active"), d("c", "2026-10-03", "released"), d("a", "2026-10-01", "resting")]);
    expect(order.map((x: { id: string }) => x.id)).toEqual(["a", "b", "c"]);
  });

  test("short names", () => {
    const base = { label: null, constellations: [] } as const;
    expect(dreamShortName({ ...base, desire: "my own design studio, with clients who trust my eye" } as never)).toBe("My own design studio…");
    expect(dreamShortName({ ...base, desire: "a calm home" } as never)).toBe("A calm home");
    expect(dreamShortName({ ...base, label: "Studio", desire: "x" } as never)).toBe("Studio");
    expect(dreamShortName({ ...base, constellations: [{ season: 1, name: "The Studio", namedAt: "" }], desire: "x" } as never)).toBe("The Studio");
  });
});
