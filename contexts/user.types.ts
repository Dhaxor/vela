// PROFILE v2 (UserContext). FROZEN CONTRACT.
//
// Steward: A2 (contexts/UserContext.tsx). Consumers: onboarding (S1), reader
// (S3: voice, rate, textSize, bed, pronunciation), settings (S7),
// notifications (A6: ritual times, reminders, lock-screen privacy).
// Stored under STORAGE_KEYS.profile ('vela.profile.v2'), migrated from
// 'vela.profile.v1' (which stays untouched). Additive changes only.
//
// Leaf module: type imports only.
//
// Note: the weekly rhythm target and 'Pause my sky' live in ProgressState
// (lib/progress.ts), not here. Pause and rhythm are progress semantics.

import type { FocusId } from "@/lib/focus";
import type { BedId, NarrationRate } from "@/lib/audio/types";

/** Same union as 1.0 (contexts/UserContext.tsx RitualTime). */
export type RitualTime = "morning" | "evening" | "both";

/** 24-hour local wall time 'HH:mm', e.g. '21:00'. */
export type HHmm = string;

/** Reader text size. S is the design default (Newsreader 17/28); M and L are accessibility steps (19, 21). Sizes live in constants/theme.ts (A1). */
export type TextSize = "S" | "M" | "L";

export interface RitualTimes {
  readonly morning: HHmm;
  readonly evening: HHmm;
}

export interface ProfileV2 {
  readonly version: 2;
  readonly name: string;
  /** How to say the name. Narration substitutes it into TTS text only. null = say the name as written. */
  readonly pronunciation: string | null;
  readonly focusAreas: readonly FocusId[];
  /** Which ritual(s) the user keeps. Selects which of ritualTimes the reminders use. */
  readonly ritual: RitualTime;
  /** Both times are always present; `ritual` decides which are used. */
  readonly ritualTimes: RitualTimes;
  /** User intent for reminders. OS permission is separate (lib/notifications getPermission). */
  readonly remindersEnabled: boolean;
  /** 'Keep my words off the Lock Screen'. Default true: notifications use neutral templates only. */
  readonly lockScreenPrivate: boolean;
  /** RankedVoice.identifier, or null for the best ranked voice. */
  readonly voiceId: string | null;
  readonly rate: NarrationRate;
  readonly textSize: TextSize;
  /** Default bed in the reader. A Plus bed falls back to 'night' when Plus is not active. */
  readonly bed: BedId;
  /** false = 'Silence' (the voice alone) in the reader. Absent means a bed plays. Additive (1.1 Phase 3). */
  readonly bedOn?: boolean;
  readonly createdAt: string;
  /** 1.0 onboarding mood. Kept for backups; never read. */
  readonly mood?: string;
}

export const DEFAULT_RITUAL_TIMES: RitualTimes = { morning: "08:00", evening: "21:00" };

/** Defaults applied when migrating a v1 profile or filling a missing field. */
export const PROFILE_V2_DEFAULTS = {
  pronunciation: null,
  ritual: "both",
  ritualTimes: DEFAULT_RITUAL_TIMES,
  remindersEnabled: true,
  lockScreenPrivate: true,
  voiceId: null,
  rate: 0.9,
  textSize: "S",
  bed: "night",
} as const satisfies Partial<ProfileV2>;
