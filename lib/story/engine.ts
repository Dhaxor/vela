// STORY ENGINE v2. Writes one chapter of a season, offline and deterministic
// under a seed. A chapter follows the 6-beat skeleton for its stage, weaves
// the proof that earned it (in the user's own words, highlighted), recalls
// older proofs by date, and is stored with BOTH daypart variants of its
// opening and closing so the reader picks one at read time.
//
//   opening(daypart) → [recall] → arrival → [weave@arrival] → sensory → living
//   → [motif] → [weave@witness | motif witness] → reflection → [cumulative]
//   → [weave@preClosing] → closing(daypart)
//
// Chapter I of a new dream is hand-tuned (FocusContent.chapterOne scripts);
// every other chapter, and a rewritten Chapter I, rolls from the stage pools.
// The repetition guard avoids every id in the dream's recent window and never
// repeats the previous chapter's ids; it degrades gracefully when a pool runs
// dry. Content is injectable so tests can run on synthetic pools.

import type {
  Chapter,
  ChapterId,
  DreamId,
  Paragraph,
  ProofId,
  ProofOrigin,
} from "@/contexts/arc.types";
import type { FocusId } from "@/lib/focus";
import {
  FOCUS_CONTENT,
  MOTIFS,
  SHARED_STAGES,
  WEAVE,
  WRITING_RULES,
  type ChapterOneScript,
  type FocusContent,
  type Fragment,
  type MotifArchetype,
  type MotifFlag,
  type MotifId,
  type ParagraphBeat,
  type ProofKind,
  type SharedStages,
  type StageId,
  type Title,
  type WeaveLibrary,
  type WeavePosition,
} from "./content";
import { canFill, fillTemplate, joinFilled, type Filled, type TokenValues } from "./fill";
import { motifFlags, primaryMotif } from "./motifs";
import { mulberry32, type Rng } from "./rng";
import { shapeDesire } from "./shaper";
import { collapse, wordCount } from "./text";
import { proofAgo, proofDate, proofDone, proofQuote, proofsCount } from "./weave";

export const ENGINE_VERSION = 2;

/** At most this many older proofs are cited in the 'Previously' recall paragraph. */
export const MAX_RECALLS = 3;

/** Everything the engine reads. Defaults to the shipped content; tests inject synthetic pools. */
export interface ContentSource {
  readonly shared: SharedStages;
  readonly focus: Readonly<Record<FocusId, FocusContent>>;
  readonly weave: WeaveLibrary;
  readonly motifs: readonly MotifArchetype[];
}

export const DEFAULT_CONTENT: ContentSource = {
  shared: SHARED_STAGES,
  focus: FOCUS_CONTENT,
  weave: WEAVE,
  motifs: MOTIFS,
};

/** The slice of a Proof the engine needs. */
export interface WeaveProof {
  readonly id: ProofId;
  readonly kind: ProofKind;
  readonly text: string;
  readonly dateKey: string;
  readonly origin: ProofOrigin;
}

export interface WriteChapterInput {
  readonly chapterId: ChapterId;
  readonly dreamId: DreamId;
  readonly season: number;
  readonly number: number;
  readonly stage: StageId;
  /** 'chapter-one' = the hand-tuned script for a new dream; 'engine' = stage pools. */
  readonly mode: "chapter-one" | "engine";
  readonly revision: number;
  readonly name: string;
  readonly focus: FocusId;
  readonly desire: string;
  readonly feeling: string;
  readonly motifIds: readonly MotifId[];
  /** The dream's rolling repetition guard (newest last). */
  readonly recentIds: readonly string[];
  /** Ids of the previous chapter and of the revision being replaced: never repeated when avoidable. */
  readonly previousIds: readonly string[];
  /** The proof this chapter weaves, or null. */
  readonly woven: WeaveProof | null;
  /** Older proofs of this dream, ascending by date: candidates for recall lines. */
  readonly history: readonly WeaveProof[];
  /** Every proof of the dream, including `woven` (cumulative line from 3). */
  readonly totalProofs: number;
  readonly seed: number;
  readonly now: Date;
  /** LOCAL 'YYYY-MM-DD' of `now` (for {proof.ago}). */
  readonly todayKey: string;
}

export interface WrittenChapter {
  readonly chapter: Chapter;
  /** Content ids this revision consumed (fragments, title, motif details). */
  readonly usedIds: readonly string[];
}

/* =========================================================================
 * Picking
 * ========================================================================= */

