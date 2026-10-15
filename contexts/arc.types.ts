// ARC DATA MODEL v2 + ArcContext public API. FROZEN CONTRACT.
//
// Steward: A2 (owns contexts/**). Everyone else builds against this file.
// Changes are additive only (new optional field, new selector) and are logged
// in docs/CONTRACTS.md §Changelog. Prose, examples and the rationale for every
// rule below: docs/CONTRACTS.md §4–§5.
//
// This module is a LEAF: no React, no AsyncStorage, no context imports. It holds
// types plus a few tiny pure helpers that ENCODE the binding rules, so lib/**
// may import it (and bun can test it) without loading React Native.
//
// Vocabulary: a Dream (v1 "intent") runs in Seasons of seven stages. Each
// Chapter ends with a Bridge (one real step for today). Crossing it, or
// saying 'Not today', records a Proof (a star). The proof is woven, in the
// user's words, into the next chapter.
//
// ─── INVARIANTS (A2 enforces them; lib/story tests and migrate tests check them) ───
// I1  Every dream has ≥ 1 chapter, and its current season has ≥ 1 chapter:
//     Chapter I is written in the same transaction that starts a season.
// I2  Within (dream, season), chapter numbers are unique and each new chapter is
//     previous + 1. A migrated season may start above 1 ('Your book starts
//     here'). number === stage for every chapter.
// I3  A new chapter's stage = stageForCompletedProofs(n), where n = proofs in its
//     season with origin 'bridge' | 'not-today' at write time. Chapter I of a
//     season is stage 1. Onboarding seed proofs never advance the stage.
// I4  Each proof is woven AT MOST once: proof.wovenInChapterId is set once and
//     never reassigned; exactly one chapter has wovenProofId === proof.id, and
//     exactly one paragraph in it carries wovenProofId. Older proofs return
//     only through recall/cumulative lines, never as a second weave.
// I5  saveProofAndWeave weaves the saved proof into the chapter it writes, in
//     the same transaction. The only unwoven v2 proof is a season's 7th star
//     when that season's Chapter VII already exists; beginNextSeason weaves it
//     into the next Chapter I. Migrated v1 proofs may stay unwoven.
// I6  At most ONE bridge with status 'open' per dream, and it belongs to the
//     dream's latest chapter. A chapter has at most one bridge.
// I7  A bridge that is crossed|learned has exactly one proof, linked both ways.
// I8  Within (dream, season), proof starIndex values are exactly 1..n (n ≤ 7),
//     in createdAt order. A season is complete iff it has 7 stars.
// I9  A complete season accepts no new bridge and no new proof. dream.season
//     advances only through beginNextSeason.
// I10 Chapters are immutable. The per-chapter key is written once when the
//     chapter is created, and rewritten only by rerenderChapter. A rerender
//     keeps id, dreamId, season, number, stage, wovenProofId and bridgeId, and
//     increments revision. Only the latest chapter of a weaving dream can be
//     rerendered.
// I11 proof.dateKey is the LOCAL calendar date at save time (never ISO/UTC slicing).
// I12 Plus-lapse rule: every dream stays readable. Mutating loop actions on a
//     dream that is not weaving reject with 'dream-not-weaving'.
// I13 'released' is terminal (only a backup import can change it).
// I14 activeDreamId is null iff there is no non-released dream; it never points
//     at a released dream.
// I15 Write order: chapter keys first, index last. The index never references a
//     chapter key that has not been written.

import type { FocusId } from "@/lib/focus";
import type {
  BridgeTier,
  Daypart,
  MotifId,
  ParagraphBeat,
  ProofKind,
  StageId,
} from "@/lib/story/content/types";

export type { BridgeTier, Daypart, MotifId, ProofKind, StageId };

/* =========================================================================
 * Scalars
 * ========================================================================= */

export type DreamId = string; // == the v1 intentId for migrated dreams (deep links keep working)
export type ChapterId = string; // == the v1 story id for the migrated current chapter
export type BridgeId = string;
export type ProofId = string;
/** ISO-8601 instant, e.g. new Date().toISOString(). */
export type IsoTime = string;
/** LOCAL calendar date 'YYYY-MM-DD' (lib/progress localDateKey). */
export type DateKey = string;

