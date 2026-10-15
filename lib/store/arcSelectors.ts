// Pure selectors over the arc index (contexts/arc.types.ts). useArc() binds
// them to the live state; the reducer, migration and tests share them. Cheap:
// they filter small arrays (a heavy user has a few hundred rows).

import {
  STARS_PER_SEASON,
  isSeasonComplete,
  weavingDreamIds,
  type ArcIndex,
  type Bridge,
  type BridgeOffer,
  type ChapterId,
  type ChapterMeta,
  type Dream,
  type DreamId,
  type LoopState,
  type Proof,
  type SeasonProgress,
} from "@/contexts/arc.types";
import { bridgeOffers } from "@/lib/futureMemory";
import { localDateKey } from "@/lib/progress";
import { primaryMotif } from "@/lib/story/motifs";
import { toRoman } from "@/lib/story/text";

export function dreamOf(index: ArcIndex, dreamId: DreamId | null | undefined): Dream | undefined {
  return dreamId ? index.dreams.find((d) => d.id === dreamId) : undefined;
}

const bySeasonNumber = (a: ChapterMeta, b: ChapterMeta) => a.season - b.season || a.number - b.number;
const byCreated = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/** Ascending by (season, number). */
export function chaptersOf(index: ArcIndex, dreamId: DreamId): ChapterMeta[] {
  return index.chapters.filter((c) => c.dreamId === dreamId).sort(bySeasonNumber);
}

export function chapterMetaOf(index: ArcIndex, chapterId: ChapterId): ChapterMeta | undefined {
  return index.chapters.find((c) => c.id === chapterId);
}

export function latestChapterOf(index: ArcIndex, dreamId: DreamId): ChapterMeta | undefined {
  const all = chaptersOf(index, dreamId);
  return all[all.length - 1];
}

/** The chapter before `chapterId` in reading order (across seasons). */
export function previousChapterOf(index: ArcIndex, chapterId: ChapterId): ChapterMeta | undefined {
  const meta = chapterMetaOf(index, chapterId);
  if (!meta) return undefined;
  const all = chaptersOf(index, meta.dreamId);
  return all[all.findIndex((c) => c.id === chapterId) - 1];
}

/** Ascending by createdAt, lapsed included. */
export function bridgesOf(index: ArcIndex, dreamId: DreamId): Bridge[] {
  return index.bridges.filter((b) => b.dreamId === dreamId).sort(byCreated);
}

export function openBridgeOf(index: ArcIndex, dreamId: DreamId): Bridge | undefined {
  return index.bridges.find((b) => b.dreamId === dreamId && b.status === "open");
}

/** Ascending by createdAt; optionally one season. */
export function proofsOf(index: ArcIndex, dreamId: DreamId, season?: number): Proof[] {
  return index.proofs
    .filter((p) => p.dreamId === dreamId && (season === undefined || p.season === season))
    .sort(byCreated);
}

/** Proofs that resolved a bridge (origin 'bridge' | 'not-today'): these advance the stage (I3). */
export function loopProofCount(index: ArcIndex, dreamId: DreamId, season: number): number {
  return proofsOf(index, dreamId, season).filter((p) => p.origin !== "onboarding").length;
}

export function seasonProgressOf(index: ArcIndex, dreamId: DreamId): SeasonProgress | undefined {
  const dream = dreamOf(index, dreamId);
  const latest = latestChapterOf(index, dreamId);
  if (!dream || !latest) return undefined;
  const stars = proofsOf(index, dreamId, dream.season).length;
  return {
    dreamId,
    season: dream.season,
    stage: latest.stage,
    stars,
    starsPerSeason: STARS_PER_SEASON,
    complete: isSeasonComplete(stars),
    constellationName: dream.constellations.find((c) => c.season === dream.season)?.name ?? null,
    chaptersWritten: chaptersOf(index, dreamId).filter((c) => c.season === dream.season).length,
  };
}

export function totalStarsOf(index: ArcIndex): number {
  return index.proofs.length;
}

export function weavingOf(index: ArcIndex, isPlus: boolean): DreamId[] {
  return weavingDreamIds(index.dreams, index.activeDreamId, isPlus);
}

/** Active but not weaving because Plus is not active (the Plus-lapse rule). */
export function planLockedOf(index: ArcIndex, isPlus: boolean): DreamId[] {
  const weaving = new Set(weavingOf(index, isPlus));
  return index.dreams.filter((d) => d.status === "active" && !weaving.has(d.id)).map((d) => d.id);
}

export function isWeaving(index: ArcIndex, dreamId: DreamId, isPlus: boolean): boolean {
  return weavingOf(index, isPlus).includes(dreamId);
}

