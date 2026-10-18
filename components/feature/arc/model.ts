// MEMORY BOOK MODEL (Arc tab). Pure view-model: it turns one dream's chapters,
// bridges and proofs (from useArc() selectors) into the rows the timeline
// renders, in the order things happened. No React, no storage, no clock: the
// caller passes `today`, so bun can test it.
//
// Ordering rule (ELEVATE §0.9, CONTRACTS §4.1):
// - Seasons ascending. Each season opens with a divider row.
// - Within a season, each chapter is followed by the bridge chosen at its end
//   and the proof that resolved that bridge, so the book reads
//   Chapter → Bridge → Proof → next Chapter (the one woven from that proof).
// - A proof that resolved no bridge (the onboarding seed, a migrated 1.0
//   proof) sits where it happened: before the first chapter written after it.
// - Lapsed bridges are hidden (they were superseded, never chosen).
// - A dream migrated from 1.0 opens with an honest 'Your book starts here'
//   plate: 1.0 kept one chapter at a time, so earlier chapters don't exist.
import {
  STARS_PER_SEASON,
  type Bridge,
  type ChapterMeta,
  type DateKey,
  type Dream,
  type Proof,
  type ProofKind,
} from "@/contexts/arc.types";
import { addDays, daysBetween, isDateKey, localDateKey } from "@/lib/progress";
import { dreamGivenName, dreamName as sharedDreamName } from "@/lib/dreams";
import { countOf, spoken } from "@/lib/a11y";

export interface SeasonRow {
  readonly kind: "season";
  readonly key: string;
  readonly season: number;
  /** Named Sky name for that season, if named. */
  readonly name: string | null;
  readonly stars: number;
  readonly complete: boolean;
  /** The dream's current season. */
  readonly current: boolean;
  /** Local day the season's first event happened (its first chapter or proof). */
  readonly startedOn: DateKey | null;
  /** Local day it was named, if named. */
  readonly namedOn: DateKey | null;
}

export interface BookStartRow {
  readonly kind: "book-start";
  readonly key: string;
  /** Number of the first kept chapter (IV when 1.0 had already reached it). */
  readonly firstChapter: number;
  /** Proofs logged in 1.0 before that chapter. */
  readonly earlierProofs: number;
}

export interface ChapterRow {
  readonly kind: "chapter";
  readonly key: string;
  readonly meta: ChapterMeta;
  /** Stars lit in its season when it was written (its cover shows exactly these). */
  readonly lit: number;
  /** Kinds of that season's stars, star 1 first (for the cover). */
  readonly kinds: readonly ProofKind[];
  readonly writtenOn: DateKey;
  readonly heard: boolean;
  /** The dream's newest chapter. */
  readonly latest: boolean;
}

export interface BridgeRow {
  readonly kind: "bridge";
  readonly key: string;
  readonly bridge: Bridge;
  readonly chosenOn: DateKey;
}

export interface ProofRow {
  readonly kind: "proof";
  readonly key: string;
  readonly proof: Proof;
  /** Day N of this dream (the day it began is Day 1). */
  readonly day: number;
  /** Number of the chapter this proof was woven into, if any. */
  readonly wovenIntoNumber: number | null;
}

/** The dashed course after the newest chapter of a season still being written. */
export interface CourseRow {
  readonly kind: "course";
  readonly key: string;
  readonly season: number;
  /** Stage of the next chapter (written from the next proof). */
  readonly nextStage: number;
  readonly starsLeft: number;
  /** The newest chapter is VII: the next star completes the season instead of writing a chapter. */
  readonly final: boolean;
}

export type TimelineRow = SeasonRow | BookStartRow | ChapterRow | BridgeRow | ProofRow | CourseRow;

export interface TimelineInput {
  readonly dream: Dream;
  /** arc.chapters(dreamId): ascending by (season, number). */
  readonly chapters: readonly ChapterMeta[];
  /** arc.bridges(dreamId): lapsed included (hidden here). */
  readonly bridges: readonly Bridge[];
  /** arc.proofs(dreamId): ascending by createdAt. */
  readonly proofs: readonly Proof[];
  /** The dream is in the loop (arc.weavingDreamIds). Only a weaving dream shows the course ahead. Default true. */
  readonly weaving?: boolean;
}