export const ARC_SCHEMA_VERSION = 2 as const;
export const STARS_PER_SEASON = 7;
/** Free tier: one dream with status 'active' at a time. Plus: unlimited. */
export const FREE_ACTIVE_DREAMS = 1;

/** Input bounds. The reducer trims/collapses whitespace and rejects empty values. */
export const LIMITS = {
  desire: 200,
  feeling: 24,
  dreamLabel: 40,
  constellationName: 40,
  proofText: 240,
  bridgeOwnText: 180,
  ifThenWhen: 40,
  ifThenThen: 120,
  /** Rolling repetition guard per dream (fragment ids, newest last). */
  usedIds: 400,
} as const;

/* =========================================================================
 * Entities
 * ========================================================================= */

/** active = in the loop · resting = paused by the user (or by the free-tier swap) · released = let go (terminal, still readable). */
export type DreamStatus = "active" | "resting" | "released";

export interface NamedConstellation {
  readonly season: number;
  readonly name: string;
  readonly namedAt: IsoTime;
}

export interface Dream {
  readonly id: DreamId;
  readonly focus: FocusId;
  /** The user's own words, trimmed. Shaped into {desire.*} tokens at render time. */
  readonly desire: string;
  /** Lowercase feeling chip id ('proud'). */
  readonly feeling: string;
  /** Display name from renameDream. null → UI derives one from the desire. */
  readonly label: string | null;
  readonly createdAt: IsoTime;
  readonly status: DreamStatus;
  readonly statusChangedAt: IsoTime;
  /** 1-based current season. */
  readonly season: number;
  readonly seasonStartedAt: IsoTime;
  /** One entry per named season (Named Sky). Ascending by season. */
  readonly constellations: readonly NamedConstellation[];
  /** Repetition guard: content ids used by recent chapters, newest last, capped at LIMITS.usedIds. */
  readonly usedIds: readonly string[];
  /** Motif archetypes matched from the desire (re-matched when a season changes the desire). */
  readonly motifIds: readonly MotifId[];
}

/** Highlight span inside Paragraph.text. UTF-16 offsets, [start, end), sorted, non-overlapping. */
export type SpanKind = "desire" | "proof" | "name";

export interface Span {
  readonly kind: SpanKind;
  readonly start: number;
  readonly end: number;
  /** Set on 'proof' spans (woven or recalled) so the reader can jump to a given proof's highlight. */
  readonly proofId?: ProofId;
}

export interface Paragraph {
  /** Unique within the chapter, identical across daypart variants ('p0'…). Narration and React keys use it. */
  readonly key: string;
  /** Content id it was rendered from ('sh3-se2', 'wv-d-ar4'; 'v1:<id>' for migrated text). */
  readonly fragmentId: string;
  readonly beat: ParagraphBeat;
  /** Final text with tokens substituted. Plain text, no markup. */
  readonly text: string;
  readonly spans: readonly Span[];
  /** Present on the ONE paragraph that weaves a proof (shows 'Woven from your proof'). */
  readonly wovenProofId?: ProofId;
}

export interface DaypartPair<T> {
  readonly morning: T;
  readonly evening: T;
}

export type ChapterSource = "engine" | "chapter-one" | "migrated-v1";

/**
 * Full chapter text, stored under chapterStorageKey(id) (lib/storageKeys).
 * Immutable per revision. Holds NO mutable loop fields (those live on ChapterMeta).
 * Both daypart variants of opening/closing are stored; one is chosen at READ time
 * with paragraphsForDaypart(chapter, daypartAt(now)).
 */
export interface Chapter {
  readonly id: ChapterId;
  readonly dreamId: DreamId;
  readonly season: number;
  readonly number: number;
  readonly stage: StageId;
  readonly title: string;
  /** 1 on first write, +1 per rerender. Readers tolerate chapter.revision ≥ meta.revision. */
  readonly revision: number;
  /** When this revision was written. */
  readonly writtenAt: IsoTime;
  readonly source: ChapterSource;
  readonly wovenProofId: ProofId | null;
  readonly opening: DaypartPair<Paragraph>;
  /** Everything between opening and closing, in reading order (recall, beats, weave, motif, cumulative). */
  readonly body: readonly Paragraph[];
  readonly closing: DaypartPair<Paragraph>;
  readonly wordCount: DaypartPair<number>;
  /** Engine version that wrote this revision (golden-test stability). */
  readonly engineVersion: number;
}