/**
 * Today's loop card. Precedence, first match wins (arc.types LoopState):
 * empty → resting → next-woven [C] → sealed-until [D] → season-complete →
 * sealed-today [D] → bridge-open [B] → chapter-waiting [A].
 */
export function loopStateOf(index: ArcIndex, dreamId: DreamId | null, now: Date, isPlus: boolean): LoopState {
  const dream = dreamOf(index, dreamId);
  const latest = dream ? latestChapterOf(index, dream.id) : undefined;
  if (!dream || !latest) return { kind: "empty" };
  if (dream.status !== "active") return { kind: "resting", dreamId: dream.id, reason: dream.status };
  if (!isWeaving(index, dream.id, isPlus)) return { kind: "resting", dreamId: dream.id, reason: "plan-locked" };

  const today = localDateKey(now);
  const heard = latest.heardAt !== null;
  const savedLater = latest.savedForAt !== null && Date.parse(latest.savedForAt) > now.getTime();
  const woven = latest.wovenProofId ? index.proofs.find((p) => p.id === latest.wovenProofId) : undefined;

  if (woven && woven.dateKey === today && !heard && !savedLater) {
    return { kind: "next-woven", dreamId: dream.id, chapterId: latest.id, proofId: woven.id };
  }
  if (savedLater) return { kind: "sealed", dreamId: dream.id, chapterId: latest.id, until: latest.savedForAt };
  const season = seasonProgressOf(index, dream.id);
  if (season?.complete && heard) {
    return { kind: "season-complete", dreamId: dream.id, season: season.season, named: season.constellationName !== null };
  }
  const loopProofToday = index.proofs.some((p) => p.dreamId === dream.id && p.origin !== "onboarding" && p.dateKey === today);
  if (loopProofToday && heard) return { kind: "sealed", dreamId: dream.id, chapterId: latest.id, until: null };
  const open = openBridgeOf(index, dream.id);
  if (open) return { kind: "bridge-open", dreamId: dream.id, chapterId: latest.id, bridgeId: open.id };
  return { kind: "chapter-waiting", dreamId: dream.id, chapterId: latest.id, heard };
}

/** Kind of the dream's newest proof (drives the suggested bridge size). */
export function lastProofKindOf(index: ArcIndex, dreamId: DreamId): Proof["kind"] | null {
  const all = proofsOf(index, dreamId);
  return all.length > 0 ? all[all.length - 1].kind : null;
}

/**
 * The three sized bridge offers for a chapter: only for the latest chapter of
 * a weaving dream whose season is still open, and never once its bridge is resolved.
 */
export function offersFor(index: ArcIndex, chapterId: ChapterId, isPlus: boolean): BridgeOffer[] {
  const meta = chapterMetaOf(index, chapterId);
  if (!meta) return [];
  const dream = dreamOf(index, meta.dreamId);
  if (!dream || !isWeaving(index, dream.id, isPlus)) return [];
  if (latestChapterOf(index, dream.id)?.id !== chapterId) return [];
  if (seasonProgressOf(index, dream.id)?.complete) return [];
  const own = meta.bridgeId ? index.bridges.find((b) => b.id === meta.bridgeId) : undefined;
  if (own && (own.status === "crossed" || own.status === "learned")) return [];
  const past = bridgesOf(index, dream.id)
    .filter((b) => b.chapterId !== chapterId && b.libraryId)
    .map((b) => b.libraryId as string);
  return bridgeOffers({
    chapterId,
    focus: dream.focus,
    stage: meta.stage,
    desire: dream.desire,
    motifIds: dream.motifIds,
    lastProofKind: lastProofKindOf(index, dream.id),
    pastLibraryIds: past,
  });
}

/** Named Sky default per focus when no motif place fits. Original, plain, no astrology. */
const FOCUS_SKY_NAMES: Readonly<Record<Dream["focus"], string>> = {
  love: "The Open Door",
  abundance: "The Full Table",
  career: "The Workbench",
  health: "The Morning Path",
  confidence: "The Lantern",
  peace: "The Still Water",
};

const titleCase = (s: string) => s.replace(/(^|\s)(\p{Ll})/gu, (_, sp: string, c: string) => sp + c.toUpperCase());

/** 'The Studio' (from the matched motif's place), else a focus default; ' II' etc. from season 2. */
export function suggestConstellationNameOf(dream: Dream, season = dream.season): string {
  const place = primaryMotif(dream.motifIds)?.place;
  const base = place && /^the\s/iu.test(place) && place.split(" ").length <= 4 ? titleCase(place) : FOCUS_SKY_NAMES[dream.focus];
  return season > 1 ? `${base} ${toRoman(season)}` : base;
}
