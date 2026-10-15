import { describe, expect, test } from "bun:test";
import { chartGeometry, distance, fitFigure, gutterFor, heroHeight, hitBoxes, splitSegment } from "./layout";
import { VELA_SAIL } from "./figures";
import { arcPath, sparklePath, starPath } from "./shapes";
import { toRoman } from "./numerals";

describe("gutterFor / heroHeight", () => {
  test("24pt gutter, 16 below 380pt", () => {
    expect(gutterFor(430)).toBe(24);
    expect(gutterFor(390)).toBe(24);
    expect(gutterFor(375)).toBe(16);
    expect(gutterFor(320)).toBe(16);
  });

  test("hero is ~30% of the window, floored at 200 and capped", () => {
    expect(heroHeight(667)).toBe(200);
    expect(heroHeight(932)).toBe(280);
    expect(heroHeight(1400)).toBe(340);
  });
});

describe("fitFigure", () => {
  test("keeps aspect, centers, respects padding", () => {
    const pts = fitFigure(VELA_SAIL, 300, 300, 20);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(20, 5);
    expect(Math.max(...xs)).toBeCloseTo(280, 5);
    const h = Math.max(...ys) - Math.min(...ys);
    expect(260 / h).toBeCloseTo(VELA_SAIL.aspect, 2);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(150, 5);
  });

  test("tall boxes fit by height", () => {
    const tall = { aspect: 0.5, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
    const pts = fitFigure(tall, 400, 200, 0);
    expect(pts[0]).toEqual({ x: 150, y: 0 });
    expect(pts[1]).toEqual({ x: 250, y: 200 });
  });
});

describe("segments and hit boxes", () => {
  test("splitSegment covers the line in order", () => {
    const parts = splitSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, 5);
    expect(parts.length).toBe(5);
    expect(parts[0]).toEqual({ x1: 0, y1: 0, x2: 2, y2: 0 });
    expect(parts[4].x2).toBe(10);
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  test("tap targets are 44pt and stay inside the box", () => {
    const boxes = hitBoxes([{ x: 2, y: 2 }, { x: 98, y: 50 }], 100, 100);
    expect(boxes[0]).toEqual({ left: 0, top: 0, size: 44 });
    expect(boxes[1]).toEqual({ left: 56, top: 28, size: 44 });
  });
});

describe("chartGeometry", () => {
  test("3 arcs, 4 meridians, a tick scale; deterministic per seed", () => {
    const g = chartGeometry(430, 932, 99);
    expect(g.radii.length).toBe(3);
    expect(g.meridians.length).toBe(4);
    expect(g.ticks.length).toBeGreaterThan(60);
    expect(g.pole.y).toBeLessThan(0);
    expect(chartGeometry(430, 932, 99)).toEqual(g);
    expect(chartGeometry(430, 932, 100).pole.x).not.toBe(g.pole.x);
  });
});

describe("shapes", () => {
  test("starPath has 2n vertices and closes", () => {
    const d = starPath(10, 10, 8, 4, 0.4);
    expect(d.startsWith("M10 2")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect((d.match(/[ML]/g) ?? []).length).toBe(8);
  });

  test("sparklePath is four curves", () => {
    expect((sparklePath(0, 0, 10).match(/Q/g) ?? []).length).toBe(4);
  });

  test("arcPath flags the large arc", () => {
    expect(arcPath(0, 0, 10, 0, Math.PI / 2)).toContain("A10 10 0 0 1");
    expect(arcPath(0, 0, 10, 0, Math.PI * 1.5)).toContain("A10 10 0 1 1");
  });
});

describe("toRoman", () => {
  test("chapters and seasons", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(toRoman)).toEqual(["I", "II", "III", "IV", "V", "VI", "VII"]);
    expect(toRoman(14)).toBe("XIV");
    expect(toRoman(49)).toBe("XLIX");
    expect(toRoman(0)).toBe("");
    expect(toRoman(Number.NaN)).toBe("");
  });
});
