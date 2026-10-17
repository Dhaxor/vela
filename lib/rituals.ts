// Rituals content selection, pure: which prompt, stems, 3·6·9 suggestions
// and identity line a person sees today, all deterministic per LOCAL day so a
// page reads the same on every open. No React, no storage; the screens pass in
// what useArc()/useJournal() already hold. Copy comes only from
// lib/content (prompts.ts, lines.ts) through the shaper and fillTemplate, so
// nothing here writes words of its own.
import type { Bridge, ChapterMeta, Dream, Proof, ProofKind } from "@/contexts/arc.types";
import type { JournalEntry } from "@/lib/journal";
import { PHRASE_369_MAX } from "@/lib/journal";
import { daysBetween } from "@/lib/progress";
import type { FocusId } from "@/lib/focus";
import { IDENTITY_LINES, RITUAL_PROMPTS, STAGES, type Fragment, type StageId } from "@/lib/story/content";
import { canFill, fillTemplate, type TokenValues } from "@/lib/story/fill";
import { mulberry32 } from "@/lib/story/rng";
import { shapeDesire } from "@/lib/story/shaper";
import { collapse, curlyQuote, hash32, toRoman } from "@/lib/story/text";

/* =========================================================================
 * Deterministic day order
 * ========================================================================= */

/** A full shuffle of `items`, the same all day (seeded by salt + LOCAL date key). */
export function dayOrder<T>(items: readonly T[], dateKey: string, salt: string): T[] {
  const rng = mulberry32(hash32(`${salt}|${dateKey}`));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* =========================================================================
 * Script: arc-linked prompts first, then the focus prompts
 * ========================================================================= */

export interface ScriptContext {
  readonly dateKey: string;
  readonly name: string;
  /** The dream in focus (Today's active dream). null → generic focus prompts only. */
  readonly dream: Dream | null;
  /** Profile focus, used when there is no dream yet. */
  readonly fallbackFocus?: FocusId | null;
  /** The latest chapter the person has heard (arc prompts about a chapter need one). */
  readonly chapter: ChapterMeta | null;
  /** The open bridge (bridge prompts read 'Imagine … is done', so a resolved one never fills them). */
  readonly bridge: Bridge | null;
  /** The newest proof of the dream. */
  readonly proof: Proof | null;
}

export interface ScriptPrompt {
  readonly id: string;
  readonly text: string;
  /** True for the arc-linked prompts ('Write the scene just after Chapter V ends.'). */
  readonly arc: boolean;
  /** The dream the page is written for. */
  readonly dreamId: string | null;
}

function scriptValues(ctx: ScriptContext): TokenValues {
  const out: TokenValues = { "{name}": { value: collapse(ctx.name) || "friend" } };
  if (ctx.dream) {
    const shaped = shapeDesire(ctx.dream.desire);
    out["{desire.np}"] = { value: shaped.np };
    out["{desire.quote}"] = { value: shaped.quote };
  }
  if (ctx.chapter) {
    const stage = STAGES[ctx.chapter.stage as StageId];
    out["{chapter.numeral}"] = { value: toRoman(ctx.chapter.number) };
    if (ctx.chapter.title.trim()) out["{chapter.title}"] = { value: ctx.chapter.title.trim() };
    if (stage) out["{stage.name}"] = { value: stage.name };
  }
  const bridge = ctx.bridge && ctx.bridge.status === "open" ? curlyQuote(ctx.bridge.text) : null;
  if (bridge) out["{bridge.quote}"] = { value: bridge };
  const proof = ctx.proof ? curlyQuote(ctx.proof.text) : null;
  if (proof) out["{proof.quote}"] = { value: proof };
  return out;
}

/**
 * Every prompt the Script page can offer today, in order. The first is
 * tonight's prompt: arc-linked when the story allows it (the 4.3 point of the
 * practice: it talks about YOUR chapter), then alternating with the focus
 * prompts. 'Another prompt' walks this list.
 */
export function scriptPrompts(ctx: ScriptContext): ScriptPrompt[] {
  const values = scriptValues(ctx);
  const dreamId = ctx.dream?.id ?? null;
  const focus = ctx.dream?.focus ?? ctx.fallbackFocus ?? null;
  const fill = (f: Fragment, arc: boolean): ScriptPrompt | null =>
    canFill(f.text, values) ? { id: f.id, text: fillTemplate(f.text, values).text, arc, dreamId } : null;

  const arc = ctx.dream
    ? dayOrder(RITUAL_PROMPTS.scriptArc, ctx.dateKey, "script-arc").flatMap((f) => fill(f, true) ?? [])
    : [];
  const own = focus ? dayOrder(RITUAL_PROMPTS.script[focus], ctx.dateKey, `script-${focus}`).flatMap((f) => fill(f, false) ?? []) : [];

  const out: ScriptPrompt[] = [];
  for (let i = 0; i < Math.max(arc.length, own.length); i += 1) {
    if (arc[i]) out.push(arc[i]);
    if (own[i]) out.push(own[i]);
  }
  return out;
}

/**
 * One prompt by id, filled from `ctx` (Today's 'Reflect' card opens the Script
 * page on the prompt it showed). null when the id is unknown or cannot fill.
 */
export function scriptPromptById(id: string, ctx: ScriptContext): ScriptPrompt | null {
  const values = scriptValues(ctx);
  const focus = ctx.dream?.focus ?? ctx.fallbackFocus ?? null;
  const arc = RITUAL_PROMPTS.scriptArc.find((f) => f.id === id);
  const own = focus ? RITUAL_PROMPTS.script[focus].find((f) => f.id === id) : undefined;
  const f = arc ?? own;
  if (!f || (arc && !ctx.dream) || !canFill(f.text, values)) return null;
  return { id: f.id, text: fillTemplate(f.text, values).text, arc: !!arc, dreamId: ctx.dream?.id ?? null };
}

/* =========================================================================
 * Gratitude: 3 of the 48 stems, swappable from the day's deck
 * ========================================================================= */

/** The day's deck of gratitude stems: show the first three, swap in the next unused. */
export function gratitudeDeck(dateKey: string): Fragment[] {
  return dayOrder(RITUAL_PROMPTS.gratitude, dateKey, "gratitude");
}

/** The stem that replaces slot `index`: the next deck stem not on the page. */
export function nextStem(deck: readonly Fragment[], onPage: readonly Fragment[], index: number): Fragment {
  const shown = new Set(onPage.map((s) => s.id));
  const from = deck.findIndex((s) => s.id === onPage[index]?.id);
  for (let step = 1; step <= deck.length; step += 1) {
    const candidate = deck[(Math.max(0, from) + step) % deck.length];
    if (!shown.has(candidate.id)) return candidate;
  }
  return onPage[index];
}

/** The saved page, exactly as the 1.0 screen (and the seeder) join it. */
export function gratitudePage(stems: readonly Fragment[], answers: readonly string[]): { prompt: string; text: string; promptId: string | undefined } {
  const lines = stems.flatMap((stem, i) => {
    const answer = collapse(answers[i] ?? "");
    return answer ? [`${stem.text} ${answer}`] : [];
  });
  const firstFilled = stems.find((_, i) => collapse(answers[i] ?? ""));
  return { prompt: stems.map((s) => s.text).join(" | "), text: lines.join("\n"), promptId: firstFilled?.id };
}

export interface GratitudeLine {
  readonly stem: string | null;
  readonly answer: string;
}

/** A saved gratitude page split back into stem + answer pairs (for /journal/entry/[id]). */
export function gratitudeLines(entry: Pick<JournalEntry, "prompt" | "text">): GratitudeLine[] {
  const stems = entry.prompt
    .split(" | ")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  return entry.text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const stem = stems.find((s) => line.startsWith(s));
      return stem ? { stem, answer: line.slice(stem.length).trim() } : { stem: null, answer: line };
    });
}

