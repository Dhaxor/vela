// Narration, the pure half: sentence segmentation, the queue state machine and
// the estimates the dock shows. No React, no expo-speech; useNarration.ts is
// the native seam that feeds utterance callbacks into reduceQueue().
//
// Contract: lib/audio/types.ts (R1 one native queue, R2 highlight from
// onStart/onDone only, R4 pronunciation in TTS text only).

import { paragraphsForDaypart, type Paragraph } from "@/contexts/arc.types";
import {
  HEARD_THRESHOLD,
  type NarrationRate,
  type NarrationSentence,
  type NarrationStatus,
  type SegmentChapter,
  type SleepTimer,
} from "./types";

/* =========================================================================
 * Sentence segmentation
 * ========================================================================= */

/** UTF-16 [start, end) inside a paragraph's text. */
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

const TERMINALS = new Set([".", "!", "?", "…"]);
const CLOSERS = new Set(['"', "'", "”", "’", ")", "]", "»"]);
const OPENERS = new Set(['"', "'", "“", "‘", "(", "[", "«", "¿", "¡"]);
/** Abbreviations that never end a sentence: a name or more of the same sentence follows. */
const NEVER_FINAL = new Set(["mr", "mrs", "ms", "mx", "dr", "prof", "st", "mt", "rev", "fr", "eg", "ie", "vs", "cf", "approx", "incl"]);
/** Abbreviations that run on into a number ('No. 5', 'p. 12'). */
const BEFORE_NUMBER = new Set(["no", "nos", "vol", "p", "pp", "fig", "ch", "art"]);
/** Sentences longer than this are split again at a clause break, so no single
 * utterance runs long enough to hit Chrome's ~15 s network-voice cut-off. */
export const MAX_SENTENCE_CHARS = 200;

const isSpace = (ch: string | undefined): boolean => ch !== undefined && /\s/.test(ch);
const isUpper = (ch: string): boolean => ch !== ch.toLowerCase() && ch === ch.toUpperCase();
const isLetter = (ch: string): boolean => ch.toLowerCase() !== ch.toUpperCase();
const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= "0" && ch <= "9";

/** Could text[i] open a new sentence? A capital, a digit, or an opening quote/bracket before one. */
function opensSentence(text: string, i: number): boolean {
  const ch = text[i];
  if (ch === undefined) return false;
  if (isUpper(ch) || isDigit(ch)) return true;
  if (OPENERS.has(ch)) {
    const next = text[i + 1];
    return next !== undefined && (isUpper(next) || isDigit(next) || OPENERS.has(next));
  }
  return false;
}

/** The word (letters and inner dots, so 'e.g' and 'a.m' stay whole) that ends just before index `end`. */
function wordBefore(text: string, end: number): string {
  let i = end;
  while (i > 0 && (isLetter(text[i - 1]) || text[i - 1] === ".")) i--;
  return text.slice(i, end).replace(/^\.+/, "");
}

/** A single '.' at `at` ends the sentence unless the word before it is an abbreviation or an initial. */
function periodEndsSentence(text: string, at: number, nextIndex: number): boolean {
  const word = wordBefore(text, at);
  const key = word.replace(/\./g, "").toLowerCase();
  if (NEVER_FINAL.has(key)) return false;
  if (word.length === 1 && isUpper(word)) return false; // an initial: 'J. K. Rowling'
  if (BEFORE_NUMBER.has(key) && isDigit(text[nextIndex])) return false;
  return true;
}

function trimRange(text: string, start: number, end: number): TextRange | null {
  while (start < end && isSpace(text[start])) start++;
  while (end > start && isSpace(text[end - 1])) end--;
  return end > start ? { start, end } : null;
}

const CLAUSE_BREAKS = ["; ", ": ", " — ", ", "];

/** Splits an over-long range at the clause break nearest its middle (recursively). */
function splitLong(text: string, range: TextRange): TextRange[] {
  if (range.end - range.start <= MAX_SENTENCE_CHARS) return [range];
  const middle = (range.start + range.end) / 2;
  let best = -1;
  for (const mark of CLAUSE_BREAKS) {
    for (let i = text.indexOf(mark, range.start); i !== -1 && i < range.end - mark.length; i = text.indexOf(mark, i + 1)) {
      const cut = i + mark.trimEnd().length;
      if (cut > range.start && (best === -1 || Math.abs(cut - middle) < Math.abs(best - middle))) best = cut;
    }
    if (best !== -1) break; // prefer the strongest break that exists
  }
  if (best === -1) return [range];
  const head = trimRange(text, range.start, best);
  const tail = trimRange(text, best, range.end);
  return [...(head ? splitLong(text, head) : []), ...(tail ? splitLong(text, tail) : [])];
}

/**
 * Sentence ranges in display text. Handles curly and straight quotes, closing
 * brackets after the stop, ellipses ('…' and '...', which end a sentence only
 * before a capital), decimals, initials and common abbreviations.
 */
