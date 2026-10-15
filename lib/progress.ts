// FORGIVING PROGRESS — contract + stub. Replaces lib/streak.ts (which stays,
// untouched, until the last 1.0 screen stops importing it).
//
// OWNER: A6 (implements every STUB below in place, with lib/progress.test.ts).
// PERSISTENCE: RitualContext (A2) stores ProgressState under
// STORAGE_KEYS.progress and calls these pure functions; it exposes the result
// through useProgress(). Exported names and signatures are frozen; additive
// changes only (docs/CONTRACTS.md §10).
//
// Rules (binding):
// P1 A 'night shown up' is a distinct LOCAL day with any loop act: a chapter
//    heard (≥ 60%), a proof, a carried line, a saved ritual page.
// P2 nightsShownUp NEVER decreases and never resets. `days` is pruned to the
//    last DAYS_KEPT for storage; the lifetime counter survives pruning.
// P3 No missed days, ever. A past day without an act is a 'rest' night.
// P4 Weekly rhythm 'n of target': target 3..7 (default 4), weeks run Monday to
//    Sunday (the Proof Ledger closes the week on Sunday).
// P5 'Pause my sky' for up to MAX_PAUSE_DAYS. While paused: no reminders
//    (lib/notifications reads pausedUntil) and paused days render as 'paused'.
// P6 Day keys are LOCAL dates (localDateKey). Never slice an ISO/UTC string.
// P7 Pure: every function takes `now: Date`; nothing here reads the clock or storage.

import type { DateKey, Proof } from "@/contexts/arc.types";
import type { ProofKind } from "@/lib/story/content/types";
import { dateKey as legacyLocalDateKey } from "@/lib/streak";

/** False once A6 lands the real implementation. A2 wires RitualContext onto it only then. */
export const PROGRESS_IS_STUB: boolean = true;

export const PROGRESS_VERSION = 2 as const;
export const RHYTHM_TARGET = { min: 3, max: 7, default: 4 } as const;
export const MAX_PAUSE_DAYS = 30;
export const DAYS_KEPT = 400;

export type LoopAct = "chapter-heard" | "proof" | "line-carried" | "ritual-saved";
export const LOOP_ACTS: readonly LoopAct[] = ["chapter-heard", "proof", "line-carried", "ritual-saved"];

export interface ProgressState {
  readonly version: typeof PROGRESS_VERSION;
  /** Distinct local days with any act, ascending, last DAYS_KEPT only. */
  readonly days: readonly DateKey[];
  /** Lifetime distinct days with any act. Never decreases (P2). */
  readonly nightsShownUp: number;
  /** Acts done on `today.dateKey` (drives 'carried' states and Today's sealed check). Stale when the date has moved on. */
  readonly today: { readonly dateKey: DateKey; readonly acts: readonly LoopAct[] } | null;
  /** 3..7. */
  readonly rhythmTarget: number;
  /** Last paused day (inclusive), or null. */
  readonly pausedUntil: DateKey | null;
  /** Lifetime count per act. One increment per recordAct call. */
  readonly lifetime: Readonly<Record<LoopAct, number>>;
}

export type WeekDayState = "shown-up" | "rest" | "today-open" | "future" | "paused";

export interface WeekDay {
  readonly dateKey: DateKey;
  /** 0 = Monday … 6 = Sunday. */
  readonly index: number;
  readonly state: WeekDayState;
}

export interface WeeklyRhythm {
  /** Monday of the week containing `now`. */
  readonly weekStart: DateKey;
  readonly target: number;
  readonly shownUp: number;
  readonly met: boolean;
  /** Exactly 7, Monday first. */
  readonly days: readonly WeekDay[];
}

export interface ProgressSummary {
  readonly nightsShownUp: number;
  /** From ArcValue.totalStars (progress does not own proofs). */
  readonly stars: number;
  /** '12 nights · 9 stars' — formatNightsStars(). */
  readonly chipLabel: string;
  readonly week: WeeklyRhythm;
  readonly paused: boolean;
  readonly pausedUntil: DateKey | null;
  /** Acts already done today (empty when `today` is stale). */
  readonly doneToday: readonly LoopAct[];
}

