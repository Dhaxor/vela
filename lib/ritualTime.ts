// The next ritual moment: the one rule behind every 'Save for 21:00' (Today's
// woven card, the Star Birth dock). Pure: the clock is passed in, so the label
// and the instant always agree.
import type { RitualTime, RitualTimes } from "@/contexts/user.types";

export interface RitualMoment {
  /** The next ritual instant (local wall time). */
  readonly at: Date;
  /** The ritual's wall time as the user set it ('21:00'). */
  readonly hhmm: string;
  /** True when the moment falls on a later calendar day than `now`. */
  readonly tomorrow: boolean;
}

/** A minute of grace: at 21:00 sharp, 'Save for 21:00' would already be in the past. */
export const RITUAL_GRACE_MS = 60_000;

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/u;

/** 'HH:mm' (24h) → hour and minute, or null when malformed. */
export function parseRitualHHmm(value: string | null | undefined): { hour: number; minute: number } | null {
  const m = HHMM.exec((value ?? "").trim());
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

/**
 * The next ritual moment strictly after `now` (plus RITUAL_GRACE_MS): today's,
 * or tomorrow's once today's has passed. 'both' picks whichever of morning and
 * evening comes first. Malformed times are skipped; null when none is valid.
 */
export function nextRitualMoment(ritual: RitualTime, times: RitualTimes, now: Date): RitualMoment | null {
  const slots = ritual === "both" ? [times.morning, times.evening] : [ritual === "morning" ? times.morning : times.evening];
  let best: RitualMoment | null = null;
  for (const hhmm of slots) {
    const t = parseRitualHHmm(hhmm);
    if (!t) continue;
    for (const dayOffset of [0, 1]) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, t.hour, t.minute, 0, 0);
      if (at.getTime() <= now.getTime() + RITUAL_GRACE_MS) continue;
      const tomorrow = at.getDate() !== now.getDate() || at.getMonth() !== now.getMonth() || at.getFullYear() !== now.getFullYear();
      if (!best || at.getTime() < best.at.getTime()) best = { at, hhmm: hhmm.trim(), tomorrow };
      break;
    }
  }
  return best;
}

/** 'Save for 21:00' or 'Save for tomorrow, 21:00'. */
export function saveForLabel(moment: Pick<RitualMoment, "hhmm" | "tomorrow">): string {
  return moment.tomorrow ? `Save for tomorrow, ${moment.hhmm}` : `Save for ${moment.hhmm}`;
}

function hhmmOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/**
 * When a saved chapter opens, said plainly against `now`: '21:00' today,
 * 'tomorrow, 21:00', else '23 October, 21:00'. Empty for a bad instant.
 */
export function whenLabel(iso: string, now: Date): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(at) - day(now)) / 86_400_000);
  if (days === 0) return hhmmOf(at);
  if (days === 1) return `tomorrow, ${hhmmOf(at)}`;
  return `${at.getDate()} ${MONTHS[at.getMonth()]}, ${hhmmOf(at)}`;
}