/** One quiet line for a Past pages row. */
export function pagePreview(entry: Pick<JournalEntry, "kind" | "prompt" | "text">): string {
  if (entry.kind === "gratitude") {
    const answers = gratitudeLines(entry).map((l) => l.answer);
    return collapse(answers.join(" · "));
  }
  return collapse(entry.text);
}

/* =========================================================================
 * 3·6·9: suggestions from the shaper, first person
 * ========================================================================= */

export interface Suggestion369 {
  readonly id: string;
  readonly text: string;
  /** True when the line carries the person's own desire. */
  readonly personal: boolean;
}

/**
 * Up to `n` lines to start the 3·6·9 practice with, filled from the dream
 * through the shaper ('I am so grateful that I have my own design studio…').
 * Personal frames lead; an unshaped desire offers only the token-free frames.
 * Every suggestion fits the 80-character phrase limit, so nothing is cut.
 */
export function suggestions369(dream: Pick<Dream, "focus" | "desire" | "feeling"> | null, dateKey: string, fallbackFocus: FocusId | null = null, n = 3): Suggestion369[] {
  const focus = dream?.focus ?? fallbackFocus;
  if (!focus) return [];
  const values: TokenValues = {};
  if (dream) {
    const shaped = shapeDesire(dream.desire);
    if (!shaped.fallback) {
      values["{desire.done.i}"] = { value: shaped.doneI };
      values["{desire.np.my}"] = { value: shaped.npMy };
    }
    const feeling = collapse(dream.feeling).toLowerCase();
    if (feeling) values["{feeling}"] = { value: feeling };
  }
  const filled = dayOrder(RITUAL_PROMPTS.frames369[focus], dateKey, `369-${focus}`).flatMap((f) => {
    if (!canFill(f.text, values)) return [];
    const text = fillTemplate(f.text, values).text;
    return text.length <= PHRASE_369_MAX ? [{ id: f.id, text, personal: /\{desire\./u.test(f.text) }] : [];
  });
  const personal = filled.filter((s) => s.personal);
  const plain = filled.filter((s) => !s.personal);
  // Two personal lines and one plain line when both exist: the dream leads, a simpler line is always on offer.
  const lead = personal.slice(0, Math.max(0, n - Math.min(1, plain.length)));
  return [...lead, ...plain].slice(0, n);
}

/* =========================================================================
 * Your lines: identity lines born from proof (kind × focus)
 * ========================================================================= */

export interface YourLine {
  readonly id: string;
  readonly text: string;
  readonly kind: ProofKind;
  /** The proof the line was born from. */
  readonly proof: Proof;
}

/** Day 0 of the Your line rotation. */
const LINE_EPOCH = "2026-01-01";

/** Today's line: the newest proof's kind × the dream's focus, the same all day. null before any proof. */
export function identityLineFor(proofs: readonly Proof[], focus: FocusId, dateKey: string): YourLine | null {
  const proof = [...proofs].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  if (!proof) return null;
  const pool = IDENTITY_LINES[proof.kind][focus];
  if (!pool || pool.length === 0) return null;
  // One line per day, walking the pool in order (the same rotation as Today's 'Carry a line' card).
  const line = pool[Math.max(0, daysBetween(LINE_EPOCH, dateKey)) % pool.length];
  return { id: line.id, text: line.text, kind: proof.kind, proof };
}

/** Every identity line the person has earned for a focus (the kinds they have proof of), newest kind first. */
export function earnedLines(proofs: readonly Proof[], focus: FocusId): { kind: ProofKind; lines: readonly Fragment[] }[] {
  const kinds: ProofKind[] = [];
  for (const p of [...proofs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) if (!kinds.includes(p.kind)) kinds.push(p.kind);
  return kinds.map((kind) => ({ kind, lines: IDENTITY_LINES[kind][focus] ?? [] }));
}

export { dreamGivenName, dreamName } from "./dreams";
