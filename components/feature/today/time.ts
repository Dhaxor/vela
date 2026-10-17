// Small, pure time helpers for Today: the greeting, the next ritual moment
// ('Save for 21:00') and friendly day phrases ('yesterday', '14 October').
// No React, no clock reads: callers pass `now` from lib/clock.
import type { RitualTime, RitualTimes } from "@/contexts/user.types";
import { addDays, daysBetween, localDateKey } from "@/lib/progress";
import { nextRitualMoment, type RitualMoment } from "@/lib/ritualTime";
export { saveForLabel, whenLabel } from "@/lib/ritualTime";

export type Greeting = "Good morning" | "Good afternoon" | "Good evening";

/** 04:00–11:59 morning, 12:00–17:59 afternoon, otherwise evening. */
export function greetingFor(now: Date): Greeting {
  const h = now.getHours();
  if (h >= 4 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

/** 'Tonight’s chapter' after 17:00 (and before 04:00), 'This morning’s chapter' before noon, else 'Today’s chapter'. */
export function chapterEyebrow(now: Date): string {
  const h = now.getHours();
  if (h >= 17 || h < 4) return "Tonight’s chapter";
  if (h < 12) return "This morning’s chapter";
  return "Today’s chapter";
}

export type NextRitual = RitualMoment;

/** The next ritual moment strictly after `now`: the shared rule in lib/ritualTime. */
export function nextRitual(ritual: RitualTime, times: RitualTimes, now: Date): NextRitual | null {
  return nextRitualMoment(ritual, times, now);
}

/** '21:00' from an ISO instant, in local wall time. */
export function wallTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** '14 October' from a local date key. */
export function dayMonth(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ""}`.trim();
}

/** 'today', 'yesterday' or 'on 14 October', relative to `now`. */
export function relativeDay(dateKey: string, now: Date): string {
  const today = localDateKey(now);
  if (dateKey === today) return "today";
  if (dateKey === addDays(today, -1)) return "yesterday";
  return `on ${dayMonth(dateKey)}`;
}

/** 'Day 9' of a dream: its first day is Day 1. */
export function dreamDay(dreamCreatedAt: string, dateKey: string): number {
  const start = localDateKey(new Date(dreamCreatedAt));
  return Math.max(1, daysBetween(start, dateKey) + 1);
}

/** Longest wait between two looks at the clock while Today is open. */
export const MAX_REFRESH_MS = 60 * 60 * 1000;

/**
 * When Today must look at the clock again, strictly after `now`: the next
 * whole local hour (the greeting, the chapter eyebrow and the day itself all
 * turn on the hour; midnight is one of them), or an earlier `boundary` such
 * as a chapter's 'saved for 21:30'. Pure.
 */
export function nextRefreshAt(now: Date, boundaries: readonly (string | null | undefined)[] = []): Date {
  const t = now.getTime();
  let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0).getTime();
  if (next <= t) next = t + MAX_REFRESH_MS;
  for (const b of boundaries) {
    const at = b ? Date.parse(b) : Number.NaN;
    if (Number.isFinite(at) && at > t && at < next) next = at;
  }
  return new Date(next);
}