interface Guard {
  readonly recent: ReadonlySet<string>;
  /** id → last position in the recent window (higher = more recent). */
  readonly lastSeen: ReadonlyMap<string, number>;
  readonly previous: ReadonlySet<string>;
  readonly used: Set<string>;
}

function makeGuard(recentIds: readonly string[], previousIds: readonly string[]): Guard {
  const lastSeen = new Map<string, number>();
  recentIds.forEach((id, i) => lastSeen.set(id, i));
  return { recent: new Set(recentIds), lastSeen, previous: new Set(previousIds), used: new Set() };
}

/**
 * Prefer ids never seen in the window; else the least recently used id that
 * was not in the previous chapter; else anything (a pool of one repeats).
 */
function pickGuarded<T extends { readonly id: string }>(rng: Rng, pool: readonly T[], guard: Guard): T | undefined {
  const open = pool.filter((x) => !guard.used.has(x.id));
  const candidates = open.length > 0 ? open : pool;
  if (candidates.length === 0) return undefined;
  const fresh = candidates.filter((x) => !guard.recent.has(x.id) && !guard.previous.has(x.id));
  if (fresh.length > 0) return fresh[Math.floor(rng() * fresh.length)];
  const notPrevious = candidates.filter((x) => !guard.previous.has(x.id));
  const ranked = (notPrevious.length > 0 ? notPrevious : candidates)
    .map((x) => ({ x, seen: guard.lastSeen.get(x.id) ?? -1 }))
    .sort((a, b) => a.seen - b.seen);
  const oldest = ranked.filter((r) => r.seen === ranked[0].seen);
  return oldest[Math.floor(rng() * oldest.length)].x;
}

/* =========================================================================
 * Context: token values, eligibility
 * ========================================================================= */

interface Ctx {
  readonly rng: Rng;
  readonly guard: Guard;
  readonly values: TokenValues;
  readonly flags: ReadonlySet<MotifFlag>;
  readonly motif: MotifArchetype | undefined;
  nowUsed: number;
}

const NOW_RE = /(?<![\p{L}])now(?![\p{L}])/iu;

function eligible(f: Fragment, ctx: Ctx, values: TokenValues = ctx.values): boolean {
  if (f.requires?.some((flag) => !ctx.flags.has(flag))) return false;
  if (f.excludes?.some((flag) => ctx.flags.has(flag))) return false;
  return canFill(f.text, values);
}

/**
 * Pick one eligible fragment and fill it. Optional inserts pass `maxWords`, so
 * only a line that fits the chapter's word budget is chosen. Avoids a second
 * 'now' in the chapter when it can. A fragment written for the user's matched
 * flags (a partner, a family) is twice as likely as a general one, so small
 * flagged pools still personalise most chapters.
 */
function draw(
  pool: readonly Fragment[],
  ctx: Ctx,
  values: TokenValues = ctx.values,
  maxWords = Number.POSITIVE_INFINITY
): { id: string; filled: Filled } | undefined {
  let ok = pool.filter((f) => eligible(f, ctx, values));
  // An optional insert is dropped rather than repeat a line of the previous chapter.
  if (Number.isFinite(maxWords)) {
    ok = ok.filter((f) => !ctx.guard.previous.has(f.id) && wordCount(fillTemplate(f.text, values).text) <= maxWords);
  }
  if (ctx.nowUsed >= WRITING_RULES.maxNowPerChapter) {
    const without = ok.filter((f) => !NOW_RE.test(f.text));
    if (without.length > 0) ok = without;
  }
  const weighted = ok.flatMap((x) => (x.requires && x.requires.length > 0 ? [x, x] : [x]));
  const f = pickGuarded(ctx.rng, weighted, ctx.guard);
  if (!f) return undefined;
  ctx.guard.used.add(f.id);
  const filled = fillTemplate(f.text, values);
  if (NOW_RE.test(filled.text)) ctx.nowUsed += 1;
  return { id: f.id, filled };
}

function proofValues(base: TokenValues, p: WeaveProof, todayKey: string): TokenValues {
  return {
    ...base,
    "{proof.quote}": { value: proofQuote(p.text), span: "proof", proofId: p.id },
    "{proof.done}": { value: proofDone(p.text), span: "proof", proofId: p.id },
    "{proof.ago}": { value: proofAgo(p.dateKey, todayKey) },
    "{proof.date}": { value: proofDate(p.dateKey, todayKey) },
  };
}

