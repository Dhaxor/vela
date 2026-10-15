// Constellation figures: the shape a dream's seven proof stars draw.
//
// Every figure has 8 points: point 0 is the ANCHOR (the dream itself, always
// lit, drawn in gold) and points 1..7 are the season's stars in the order they
// light. Edges join points; an edge is lit once both its ends are lit, and
// every star joins at least one earlier point, so the figure grows connected.
//
// Season 1 is always the real Vela sail (star positions are facts). Later
// seasons cycle through 12 ORIGINAL figures, ordered per dream and gently
// jittered by a seed, so no two dreams share a sky.
import { mulberry32 } from "@/lib/story/rng";
import { hashString } from "./starfield";

export interface FigurePoint {
  readonly x: number;
  readonly y: number;
}

export type FigureEdge = readonly [number, number];

export interface Figure {
  readonly id: string;
  /** Working name; the user names their own constellation at the Named Sky. */
  readonly name: string;
  /** Width / height of the figure's box. Points are normalized to 0..1 on each axis. */
  readonly aspect: number;
  readonly points: readonly FigurePoint[];
  readonly edges: readonly FigureEdge[];
}

export const FIGURE_POINTS = 8;
export const FIGURE_STARS = FIGURE_POINTS - 1;

/* ------------------------------------------------------------------------- */
/* The Vela sail, from catalogue positions (J2000, rounded).                 */
/* ------------------------------------------------------------------------- */

interface Catalogued {
  readonly star: string;
  readonly raDeg: number;
  readonly decDeg: number;
}

/** Anchor γ, then the lighting order δ κ φ μ q ψ λ; λ closes back to γ. */
const VELA_CATALOGUE: readonly Catalogued[] = [
  { star: "γ Vel", raDeg: 122.383, decDeg: -47.337 },
  { star: "δ Vel", raDeg: 131.176, decDeg: -54.708 },
  { star: "κ Vel", raDeg: 140.528, decDeg: -55.011 },
  { star: "φ Vel", raDeg: 149.215, decDeg: -54.568 },
  { star: "μ Vel", raDeg: 161.692, decDeg: -49.42 },
  { star: "q Vel", raDeg: 153.684, decDeg: -42.122 },
  { star: "ψ Vel", raDeg: 142.675, decDeg: -40.467 },
  { star: "λ Vel", raDeg: 136.999, decDeg: -43.433 },
];

/**
 * Local tangent-plane projection, north up and east LEFT, as on a printed star
 * chart, normalized into a unit box that keeps the true aspect.
 */
export function projectCatalogue(stars: readonly { raDeg: number; decDeg: number }[]): {
  aspect: number;
  points: FigurePoint[];
} {
  const ra0 = stars.reduce((a, s) => a + s.raDeg, 0) / stars.length;
  const dec0 = stars.reduce((a, s) => a + s.decDeg, 0) / stars.length;
  const k = Math.cos((dec0 * Math.PI) / 180);
  const raw = stars.map((s) => ({ x: -(s.raDeg - ra0) * k, y: -(s.decDeg - dec0) }));
  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y));
  const maxY = Math.max(...raw.map((p) => p.y));
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  return {
    aspect: w / h,
    points: raw.map((p) => ({ x: round((p.x - minX) / w), y: round((p.y - minY) / h) })),
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const velaProjection = projectCatalogue(VELA_CATALOGUE);

/** Loop edges: anchor → δ → … → λ → anchor. */
const CHAIN_CLOSED: readonly FigureEdge[] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
];

export const VELA_SAIL: Figure = {
  id: "vela",
  name: "The Sail",
  aspect: round(velaProjection.aspect),
  points: velaProjection.points,
  edges: CHAIN_CLOSED,
};

/** Catalogue names of the sail's points, for accessibility and the dev sink. */
export const VELA_STAR_NAMES: readonly string[] = VELA_CATALOGUE.map((s) => s.star);

/* ------------------------------------------------------------------------- */
/* Twelve original figures (Vela's own; none echoes a real constellation).    */
/* ------------------------------------------------------------------------- */

const p = (x: number, y: number): FigurePoint => ({ x, y });