/** Index entry for a chapter. Lives in the arc index; carries the mutable loop fields. */
export interface ChapterMeta {
  readonly id: ChapterId;
  readonly dreamId: DreamId;
  readonly season: number;
  readonly number: number;
  readonly stage: StageId;
  readonly title: string;
  readonly revision: number;
  readonly source: ChapterSource;
  readonly createdAt: IsoTime;
  readonly revisedAt: IsoTime | null;
  readonly wovenProofId: ProofId | null;
  /** The bridge chosen at the end of this chapter. null until chooseBridge. */
  readonly bridgeId: BridgeId | null;
  /** First time the chapter was heard/read to the end (markHeard). */
  readonly heardAt: IsoTime | null;
  /** 'Save for 21:00': the reader deferred this chapter to this instant. */
  readonly savedForAt: IsoTime | null;
}

/** '2min' | '15min' | 'brave' from the library, or 'own' (written by the user). */
export type BridgeOfferTier = BridgeTier | "own";

/** open = chosen, awaiting proof · crossed = did/moved proof · learned = learned proof (incl. Not today) · lapsed = superseded, hidden. */
export type BridgeStatus = "open" | "crossed" | "learned" | "lapsed";

/** 'If it's {when} and I hesitate, then I {then}.' */
export interface IfThen {
  /** Cue label: '9am', 'lunch', 'after work' or custom. ≤ LIMITS.ifThenWhen. */
  readonly when: string;
  /** First move, a verb phrase without 'I': 'open the portfolio file'. ≤ LIMITS.ifThenThen. */
  readonly then: string;
}

export interface Bridge {
  readonly id: BridgeId;
  readonly dreamId: DreamId;
  readonly chapterId: ChapterId;
  readonly season: number;
  readonly tier: BridgeOfferTier;
  /** BridgeEntry.id from the library; null for 'own' and for migrated v1 actions. */
  readonly libraryId: string | null;
  /** Final text, tokens filled, sentence case, ends with a period. */
  readonly text: string;
  readonly ifThen: IfThen | null;
  /** Absolute instant for the if-then reminder ('Remind me at 9am'). Drives the 'ifthen' notification slot. */
  readonly remindAt: IsoTime | null;
  readonly status: BridgeStatus;
  readonly createdAt: IsoTime;
  readonly resolvedAt: IsoTime | null;
  readonly proofId: ProofId | null;
}

/** onboarding = the optional 'one thing you've already done' seed · bridge = the proof form · not-today = the Not-today sheet (always kind 'learned'). */
export type ProofOrigin = "onboarding" | "bridge" | "not-today";

export interface Proof {
  readonly id: ProofId;
  readonly dreamId: DreamId;
  /** The bridge it resolved. null for onboarding seeds (and for a proof logged with no open bridge). */
  readonly bridgeId: BridgeId | null;
  readonly kind: ProofKind;
  /** Sanitized: trimmed, whitespace collapsed, ≤ LIMITS.proofText, trailing '..'/'!.' normalized. */
  readonly text: string;
  /** Persistent file URI (copied into the document directory), or null. */
  readonly photoUri: string | null;
  readonly createdAt: IsoTime;
  /** LOCAL date of createdAt at save time (I11). */
  readonly dateKey: DateKey;
  /** Set once, never reassigned (I4). null = not woven (yet). */
  readonly wovenInChapterId: ChapterId | null;
  /** 1..7 within its season (I8). */
  readonly starIndex: number;
  readonly season: number;
  readonly origin: ProofOrigin;
  /** Present on proofs migrated from vela.stories.v1. */
  readonly migratedFromV1?: true;
}

/* =========================================================================
 * Storage layout
 * ========================================================================= */

/** Stored under STORAGE_KEYS.arcs ('vela.arcs.v2'). Small: no chapter text. */
export interface ArcIndex {
  readonly schemaVersion: typeof ARC_SCHEMA_VERSION;
  /** Newest first. */
  readonly dreams: readonly Dream[];
  readonly chapters: readonly ChapterMeta[];
  readonly bridges: readonly Bridge[];
  readonly proofs: readonly Proof[];
  readonly activeDreamId: DreamId | null;
  readonly migratedFromV1At: IsoTime | null;
}