function baseValues(input: WriteChapterInput, motif: MotifArchetype | undefined, rng: Rng, guard: Guard, used: string[]): TokenValues {
  const shaped = shapeDesire(input.desire);
  const values: TokenValues = {
    "{name}": { value: collapse(input.name) || "friend", span: "name" },
    "{feeling}": { value: collapse(input.feeling).toLowerCase() || "grateful" },
    "{desire.quote}": { value: shaped.quote, span: "desire" },
    "{desire.np}": { value: shaped.np, span: "desire" },
    "{desire.done}": { value: shaped.done, span: "desire" },
  };
  if (!motif) return values;
  const details = motif.details.map((text, i) => ({ id: `mo-${motif.id}-d${i + 1}`, text }));
  const detail = pickGuarded(rng, details, guard);
  if (detail) used.push(detail.id);
  return {
    ...values,
    "{motif.place}": { value: motif.place },
    ...(detail ? { "{motif.detail}": { value: detail.text } } : {}),
  };
}

/* =========================================================================
 * Paragraph assembly
 * ========================================================================= */

interface Piece {
  readonly beat: ParagraphBeat;
  readonly fragmentId: string;
  readonly filled: Filled;
  readonly wovenProofId?: ProofId;
}

const piece = (beat: ParagraphBeat, d: { id: string; filled: Filled }, wovenProofId?: ProofId): Piece => ({
  beat,
  fragmentId: d.id,
  filled: d.filled,
  ...(wovenProofId ? { wovenProofId } : {}),
});

const toParagraph = (p: Piece, key: string): Paragraph => ({
  key,
  fragmentId: p.fragmentId,
  beat: p.beat,
  text: p.filled.text,
  spans: p.filled.spans,
  ...(p.wovenProofId ? { wovenProofId: p.wovenProofId } : {}),
});

/** Where a proof sits, by kind: a deed opens the scene, a step is witnessed, a lesson is carried to rest. */
export function weavePosition(kind: ProofKind): WeavePosition {
  if (kind === "did") return "arrival";
  if (kind === "moved") return "witness";
  return "preClosing";
}

function weavePool(content: ContentSource, p: WeaveProof): readonly Fragment[] {
  if (p.origin === "onboarding") return content.weave.seed;
  if (p.origin === "not-today") return content.weave.notToday;
  return content.weave.woven[p.kind][weavePosition(p.kind)];
}

function drawWeave(content: ContentSource, ctx: Ctx, p: WeaveProof, todayKey: string): Piece {
  const values = proofValues(ctx.values, p, todayKey);
  const pools = [weavePool(content, p), content.weave.woven[p.kind][weavePosition(p.kind)]];
  for (const pool of pools) {
    const d = draw(pool, ctx, values);
    if (d) return piece("weave", d, p.id);
  }
  // No eligible line at all (broken content): the proof is still woven, in quotes.
  return {
    beat: "weave",
    fragmentId: "wv-fallback",
    filled: fillTemplate("It started with something real. You wrote {proof.quote}, and it counted.", values),
    wovenProofId: p.id,
  };
}

/** One 'Previously' paragraph citing up to MAX_RECALLS older proofs (oldest first), within a word budget. */
function drawRecall(content: ContentSource, ctx: Ctx, history: readonly WeaveProof[], todayKey: string, budget: number): Piece | undefined {
  const cited = history.slice(-MAX_RECALLS);
  const parts: { id: string; filled: Filled }[] = [];
  let words = 0;
  for (const p of cited) {
    const d = draw(content.weave.recall, ctx, proofValues(ctx.values, p, todayKey), budget - words);
    if (!d) break;
    parts.push(d);
    words += wordCount(d.filled.text);
  }
  if (parts.length === 0) return undefined;
  return { beat: "recall", fragmentId: parts.map((x) => x.id).join("+"), filled: joinFilled(parts.map((x) => x.filled)) };
}

/* =========================================================================
 * Chapter assembly
 * ========================================================================= */

interface Draft {
  title: Title;
  opening: { morning: Piece; evening: Piece };
  body: Piece[];
  closing: { morning: Piece; evening: Piece };
}

const words = (p: Piece | undefined) => (p ? wordCount(p.filled.text) : 0);

function draftWords(d: Draft): number {
  const body = d.body.reduce((n, p) => n + words(p), 0);
  return body + Math.max(words(d.opening.morning) + words(d.closing.morning), words(d.opening.evening) + words(d.closing.evening));
}

