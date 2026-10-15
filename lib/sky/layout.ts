// Layout math for the sky: gutters, the responsive hero, fitting a figure into
// a box, star tap targets and the atlas line-work. Pure; all units are points.
import { mulberry32 } from "@/lib/story/rng";
import type { Figure } from "./figures";

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Screen gutter: 24, or 16 below 380pt (iPhone SE / mini). */
export function gutterFor(width: number): 16 | 24 {
  return width < 380 ? 16 : 24;
}

/**
 * The Today sky hero: about 30% of the window, never below 200pt, so the loop
 * card's one CTA stays above the fold on a 375×667 iPhone SE (ELEVATE §8).
 */
export function heroHeight(windowHeight: number, ratio = 0.3, min = 200, max = 340): number {
  return Math.round(Math.min(max, Math.max(min, windowHeight * ratio)));
}

/**
 * Place a figure's normalized points in a width×height box, keeping its
 * aspect, centered, with `padding` on every side.
 */
export function fitFigure(figure: Pick<Figure, "aspect" | "points">, width: number, height: number, padding: number): Pt[] {
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const boxAspect = innerW / innerH;
  const w = figure.aspect >= boxAspect ? innerW : innerH * figure.aspect;
  const h = figure.aspect >= boxAspect ? innerW / figure.aspect : innerH;
  const ox = (width - w) / 2;
  const oy = (height - h) / 2;
  return figure.points.map((pt) => ({ x: ox + pt.x * w, y: oy + pt.y * h }));
}

export function distance(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** n equal pieces of a segment, in drawing order (the web line-draw fallback). */
export function splitSegment(a: Pt, b: Pt, n: number): Segment[] {
  const count = Math.max(1, Math.floor(n));
  return Array.from({ length: count }, (_, i) => ({
    x1: a.x + ((b.x - a.x) * i) / count,
    y1: a.y + ((b.y - a.y) * i) / count,
    x2: a.x + ((b.x - a.x) * (i + 1)) / count,
    y2: a.y + ((b.y - a.y) * (i + 1)) / count,
  }));
}

export interface HitBox {
  readonly left: number;
  readonly top: number;
  readonly size: number;
}

/** A square tap target (≥ 44pt) centered on each star, kept inside the box. */
export function hitBoxes(points: readonly Pt[], width: number, height: number, size = 44): HitBox[] {
  return points.map((pt) => ({
    left: Math.min(Math.max(0, pt.x - size / 2), Math.max(0, width - size)),
    top: Math.min(Math.max(0, pt.y - size / 2), Math.max(0, height - size)),
    size,
  }));
}

export interface ChartGeometry {
  /** Declination circles around a pole above the screen: center + radii. */
  readonly pole: Pt;
  readonly radii: readonly number[];
  /** Meridians from the pole down past the bottom edge. */
  readonly meridians: readonly Segment[];
  /** Graduated scale along the right edge, minor and major ticks. */
  readonly ticks: readonly Segment[];
}

/**
 * The engraved atlas layer: 3 declination arcs, 4 meridians and an edge tick
 * scale. The pole sits well above the screen so arcs read as gentle curves;
 * its horizontal offset is seeded, so each user's chart is drawn a little
 * differently.
 */
export function chartGeometry(width: number, height: number, seed: number): ChartGeometry {
  const rng = mulberry32(seed ^ 0x5bd1e995);
  const pole = { x: width * (0.3 + rng() * 0.4), y: -height * 0.85 };
  const radii = [0.3, 0.58, 0.86].map((f) => Math.round(height * 0.85 + height * f));
  const bottom = height * 1.05;
  const meridians = [0.08, 0.36, 0.64, 0.92].map((f) => {
    const x2 = width * f + (rng() - 0.5) * width * 0.06;
    return { x1: pole.x, y1: pole.y, x2, y2: bottom };
  });
  const ticks: Segment[] = [];
  const x = width - 1;
  for (let y = 12, i = 0; y < height; y += 12, i++) {
    const len = i % 5 === 4 ? 9 : 4;
    ticks.push({ x1: x - len, y1: y, x2: x, y2: y });
  }
  return { pole, radii, meridians, ticks };
}
