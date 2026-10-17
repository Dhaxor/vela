// 'Save for 21:00' after a Star Birth: the shared rule in lib/ritualTime, with
// the default evening ritual when the profile has no valid time.
import type { ProfileV2 } from "@/contexts/user.types";
import { DEFAULT_RITUAL_TIMES } from "@/contexts/user.types";
import { nextRitualMoment } from "@/lib/ritualTime";

export interface RitualSlot {
  /** The next ritual instant (local wall time). */
  readonly at: Date;
  /** 'HH:mm', as the user set it. */
  readonly label: string;
  /** True when the slot falls on a later calendar day than `now`. */
  readonly later: boolean;
}

/** The next ritual time strictly after `now` (lib/ritualTime). No profile, or no valid time, falls back to 21:00. */
export function nextRitual(profile: Pick<ProfileV2, "ritual" | "ritualTimes"> | null | undefined, now: Date): RitualSlot {
  const moment =
    nextRitualMoment(profile?.ritual ?? "evening", profile?.ritualTimes ?? DEFAULT_RITUAL_TIMES, now) ??
    nextRitualMoment("evening", DEFAULT_RITUAL_TIMES, now)!;
  return { at: moment.at, label: moment.hhmm, later: moment.tomorrow };
}