/** Index + every chapter text: the unit of backup export/import and of test fixtures. */
export interface ArcSnapshot {
  readonly index: ArcIndex;
  readonly chapters: Readonly<Record<ChapterId, Chapter>>;
}

export const EMPTY_ARC_INDEX: ArcIndex = {
  schemaVersion: ARC_SCHEMA_VERSION,
  dreams: [],
  chapters: [],
  bridges: [],
  proofs: [],
  activeDreamId: null,
  migratedFromV1At: null,
};

/* =========================================================================
 * Derived state
 * ========================================================================= */

export interface SeasonProgress {
  readonly dreamId: DreamId;
  readonly season: number;
  /** Stage of the dream's latest chapter. */
  readonly stage: StageId;
  /** Proofs in this season (0..7). */
  readonly stars: number;
  readonly starsPerSeason: typeof STARS_PER_SEASON;
  readonly complete: boolean;
  readonly constellationName: string | null;
  readonly chaptersWritten: number;
}

/**
 * Today's loop card (S2) for one dream. Exactly one filled CTA per state.
 * Precedence, first match wins (A2 implements; lib tests pin it):
 *   1. no dreams at all ............................................ 'empty'
 *   2. dream not weaving (resting/released/plan-locked) ............. 'resting'
 *   3. latest chapter weaves a proof saved TODAY, is unheard, and is not
 *      saved for later .............................................. 'next-woven'   [C]
 *   4. latest chapter savedForAt > now ............................... 'sealed'       [D]
 *   5. season complete (7 stars) and the latest chapter is heard ..... 'season-complete'
 *   6. a proof was saved today and the latest chapter is heard ....... 'sealed'       [D]
 *   7. an open bridge exists ......................................... 'bridge-open'  [B]
 *   8. otherwise (read the latest chapter / choose its bridge) ....... 'chapter-waiting' [A]
 */
export type LoopState =
  | { readonly kind: "empty" }
  | { readonly kind: "resting"; readonly dreamId: DreamId; readonly reason: "resting" | "released" | "plan-locked" }
  | { readonly kind: "chapter-waiting"; readonly dreamId: DreamId; readonly chapterId: ChapterId; readonly heard: boolean }
  | { readonly kind: "bridge-open"; readonly dreamId: DreamId; readonly chapterId: ChapterId; readonly bridgeId: BridgeId }
  | { readonly kind: "next-woven"; readonly dreamId: DreamId; readonly chapterId: ChapterId; readonly proofId: ProofId }
  | { readonly kind: "sealed"; readonly dreamId: DreamId; readonly chapterId: ChapterId; readonly until: IsoTime | null }
  | { readonly kind: "season-complete"; readonly dreamId: DreamId; readonly season: number; readonly named: boolean };

/** One of the three sized options shown at a chapter's end. Deterministic per chapter. */
export interface BridgeOffer {
  readonly tier: BridgeTier;
  readonly libraryId: string;
  /** Filled text. */
  readonly text: string;
  /**
   * Exactly one offer per chapter is suggested, from the last proof's kind:
   * learned → '2min' (a smaller retry), moved → '15min', did → 'brave' (step up),
   * no proof yet → '15min'.
   */
  readonly suggested: boolean;
}

/* =========================================================================
 * Action inputs / results
 * ========================================================================= */

export interface CreateDreamInput {
  readonly focus: FocusId;
  readonly desire: string;
  readonly feeling: string;
  /** Optional 'One thing you've already done toward this' → kind 'did', origin 'onboarding', star 1, woven into Chapter I. */
  readonly seedProof?: { readonly text: string; readonly photoUri?: string | null };
}

export type BridgeChoice =
  | { readonly tier: BridgeTier; readonly libraryId: string }
  | { readonly tier: "own"; readonly text: string };

export interface ChooseBridgeInput {
  /** Must be the dream's latest chapter (else 'not-latest-chapter'). */
  readonly chapterId: ChapterId;
  readonly choice: BridgeChoice;
  readonly ifThen?: IfThen | null;
  readonly remindAt?: IsoTime | null;
}

