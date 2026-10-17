// planQueue: the pure planner behind the rolling notification queue
// (docs/CONTRACTS.md §11, rules N1 N4 N5). No clock, no storage, no native
// calls: (snapshot, now, history) → plan + history, so it is tested exhaustively.
//
// What gets planned, for the next HORIZON days, assuming the user does nothing
// more (every action triggers a rebuild that replans from scratch):
// - ritual-chapter / ritual-bridge at each ritual time: ONE per ritual time,
//   about the dream whose turn it is (weaving dreams take turns slot by slot;
//   a dream with nothing to ask passes its turn on). An unheard latest chapter → 'ritual-chapter' (opens the
//   reader). A heard one → 'ritual-bridge': its open bridge opens the proof
//   form; with no bridge chosen yet it opens the chapter, whose end holds the
//   bridge chooser. Quiet when the loop is done for today (proof saved,
//   chapter heard), when the chapter was saved for a later time, and after a
//   complete, heard season.
// - ifthen at the open bridge's remindAt; next-woven at a chapter's savedForAt.
// - ledger on Sunday at the ritual time once the week holds ≥ 2 proofs.
// - quiet-return once per quiet spell, after quietReturnAfterDays quiet days.
// A ritual cue within an hour of any of those is dropped (one voice at a time).
// Days on or before pausedUntil plan nothing; reminders resume the day after.
// While a pause runs, the 10-day horizon starts on that resume day, not today:
// the queue is only rebuilt while the app is open, so a horizon that began
// today would leave a 14- or 30-night pause with nothing planned after it, and
// reminders would never 'resume' for the user who stepped away.

import type { ChapterMeta, DateKey, DreamId, IsoTime } from "@/contexts/arc.types";
import type { HHmm } from "@/contexts/user.types";
import { NOTIFICATIONS } from "@/lib/content/notifications";
import { addDays, daysBetween, LEDGER_MIN_PROOFS, localDateKey, weekdayIndex } from "@/lib/progress";
import { STAGES, type NotificationLibrary, type NotificationSlot, type Token } from "@/lib/story/content/types";
import { APP_HOME_URL, urlForChapter, urlForEvidence } from "./routing";
import {
  agoPhrase,
  countValues,
  curlyQuote,
  formatRitualTime,
  midSentence,
  noteDelivered,
  parseHHmm,
  pickTemplate,
  romanNumeral,
  type TokenValues,
} from "./templates";
import {
  ID_PREFIX,
  NOTIFICATION_LIMITS,
  type NotificationDreamState,
  type NotificationSnapshot,
  type PendingTemplate,
  type PlannedNotification,
  type TemplateHistory,
} from "./types";

/** Deterministic, so an unchanged plan keeps its identifiers across rebuilds. */
export function notificationId(slot: NotificationSlot, dreamId: DreamId | null, fireAt: IsoTime): string {
  return `${ID_PREFIX}${slot}-${dreamId ?? "all"}-${fireAt}`;
}

interface Candidate {
  readonly slot: NotificationSlot;
  readonly at: Date;
  readonly url: string;
  /** The dream it is about (null for ledger and quiet-return, which speak for the whole sky). */
  readonly dream: NotificationDreamState | null;
  readonly chapter: ChapterMeta | null;
  /** The ritual time in {ritual.time}. */
  readonly ritualTime: HHmm;
  /** Ledger only: proofs in the Sunday's week. */
  readonly weekProofs?: number;
  readonly spell?: DateKey;
}

/* =========================================================================
 * History
 * ========================================================================= */

/** Move every pending template whose time has passed into `used`; those notifications were delivered. */
export function settleHistory(history: TemplateHistory, now: Date): TemplateHistory {
  const pending = [...(history.pending ?? [])].sort((a, b) => a.fireAt.localeCompare(b.fireAt));
  const used: Partial<Record<NotificationSlot, readonly string[]>> = { ...history.used };
  let quietSpell = history.quietSpell ?? null;
  const waiting: PendingTemplate[] = [];
  for (const entry of pending) {
    if (Date.parse(entry.fireAt) > now.getTime()) {
      waiting.push(entry);
      continue;
    }
    used[entry.slot] = noteDelivered(used[entry.slot] ?? [], entry.templateId);
    if (entry.slot === "quiet-return" && entry.spell) quietSpell = entry.spell;
  }
  return { version: 1, used, pending: waiting, quietSpell };
}

