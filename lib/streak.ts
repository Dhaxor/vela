// Streak arithmetic over local-date keys. Pure and timezone-honest: a "day"
// is the user's wall-clock day, so the key is built from local components,
// never from ISO/UTC strings.

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

/**
 * Current streak as of `now`: consecutive days ending today or yesterday.
 * A streak isn't broken until a full day has actually been missed — showing
 * 0 at 7am before the user has done their morning ritual would be cruel and
 * wrong.
 */
export function computeStreak(days: ReadonlySet<string>, now: Date): number {
  let cursor: Date;
  if (days.has(dateKey(now))) {
    cursor = now;
  } else if (days.has(dateKey(shiftDays(now, -1)))) {
    cursor = shiftDays(now, -1);
  } else {
    return 0;
  }

  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

/** True when today's practice would extend (or start) the streak. */
export function practicedToday(days: ReadonlySet<string>, now: Date): boolean {
  return days.has(dateKey(now));
}

/** Keeps storage bounded: only the last `keep` distinct days matter. */
export function pruneDays(days: readonly string[], keep = 400): string[] {
  return [...new Set(days)].sort().slice(-keep);
}
