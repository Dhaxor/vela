// NotificationSnapshot builder: the pure half of useLoopEffects. It reads the
// arc through ArcValue's own selectors (no re-mapping) and the profile with
// ProfileV2 defaults, so it works with the 1.0 profile shape as well.

import type { ArcValue, DateKey, Dream } from "@/contexts/arc.types";
import { DEFAULT_RITUAL_TIMES, PROFILE_V2_DEFAULTS, type RitualTime, type RitualTimes } from "@/contexts/user.types";
import { localDateKey, type ProgressState } from "@/lib/progress";
import { parseHHmm } from "./templates";
import type { NotificationDreamState, NotificationSnapshot } from "./types";

/** The profile fields notifications read. ProfileV2 satisfies it; so does the 1.0 profile (defaults fill the rest). */
export interface SnapshotProfile {
  readonly name: string;
  readonly ritual: RitualTime;
  readonly ritualTimes?: RitualTimes;
  readonly remindersEnabled?: boolean;
  readonly lockScreenPrivate?: boolean;
}

export type ArcReader = Pick<
  ArcValue,
  | "weavingDreamIds"
  | "activeDreamId"
  | "dream"
  | "loopState"
  | "latestChapter"
  | "openBridge"
  | "proofs"
  | "seasonProgress"
  | "dreams"
>;

export interface SnapshotInput {
  readonly profile: SnapshotProfile;
  readonly arc: ArcReader;
  readonly progress: Pick<ProgressState, "pausedUntil" | "nightsShownUp" | "days">;
  readonly now: Date;
  /** The desire shaper's noun phrase, when available. */
  readonly desireNp?: (dream: Dream) => string | null;
}

function ritualTimesOf(profile: SnapshotProfile): RitualTimes {
  const t = profile.ritualTimes;
  return {
    morning: t && parseHHmm(t.morning) ? t.morning : DEFAULT_RITUAL_TIMES.morning,
    evening: t && parseHHmm(t.evening) ? t.evening : DEFAULT_RITUAL_TIMES.evening,
  };
}

/** Weaving dreams, the focused one first; the rest keep the arc's order (newest first). */
function orderedWeavingIds(arc: ArcReader): string[] {
  const weaving = arc.weavingDreamIds;
  const focused = weaving.filter((id) => id === arc.activeDreamId);
  return [...focused, ...weaving.filter((id) => id !== arc.activeDreamId)];
}

export function buildNotificationSnapshot(input: SnapshotInput): NotificationSnapshot {
  const { profile, arc, progress, now } = input;
  const dreams: NotificationDreamState[] = [];
  for (const id of orderedWeavingIds(arc)) {
    const dream = arc.dream(id);
    if (!dream) continue;
    const proofs = arc.proofs(id);
    dreams.push({
      dream,
      loop: arc.loopState(id, now),
      latestChapter: arc.latestChapter(id) ?? null,
      openBridge: arc.openBridge(id) ?? null,
      latestProof: proofs.length > 0 ? proofs[proofs.length - 1] : null,
      season: arc.seasonProgress(id) ?? null,
      proofCount: proofs.length,
      desireNp: input.desireNp?.(dream) ?? null,
    });
  }
  const proofDateKeys: DateKey[] = [];
  for (const dream of arc.dreams) for (const p of arc.proofs(dream.id)) proofDateKeys.push(p.dateKey);

  // The last act, from progress and from the arc itself (a proof, a heard
  // chapter), so a missing or lagging progress store never reads as quiet days.
  const actDays = [...proofDateKeys];
  if (progress.days.length > 0) actDays.push(progress.days[progress.days.length - 1]);
  for (const d of dreams) {
    const heard = d.latestChapter?.heardAt ? Date.parse(d.latestChapter.heardAt) : NaN;
    if (Number.isFinite(heard)) actDays.push(localDateKey(new Date(heard)));
  }
  const lastActDateKey = actDays.length > 0 ? actDays.reduce((a, b) => (b > a ? b : a)) : null;

  return {
    enabled: profile.remindersEnabled ?? PROFILE_V2_DEFAULTS.remindersEnabled,
    lockScreenPrivate: profile.lockScreenPrivate ?? PROFILE_V2_DEFAULTS.lockScreenPrivate,
    pausedUntil: progress.pausedUntil,
    name: profile.name,
    ritual: profile.ritual,
    ritualTimes: ritualTimesOf(profile),
    dreams,
    nightsShownUp: progress.nightsShownUp,
    lastActDateKey,
    proofDateKeys,
  };
}

/**
 * A compact signature of everything planQueue reads, so useLoopEffects can
 * rebuild on real changes only, however often the providers re-render.
 */
export function snapshotKey(s: NotificationSnapshot): string {
  const dreams = s.dreams.map((d) => {
    const c = d.latestChapter;
    const b = d.openBridge;
    return [
      d.dream.id,
      d.dream.status,
      d.dream.desire,
      d.dream.createdAt,
      d.loop.kind,
      c ? [c.id, c.number, c.stage, c.title, c.heardAt, c.savedForAt].join(",") : "",
      b ? [b.id, b.status, b.text, b.remindAt, b.ifThen?.when, b.ifThen?.then].join(",") : "",
      d.latestProof ? [d.latestProof.id, d.latestProof.text, d.latestProof.dateKey].join(",") : "",
      d.season ? [d.season.stars, d.season.complete].join(",") : "",
      d.proofCount ?? "",
      d.desireNp ?? "",
    ].join("|");
  });
  return JSON.stringify([
    s.enabled,
    s.lockScreenPrivate,
    s.pausedUntil,
    s.name,
    s.ritual,
    s.ritualTimes.morning,
    s.ritualTimes.evening,
    s.nightsShownUp,
    s.lastActDateKey,
    s.proofDateKeys ?? [],
    dreams,
  ]);
}