export function splitSentences(text: string): TextRange[] {
  const out: TextRange[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    if (!TERMINALS.has(text[i])) {
      i++;
      continue;
    }
    let runEnd = i;
    while (runEnd < text.length && TERMINALS.has(text[runEnd])) runEnd++;
    let close = runEnd;
    while (close < text.length && CLOSERS.has(text[close])) close++;
    if (close < text.length && !isSpace(text[close])) {
      i = close; // '3.5', 'wait…what', 'a.m'
      continue;
    }
    let next = close;
    while (next < text.length && isSpace(text[next])) next++;
    const isSingleStop = runEnd - i === 1 && text[i] === ".";
    if (next < text.length && opensSentence(text, next) && (!isSingleStop || periodEndsSentence(text, i, next))) {
      const range = trimRange(text, start, close);
      if (range) out.push(...splitLong(text, range));
      start = next;
    }
    i = Math.max(close, i + 1);
  }
  const last = trimRange(text, start, text.length);
  if (last) out.push(...splitLong(text, last));
  return out;
}

/* =========================================================================
 * Spoken text (R4)
 * ========================================================================= */

/** Index of `word` as a whole word (no letter or digit on either side), from `from`. */
function wholeWordIndex(text: string, word: string, from: number): number {
  for (let i = text.indexOf(word, from); i !== -1; i = text.indexOf(word, i + 1)) {
    const before = text[i - 1];
    const after = text[i + word.length];
    const edge = (ch: string | undefined) => ch === undefined || !(isLetter(ch) || isDigit(ch));
    if (edge(before) && edge(after)) return i;
  }
  return -1;
}

/**
 * What TTS says for paragraph text [start, end): every 'name' span is replaced
 * by the pronunciation. Text without name spans (migrated 1.0 chapters) gets
 * a whole-word substitution of the name instead. Display text is never touched.
 */