/* =========================================================================
 * Time helpers (local wall clock; the device zone is the user's zone)
 * ========================================================================= */

/** The instant of `time` on local day `key`. A time skipped by DST lands just after the gap, as iOS does. */
function localInstant(key: DateKey, time: HHmm): Date | null {
  const t = parseHHmm(time);
  if (!t) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, t.hour, t.minute);
}

function horizonEnd(from: Date): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + NOTIFICATION_LIMITS.horizonDays);
  return end;
}

/** The planning window: [from, end], starting on firstDay (today, or the day a running pause ends). */
interface PlanWindow {
  readonly firstDay: DateKey;
  readonly from: Date;
  readonly end: Date;
}

/** Today's window, or, while a pause runs, the window that opens the day after it ends. */
export function planWindow(pausedUntil: DateKey | null, now: Date): PlanWindow {
  const today = localDateKey(now);
  if (!pausedUntil || pausedUntil < today) return { firstDay: today, from: now, end: horizonEnd(now) };
  const firstDay = addDays(pausedUntil, 1);
  const [y, m, d] = firstDay.split("-").map(Number);
  const midnight = new Date(y, m - 1, d);
  const from = midnight > now ? midnight : now;
  return { firstDay, from, end: horizonEnd(from) };
}

/** The user's ritual times for one day, in order. */
function ritualSlots(snapshot: NotificationSnapshot): HHmm[] {
  const { morning, evening } = snapshot.ritualTimes;
  if (snapshot.ritual === "morning") return [morning];
  if (snapshot.ritual === "evening") return [evening];
  return [morning, evening];
}

/** The time a non-ritual notification quotes in {ritual.time}, and the ledger's time: the evening ritual when kept. */
function mainRitualTime(snapshot: NotificationSnapshot): HHmm {
  return snapshot.ritual === "morning" ? snapshot.ritualTimes.morning : snapshot.ritualTimes.evening;
}

function parseInstant(iso: IsoTime | null | undefined): Date | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/* =========================================================================
 * Candidates
 * ========================================================================= */

/** What one dream asks for at a ritual time on `day`, or null when it should stay quiet. */
function ritualCue(
  state: NotificationDreamState,
  day: DateKey,
  today: DateKey,
  now: Date
): { slot: NotificationSlot; url: string; chapter: ChapterMeta } | null {
  const chapter = state.latestChapter;
  if (!chapter) return null;
  const heard = chapter.heardAt !== null;
  // Season complete and its last chapter heard: Today offers the Named Sky; no cue.
  if (state.season?.complete && heard) return null;
  // Loop done for today: proof saved and the chapter it opened already heard.
  if (day === today && state.latestProof?.dateKey === today && heard) return null;
  // Saved for later: the 'next-woven' notification speaks for that chapter, on that day.
  const savedFor = parseInstant(chapter.savedForAt);
  if (!heard && savedFor && savedFor > now && day <= localDateKey(savedFor)) return null;
  if (state.openBridge && state.openBridge.status === "open") {
    return { slot: "ritual-bridge", url: urlForEvidence(state.dream.id), chapter };
  }
  return { slot: heard ? "ritual-bridge" : "ritual-chapter", url: urlForChapter(chapter.id), chapter };
}

function ritualCandidates(snapshot: NotificationSnapshot, now: Date, firstDay: DateKey): Candidate[] {
  const today = localDateKey(now);
  const out: Candidate[] = [];
  const n = snapshot.dreams.length;
  const times = ritualSlots(snapshot);
  for (let d = 0; d <= NOTIFICATION_LIMITS.horizonDays; d += 1) {
    const day = addDays(firstDay, d);
    for (const [index, time] of times.entries()) {
      const at = localInstant(day, time);
      if (!at) continue;
      // Dreams take turns by an absolute slot number, so the rotation is stable across rebuilds.
      const slot = daysBetween("2000-01-03", day) * times.length + index;
      const turn = ((slot % n) + n) % n;
      for (let k = 0; k < n; k += 1) {
        const state = snapshot.dreams[(turn + k) % n];
        const cue = ritualCue(state, day, today, now);
        if (!cue) continue;
        out.push({ ...cue, at, dream: state, ritualTime: time });
        break;
      }
    }
  }
  return out;
}

