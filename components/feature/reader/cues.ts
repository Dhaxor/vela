// Pure helpers for the reader: if-then cues and their reminder instants, the
// sleep-timer choices, the speed cycle and the short chapter labels used by
// the header and the prev/next links. No React, no React Native.

import type { ChapterMeta, IfThen } from "@/contexts/arc.types";
import type { HHmm, RitualTimes, RitualTime } from "@/contexts/user.types";
import { NARRATION_RATES, type NarrationRate, type SleepTimer } from "@/lib/audio/types";
import { toRoman } from "@/lib/sky/numerals";

/* =========================================================================
 * If-then cues ('If it's [9am / lunch / after work / other] and I hesitate…')
 * ========================================================================= */

export type CueId = "9am" | "lunch" | "after-work" | "other";

export interface Cue {
  readonly id: CueId;
  /** Chip label. */
  readonly label: string;
  /** IfThen.when, as it reads inside the line ('If it's {when} and I hesitate'). null = typed by the user. */
  readonly when: string | null;
  /** Local wall time of the reminder; null = no reminder (a custom cue has no clock). */
  readonly at: { readonly hour: number; readonly minute: number } | null;
}

export const CUES: readonly Cue[] = [
  { id: "9am", label: "9am", when: "9am", at: { hour: 9, minute: 0 } },
  { id: "lunch", label: "Lunch", when: "lunch", at: { hour: 12, minute: 30 } },
  { id: "after-work", label: "After work", when: "after work", at: { hour: 18, minute: 0 } },
  { id: "other", label: "Other", when: null, at: null },
];

export function cueById(id: CueId | null): Cue | null {
  return CUES.find((c) => c.id === id) ?? null;
}

/** The next local instant at hour:minute strictly after `now` (today, else tomorrow). DST-safe: built from local fields. */
export function nextLocalTime(hour: number, minute: number, now: Date): Date {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (at.getTime() > now.getTime()) return at;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0, 0);
}

/** ISO instant for a cue's reminder, or null when the cue has no clock. */
export function remindAtFor(cue: Cue | null, now: Date): string | null {
  if (!cue?.at) return null;
  return nextLocalTime(cue.at.hour, cue.at.minute, now).toISOString();
}

/** 'open the file.' → 'open the file' ; trims and collapses whitespace. */
export function cleanMove(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/[.!?…]+$/u, "").trim();
}

/** The if-then to store, or null unless both halves are present. */
export function buildIfThen(when: string | null, then: string): IfThen | null {
  const w = (when ?? "").replace(/\s+/g, " ").trim();
  const t = cleanMove(then);
  if (!w || !t) return null;
  return { when: w, then: t };
}

/** 'If it's 9am and I hesitate, then I open the sketchbook.' */
export function ifThenLine(ifThen: IfThen): string {
  return `If it’s ${ifThen.when} and I hesitate, then I ${cleanMove(ifThen.then)}.`;
}

/** Locale clock label for an instant: '9:00 AM' / '09:00'. */
export function clockLabel(at: Date): string {
  try {
    return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return `${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")}`;
  }
}

/** Parse 'HH:mm' (24h). Falls back to 21:00. */
export function parseHHmm(value: HHmm | null | undefined): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  const hour = m ? Number(m[1]) : 21;
  const minute = m ? Number(m[2]) : 0;
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60 ? { hour, minute } : { hour: 21, minute: 0 };
}

/** The next ritual instant (the 'ritual-bridge' reminder): evening for evening/both, else morning. */
export function nextRitualAt(ritual: RitualTime, times: RitualTimes, now: Date): Date {
  const { hour, minute } = parseHHmm(ritual === "morning" ? times.morning : times.evening);
  return nextLocalTime(hour, minute, now);
}

/* =========================================================================
 * Listening controls
 * ========================================================================= */

export type SleepChoice = "off" | "10" | "20" | "30" | "end";

export const SLEEP_CHOICES: readonly { readonly id: SleepChoice; readonly label: string; readonly timer: SleepTimer }[] = [
  { id: "off", label: "Off", timer: { kind: "off" } },
  { id: "10", label: "10 minutes", timer: { kind: "minutes", minutes: 10 } },
  { id: "20", label: "20 minutes", timer: { kind: "minutes", minutes: 20 } },
  { id: "30", label: "30 minutes", timer: { kind: "minutes", minutes: 30 } },
  { id: "end", label: "End of chapter", timer: { kind: "end-of-chapter" } },
];

export function sleepTimerFor(choice: SleepChoice): SleepTimer {
  return SLEEP_CHOICES.find((c) => c.id === choice)?.timer ?? { kind: "off" };
}

/** Tap-to-cycle speed: 0.8 → 0.9 → 1.0 → 0.8. */
export function nextRate(rate: NarrationRate): NarrationRate {
  const i = NARRATION_RATES.indexOf(rate);
  return NARRATION_RATES[(i + 1) % NARRATION_RATES.length] ?? NARRATION_RATES[0];
}

export function rateLabel(rate: number): string {
  return `${rate.toFixed(1)}×`;
}

/** 'about 3 min' from an estimate, never '0 min'. */
export function minutesLabel(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes} min`;
}

/* =========================================================================
 * Chapter labels
 * ========================================================================= */

/** 'IV · They Know Your Work' for prev/next links. */
export function chapterLinkLabel(meta: Pick<ChapterMeta, "number" | "title">): string {
  return `${toRoman(meta.number)} · ${meta.title}`;
}

/** Previous and next chapters of the same dream (across seasons), from arc.chapters(dreamId). */
export function neighbours<M extends Pick<ChapterMeta, "id">>(
  chapters: readonly M[],
  chapterId: string
): { prev: M | null; next: M | null } {
  const i = chapters.findIndex((c) => c.id === chapterId);
  if (i < 0) return { prev: null, next: null };
  return { prev: chapters[i - 1] ?? null, next: chapters[i + 1] ?? null };
}