const byCreated = <T extends { readonly createdAt: string }>(a: T, b: T) => a.createdAt.localeCompare(b.createdAt);

/** Local day of an ISO instant (never an ISO/UTC slice). */
export function dayOf(iso: string): DateKey {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : localDateKey(d);
}

/** True when the dream's book began with a chapter carried over from Vela 1.0. */
export function isMigratedBook(chapters: readonly ChapterMeta[]): boolean {
  return chapters.length > 0 && chapters[0].source === "migrated-v1";
}

export function buildTimeline({ dream, chapters, bridges, proofs, weaving = true }: TimelineInput): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const start = dayOf(dream.createdAt);
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const live = bridges.filter((b) => b.status !== "lapsed");
  const bridgeById = new Map(live.map((b) => [b.id, b]));
  const latestId = chapters.length > 0 ? chapters[chapters.length - 1].id : null;
  const seasons = [...new Set([...chapters.map((c) => c.season), ...proofs.map((p) => p.season), dream.season])].sort((a, b) => a - b);
  const placed = new Set<string>();

  const proofRow = (p: Proof): ProofRow => {
    placed.add(p.id);
    const woven = p.wovenInChapterId ? chapterById.get(p.wovenInChapterId) : undefined;
    const day = isDateKey(start) && isDateKey(p.dateKey) ? Math.max(1, daysBetween(start, p.dateKey) + 1) : 1;
    return { kind: "proof", key: `proof-${p.id}`, proof: p, day, wovenIntoNumber: woven ? woven.number : null };
  };

  seasons.forEach((season, si) => {
    const sChapters = chapters.filter((c) => c.season === season);
    const sProofs = proofs.filter((p) => p.season === season).slice().sort(byCreated);
    const kinds = sProofs.map((p) => p.kind);
    const named = dream.constellations.find((c) => c.season === season) ?? null;
    const firstEvent = [...sChapters.map((c) => c.createdAt), ...sProofs.map((p) => p.createdAt)].sort()[0];
    rows.push({
      kind: "season",
      key: `season-${season}`,
      season,
      name: named?.name ?? null,
      stars: sProofs.length,
      complete: sProofs.length >= STARS_PER_SEASON,
      current: season === dream.season,
      startedOn: firstEvent ? dayOf(firstEvent) : null,
      namedOn: named ? dayOf(named.namedAt) : null,
    });

    if (si === 0 && isMigratedBook(chapters)) {
      const first = chapters[0];
      rows.push({
        kind: "book-start",
        key: "book-start",
        firstChapter: first.number,
        earlierProofs: proofs.filter((p) => p.createdAt <= first.createdAt && !p.bridgeId).length,
      });
    }

    // A proof is attached when it resolved a bridge the book shows; the rest are loose.
    const loose = sProofs.filter((p) => !(p.bridgeId && bridgeById.has(p.bridgeId)));
    const flushLoose = (until: string | null) => {
      for (const p of loose) {
        if (placed.has(p.id)) continue;
        if (until !== null && p.createdAt > until) continue;
        rows.push(proofRow(p));
      }
    };

    for (const meta of sChapters) {
      flushLoose(meta.createdAt);
      rows.push({
        kind: "chapter",
        key: `chapter-${meta.id}`,
        meta,
        lit: sProofs.filter((p) => p.createdAt <= meta.createdAt).length,
        kinds,
        writtenOn: dayOf(meta.createdAt),
        heard: meta.heardAt !== null,
        latest: meta.id === latestId,
      });
      const bridge = (meta.bridgeId ? bridgeById.get(meta.bridgeId) : undefined) ?? live.find((b) => b.chapterId === meta.id);
      if (bridge) {
        rows.push({ kind: "bridge", key: `bridge-${bridge.id}`, bridge, chosenOn: dayOf(bridge.createdAt) });
        const proof = bridge.proofId ? sProofs.find((p) => p.id === bridge.proofId) : undefined;
        if (proof && !placed.has(proof.id)) rows.push(proofRow(proof));
      }
    }
    flushLoose(null);
    // Attached proofs whose chapter isn't in this season (defensive: never drop a proof).
    for (const p of sProofs) if (!placed.has(p.id)) rows.push(proofRow(p));

    const latestInSeason = sChapters[sChapters.length - 1];
    if (weaving && season === dream.season && latestInSeason && sProofs.length < STARS_PER_SEASON && dream.status === "active") {
      rows.push({
        kind: "course",
        key: `course-${season}`,
        season,
        nextStage: Math.min(latestInSeason.stage + 1, STARS_PER_SEASON),
        starsLeft: STARS_PER_SEASON - sProofs.length,
        final: latestInSeason.stage >= STARS_PER_SEASON,
      });
    }
  });
  return rows;
}