export interface SaveProofInput {
  readonly dreamId: DreamId;
  /** Ignored (forced to 'learned') when origin is 'not-today'. */
  readonly kind: ProofKind;
  readonly text: string;
  /** Picker URI; ArcContext copies it into the document directory before storing. */
  readonly photoUri?: string | null;
  /** Default 'bridge'. */
  readonly origin?: "bridge" | "not-today";
}

export interface SaveProofResult {
  readonly proof: Proof;
  /** Same as proof.starIndex (1..7). Star Birth flies to this point. */
  readonly starIndex: number;
  /**
   * The chapter woven from this proof. Absent only when seasonComplete is true
   * AND the season's Chapter VII already existed (the proof then opens the
   * next season's Chapter I via beginNextSeason).
   */
  readonly nextChapter?: Chapter;
  /** True when this proof was the season's 7th star → Named Sky ceremony. */
  readonly seasonComplete: boolean;
}

export interface BeginSeasonInput {
  /** Re-sharpened desire ('what did this season teach you?'). Omitted = keep. Re-matches motifs. */
  readonly desire?: string;
  readonly feeling?: string;
}

export type ArcErrorCode =
  | "not-ready" // called before ready
  | "not-found" // unknown dream / chapter / bridge id
  | "invalid-input" // empty or over-limit text, released target, unknown library id
  | "plan-limit" // createDream / resume would exceed FREE_ACTIVE_DREAMS without Plus
  | "dream-not-weaving" // I12
  | "no-open-bridge" // 'not-today' with no open bridge
  | "bridge-resolved" // chooseBridge on a chapter whose bridge is crossed/learned
  | "season-complete" // I9
  | "season-incomplete" // beginNextSeason before 7 stars
  | "not-latest-chapter" // chooseBridge / rerender on an older chapter
  | "storage" // persistence failed after retries (in-memory state still stands)
  | "not-implemented"; // contract stub

export class ArcError extends Error {
  readonly code: ArcErrorCode;
  constructor(code: ArcErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ArcError";
    this.code = code;
  }
}

export function isArcError(e: unknown): e is ArcError {
  return e instanceof ArcError || (typeof e === "object" && e !== null && (e as { name?: unknown }).name === "ArcError");
}

/* =========================================================================
 * ArcContext value — what useArc() returns
 * ========================================================================= */

/**
 * Semantics shared by every action:
 * - Atomic: one action = one reducer transition = one persisted transaction.
 *   Functional updates only (never read a stale snapshot).
 * - Resolves after the in-memory commit; persistence is serialized by
 *   lib/store/persistQueue and may lag. Use flush() before export or in tests.
 * - Rejects with ArcError (typed `code`); state is unchanged on rejection.
 * - Records progress acts itself (markHeard → 'chapter-heard',
 *   saveProofAndWeave → 'proof'); screens never double-record them.
 */
export interface ArcValue {
  /* ---- status ---- */
  /** Index loaded (and v1 migrated if needed) AND the latest chapter of every non-released dream is cached. */
  readonly ready: boolean;
  readonly schemaVersion: typeof ARC_SCHEMA_VERSION;

  /* ---- state ---- */
  /** Every dream incl. resting and released, newest first. */
  readonly dreams: readonly Dream[];
  /** The dream in focus on Today (ArcSwitcher). See I14. */
  readonly activeDreamId: DreamId | null;
  readonly activeDream: Dream | null;
  /** Dreams currently in the loop after applying the Plus-lapse rule (weavingDreamIds()). */
  readonly weavingDreamIds: readonly DreamId[];
  /** status 'active' but not weaving because Plus lapsed. UI: 'Choose the dream that keeps weaving'. */
  readonly planLockedDreamIds: readonly DreamId[];
  /** canCreateDream() applied to the current dreams and entitlement. */
  readonly canCreateDream: boolean;
  /** Proofs across every dream (the '9 stars' in '12 nights · 9 stars'). */
  readonly totalStars: number;