function ifThenCandidates(snapshot: NotificationSnapshot): Candidate[] {
  const out: Candidate[] = [];
  for (const state of snapshot.dreams) {
    const bridge = state.openBridge;
    const at = bridge && bridge.status === "open" ? parseInstant(bridge.remindAt) : null;
    if (!at) continue;
    out.push({
      slot: "ifthen",
      at,
      url: urlForEvidence(state.dream.id),
      dream: state,
      chapter: state.latestChapter,
      ritualTime: mainRitualTime(snapshot),
    });
  }
  return out;
}

function nextWovenCandidates(snapshot: NotificationSnapshot): Candidate[] {
  const out: Candidate[] = [];
  for (const state of snapshot.dreams) {
    const chapter = state.latestChapter;
    const at = chapter && chapter.heardAt === null ? parseInstant(chapter.savedForAt) : null;
    if (!chapter || !at) continue;
    out.push({
      slot: "next-woven",
      at,
      url: urlForChapter(chapter.id),
      dream: state,
      chapter,
      ritualTime: mainRitualTime(snapshot),
    });
  }
  return out;
}

function ledgerCandidates(snapshot: NotificationSnapshot, firstDay: DateKey): Candidate[] {
  const keys = snapshot.proofDateKeys ?? [];
  const time = mainRitualTime(snapshot);
  const out: Candidate[] = [];
  for (let d = 0; d <= NOTIFICATION_LIMITS.horizonDays; d += 1) {
    const day = addDays(firstDay, d);
    if (weekdayIndex(day) !== 6) continue;
    const weekStart = addDays(day, -6);
    const weekProofs = keys.filter((k) => k >= weekStart && k <= day).length;
    const at = localInstant(day, time);
    if (!at || weekProofs < LEDGER_MIN_PROOFS) continue;
    out.push({ slot: "ledger", at, url: APP_HOME_URL, dream: null, chapter: null, ritualTime: time, weekProofs });
  }
  return out;
}

/** The day before the first quiet day: the last act, the end of a pause, or the first dream's start. */
function quietSpellStart(snapshot: NotificationSnapshot): DateKey | null {
  let start = snapshot.lastActDateKey;
  if (!start) {
    const created = snapshot.dreams
      .map((s) => parseInstant(s.dream.createdAt))
      .filter((d): d is Date => d !== null)
      .map(localDateKey)
      .sort();
    start = created[0] ?? null;
  }
  if (!start) return null;
  // Paused days are rest the user chose: they never count as quiet.
  return snapshot.pausedUntil && snapshot.pausedUntil > start ? snapshot.pausedUntil : start;
}

function quietReturnCandidate(snapshot: NotificationSnapshot, now: Date, history: TemplateHistory, firstDay: DateKey): Candidate | null {
  const spell = quietSpellStart(snapshot);
  if (!spell || history.quietSpell === spell) return null;
  const first = addDays(spell, NOTIFICATION_LIMITS.quietReturnAfterDays + 1);
  for (let d = 0; d <= NOTIFICATION_LIMITS.horizonDays; d += 1) {
    const day = addDays(firstDay, d);
    if (day < first) continue;
    for (const time of ritualSlots(snapshot)) {
      const at = localInstant(day, time);
      if (at && at > now) {
        return { slot: "quiet-return", at, url: APP_HOME_URL, dream: null, chapter: null, ritualTime: time, spell };
      }
    }
  }
  return null;
}

/* =========================================================================
 * Token values
 * ========================================================================= */

