// Settings v2 helpers: ritual times, reminder summaries, the pause choices and
// the backup summary line. Pure (tested in time.test.ts); date keys come from
// lib/progress so they stay LOCAL calendar dates.
import type { HHmm, RitualTime, RitualTimes } from "@/contexts/user.types";
import type { DateKey } from "@/contexts/arc.types";
import { addDays, localDateKey, maxPauseUntil, MAX_PAUSE_DAYS } from "@/lib/progress";
import type { BackupSummary } from "@/lib/backup";

export type RitualSlot = "morning" | "evening";

export const SLOT_LABEL: Readonly<Record<RitualSlot, string>> = { morning: "Morning", evening: "Evening" };

/** The slots a ritual uses, morning first. */
export function slotsFor(ritual: RitualTime): RitualSlot[] {
  return ritual === "both" ? ["morning", "evening"] : [ritual];
}

/** 'HH:mm' → { h, m }, or null when malformed. */
export function parseHHmm(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

export function toHHmm(h: number, m: number): HHmm {
  const hh = ((Math.round(h) % 24) + 24) % 24;
  const mm = ((Math.round(m) % 60) + 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Move a time by whole hours, wrapping around midnight. */
export function stepHour(value: HHmm, delta: number): HHmm {
  const t = parseHHmm(value) ?? { h: 21, m: 0 };
  return toHHmm(t.h + delta, t.m);
}

/** Move the minutes by `step` (default 5), snapping to the grid and wrapping within the hour. */
export function stepMinutes(value: HHmm, delta: number, step = 5): HHmm {
  const t = parseHHmm(value) ?? { h: 21, m: 0 };
  const snapped = Math.round(t.m / step) * step;
  const next = (((snapped + delta * step) % 60) + 60) % 60;
  return toHHmm(t.h, next);
}

/** Does this device read time on a 12-hour clock? */
export function deviceUses12h(): boolean {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 !== false;
  } catch {
    return false;
  }
}

/** '9:00 PM' on a 12-hour clock, '21:00' on a 24-hour one. */
export function formatClock(value: HHmm, hour12: boolean = deviceUses12h()): string {
  const t = parseHHmm(value);
  if (!t) return value;
  if (!hour12) return toHHmm(t.h, t.m);
  const suffix = t.h < 12 ? "AM" : "PM";
  const h = t.h % 12 === 0 ? 12 : t.h % 12;
  return `${h}:${String(t.m).padStart(2, "0")} ${suffix}`;
}

/** The hour as the stepper shows it: '9 PM' on a 12-hour clock, '21' on a 24-hour one. */
export function hourLabel(value: HHmm, hour12: boolean = deviceUses12h()): string {
  const t = parseHHmm(value);
  if (!t) return "";
  if (!hour12) return String(t.h).padStart(2, "0");
  return `${t.h % 12 === 0 ? 12 : t.h % 12} ${t.h < 12 ? "AM" : "PM"}`;
}

/** The ritual's reminder times in words: '9:00 PM', or '8:00 AM and 9:00 PM'. */
export function ritualTimesLabel(ritual: RitualTime, times: RitualTimes, hour12?: boolean): string {
  return slotsFor(ritual)
    .map((slot) => formatClock(times[slot], hour12))
    .join(" and ");
}

/** Quick picks in the time sheet. */
export const TIME_PRESETS: Readonly<Record<RitualSlot, readonly HHmm[]>> = {
  morning: ["06:30", "07:00", "08:00", "09:00"],
  evening: ["20:00", "21:00", "22:00", "23:00"],
};

/* ------------------------------------------------------------------ pause */

export interface PauseOption {
  readonly nights: number;
  readonly label: string;
  /** Last paused day (inclusive), what progress.pauseUntil takes. */
  readonly until: DateKey;
  /** The day the sky picks up again. */
  readonly resumes: DateKey;
}

const PAUSE_CHOICES: readonly { nights: number; label: string }[] = [
  { nights: 3, label: "3 nights" },
  { nights: 7, label: "A week" },
  { nights: 14, label: "Two weeks" },
  { nights: MAX_PAUSE_DAYS, label: `${MAX_PAUSE_DAYS} nights` },
];

/** 'Pause my sky' choices from today, never past maxPauseUntil (today + 30). */
export function pauseOptions(now: Date): PauseOption[] {
  const today = localDateKey(now);
  const max = maxPauseUntil(now);
  return PAUSE_CHOICES.map(({ nights, label }) => {
    const wanted = addDays(today, nights - 1);
    const until = wanted > max ? max : wanted;
    return { nights, label, until, resumes: addDays(until, 1) };
  });
}

/** A local date key as 'Wed 28 Oct'. */
export function formatDay(key: DateKey): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
  return `${weekday} ${date.getDate()} ${month}`;
}

/** 'Resumes Wed 28 Oct' for a pause whose last paused day is `pausedUntil`. */
export function resumesLabel(pausedUntil: DateKey): string {
  return `Resumes ${formatDay(addDays(pausedUntil, 1))}`;
}

/* ----------------------------------------------------------------- backup */

/** '14 chapters', with a no-break space so a count never wraps away from its noun. */
function count(n: number, one: string, many: string): string {
  return `${n}\u00a0${n === 1 ? one : many}`;
}

/** '2 dreams · 14 chapters · 9 proofs · 4 pages' (parts with nothing are left out). */
export function backupSummaryLine(s: BackupSummary): string {
  const parts = [
    count(s.dreams, "dream", "dreams"),
    s.chapters ? count(s.chapters, "chapter", "chapters") : null,
    s.proofs ? count(s.proofs, "proof", "proofs") : null,
    s.pages ? count(s.pages, "page", "pages") : null,
    s.scenes ? count(s.scenes, "Scene", "Scenes") : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** A backup's export instant as '21 Oct 2026', or null when unreadable. */
export function exportedOn(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}