/* =========================================================================
 * Header figures
 * ========================================================================= */

export interface DreamStats {
  readonly chapters: number;
  readonly proofs: number;
  readonly nights: number;
}

/** The ledger under a dream, read aloud: '1 chapter, 2 proofs, 1 night.' */
export function statsLabel(stats: DreamStats): string {
  return spoken(`${countOf(stats.chapters, "chapter")}, ${countOf(stats.proofs, "proof")}, ${countOf(stats.nights, "night")}`);
}

/**
 * A proof in the Memory Book, read aloud: 'Star 2. I did it, day 3. Sent my
 * portfolio to two studios I admire. Today · Woven into Chapter III.' The
 * user's sentence keeps its own closing mark (never 'admire..').
 */
export function proofNodeLabel(p: { starIndex: number; label: string; day: number; text: string; notes: string }): string {
  return spoken(`Star ${p.starIndex}`, `${p.label}, day ${p.day}`, p.text, p.notes);
}

/**
 * Nights shown up since this dream began: distinct local days with any loop
 * act (lib/progress P1) on or after the dream's first day. For a user's only
 * dream this equals Today's 'n nights'. `days` is pruned to the last 400, so
 * lifetime nights older than the kept window are added back when the dream
 * predates it.
 */
export function nightsSince(startedOn: DateKey, days: readonly DateKey[], lifetimeNights: number): number {
  if (!isDateKey(startedOn)) return lifetimeNights;
  const kept = days.filter((d) => d >= startedOn).length;
  const pruned = Math.max(0, lifetimeNights - days.length);
  const predatesWindow = days.length > 0 && startedOn < days[0];
  return Math.min(lifetimeNights, kept + (predatesWindow ? pruned : 0));
}

export function dreamStats(input: TimelineInput, days: readonly DateKey[], lifetimeNights: number): DreamStats {
  return {
    chapters: input.chapters.length,
    proofs: input.proofs.length,
    nights: nightsSince(dayOf(input.dream.createdAt), days, lifetimeNights),
  };
}

/* =========================================================================
 * Dreams
 * ========================================================================= */

/** Switcher order: the order the dreams began (oldest first). Stable, so resting or releasing one never makes the pills jump. */
export function orderDreams(dreams: readonly Dream[]): Dream[] {
  return [...dreams].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/* =========================================================================
 * Names and dates
 * ========================================================================= */

/** A dream's short name: its label, else its newest named sky, else null (show the user's words). */
export function dreamName(dream: Dream): string | null {
  return dreamGivenName(dream);
}

/** Sentence-cased first words of the desire for a switcher pill: 'My own design studio'. The shared rule in lib/dreams. */
export function dreamShortName(dream: Dream, maxWords = 4): string {
  return sharedDreamName(dream, maxWords);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** '5 Oct', '5 Oct 2025' outside the current year. */
export function shortDate(dateKey: DateKey, today: DateKey): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return "";
  const label = `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1] ?? ""}`;
  return m[1] === today.slice(0, 4) ? label : `${label} ${m[1]}`;
}

/** 'Mon 5 Oct' (weekday from the calendar date, immune to DST). */
export function weekdayDate(dateKey: DateKey, today: DateKey): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return "";
  const wd = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return `${WEEKDAYS_SHORT[wd]} ${shortDate(dateKey, today)}`;
}

/** 'Today', 'Yesterday' or 'Mon 5 Oct'. */
export function relativeDate(dateKey: DateKey, today: DateKey): string {
  if (dateKey === today) return "Today";
  if (isDateKey(today) && dateKey === addDays(today, -1)) return "Yesterday";
  return weekdayDate(dateKey, today);
}