/** Beats for a script's text items: the first arrives, the last reflects, the rest are lived. */
function scriptBeat(index: number, count: number): ParagraphBeat {
  if (index === 0) return "arrival";
  return index === count - 1 ? "reflection" : "living";
}

function chapterOneScript(focus: FocusContent, motifIds: readonly MotifId[]): ChapterOneScript | undefined {
  return (
    focus.chapterOne.find((s) => s.motifs.some((m) => motifIds.includes(m))) ??
    focus.chapterOne.find((s) => s.motifs.length === 0) ??
    focus.chapterOne[0]
  );
}

function fixed(f: Fragment, ctx: Ctx, beat: ParagraphBeat): Piece | undefined {
  if (!eligible(f, ctx)) return undefined;
  ctx.guard.used.add(f.id);
  const filled = fillTemplate(f.text, ctx.values);
  if (NOW_RE.test(filled.text)) ctx.nowUsed += 1;
  return { beat, fragmentId: f.id, filled };
}

function draftChapterOne(input: WriteChapterInput, content: ContentSource, ctx: Ctx, script: ChapterOneScript): Draft | undefined {
  const om = fixed(script.opening.morning, ctx, "opening");
  const oe = fixed(script.opening.evening, ctx, "opening");
  const cm = fixed(script.closing.morning, ctx, "closing");
  const ce = fixed(script.closing.evening, ctx, "closing");
  if (!om || !oe || !cm || !ce) return undefined;
  // Script text and the seed weave are the hand-tuned core; motif slots are
  // optional and filled last, only with a line that keeps the chapter in budget.
  const slots: (Piece | { motif: "living" | "witness" })[] = [];
  const textCount = script.body.filter((x) => x.kind === "text").length;
  let textIndex = 0;
  for (const item of script.body) {
    if (item.kind === "text") {
      const p = fixed(item.fragment, ctx, scriptBeat(textIndex, textCount));
      textIndex += 1;
      if (p) slots.push(p);
    } else if (item.kind === "weave") {
      if (input.woven) slots.push(drawWeave(content, ctx, input.woven, input.todayKey));
    } else if (ctx.motif) slots.push({ motif: item.part });
  }
  const isPiece = (x: (typeof slots)[number]): x is Piece => !("motif" in x);
  const core: Draft = { title: script.title, opening: { morning: om, evening: oe }, body: slots.filter(isPiece), closing: { morning: cm, evening: ce } };
  let room = WRITING_RULES.chapterWords.max - draftWords(core);
  const body: Piece[] = [];
  for (const slot of slots) {
    if (isPiece(slot)) {
      body.push(slot);
      continue;
    }
    const d = ctx.motif ? draw(slot.motif === "living" ? ctx.motif.living : ctx.motif.witness, ctx, ctx.values, room) : undefined;
    if (d) {
      body.push(piece("motif", d));
      room -= wordCount(d.filled.text);
    }
  }
  return { ...core, body };
}