  /* ---- selectors: pure, sync, cheap ---- */
  dream(dreamId: DreamId): Dream | undefined;
  /** Ascending by (season, number). */
  chapters(dreamId: DreamId): readonly ChapterMeta[];
  chapterMeta(chapterId: ChapterId): ChapterMeta | undefined;
  latestChapter(dreamId: DreamId): ChapterMeta | undefined;
  /** Ascending by createdAt. Lapsed bridges included (UI hides them). */
  bridges(dreamId: DreamId): readonly Bridge[];
  bridge(bridgeId: BridgeId): Bridge | undefined;
  openBridge(dreamId: DreamId): Bridge | undefined;
  /** Ascending by createdAt; optionally one season. */
  proofs(dreamId: DreamId, season?: number): readonly Proof[];
  proof(proofId: ProofId): Proof | undefined;
  seasonProgress(dreamId: DreamId): SeasonProgress | undefined;
  /** Exactly 3 offers ('2min', '15min', 'brave' in that order) for the dream's latest chapter; [] otherwise. Deterministic. */
  bridgeOffers(chapterId: ChapterId): readonly BridgeOffer[];
  /** Today's loop card. `now` defaults to lib/clock now(). */
  loopState(dreamId: DreamId | null, now?: Date): LoopState;
  /** Default Named Sky name derived from the desire ('The Studio'). */
  suggestConstellationName(dreamId: DreamId): string;

  /* ---- chapter text (one key per chapter, loaded lazily, cached) ---- */
  /** Cached text or undefined. Latest chapters are always cached once ready. */
  peekChapter(chapterId: ChapterId): Chapter | undefined;
  /** Loads from storage if needed. null = unknown id. */
  loadChapter(chapterId: ChapterId): Promise<Chapter | null>;

  /* ---- actions ---- */
  /** New dream (status active, season 1) + optional seed proof + hand-tuned Chapter I. Becomes activeDreamId. Rejects 'plan-limit'. */
  createDream(input: CreateDreamInput): Promise<Chapter>;
  /** Set (or replace, while still open) the latest chapter's bridge. */
  chooseBridge(input: ChooseBridgeInput): Promise<Bridge>;
  /** Save proof → resolve the open bridge → weave the next chapter. One transaction (I4, I5). */
  saveProofAndWeave(input: SaveProofInput): Promise<SaveProofResult>;
  /** 'Rewrite this chapter': new fragment roll, same number, stage, woven proof and bridge (I10). */
  rerenderChapter(chapterId: ChapterId): Promise<Chapter>;
  /** Heard ≥ 60% or read to the end. Idempotent: only the first call sets heardAt and records the act. */
  markHeard(chapterId: ChapterId): Promise<void>;
  /** 'Save for 21:00': defer the chapter to an instant (drives Today [D] and the 'next-woven' notification). */
  saveForRitual(chapterId: ChapterId, at: IsoTime): Promise<void>;
  /** Named Sky. Allowed once the season is complete; calling again renames. */
  nameConstellation(dreamId: DreamId, season: number, name: string): Promise<void>;
  /** Requires the current season complete. Auto-names it if unnamed, starts season+1, writes its Chapter I (weaving the carried 7th proof if unwoven). */
  beginNextSeason(dreamId: DreamId, input?: BeginSeasonInput): Promise<Chapter>;
  /** Display label only; never touches desire or written chapters. null clears it. */
  renameDream(dreamId: DreamId, label: string | null): Promise<void>;
  /** status → resting. Its open bridge stays open but silent. Focus moves if needed (I14). */
  restDream(dreamId: DreamId): Promise<void>;
  /** status → released (terminal). Its open bridge → lapsed. Chapters stay readable. */
  releaseDream(dreamId: DreamId): Promise<void>;
  /**
   * Focus a dream. active → focus only (this is how a lapsed user picks the
   * weaving dream). resting → becomes active; without Plus every other
   * active dream becomes resting (free-tier swap). released → 'invalid-input'.
   */
  setActiveDream(dreamId: DreamId): Promise<void>;

  /* ---- persistence / backup ---- */
  /** Resolves when every queued write has hit storage. */
  flush(): Promise<void>;
  /** Index + all chapter texts (loads uncached chapters). For lib/backup export. */
  exportSnapshot(): Promise<ArcSnapshot>;
  /** Validates (checkArcInvariants), then replaces all arc state and storage. Rejects 'invalid-input'. */
  importSnapshot(snapshot: ArcSnapshot): Promise<void>;
}

/* =========================================================================
 * v1 migration contract (implemented by A2 in lib/migrate.ts, pure)
 * ========================================================================= */