export interface ProofLedger {
  readonly weekStart: DateKey;
  readonly weekEnd: DateKey;
  readonly total: number;
  readonly counts: Readonly<Record<ProofKind, number>>;
  /** The proof to feature as 'the sentence of the week', or null. */
  readonly sentenceOfWeek: Proof | null;
}

/* =========================================================================
 * Implemented (trivially correct, shared by everyone today)
 * ========================================================================= */

/** LOCAL calendar date 'YYYY-MM-DD' (P6). The only day-key function in 1.1. */
export function localDateKey(d: Date): DateKey {
  return legacyLocalDateKey(d);
}

/** '12 nights · 9 stars', '1 night · 1 star', '0 nights · 0 stars'. Fixes the 1.0 '1 moments' bug class. */
export function formatNightsStars(nights: number, stars: number): string {
  const n = Math.max(0, Math.floor(nights));
  const s = Math.max(0, Math.floor(stars));
  return `${n} ${n === 1 ? "night" : "nights"} · ${s} ${s === 1 ? "star" : "stars"}`;
}

export function emptyProgress(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    days: [],
    nightsShownUp: 0,
    today: null,
    rhythmTarget: RHYTHM_TARGET.default,
    pausedUntil: null,
    lifetime: { "chapter-heard": 0, proof: 0, "line-carried": 0, "ritual-saved": 0 },
  };
}

/* =========================================================================
 * STUBS — A6 implements (signatures frozen)
 * ========================================================================= */

/** Record one loop act at `now`. Adds the local day (P1), bumps nightsShownUp on a new day, bumps lifetime[act]. STUB: returns state unchanged. */
export function recordAct(state: ProgressState, _act: LoopAct, _now: Date): ProgressState {
  return state;
}

/** Clamp to RHYTHM_TARGET. STUB: returns state unchanged. */
export function setRhythmTarget(state: ProgressState, _target: number): ProgressState {
  return state;
}

/** Pause through `until` (inclusive), clamped to now + MAX_PAUSE_DAYS. STUB: returns state unchanged. */
export function pauseUntil(state: ProgressState, _until: DateKey, _now: Date): ProgressState {
  return state;
}

/** Clear the pause. STUB: returns state unchanged. */
export function resumeProgress(state: ProgressState): ProgressState {
  return state;
}

/** True when `now`'s local day is on or before pausedUntil. STUB: false. */
export function isPaused(_state: ProgressState, _now: Date): boolean {
  return false;
}

/** The Monday–Sunday rhythm for the week containing `now` (P3, P4). STUB: an empty week. */
export function weeklyRhythm(state: ProgressState, now: Date): WeeklyRhythm {
  const key = localDateKey(now);
  return { weekStart: key, target: state.rhythmTarget, shownUp: 0, met: false, days: [] };
}

/** Everything Today and Settings need in one call. STUB: zero-ish summary. */
export function summarize(state: ProgressState, stars: number, now: Date): ProgressSummary {
  return {
    nightsShownUp: state.nightsShownUp,
    stars,
    chipLabel: formatNightsStars(state.nightsShownUp, stars),
    week: weeklyRhythm(state, now),
    paused: false,
    pausedUntil: state.pausedUntil,
    doneToday: [],
  };
}

/** Lenient parse of a stored value; anything malformed → emptyProgress(). STUB: always empty. */
export function parseProgress(_raw: unknown): ProgressState {
  return emptyProgress();
}

/**
 * Migrate the 1.0 'vela.ritual.v1' value ({days, todayKey, todayDone}).
 * days → days; nightsShownUp = distinct day count (pruning means it may
 * undercount, never overcount); todayDone story→chapter-heard,
 * affirmation→line-carried, script→ritual-saved. STUB: empty.
 */
export function progressFromRitualV1(_raw: unknown): ProgressState {
  return emptyProgress();
}

/** Proofs whose dateKey falls in the Monday–Sunday week containing `now`. STUB: empty ledger. */
export function weeklyLedger(_proofs: readonly Proof[], now: Date): ProofLedger {
  const key = localDateKey(now);
  return { weekStart: key, weekEnd: key, total: 0, counts: { did: 0, moved: 0, learned: 0 }, sentenceOfWeek: null };
}

/** Show the Sunday Proof Ledger card: `now` is a Sunday and the week has ≥ 2 proofs. STUB: false. */
export function shouldShowLedger(_ledger: ProofLedger, _now: Date): boolean {
  return false;
}
