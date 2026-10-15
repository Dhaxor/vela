// MOTIF MATCHER. Matches a desire against the 24 archetypes in
// lib/story/content/motifs.ts (A4's data) by whole-word keyword, on the device.
// A matched motif unlocks its place, sensory details, living moments and
// witness lines, and its flags gate fragments that assume a partner, a child,
// a client… Love content never assumes a partner unless 'partner' or
// 'wedding' matched. Pure.

import type { FocusId } from "@/lib/focus";
import { MOTIFS, MOTIF_IDS, type MotifArchetype, type MotifFlag, type MotifId } from "./content";

/** At most this many motifs per dream; the first is the primary (place, details, Chapter I script). */
export const MAX_MOTIFS = 3;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/** Normalise for matching: lowercase, straight apostrophes, hyphens as spaces, single spaces. */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[’‘]/gu, "'").replace(/[-_/]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function keywordRe(keyword: string): RegExp {
  const k = escapeRe(normalise(keyword)).replace(/ /gu, "\\s+");
  // Whole words plus an optional -s/-es plural ('studio' → 'studios'). Irregular plurals are listed by the writers.
  return new RegExp(`(?<![\\p{L}\\p{N}])${k}(?:s|es)?(?![\\p{L}\\p{N}])`, "iu");
}

const RE_CACHE = new Map<string, RegExp>();
function cachedRe(keyword: string): RegExp {
  let re = RE_CACHE.get(keyword);
  if (!re) {
    re = keywordRe(keyword);
    RE_CACHE.set(keyword, re);
  }
  return re;
}

/** Score = matched keyword words (a two-word phrase beats a one-word hit). 0 = no match. */
export function motifScore(desire: string, archetype: MotifArchetype): number {
  const text = normalise(desire);
  let score = 0;
  for (const k of archetype.keywords) {
    if (k.trim() && cachedRe(k).test(text)) score += normalise(k).split(" ").length;
  }
  return score;
}

/**
 * Motifs for a desire, best first: score, then archetypes of the dream's own
 * focus, then catalogue order. Deterministic.
 */
export function matchMotifs(
  desire: string,
  focus: FocusId,
  motifs: readonly MotifArchetype[] = MOTIFS
): MotifId[] {
  const order = (id: MotifId) => MOTIF_IDS.indexOf(id);
  return motifs
    .map((m) => ({ m, score: motifScore(desire, m) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.m.focus === focus) - Number(a.m.focus === focus) ||
        order(a.m.id) - order(b.m.id)
    )
    .slice(0, MAX_MOTIFS)
    .map((x) => x.m.id);
}

/** Union of the matched archetypes' flags (gates `requires` / `excludes`). */
export function motifFlags(ids: readonly MotifId[], motifs: readonly MotifArchetype[] = MOTIFS): Set<MotifFlag> {
  const flags = new Set<MotifFlag>();
  for (const id of ids) for (const f of motifs.find((m) => m.id === id)?.flags ?? []) flags.add(f);
  return flags;
}

/** The first matched archetype that exists in the catalogue. */
export function primaryMotif(ids: readonly MotifId[], motifs: readonly MotifArchetype[] = MOTIFS): MotifArchetype | undefined {
  for (const id of ids) {
    const m = motifs.find((x) => x.id === id);
    if (m) return m;
  }
  return undefined;
}