export function spokenText(
  paragraph: Paragraph,
  range: TextRange,
  name?: string,
  pronunciation?: string | null
): string {
  const text = paragraph.text;
  const say = pronunciation?.trim();
  let out = "";
  let cursor = range.start;
  const nameSpans = paragraph.spans.filter((s) => s.kind === "name");
  if (say) {
    for (const span of nameSpans) {
      if (span.end <= range.start || span.start >= range.end) continue;
      out += text.slice(cursor, Math.max(span.start, cursor)) + say;
      cursor = Math.min(span.end, range.end);
    }
  }
  out += text.slice(cursor, range.end);
  const plainName = name?.trim();
  if (say && plainName && nameSpans.length === 0) {
    for (let i = wholeWordIndex(out, plainName, 0); i !== -1; i = wholeWordIndex(out, plainName, i + say.length)) {
      out = out.slice(0, i) + say + out.slice(i + plainName.length);
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

const countWords = (s: string): number => (s.match(/\S+/g) ?? []).length;

/** Pure SegmentChapter: the chosen daypart's paragraphs, one entry per utterance. */
export const segmentChapter: SegmentChapter = (chapter, daypart, opts) => {
  const out: NarrationSentence[] = [];
  paragraphsForDaypart(chapter, daypart).forEach((paragraph, paragraphIndex) => {
    splitSentences(paragraph.text).forEach((range, sentenceInParagraph) => {
      const ttsText = spokenText(paragraph, range, opts?.name, opts?.pronunciation);
      out.push({
        index: out.length,
        paragraphIndex,
        sentenceInParagraph,
        start: range.start,
        end: range.end,
        text: paragraph.text.slice(range.start, range.end),
        ttsText,
        wordCount: countWords(ttsText),
      });
    });
  });
  return out;
};

/** First sentence of a paragraph, or -1 when it has none. */
export function firstSentenceOfParagraph(sentences: readonly NarrationSentence[], paragraphIndex: number): number {
  return sentences.findIndex((s) => s.paragraphIndex === paragraphIndex);
}

/* =========================================================================
 * Estimates
 * ========================================================================= */

/** Calm narration pace at rate 1.0, and the pause punctuation adds per sentence. */
export const WORDS_PER_MINUTE = 170;
export const SENTENCE_PAUSE_MS = 300;

export function estimateSentenceMs(sentence: NarrationSentence, rate: NarrationRate): number {
  return (sentence.wordCount / (WORDS_PER_MINUTE * rate)) * 60_000 + SENTENCE_PAUSE_MS;
}

/** Estimated time to speak sentences [from, to). */
export function estimateRangeMs(
  sentences: readonly NarrationSentence[],
  rate: NarrationRate,
  from = 0,
  to = sentences.length
): number {
  let ms = 0;
  for (let i = Math.max(0, from); i < Math.min(to, sentences.length); i++) ms += estimateSentenceMs(sentences[i], rate);
  return Math.round(ms);
}

/** 'm:ss' for the dock ('Listening · 2:41'). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/* =========================================================================
 * Queue state machine
 * ========================================================================= */

/**
 * The narration queue. `generation` changes whenever the native queue is
 * replaced or cleared, and every utterance callback carries the generation it
 * was queued under, so callbacks from a stopped queue (Chrome fires errors for
 * every cancelled utterance; iOS fires didCancel) can never move the highlight.
 */
export interface NarrationQueue {
  readonly status: NarrationStatus;
  readonly total: number;
  readonly generation: number;
  /** Last sentence whose onStart fired in this run. It stays set through the
   *  gap until the next onStart, so the highlight never flickers. */
  readonly current: number | null;
  /** Between `current`'s onStart and its onDone. Drives the bed's ducking. */
  readonly speaking: boolean;
  /** Where play/resume starts: the sentence being spoken, or the next unfinished one. */
  readonly position: number;
  /** Sentences finished at least once (any order: seeking skips some). */
  readonly heard: readonly boolean[];
  readonly heardCount: number;
  /** HEARD_THRESHOLD reached; flips once and stays (onHeard fires on the flip). */
  readonly heardReached: boolean;
}

export type QueueEvent =
  /** The native queue was replaced with sentences from..total-1 (play, resume, seek or re-queue while playing). */
  | { readonly type: "enqueue"; readonly from: number }
  | { readonly type: "start"; readonly generation: number; readonly index: number }
  | { readonly type: "done"; readonly generation: number; readonly index: number }
  | { readonly type: "error"; readonly generation: number; readonly index: number }
  /** Native queue cleared; resume restarts the current sentence. */
  | { readonly type: "pause" }
  /** Native queue cleared; back to the first sentence. */
  | { readonly type: "stop" }
  /** Move the resume position while nothing is queued. */
  | { readonly type: "seek"; readonly index: number }
  | { readonly type: "unavailable" };

/** A fresh queue. Pass the previous queue's generation + 1 when replacing one, so its late callbacks stay stale. */
export function initialQueue(total: number, generation = 0): NarrationQueue {
  return {
    status: "idle",
    total,
    generation,
    current: null,
    speaking: false,
    position: 0,
    heard: Array.from({ length: total }, () => false),
    heardCount: 0,
    heardReached: false,
  };
}

const clampIndex = (q: NarrationQueue, i: number): number => Math.min(Math.max(0, Math.floor(i)), Math.max(0, q.total - 1));

/** Clears the native queue: a new generation so its pending callbacks are ignored. */
const cleared = (q: NarrationQueue, status: NarrationStatus, position: number): NarrationQueue => ({
  ...q,
  status,
  generation: q.generation + 1,
  current: null,
  speaking: false,
  position,
});

export function reduceQueue(q: NarrationQueue, e: QueueEvent): NarrationQueue {
  if (q.status === "unavailable") return q;
  switch (e.type) {
    case "enqueue":
      if (q.total === 0) return q;
      return { ...q, status: "playing", generation: q.generation + 1, speaking: false, position: clampIndex(q, e.from) };
    case "start":
      if (e.generation !== q.generation || q.status !== "playing") return q;
      return { ...q, current: e.index, speaking: true, position: e.index };
    case "done": {
      if (e.generation !== q.generation || q.status !== "playing") return q;
      const fresh = !q.heard[e.index];
      const heard = fresh ? q.heard.map((h, i) => h || i === e.index) : q.heard;
      const heardCount = q.heardCount + (fresh ? 1 : 0);
      const heardReached = q.heardReached || heardCount / q.total >= HEARD_THRESHOLD;
      const base = { ...q, heard, heardCount, heardReached, speaking: false, position: e.index + 1 };
      return e.index + 1 >= q.total ? { ...base, status: "finished", current: null, position: q.total } : base;
    }
    case "error":
      if (e.generation !== q.generation || q.status !== "playing") return q;
      return cleared(q, "paused", e.index);
    case "pause":
      return q.status === "playing" ? cleared(q, "paused", q.position) : q;
    case "stop":
      return cleared(q, "idle", 0);
    case "seek":
      if (q.status === "playing" || q.total === 0) return q;
      return { ...q, status: q.status === "finished" ? "paused" : q.status, current: null, position: clampIndex(q, e.index) };
    case "unavailable":
      return cleared(q, "unavailable", q.position);
  }
}

/** The sentence play()/resume() start from by default. */
export function resumeIndex(q: NarrationQueue): number {
  return q.status === "finished" || q.position >= q.total ? 0 : q.position;
}

/** 0..1 through the chapter: sentences before the playhead. Finished = 1. */
export function queueProgress(q: NarrationQueue): number {
  if (q.total === 0) return 0;
  return q.status === "finished" ? 1 : Math.min(q.position, q.total) / q.total;
}

/* =========================================================================
 * Sleep timer
 * ========================================================================= */

/** Absolute deadline (epoch ms) of a minutes timer; null for off and end-of-chapter. */
export function sleepDeadline(timer: SleepTimer, nowMs: number): number | null {
  return timer.kind === "minutes" ? nowMs + timer.minutes * 60_000 : null;
}

export function sleepRemainingMs(deadline: number | null, nowMs: number): number | null {
  return deadline === null ? null : Math.max(0, deadline - nowMs);
}