/** Raw AsyncStorage strings of the five v1 keys (lib/storageKeys V1_KEYS); null when absent. */
export interface V1RawStorage {
  readonly stories: string | null;
  readonly ritual: string | null;
  readonly profile: string | null;
  readonly journal: string | null;
  readonly board: string | null;
}

export interface MigrationReport {
  readonly dreams: number;
  readonly chapters: number;
  readonly proofs: number;
  readonly openBridges: number;
  readonly lapsedBridges: number;
  /** Non-fatal oddities (malformed rows skipped, etc.). */
  readonly warnings: readonly string[];
}

/**
 * Pure. Never throws on malformed input (skips rows + warns). Rules (binding):
 * - Each v1 intent → Dream with the SAME id; v1 order kept; activeDreamId = newest.
 * - Completed actions with evidence → Proof (kind = evidenceKind ?? 'did', origin
 *   'bridge', migratedFromV1, dateKey = LOCAL date of completedAt), oldest first,
 *   chunked into seasons of 7 stars.
 * - Stage of the current chapter = stageForCompletedProofs(proofs in the current
 *   season). NEVER from intent.chapter (inflated by the v1 refresh-icon bug).
 * - Newest non-completed action per intent → the live open Bridge ('reshaped'
 *   → tier 'own', else '15min'; libraryId null). Every older non-completed
 *   action → 'lapsed'. If the current season is already complete, it is lapsed too.
 * - The v1 story → one Chapter with the SAME id (source 'migrated-v1'), its single
 *   opening/closing copied into both daypart slots. If the newest action is
 *   completed, migration also weaves the next chapter from that proof with the
 *   v2 engine (I5), unless the season is complete.
 * - The result must pass checkArcInvariants. v1 keys are never written or deleted.
 */
export type MigrateV1 = (
  raw: V1RawStorage,
  ctx: { readonly now: Date; readonly name: string }
) => { readonly snapshot: ArcSnapshot; readonly report: MigrationReport };

/** Pure validator for I1–I15 (A2: lib/migrate.ts). Returns human-readable violations; [] = valid. */
export type CheckArcInvariants = (snapshot: ArcSnapshot) => readonly string[];

/* =========================================================================
 * Binding rule helpers (pure; implemented here so every agent shares them)
 * ========================================================================= */

/** Stage of a chapter written after `completedProofs` bridge-resolving proofs in its season: min(n + 1, 7). */
export function stageForCompletedProofs(completedProofs: number): StageId {
  const n = Number.isFinite(completedProofs) ? Math.max(0, Math.floor(completedProofs)) : 0;
  return Math.min(n + 1, 7) as StageId;
}

/** A season is complete iff it holds 7 stars. */
export function isSeasonComplete(starsInSeason: number): boolean {
  return starsInSeason >= STARS_PER_SEASON;
}

/** Which daypart variant to show for a chapter opened at `now` (local hour 04:00–14:59 → morning). */
export function daypartAt(now: Date): Daypart {
  const h = now.getHours();
  return h >= 4 && h < 15 ? "morning" : "evening";
}

/** The paragraphs to render/narrate for one daypart: opening, body…, closing. */
export function paragraphsForDaypart(chapter: Chapter, daypart: Daypart): readonly Paragraph[] {
  return [chapter.opening[daypart], ...chapter.body, chapter.closing[daypart]];
}

/**
 * Plus-lapse rule. Plus: every 'active' dream weaves. Free: only the primary
 * one, i.e. activeDreamId when it is 'active', else the newest 'active' dream.
 * Nothing is mutated on lapse, so re-subscribing resumes every dream.
 */
export function weavingDreamIds(
  dreams: readonly Dream[],
  activeDreamId: DreamId | null,
  isPlus: boolean
): DreamId[] {
  const active = dreams.filter((d) => d.status === "active");
  if (isPlus) return active.map((d) => d.id);
  if (active.length === 0) return [];
  const focused = active.find((d) => d.id === activeDreamId);
  if (focused) return [focused.id];
  const newest = [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return [newest.id];
}

/** Free tier: a new dream only when no dream is 'active'. Plus: always. */
export function canCreateDream(dreams: readonly Dream[], isPlus: boolean): boolean {
  if (isPlus) return true;
  return dreams.filter((d) => d.status === "active").length < FREE_ACTIVE_DREAMS;
}
