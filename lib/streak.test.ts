import { describe, expect, test } from "bun:test";
import { computeStreak, dateKey, practicedToday, pruneDays } from "./streak";

const at = (iso: string) => new Date(`${iso}T12:00:00`);

describe("dateKey", () => {
  test("uses local components, zero-padded", () => {
    expect(dateKey(at("2026-03-05"))).toBe("2026-03-05");
    expect(dateKey(new Date(2026, 0, 9, 23, 59))).toBe("2026-01-09");
  });
});

describe("computeStreak", () => {
  test("empty history is zero", () => {
    expect(computeStreak(new Set(), at("2026-07-31"))).toBe(0);
  });

  test("counts consecutive days ending today", () => {
    const days = new Set(["2026-07-29", "2026-07-30", "2026-07-31"]);
    expect(computeStreak(days, at("2026-07-31"))).toBe(3);
  });

  test("yesterday's streak survives an unpracticed morning", () => {
    const days = new Set(["2026-07-29", "2026-07-30"]);
    expect(computeStreak(days, at("2026-07-31"))).toBe(2);
  });

  test("a full missed day breaks it", () => {
    const days = new Set(["2026-07-27", "2026-07-28"]);
    expect(computeStreak(days, at("2026-07-31"))).toBe(0);
  });

  test("gaps stop the count at the gap", () => {
    const days = new Set(["2026-07-25", "2026-07-27", "2026-07-30", "2026-07-31"]);
    expect(computeStreak(days, at("2026-07-31"))).toBe(2);
  });

  test("crosses month boundaries", () => {
    const days = new Set(["2026-06-29", "2026-06-30", "2026-07-01"]);
    expect(computeStreak(days, at("2026-07-01"))).toBe(3);
  });
});

describe("practicedToday / pruneDays", () => {
  test("practicedToday reflects today's key only", () => {
    expect(practicedToday(new Set(["2026-07-31"]), at("2026-07-31"))).toBe(true);
    expect(practicedToday(new Set(["2026-07-30"]), at("2026-07-31"))).toBe(false);
  });

  test("pruneDays dedupes, sorts and bounds", () => {
    const days = ["2026-01-02", "2026-01-01", "2026-01-02", "2026-01-03"];
    expect(pruneDays(days, 2)).toEqual(["2026-01-02", "2026-01-03"]);
  });
});