function draftEngine(input: WriteChapterInput, content: ContentSource, ctx: Ctx): Draft | undefined {
  const shared = content.shared[input.stage];
  const focus = content.focus[input.focus].stages[input.stage];
  const title = pickGuarded(ctx.rng, focus.titles, ctx.guard);
  if (title) ctx.guard.used.add(title.id);
  const om = draw(shared.opening.morning, ctx);
  const oe = draw(shared.opening.evening, ctx);
  const arrival = draw(focus.arrival, ctx);
  const sensory = draw(shared.sensory, ctx);
  const living = draw(focus.living, ctx);
  const reflection = draw(shared.reflection, ctx);
  const cm = draw(shared.closing.morning, ctx);
  const ce = draw(shared.closing.evening, ctx);
  if (!title || !om || !oe || !arrival || !sensory || !living || !reflection || !cm || !ce) return undefined;

  const pos = input.woven ? weavePosition(input.woven.kind) : null;
  const weave = input.woven ? drawWeave(content, ctx, input.woven, input.todayKey) : undefined;
  const at = (p: WeavePosition): Piece[] => (pos === p && weave ? [weave] : []);

  // The skeleton plus the mandatory weave. Optional inserts are added below, within the word budget.
  const draft: Draft = {
    title,
    opening: { morning: piece("opening", om), evening: piece("opening", oe) },
    body: [
      piece("arrival", arrival),
      ...at("arrival"),
      piece("sensory", sensory),
      piece("living", living),
      ...at("witness"),
      piece("reflection", reflection),
      ...at("preClosing"),
    ],
    closing: { morning: piece("closing", cm), evening: piece("closing", ce) },
  };

  // Optional inserts, in priority order, each only if a line fits the remaining
  // budget. The cumulative line is short and is the season's payoff ('Reality
  // has answered you four times'), so it claims its room before the recall
  // paragraph, which degrades by citing fewer proofs. The Hard Day (stage III)
  // takes no upbeat motif 'living' moment; its motif shows up as a witness.
  // The Threshold (stage V) is one unbroken minute, so it takes no motif at all.
  const room = () => WRITING_RULES.chapterWords.max - draftWords(draft);
  const indexOf = (beat: ParagraphBeat) => draft.body.findIndex((x) => x.beat === beat);
  const motif = input.stage === 5 ? undefined : ctx.motif;
  if (motif && input.stage !== 3) {
    const d = draw(motif.living, ctx, ctx.values, room());
    if (d) draft.body.splice(indexOf("living") + 1, 0, piece("motif", d));
  }
  if (input.totalProofs >= 3) {
    const n = proofsCount(input.totalProofs);
    const values: TokenValues = { ...ctx.values, "{proofs.count}": { value: n.count }, "{proofs.phrase}": { value: n.phrase } };
    const d = draw(content.weave.cumulative, ctx, values, room());
    if (d) draft.body.splice(indexOf("reflection") + 1, 0, piece("cumulative", d));
  }
  if (input.stage > 1 && input.history.length > 0 && room() > 0) {
    const recall = drawRecall(content, ctx, input.history, input.todayKey, room());
    if (recall) draft.body.unshift(recall);
  }
  if (motif && pos !== "witness") {
    const d = draw(motif.witness, ctx, ctx.values, room());
    if (d) draft.body.splice(indexOf("reflection"), 0, piece("motif", d));
  }
  return draft;
}

/* =========================================================================
 * Public API
 * ========================================================================= */

/** Write one chapter revision. Pure and deterministic for a given input. */
export function writeChapter(input: WriteChapterInput, content: ContentSource = DEFAULT_CONTENT): WrittenChapter {
  const rng = mulberry32(input.seed);
  const guard = makeGuard(input.recentIds, input.previousIds);
  const motif = primaryMotif(input.motifIds, content.motifs);
  const extraUsed: string[] = [];
  const values = baseValues(input, motif, rng, guard, extraUsed);
  const ctx: Ctx = { rng, guard, values, flags: motifFlags(input.motifIds, content.motifs), motif, nowUsed: 0 };

  const script = input.mode === "chapter-one" ? chapterOneScript(content.focus[input.focus], input.motifIds) : undefined;
  const scripted = script ? draftChapterOne(input, content, ctx, script) : undefined;
  const draft =
    scripted ??
    draftEngine(input, content, ctx) ??
    // Last resort for broken content: stage I pools always exist (contract test).
    draftEngine({ ...input, stage: 1 }, content, ctx);
  if (!draft) throw new Error(`story engine: no content for ${input.focus} stage ${input.stage}`);

  const body = draft.body.map((p, i) => toParagraph(p, `p${i + 1}`));
  const closingKey = `p${body.length + 1}`;
  const opening = { morning: toParagraph(draft.opening.morning, "p0"), evening: toParagraph(draft.opening.evening, "p0") };
  const closing = { morning: toParagraph(draft.closing.morning, closingKey), evening: toParagraph(draft.closing.evening, closingKey) };
  const bodyWords = body.reduce((n, p) => n + wordCount(p.text), 0);

  const usedIds = [
    draft.title.id,
    ...[opening.morning, opening.evening, ...body, closing.morning, closing.evening].flatMap((p) => p.fragmentId.split("+")),
    ...extraUsed,
  ].filter((id, i, all) => all.indexOf(id) === i && id !== "wv-fallback");

  const chapter: Chapter = {
    id: input.chapterId,
    dreamId: input.dreamId,
    season: input.season,
    number: input.number,
    stage: input.stage,
    title: draft.title.text,
    revision: input.revision,
    writtenAt: input.now.toISOString(),
    source: scripted ? "chapter-one" : "engine",
    wovenProofId: input.woven?.id ?? null,
    opening,
    body,
    closing,
    wordCount: {
      morning: bodyWords + wordCount(opening.morning.text) + wordCount(closing.morning.text),
      evening: bodyWords + wordCount(opening.evening.text) + wordCount(closing.evening.text),
    },
    engineVersion: ENGINE_VERSION,
    usedIds,
  };
  return { chapter, usedIds };
}
