import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SKY_SEED,
  MAX_TWINKLES,
  STARFIELD_COUNT,
  hashString,
  makeStarfield,
  pickTwinkles,
  skySeed,
  twinkleTimings,
} from "./starfield";

describe("hashString / skySeed", () => {
  test("is a stable unsigned 32-bit hash", () => {
    expect(hashString("vela")).toBe(hashString("vela"));
    expect(hashString("vela")).not.toBe(hashString("Vela"));
    const h = hashString("2026-10-15T20:05:00.000ZMaya");
    expect(Number.isInteger(h) && h >= 0 && h <= 0xffffffff).toBe(true);
  });

  test("each user gets their own sky; no profile gets the default sky", () => {
    expect(skySeed("2026-10-15T20:05:00.000Z", "Maya")).not.toBe(skySeed("2026-10-15T20:05:00.000Z", "Sam"));
    expect(skySeed("2026-10-15T20:05:00.000Z", " Maya ")).toBe(skySeed("2026-10-15T20:05:00.000Z", "Maya"));
    expect(skySeed(null, undefined)).toBe(DEFAULT_SKY_SEED);
  });
});

describe("makeStarfield", () => {
  const seed = skySeed("2026-10-15T20:05:00.000Z", "Maya");
  const stars = makeStarfield(seed);

  test("has 140 stars inside the unit box", () => {
    expect(stars.length).toBe(STARFIELD_COUNT);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(1);
    }
  });

  test("is deterministic per seed and different across seeds", () => {
    expect(makeStarfield(seed)).toEqual(stars);
    expect(makeStarfield(seed + 1)).not.toEqual(stars);
  });

  test("uses only the three radius tiers, mostly small", () => {
    const radii = new Set(stars.map((s) => s.r));
    for (const r of radii) expect([0.6, 1, 1.6]).toContain(r);
    const small = stars.filter((s) => s.r === 0.6).length;
    const big = stars.filter((s) => s.r === 1.6).length;
    expect(small).toBeGreaterThan(stars.length / 2);
    expect(big).toBeGreaterThan(0);
    expect(big).toBeLessThan(stars.length / 5);
  });

  test("thins toward the horizon", () => {
    const top = stars.filter((s) => s.y < 0.5).length;
    expect(top).toBeGreaterThan(stars.length - top);
  });

  test("opacities stay in a legible, never-glaring band", () => {
    for (const s of stars) {
      expect(s.opacity).toBeGreaterThanOrEqual(0.2);
      expect(s.opacity).toBeLessThanOrEqual(1);
    }
  });
});

describe("pickTwinkles", () => {
  const stars = makeStarfield(42);

  test("never more than 10, all distinct", () => {
    const t = pickTwinkles(stars, 50);
    expect(t.length).toBe(MAX_TWINKLES);
    expect(new Set(t).size).toBe(t.length);
  });

  test("prefers the brightest stars", () => {
    const t = pickTwinkles(stars, 3);
    const brightest = Math.max(...stars.map((s) => s.r));
    expect(stars[t[0]].r as number).toBe(brightest);
  });

  test("handles tiny fields", () => {
    expect(pickTwinkles([], 10)).toEqual([]);
    expect(pickTwinkles(makeStarfield(1, 3), 10).length).toBe(3);
  });
});

describe("twinkleTimings", () => {
  test("periods between 2.4 and 5.6 seconds, deterministic", () => {
    const t = twinkleTimings(7, 10);
    expect(t).toEqual(twinkleTimings(7, 10));
    for (const { periodMs, delayMs } of t) {
      expect(periodMs).toBeGreaterThanOrEqual(2400);
      expect(periodMs).toBeLessThanOrEqual(5600);
      expect(delayMs).toBeGreaterThanOrEqual(0);
      expect(delayMs).toBeLessThanOrEqual(periodMs);
    }
  });
});
