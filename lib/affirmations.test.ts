import { describe, expect, test } from "bun:test";
import { FOCUS_AREAS } from "./focus";
import { AFFIRMATIONS, affirmationsFor, dailyAffirmation } from "./affirmations";

describe("affirmation library", () => {
  test("20 per focus area, unique ids, non-trivial text", () => {
    for (const f of FOCUS_AREAS) {
      expect(affirmationsFor(f.id).length).toBe(20);
    }
    expect(new Set(AFFIRMATIONS.map((x) => x.id)).size).toBe(AFFIRMATIONS.length);
    for (const x of AFFIRMATIONS) {
      expect(x.text.length).toBeGreaterThan(10);
      expect(x.text.length).toBeLessThanOrEqual(120); // must fit a widget/card
    }
  });
});

describe("dailyAffirmation", () => {
  test("deterministic for a given day and areas", () => {
    const a = dailyAffirmation("2026-07-31", ["love", "peace"]);
    const b = dailyAffirmation("2026-07-31", ["love", "peace"]);
    expect(a.id).toBe(b.id);
  });

  test("stays inside the chosen areas", () => {
    for (let d = 1; d <= 28; d++) {
      const key = `2026-08-${String(d).padStart(2, "0")}`;
      const x = dailyAffirmation(key, ["abundance"]);
      expect(x.focus).toBe("abundance");
    }
  });

  test("varies across days", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-08-${String(d).padStart(2, "0")}`;
      seen.add(dailyAffirmation(key, ["love", "peace", "career"]).id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(12);
  });

  test("rotates areas over time for multi-area users", () => {
    const areas = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-09-${String(d).padStart(2, "0")}`;
      areas.add(dailyAffirmation(key, ["love", "peace"]).focus);
    }
    expect(areas.size).toBe(2);
  });

  test("empty areas fall back to the full catalog without throwing", () => {
    const x = dailyAffirmation("2026-07-31", []);
    expect(x.text.length).toBeGreaterThan(0);
  });
});
