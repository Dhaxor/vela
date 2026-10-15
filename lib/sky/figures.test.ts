import { describe, expect, test } from "bun:test";
import {
  FIGURE_POINTS,
  FIGURE_STARS,
  ORIGINAL_FIGURES,
  VELA_SAIL,
  VELA_STAR_NAMES,
  edgeStep,
  edgesLitAt,
  figureFor,
  isPointLit,
  litEdges,
  projectCatalogue,
  unlitEdges,
  type Figure,
} from "./figures";

const ALL: readonly Figure[] = [VELA_SAIL, ...ORIGINAL_FIGURES];

describe("figure shape rules", () => {
  test("there are 12 originals with unique ids", () => {
    expect(ORIGINAL_FIGURES.length).toBe(12);
    expect(new Set(ALL.map((f) => f.id)).size).toBe(ALL.length);
  });

  for (const figure of ALL) {
    describe(figure.id, () => {
      test("has an anchor plus seven stars inside the unit box", () => {
        expect(figure.points.length).toBe(FIGURE_POINTS);
        for (const pt of figure.points) {
          expect(pt.x).toBeGreaterThanOrEqual(0);
          expect(pt.x).toBeLessThanOrEqual(1);
          expect(pt.y).toBeGreaterThanOrEqual(0);
          expect(pt.y).toBeLessThanOrEqual(1);
        }
        expect(figure.aspect).toBeGreaterThan(0.4);
        expect(figure.aspect).toBeLessThan(2.6);
      });

      test("no two stars crowd each other", () => {
        const pts = figure.points.map((p) => ({ x: p.x * figure.aspect, y: p.y }));
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(0.08);
          }
        }
      });

      test("edges are valid and unique", () => {
        const seen = new Set<string>();
        for (const [a, b] of figure.edges) {
          expect(a).not.toBe(b);
          expect(a).toBeGreaterThanOrEqual(0);
          expect(b).toBeLessThan(FIGURE_POINTS);
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      });

      test("every star joins an earlier point, so the figure grows connected", () => {
        for (let k = 1; k <= FIGURE_STARS; k++) {
          expect(edgesLitAt(figure, k).length).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe("the Vela sail", () => {
  test("is projected from the catalogue: wide, anchor γ on the chart's west (right) edge", () => {
    expect(VELA_STAR_NAMES[0]).toBe("γ Vel");
    expect(VELA_SAIL.aspect).toBeGreaterThan(1.4);
    expect(VELA_SAIL.points[0].x).toBe(1);
    // μ Vel is the easternmost: left edge.
    expect(VELA_SAIL.points[4].x).toBe(0);
  });

  test("the 7th star closes the sail back onto the anchor", () => {
    expect(edgesLitAt(VELA_SAIL, 7)).toEqual([[6, 7], [7, 0]]);
  });

  test("projection keeps north up", () => {
    const { points } = projectCatalogue([
      { raDeg: 10, decDeg: -40 },
      { raDeg: 10, decDeg: -50 },
      { raDeg: 20, decDeg: -45 },
    ]);
    expect(points[0].y).toBeLessThan(points[1].y);
    expect(points[2].x).toBeLessThan(points[0].x);
  });
});

describe("figureFor", () => {
  test("season 1 is always the sail", () => {
    expect(figureFor("d1", 1)).toBe(VELA_SAIL);
    expect(figureFor("anything", 0)).toBe(VELA_SAIL);
  });

  test("later seasons are deterministic, jittered originals", () => {
    const a = figureFor("d1", 2);
    expect(figureFor("d1", 2)).toEqual(a);
    const base = ORIGINAL_FIGURES.find((f) => f.id === a.id)!;
    expect(a.points).not.toEqual(base.points);
    a.points.forEach((pt, i) => {
      expect(Math.abs(pt.x - base.points[i].x)).toBeLessThanOrEqual(0.026);
      expect(Math.abs(pt.y - base.points[i].y)).toBeLessThanOrEqual(0.026);
    });
  });

  test("seasons 2..13 visit all 12 originals once", () => {
    const ids = Array.from({ length: 12 }, (_, i) => figureFor("dream-x", i + 2).id);
    expect(new Set(ids).size).toBe(12);
  });

  test("different dreams start their cycle in different places", () => {
    const starts = new Set(["a", "b", "c", "d", "e", "f"].map((id) => figureFor(id, 2).id));
    expect(starts.size).toBeGreaterThan(1);
  });
});

describe("lighting", () => {
  test("the anchor is always lit; stars light in order", () => {
    expect(isPointLit(0, 0)).toBe(true);
    expect(isPointLit(1, 0)).toBe(false);
    expect(isPointLit(3, 3)).toBe(true);
    expect(isPointLit(4, 3)).toBe(false);
    expect(isPointLit(7, 99)).toBe(true);
  });

  test("lit and unlit edges partition the figure", () => {
    for (let lit = 0; lit <= 7; lit++) {
      const on = litEdges(VELA_SAIL, lit);
      const off = unlitEdges(VELA_SAIL, lit);
      expect(on.length + off.length).toBe(VELA_SAIL.edges.length);
      for (const e of on) expect(edgeStep(e)).toBeLessThanOrEqual(lit);
    }
    expect(litEdges(VELA_SAIL, 0)).toEqual([]);
    expect(litEdges(VELA_SAIL, 7).length).toBe(8);
  });
});