function tokenValues(snapshot: NotificationSnapshot, c: Candidate): TokenValues {
  const values: Partial<Record<Token, string>> = {
    "{name}": snapshot.name.trim() || "friend",
    "{ritual.time}": formatRitualTime(c.ritualTime),
  };
  const nights = countValues(snapshot.nightsShownUp, "nights");
  if (nights) {
    values["{nights.count}"] = nights.count;
    values["{nights.phrase}"] = nights.phrase;
  }

  // Sky-wide notifications speak about the focused dream when they quote one.
  const state = c.dream ?? snapshot.dreams[0] ?? null;
  const chapter = c.chapter ?? state?.latestChapter ?? null;
  if (chapter) {
    values["{chapter.numeral}"] = romanNumeral(chapter.number);
    values["{chapter.title}"] = chapter.title.trim();
    values["{stage.name}"] = STAGES[chapter.stage]?.name;
  }
  const proofs = c.slot === "ledger" ? c.weekProofs ?? 0 : state ? state.proofCount ?? state.season?.stars ?? 0 : 0;
  const counted = countValues(proofs, "proofs");
  if (counted) {
    values["{proofs.count}"] = counted.count;
    values["{proofs.phrase}"] = counted.phrase;
  }
  if (!state) return values;

  values["{desire.quote}"] = curlyQuote(state.dream.desire);
  if (state.desireNp) values["{desire.np}"] = state.desireNp;
  const bridge = state.openBridge && state.openBridge.status === "open" ? state.openBridge : null;
  if (bridge) {
    values["{bridge.quote}"] = curlyQuote(bridge.text);
    if (bridge.ifThen) {
      values["{ifthen.when}"] = midSentence(bridge.ifThen.when);
      values["{ifthen.then}"] = midSentence(bridge.ifThen.then);
    }
  }
  const proof = state.latestProof;
  if (proof) {
    values["{proof.quote}"] = curlyQuote(proof.text);
    const ago = agoPhrase(daysBetween(proof.dateKey, localDateKey(c.at)));
    if (ago) values["{proof.ago}"] = ago;
  }
  return values;
}

/* =========================================================================
 * planQueue
 * ========================================================================= */

function collides(ritual: Candidate, specific: readonly Candidate[]): boolean {
  return specific.some((s) => Math.abs(s.at.getTime() - ritual.at.getTime()) < NOTIFICATION_LIMITS.collisionWindowMs);
}

/**
 * Pure (N1, N4, N5). Returns the plan sorted by fireAt plus the updated
 * rotation history (delivered templates settled into `used`, the new plan as
 * `pending`). Same inputs, same plan: rebuilding without a change is a no-op.
 */
export function planQueue(
  input: NotificationSnapshot,
  now: Date,
  history: TemplateHistory,
  library: NotificationLibrary = NOTIFICATIONS
): { readonly planned: readonly PlannedNotification[]; readonly history: TemplateHistory } {
  const settled = settleHistory(history, now);
  // Defensive: the snapshot should already hold weaving dreams only.
  const snapshot: NotificationSnapshot = { ...input, dreams: input.dreams.filter((s) => s.dream.status === "active") };
  if (!snapshot.enabled || snapshot.dreams.length === 0) {
    return { planned: [], history: { ...settled, pending: [] } };
  }

  const { firstDay, from, end } = planWindow(snapshot.pausedUntil, now);
  const inWindow = (c: Candidate) =>
    c.at > now && c.at >= from && c.at <= end && !(snapshot.pausedUntil && localDateKey(c.at) <= snapshot.pausedUntil);

  const quiet = quietReturnCandidate(snapshot, now, settled, firstDay);
  const specific = [
    ...ifThenCandidates(snapshot),
    ...nextWovenCandidates(snapshot),
    ...ledgerCandidates(snapshot, firstDay),
    ...(quiet ? [quiet] : []),
  ].filter(inWindow);
  const rituals = ritualCandidates(snapshot, now, firstDay)
    .filter(inWindow)
    .filter((r) => !collides(r, specific));
  const candidates = [...specific, ...rituals].sort(
    (a, b) => a.at.getTime() - b.at.getTime() || a.slot.localeCompare(b.slot)
  );

  const used: Partial<Record<NotificationSlot, readonly string[]>> = { ...settled.used };
  const planned: PlannedNotification[] = [];
  const pending: PendingTemplate[] = [];
  const ids = new Set<string>();
  for (const c of candidates) {
    if (planned.length >= NOTIFICATION_LIMITS.maxPending) break;
    const fireAt = c.at.toISOString();
    const dreamId = c.dream?.dream.id ?? null;
    const id = notificationId(c.slot, dreamId, fireAt);
    if (ids.has(id)) continue;
    const pick = pickTemplate(library[c.slot] ?? [], used[c.slot] ?? [], tokenValues(snapshot, c), snapshot.lockScreenPrivate);
    if (!pick) continue;
    used[c.slot] = pick.used;
    ids.add(id);
    planned.push({ id, slot: c.slot, fireAt, title: pick.copy.title, body: pick.copy.body, url: c.url, dreamId, templateId: pick.template.id });
    pending.push({ id, slot: c.slot, templateId: pick.template.id, fireAt, ...(c.spell ? { spell: c.spell } : {}) });
  }
  return { planned, history: { ...settled, pending } };
}
