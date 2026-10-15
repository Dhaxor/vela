// SEASONS. A dream runs in seasons of seven stages, one chapter per stage:
// I The First Glimpse · II The Night Before · III The Hard Day · IV Someone
// Notices · V The Threshold · VI An Ordinary Day · VII Becoming. Seven stars
// complete a season (Named Sky), then 'Begin Season 2'. The stage of a new
// chapter comes from proofs, never from a counter (docs/CONTRACTS.md §4.1).
// Pure labels and arithmetic; the binding rule helpers live in arc.types.

import { STARS_PER_SEASON, stageForCompletedProofs } from "@/contexts/arc.types";
import { STAGES, type StageId, type StageMeta } from "./content/types";
import { toRoman } from "./text";

export { stageForCompletedProofs };

export function stageMeta(stage: StageId): StageMeta {
  return STAGES[stage];
}

/** 'Chapter III · The Hard Day'. */
export function chapterLabel(stage: StageId): string {
  const s = STAGES[stage];
  return `Chapter ${s.numeral} · ${s.name}`;
}

/** 'Season 1 · Stage III of VII'. */
export function seasonStageLabel(season: number, stage: StageId): string {
  return `Season ${Math.max(1, Math.floor(season))} · Stage ${STAGES[stage].numeral} of ${toRoman(STARS_PER_SEASON)}`;
}

/** Where the n-th proof of a dream (0-based, oldest first) falls: season and star 1..7. */
export function seasonSlot(proofIndex: number): { season: number; starIndex: number } {
  const i = Math.max(0, Math.floor(proofIndex));
  return { season: Math.floor(i / STARS_PER_SEASON) + 1, starIndex: (i % STARS_PER_SEASON) + 1 };
}
