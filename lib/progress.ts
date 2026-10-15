// FORGIVING PROGRESS. Replaces lib/streak.ts (which stays, deprecated, until
// the last 1.0 screen stops importing it).
//
// OWNER: A6 (with lib/progress.test.ts).
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
//
// Day-key arithmetic (addDays, weekday) runs on the calendar date alone, in
// UTC, so it is immune to DST: a 23- or 25-hour day is still one day.

import type { DateKey, Proof } from "@/contexts/arc.types";
import type { ProofKind } from "@/lib/story/content/types";

/** False once A6 lands the real implementation. A2 wires RitualContext onto it only then. */
export const PROGRESS_IS_STUB: boolean = false;

export const PROGRESS_VERSION = 2 as const;
export const RHYTHM_TARGET = { min: 3, max: 7, default: 4 } as const;
export const MAX_PAUSE_DAYS = 30;
export const DAYS_KEPT = 400;
/** The Sunday ledger needs at least this many proofs in the week. */
export const LEDGER_MIN_PROOFS = 2;

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
  /** First paused day (the day pauseUntil was called), so earlier rest nights never render as 'paused'. Absent in older values. */
  readonly pausedFrom?: DateKey | null;
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
  /** The active pause's last day; null when not paused (an expired pause is not reported). */
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
 * Day keys
 * ========================================================================= */

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** LOCAL calendar date 'YYYY-MM-DD' (P6). The only day-key function in 1.1. */
export function localDateKey(d: Date): DateKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True for a real calendar date in 'YYYY-MM-DD' form ('2026-02-30' is false). */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string") return false;
  const m = DATE_KEY_RE.exec(value);
  if (!m) return false;
  const utc = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return utcKey(utc) === value;
}

