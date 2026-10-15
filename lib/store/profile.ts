// ProfileV2 (contexts/user.types.ts): lenient parse, v1 migration and patch
// validation. Every field is clamped to its allowed values, so a corrupt or
// hand-edited backup can never put an impossible value in front of a screen.

import {
  DEFAULT_RITUAL_TIMES,
  PROFILE_V2_DEFAULTS,
  type HHmm,
  type ProfileV2,
  type RitualTime,
  type TextSize,
} from "@/contexts/user.types";
import { BED_IDS, NARRATION_RATES, type BedId, type NarrationRate } from "@/lib/audio/types";
import { sanitizeFocusIds } from "@/lib/focus";
import { collapse } from "@/lib/story/text";

export const NAME_MAX = 40;
export const PRONUNCIATION_MAX = 40;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const RITUALS: readonly RitualTime[] = ["morning", "evening", "both"];
const SIZES: readonly TextSize[] = ["S", "M", "L"];

export function isHHmm(v: unknown): v is HHmm {
  return typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(v);
}

const cleanName = (v: unknown, max: number) => (typeof v === "string" ? collapse(v).slice(0, max) : "");

/** Build a full ProfileV2 from any partial input, applying defaults and clamps. null when the name is missing. */
export function normalizeProfile(input: Record<string, unknown>, fallbackCreatedAt: string): ProfileV2 | null {
  const name = cleanName(input.name, NAME_MAX);
  if (!name) return null;
  const times = isObj(input.ritualTimes) ? input.ritualTimes : {};
  const pronunciation = cleanName(input.pronunciation, PRONUNCIATION_MAX);
  const rate = NARRATION_RATES.find((r) => r === input.rate);
  const createdAt = typeof input.createdAt === "string" && Number.isFinite(Date.parse(input.createdAt)) ? input.createdAt : fallbackCreatedAt;
  return {
    version: 2,
    name,
    pronunciation: pronunciation || null,
    focusAreas: sanitizeFocusIds(input.focusAreas),
    ritual: RITUALS.includes(input.ritual as RitualTime) ? (input.ritual as RitualTime) : PROFILE_V2_DEFAULTS.ritual,
    ritualTimes: {
      morning: isHHmm(times.morning) ? times.morning : DEFAULT_RITUAL_TIMES.morning,
      evening: isHHmm(times.evening) ? times.evening : DEFAULT_RITUAL_TIMES.evening,
    },
    remindersEnabled: typeof input.remindersEnabled === "boolean" ? input.remindersEnabled : PROFILE_V2_DEFAULTS.remindersEnabled,
    lockScreenPrivate: typeof input.lockScreenPrivate === "boolean" ? input.lockScreenPrivate : PROFILE_V2_DEFAULTS.lockScreenPrivate,
    voiceId: typeof input.voiceId === "string" && input.voiceId.trim() ? input.voiceId : null,
    rate: (rate ?? PROFILE_V2_DEFAULTS.rate) as NarrationRate,
    textSize: SIZES.includes(input.textSize as TextSize) ? (input.textSize as TextSize) : PROFILE_V2_DEFAULTS.textSize,
    bed: BED_IDS.includes(input.bed as BedId) ? (input.bed as BedId) : PROFILE_V2_DEFAULTS.bed,
    createdAt,
    ...(typeof input.mood === "string" && input.mood ? { mood: input.mood.slice(0, 40) } : {}),
  };
}

/** Stored 'vela.profile.v2' value → ProfileV2, or null when absent or unusable. */
export function parseProfileV2(raw: unknown, now: Date): ProfileV2 | null {
  return isObj(raw) && raw.version === 2 ? normalizeProfile(raw, now.toISOString()) : null;
}

/** 1.0 'vela.profile.v1' ({name, focusAreas, ritual, mood?, createdAt}) → ProfileV2 with defaults. */
export function profileFromV1(raw: unknown, now: Date): ProfileV2 | null {
  return isObj(raw) ? normalizeProfile({ ...raw, version: 2 }, now.toISOString()) : null;
}

/** Apply a patch; fields that fail validation keep their old value. */
export function patchProfile(profile: ProfileV2, patch: Partial<Omit<ProfileV2, "version" | "createdAt">>): ProfileV2 {
  const merged = normalizeProfile({ ...profile, ...patch }, profile.createdAt);
  return merged ?? profile;
}