export const ORIGINAL_FIGURES: readonly Figure[] = [
  {
    id: "lantern",
    name: "The Lantern",
    aspect: 0.72,
    points: [p(0.5, 0), p(0.5, 0.2), p(0.14, 0.42), p(0.2, 0.76), p(0.5, 1), p(0.8, 0.76), p(0.86, 0.42), p(0.5, 0.58)],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [4, 7]],
  },
  {
    id: "key",
    name: "The Key",
    aspect: 1.9,
    points: [p(0, 0.5), p(0.12, 0.1), p(0.26, 0.5), p(0.52, 0.5), p(0.8, 0.5), p(1, 0.5), p(0.8, 0.94), p(1, 1)],
    edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [4, 6], [5, 7]],
  },
  {
    id: "kite",
    name: "The Kite",
    aspect: 0.7,
    points: [p(0.5, 0), p(0.06, 0.3), p(0.5, 0.58), p(0.94, 0.3), p(0.38, 0.7), p(0.58, 0.8), p(0.4, 0.9), p(0.62, 1)],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 6], [6, 7]],
  },
  {
    id: "beacon",
    name: "The Beacon",
    aspect: 0.86,
    points: [p(0.5, 0), p(0.38, 0.24), p(0.62, 0.24), p(0.32, 0.62), p(0.68, 0.62), p(0.24, 0.98), p(0.76, 0.98), p(0, 0.86)],
    edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 6], [5, 7]],
  },
  {
    id: "compass",
    name: "The Compass",
    aspect: 1,
    points: [p(0.5, 0.5), p(0.5, 0), p(1, 0.5), p(0.5, 1), p(0, 0.5), p(0.74, 0.26), p(0.26, 0.74), p(0.26, 0.26)],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [5, 2], [3, 6], [6, 4], [4, 7], [7, 1]],
  },
  {
    id: "door",
    name: "The Open Door",
    aspect: 0.62,
    points: [p(0.04, 0), p(0.78, 0), p(0.78, 1), p(0.04, 1), p(0.4, 0.12), p(0.4, 0.88), p(0.3, 0.52), p(1, 0.9)],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 3], [5, 6], [2, 7]],
  },
  {
    id: "bridge",
    name: "The Span",
    aspect: 2.2,
    points: [p(0, 1), p(0.18, 0.4), p(0.38, 0.06), p(0.62, 0.06), p(0.82, 0.4), p(1, 1), p(0.3, 1), p(0.7, 1)],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [6, 7], [7, 4]],
  },
  {
    id: "quill",
    name: "The Quill",
    aspect: 0.9,
    points: [p(0, 1), p(0.2, 0.78), p(0.42, 0.56), p(0.64, 0.34), p(0.92, 0), p(0.46, 0.3), p(0.7, 0.08), p(0.74, 0.52)],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 4], [3, 7], [7, 4]],
  },
  {
    id: "bell",
    name: "The Bell",
    aspect: 0.84,
    points: [p(0.5, 0), p(0.3, 0.18), p(0.22, 0.56), p(0, 0.84), p(0.5, 1), p(1, 0.84), p(0.78, 0.56), p(0.7, 0.18)],
    edges: CHAIN_CLOSED,
  },
  {
    id: "heading",
    name: "The Heading",
    aspect: 1,
    points: [p(0.06, 0.94), p(0.3, 0.7), p(0.52, 0.48), p(0.74, 0.26), p(0.96, 0.04), p(0.62, 0.06), p(0.94, 0.38), p(0, 0.66)],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [0, 7], [7, 1]],
  },
  {
    id: "sprout",
    name: "The Sprout",
    aspect: 0.8,
    points: [p(0.5, 1), p(0.5, 0.76), p(0.46, 0.52), p(0.52, 0.3), p(0.06, 0.3), p(0.96, 0.16), p(0.56, 0), p(0.08, 1)],
    edges: [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [3, 6], [0, 7]],
  },
  {
    id: "tide",
    name: "The Tide",
    aspect: 2,
    points: [p(0, 0.62), p(0.14, 0.24), p(0.32, 0.08), p(0.46, 0.4), p(0.58, 0.82), p(0.74, 0.96), p(0.88, 0.6), p(1, 0.2)],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  },
];

/** How far a seeded copy of an original figure may wander, in box units. */
const JITTER = 0.025;

function jittered(figure: Figure, seed: number): Figure {
  const rng = mulberry32(seed);
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return {
    ...figure,
    points: figure.points.map((pt) => ({
      x: round(clamp(pt.x + (rng() * 2 - 1) * JITTER)),
      y: round(clamp(pt.y + (rng() * 2 - 1) * JITTER)),
    })),
  };
}

/**
 * The figure a dream draws in a season. Season 1 is the Vela sail. Seasons
 * 2..13 walk the 12 originals in a per-dream order (starting offset from the
 * dream id), then repeat, each copy jittered by dream + season.
 */
export function figureFor(dreamId: string, season: number): Figure {
  if (season <= 1) return VELA_SAIL;
  const n = ORIGINAL_FIGURES.length;
  const start = hashString(`figure:${dreamId}`) % n;
  const base = ORIGINAL_FIGURES[(start + season - 2) % n];
  return jittered(base, hashString(`${dreamId}#${season}`));
}

/* ------------------------------------------------------------------------- */
/* Lighting                                                                  */
/* ------------------------------------------------------------------------- */

function clampLit(lit: number): number {
  return Math.max(0, Math.min(FIGURE_STARS, Math.floor(lit)));
}

/** Point i is lit when it's the anchor or among the first `lit` stars. */
export function isPointLit(index: number, lit: number): boolean {
  return index === 0 || index <= clampLit(lit);
}

/** The step at which an edge lights: the later of its two points. */
export function edgeStep(edge: FigureEdge): number {
  return Math.max(edge[0], edge[1]);
}

export function litEdges(figure: Figure, lit: number): readonly FigureEdge[] {
  const n = clampLit(lit);
  return figure.edges.filter((e) => edgeStep(e) <= n);
}

export function unlitEdges(figure: Figure, lit: number): readonly FigureEdge[] {
  const n = clampLit(lit);
  return figure.edges.filter((e) => edgeStep(e) > n);
}

/** The edges that lit exactly when star `star` lit (what Star Birth draws). */
export function edgesLitAt(figure: Figure, star: number): readonly FigureEdge[] {
  return figure.edges.filter((e) => edgeStep(e) === star);
}
