// Pins the binding rule helpers in the arc contract (and the two shared
// progress helpers every screen needs). Owner: A2 (A6 for the progress part).
import { describe, expect, test } from "bun:test";
import {
  ArcError,
  STARS_PER_SEASON,
  canCreateDream,
  daypartAt,
  isArcError,
  isSeasonComplete,
  paragraphsForDaypart,
  stageForCompletedProofs,
  weavingDreamIds,
  type Chapter,
  type Dream,
  type Paragraph,
} from "./arc.types";
import { chapterStorageKey, STORAGE_KEYS, V1_KEYS } from "@/lib/storageKeys";
import { formatNightsStars, localDateKey } from "@/lib/progress";

const dream = (id: string, status: Dream["status"], createdAt: string): Dream => ({
  id,
  focus: "career",
  desire: "my own design studio",
  feeling: "proud",
  label: null,
  createdAt,
  status,
  statusChangedAt: createdAt,
  season: 1,
  seasonStartedAt: createdAt,
  constellations: [],
  usedIds: [],
  motifIds: [],
});

const para = (key: string, text: string): Paragraph => ({ key, fragmentId: key, beat: "living", text, spans: [] });

describe("stage and season rules", () => {
  test("stage = min(completedProofs + 1, 7)", () => {
    expect([0, 1, 2, 5, 6, 7, 12].map(stageForCompletedProofs)).toEqual([1, 2, 3, 6, 7, 7, 7]);
    expect(stageForCompletedProofs(-3)).toBe(1);
    expect(stageForCompletedProofs(Number.NaN)).toBe(1);
  });

  test("a season completes at exactly 7 stars", () => {
    expect(STARS_PER_SEASON).toBe(7);
    expect(isSeasonComplete(6)).toBe(false);
    expect(isSeasonComplete(7)).toBe(true);
  });
});

describe("daypart is chosen at read time", () => {
  test("04:00–14:59 local is morning, everything else evening", () => {
    const at = (h: number) => daypartAt(new Date(2026, 9, 15, h, 30));
    expect([3, 4, 9, 14, 15, 21, 23].map(at)).toEqual([
      "evening", "morning", "morning", "morning", "evening", "evening", "evening",
    ]);
  });

  test("paragraphsForDaypart = opening, body, closing for that daypart", () => {
    const ch = {
      opening: { morning: para("o", "Morning open."), evening: para("o", "Evening open.") },
      body: [para("p1", "One."), para("p2", "Two.")],
      closing: { morning: para("c", "Into the day."), evening: para("c", "Into rest.") },
    } as unknown as Chapter;
    expect(paragraphsForDaypart(ch, "morning").map((p) => p.text)).toEqual(["Morning open.", "One.", "Two.", "Into the day."]);
    expect(paragraphsForDaypart(ch, "evening").map((p) => p.text)).toEqual(["Evening open.", "One.", "Two.", "Into rest."]);
  });
});

describe("Plus-lapse rule", () => {
  const a = dream("a", "active", "2026-10-01T10:00:00.000Z");
  const b = dream("b", "active", "2026-10-05T10:00:00.000Z");
  const c = dream("c", "resting", "2026-10-07T10:00:00.000Z");
  const r = dream("r", "released", "2026-10-08T10:00:00.000Z");

  test("Plus: every active dream weaves", () => {
    expect(weavingDreamIds([a, b, c, r], "a", true).sort()).toEqual(["a", "b"]);
  });

  test("free: only the focused active dream weaves", () => {
    expect(weavingDreamIds([a, b, c, r], "a", false)).toEqual(["a"]);
  });

  test("free: focus on a non-active dream falls back to the newest active one", () => {
    expect(weavingDreamIds([a, b, c, r], "c", false)).toEqual(["b"]);
    expect(weavingDreamIds([a, b, c, r], null, false)).toEqual(["b"]);
    expect(weavingDreamIds([c, r], "c", false)).toEqual([]);
  });

  test("free tier creates a dream only when none is active", () => {
    expect(canCreateDream([], false)).toBe(true);
    expect(canCreateDream([a], false)).toBe(false);
    expect(canCreateDream([c, r], false)).toBe(true);
    expect(canCreateDream([a, b], true)).toBe(true);
  });
});

describe("errors, keys, shared helpers", () => {
  test("ArcError carries a typed code", () => {
    const e = new ArcError("plan-limit");
    expect(isArcError(e)).toBe(true);
    expect(e.code).toBe("plan-limit");
    expect(isArcError(new Error("x"))).toBe(false);
  });

  test("storage layout: one index key, one immutable key per chapter, v1 keys distinct", () => {
    expect(STORAGE_KEYS.arcs).toBe("vela.arcs.v2");
    expect(chapterStorageKey("abc")).toBe("vela.chapter.v2.abc");
    const v2 = new Set<string>(Object.values(STORAGE_KEYS));
    for (const k of Object.values(V1_KEYS)) expect(v2.has(k)).toBe(false);
  });

  test("localDateKey uses the LOCAL calendar date", () => {
    expect(localDateKey(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
    expect(localDateKey(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  test("formatNightsStars pluralises both counts", () => {
    expect(formatNightsStars(12, 9)).toBe("12 nights · 9 stars");
    expect(formatNightsStars(1, 1)).toBe("1 night · 1 star");
    expect(formatNightsStars(0, 0)).toBe("0 nights · 0 stars");
  });
});
