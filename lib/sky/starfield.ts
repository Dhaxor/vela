// The static starfield behind every screen. Seeded per user, so every sky is
// unique to its owner and identical on every visit and device.
//
// Coordinates are normalized (0..1) so one field serves every screen size;
// components scale them to pixels. Pure and deterministic.
import { mulberry32 } from "@/lib/story/rng";

export type StarRadius = 0.6 | 1 | 1.6;
export type StarTone = "warm" | "cool" | "pale";

export interface SkyStar {
  readonly x: number;
  readonly y: number;
  readonly r: StarRadius;
  readonly opacity: number;
  readonly tone: StarTone;
}

export const STARFIELD_COUNT = 140;
export const MAX_TWINKLES = 10;

/** Radius tiers with their weights and base opacities (ELEVATE §2.1). */
const TIERS: readonly { r: StarRadius; weight: number; opacity: number }[] = [
  { r: 0.6, weight: 0.68, opacity: 0.35 },
  { r: 1, weight: 0.24, opacity: 0.6 },
  { r: 1.6, weight: 0.08, opacity: 0.9 },
];

/** FNV-1a, 32-bit. Stable across platforms and JS engines. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Fallback sky for a visitor with no profile yet (onboarding, kitchen sink). */
export const DEFAULT_SKY_SEED = hashString("vela:first-light");

/** hash(profile.createdAt + name): the user's own sky. */
export function skySeed(createdAt: string | null | undefined, name: string | null | undefined): number {
  const key = `${createdAt ?? ""}${(name ?? "").trim()}`;
  return key ? hashString(key) : DEFAULT_SKY_SEED;
}

function pickTier(roll: number) {
  let acc = 0;
  for (const tier of TIERS) {
    acc += tier.weight;
    if (roll < acc) return tier;
  }
  return TIERS[TIERS.length - 1];
}

/**
 * Stratified sampling with full-cell jitter (even cover, no grid look) and a
 * density falloff toward the horizon, where the glow sits.
 */
export function makeStarfield(seed: number, count: number = STARFIELD_COUNT): readonly SkyStar[] {
  const rng = mulberry32(seed);
  const cols = Math.max(1, Math.round(Math.sqrt(count * 0.55)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const stars: SkyStar[] = [];
  let guard = 0;
  while (stars.length < count && guard < count * 12) {
    const cell = guard % (cols * rows);
    guard++;
    const cx = cell % cols;
    const cy = Math.floor(cell / cols);
    const x = (cx + rng()) / cols;
    const y = (cy + rng()) / rows;
    // Fewer stars low in the sky: acceptance falls from 1 at the top to .45.
    if (rng() > 1 - 0.55 * y * y) continue;
    const tier = pickTier(rng());
    const toneRoll = rng();
    const tone: StarTone = toneRoll < 0.5 ? "pale" : toneRoll < 0.8 ? "cool" : "warm";
    const opacity = Math.min(1, Math.max(0.2, tier.opacity + (rng() - 0.5) * 0.12));
    stars.push({ x, y, r: tier.r, opacity: Math.round(opacity * 100) / 100, tone });
  }
  return stars;
}

/**
 * Indices of the stars that twinkle: the brightest, kept apart from each
 * other so the motion never clusters. At most MAX_TWINKLES.
 */
export function pickTwinkles(stars: readonly SkyStar[], max: number = MAX_TWINKLES): readonly number[] {
  const limit = Math.min(max, MAX_TWINKLES);
  const order = stars
    .map((star, index) => ({ index, score: star.r * 10 + star.opacity }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen: number[] = [];
  for (const minGap of [0.18, 0.1, 0]) {
    for (const { index } of order) {
      if (chosen.length >= limit) return chosen;
      if (chosen.includes(index)) continue;
      const s = stars[index];
      const clear = chosen.every((j) => Math.hypot(stars[j].x - s.x, stars[j].y - s.y) >= minGap);
      if (clear) chosen.push(index);
    }
  }
  return chosen;
}

export interface TwinkleTiming {
  /** Full low→high→low period, 2.4–5.6 s. */
  readonly periodMs: number;
  /** Phase offset so twinkles never pulse in unison. */
  readonly delayMs: number;
}

export function twinkleTimings(seed: number, n: number): readonly TwinkleTiming[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  return Array.from({ length: n }, () => {
    const periodMs = Math.round(2400 + rng() * 3200);
    return { periodMs, delayMs: Math.round(rng() * periodMs) };
  });
}