function utcKey(d: Date): DateKey {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function keyToUtcMs(key: DateKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Calendar arithmetic on a day key (DST-proof). */
export function addDays(key: DateKey, delta: number): DateKey {
  return utcKey(new Date(keyToUtcMs(key) + delta * DAY_MS));
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((keyToUtcMs(to) - keyToUtcMs(from)) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (new Date(keyToUtcMs(key)).getUTCDay() + 6) % 7;
}

/** Monday of the Monday–Sunday week containing `now`'s local day (P4). */
export function weekStartKey(now: Date): DateKey {
  const today = localDateKey(now);
  return addDays(today, -weekdayIndex(today));
}

/** The latest day `pauseUntil` accepts from `now`: today + MAX_PAUSE_DAYS (for Settings' date picker). */
export function maxPauseUntil(now: Date): DateKey {
  return addDays(localDateKey(now), MAX_PAUSE_DAYS);
}

/** The most recent day with any act, or null. Drives the 'quiet-return' notification. */
export function lastActDateKey(state: ProgressState): DateKey | null {
  return state.days.length > 0 ? state.days[state.days.length - 1] : null;
}

/* =========================================================================
 * Display helpers
 * ========================================================================= */

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
 * Transitions
 * ========================================================================= */

/** Distinct, ascending, last DAYS_KEPT. */
function normalizeDays(days: readonly DateKey[]): DateKey[] {
  return [...new Set(days)].sort().slice(-DAYS_KEPT);
}

/** Record one loop act at `now`. Adds the local day (P1), bumps nightsShownUp on a new day, bumps lifetime[act]. */
export function recordAct(state: ProgressState, act: LoopAct, now: Date): ProgressState {
  const key = localDateKey(now);
  const known = state.days.includes(key);
  // A day older than everything kept, with storage full, may have been pruned:
  // never count it twice (P2 may undercount, never overcount).
  const maybePruned = !known && state.days.length >= DAYS_KEPT && key < state.days[0];
  const isNewNight = !known && !maybePruned;

  const actsToday = state.today && state.today.dateKey === key ? state.today.acts : [];
  return {
    ...state,
    days: isNewNight ? normalizeDays([...state.days, key]) : state.days,
    nightsShownUp: state.nightsShownUp + (isNewNight ? 1 : 0),
    today: { dateKey: key, acts: actsToday.includes(act) ? actsToday : [...actsToday, act] },
    lifetime: { ...state.lifetime, [act]: state.lifetime[act] + 1 },
  };
}

function clampTarget(target: number, fallback: number): number {
  if (!Number.isFinite(target)) return fallback;
  return Math.min(RHYTHM_TARGET.max, Math.max(RHYTHM_TARGET.min, Math.round(target)));
}

/** Clamp to RHYTHM_TARGET. A non-number keeps the current target. */
export function setRhythmTarget(state: ProgressState, target: number): ProgressState {
  const next = clampTarget(target, state.rhythmTarget);
  return next === state.rhythmTarget ? state : { ...state, rhythmTarget: next };
}

/**
 * Pause through `until` (inclusive), clamped to now + MAX_PAUSE_DAYS. A day
 * before today clears the pause. Extending a running pause keeps its start.
 */
export function pauseUntil(state: ProgressState, until: DateKey, now: Date): ProgressState {
  if (!isDateKey(until)) return state;
  const today = localDateKey(now);
  if (until < today) return resumeProgress(state);
  const max = maxPauseUntil(now);
  const end = until > max ? max : until;
  const from = isPaused(state, now) && state.pausedFrom && state.pausedFrom <= today ? state.pausedFrom : today;
  return { ...state, pausedUntil: end, pausedFrom: from };
}

/** Clear the pause. */
export function resumeProgress(state: ProgressState): ProgressState {
  if (state.pausedUntil === null && !state.pausedFrom) return state;
  return { ...state, pausedUntil: null, pausedFrom: null };
}

/** True when `now`'s local day is on or before pausedUntil. */
export function isPaused(state: ProgressState, now: Date): boolean {
  return state.pausedUntil !== null && localDateKey(now) <= state.pausedUntil;
}

/* =========================================================================
 * Derived views
 * ========================================================================= */

function inPause(state: ProgressState, key: DateKey, today: DateKey): boolean {
  if (state.pausedUntil === null || key > state.pausedUntil) return false;
  // Values written before pausedFrom existed: treat the pause as starting today.
  return key >= (state.pausedFrom ?? today);
}

/** The Monday–Sunday rhythm for the week containing `now` (P3, P4). */
export function weeklyRhythm(state: ProgressState, now: Date): WeeklyRhythm {
  const today = localDateKey(now);
  const weekStart = weekStartKey(now);
  const shown = new Set(state.days);
  const days: WeekDay[] = [];
  for (let index = 0; index < 7; index += 1) {
    const dateKey = addDays(weekStart, index);
    let dayState: WeekDayState;
    if (shown.has(dateKey)) dayState = "shown-up";
    else if (inPause(state, dateKey, today)) dayState = "paused";
    else if (dateKey === today) dayState = "today-open";
    else dayState = dateKey < today ? "rest" : "future";
    days.push({ dateKey, index, state: dayState });
  }
  const shownUp = days.filter((d) => d.state === "shown-up").length;
  const target = clampTarget(state.rhythmTarget, RHYTHM_TARGET.default);
  return { weekStart, target, shownUp, met: shownUp >= target, days };
}

/** Everything Today and Settings need in one call. */
export function summarize(state: ProgressState, stars: number, now: Date): ProgressSummary {
  const paused = isPaused(state, now);
  const today = localDateKey(now);
  return {
    nightsShownUp: state.nightsShownUp,
    stars,
    chipLabel: formatNightsStars(state.nightsShownUp, stars),
    week: weeklyRhythm(state, now),
    paused,
    pausedUntil: paused ? state.pausedUntil : null,
    doneToday: state.today?.dateKey === today ? state.today.acts : [],
  };
}

/* =========================================================================
 * Parsing and migration
 * ========================================================================= */

function asObject(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function dayList(value: unknown): DateKey[] {
  return Array.isArray(value) ? normalizeDays(value.filter(isDateKey)) : [];
}

function isLoopAct(value: unknown): value is LoopAct {
  return typeof value === "string" && (LOOP_ACTS as readonly string[]).includes(value);
}

/** Lenient parse of a stored value (object or JSON string); anything malformed → emptyProgress(). */
export function parseProgress(raw: unknown): ProgressState {
  const o = asObject(raw);
  if (!o) return emptyProgress();
  const days = dayList(o.days);
  const today = asObject(o.today);
  const lifetime = asObject(o.lifetime) ?? {};
  const pausedUntil = isDateKey(o.pausedUntil) ? o.pausedUntil : null;
  const pausedFrom = pausedUntil && isDateKey(o.pausedFrom) && o.pausedFrom <= pausedUntil ? o.pausedFrom : null;
  return {
    version: PROGRESS_VERSION,
    days,
    // Never below the days we can still see (P2).
    nightsShownUp: Math.max(count(o.nightsShownUp), days.length),
    today:
      today && isDateKey(today.dateKey) && Array.isArray(today.acts)
        ? { dateKey: today.dateKey, acts: [...new Set(today.acts.filter(isLoopAct))] }
        : null,
    rhythmTarget: clampTarget(typeof o.rhythmTarget === "number" ? o.rhythmTarget : NaN, RHYTHM_TARGET.default),
    pausedUntil,
    pausedFrom,
    lifetime: {
      "chapter-heard": count(lifetime["chapter-heard"]),
      proof: count(lifetime.proof),
      "line-carried": count(lifetime["line-carried"]),
      "ritual-saved": count(lifetime["ritual-saved"]),
    },
  };
}

const V1_PRACTICE_ACT: Readonly<Record<string, LoopAct>> = {
  story: "chapter-heard",
  affirmation: "line-carried",
  script: "ritual-saved",
};

/**
 * Migrate the 1.0 'vela.ritual.v1' value ({days, todayKey, todayDone}).
 * days → days; nightsShownUp = distinct day count (pruning means it may
 * undercount, never overcount); todayDone story→chapter-heard,
 * affirmation→line-carried, script→ritual-saved. Lifetime counters start from
 * today's acts, the only per-act history 1.0 kept.
 */
export function progressFromRitualV1(raw: unknown): ProgressState {
  const o = asObject(raw);
  if (!o) return emptyProgress();
  const days = dayList(o.days);
  const acts = Array.isArray(o.todayDone)
    ? [...new Set(o.todayDone.map((p) => (typeof p === "string" ? V1_PRACTICE_ACT[p] : undefined)).filter(isLoopAct))]
    : [];
  const todayKey = isDateKey(o.todayKey) ? o.todayKey : null;
  const base = emptyProgress();
  const lifetime = { ...base.lifetime };
  if (todayKey) for (const act of acts) lifetime[act] = 1;
  return {
    ...base,
    days,
    nightsShownUp: days.length,
    today: todayKey && acts.length > 0 ? { dateKey: todayKey, acts } : null,
    lifetime,
  };
}

/* =========================================================================
 * Proof Ledger
 * ========================================================================= */

const KIND_RANK: Readonly<Record<ProofKind, number>> = { did: 0, moved: 1, learned: 2 };

/**
 * The sentence of the week: a 'did' beats 'moved' beats 'learned' (the step
 * itself is the headline), then the fuller sentence, then the most recent.
 */
function pickSentence(proofs: readonly Proof[]): Proof | null {
  let best: Proof | null = null;
  for (const p of proofs) {
    if (!p.text.trim()) continue;
    if (
      !best ||
      KIND_RANK[p.kind] < KIND_RANK[best.kind] ||
      (KIND_RANK[p.kind] === KIND_RANK[best.kind] &&
        (p.text.length > best.text.length || (p.text.length === best.text.length && p.createdAt > best.createdAt)))
    ) {
      best = p;
    }
  }
  return best;
}

/** Proofs whose dateKey falls in the Monday–Sunday week containing `now`. */
export function weeklyLedger(proofs: readonly Proof[], now: Date): ProofLedger {
  const weekStart = weekStartKey(now);
  const weekEnd = addDays(weekStart, 6);
  const week = proofs.filter((p) => p.dateKey >= weekStart && p.dateKey <= weekEnd);
  const counts: Record<ProofKind, number> = { did: 0, moved: 0, learned: 0 };
  for (const p of week) if (p.kind in counts) counts[p.kind] += 1;
  return { weekStart, weekEnd, total: week.length, counts, sentenceOfWeek: pickSentence(week) };
}

/** Show the Sunday Proof Ledger card: `now` is the ledger's Sunday and the week has ≥ LEDGER_MIN_PROOFS proofs. */
export function shouldShowLedger(ledger: ProofLedger, now: Date): boolean {
  return localDateKey(now) === ledger.weekEnd && ledger.total >= LEDGER_MIN_PROOFS;
}
