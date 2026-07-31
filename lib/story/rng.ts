// Seeded PRNG (mulberry32). The engine must be deterministic under test and
// genuinely varied in production — both come from controlling the seed.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Pick one item, preferring those not in `avoid`. Falls back to the full pool
 * when everything has been used — variety degrades gracefully, never errors.
 */
export function pickAvoiding<T extends { id: string }>(
  rng: Rng,
  items: readonly T[],
  avoid: ReadonlySet<string>
): T {
  const fresh = items.filter((i) => !avoid.has(i.id));
  return pick(rng, fresh.length > 0 ? fresh : items);
}
