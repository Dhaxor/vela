// Pure: split one paragraph into styled runs for the reader.
//
// A paragraph's text is cut at every span edge (the user's words: desire and
// proof, plus the name) and at the edges of the sentence being spoken, so the
// reader can render nested <T> runs whose colour alone carries the meaning
// (ELEVATE §8: nested Text colour/opacity only, never transforms):
//   - desire/proof runs: gold Newsreader Italic (the user's own words)
//   - runs inside the spoken sentence: full ink; the rest dims while listening
// Offsets are UTF-16, [start, end), like Span and NarrationSentence.

import type { Span, SpanKind } from "@/contexts/arc.types";

export interface Run {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  /** The span this run sits in, or null for plain narration. */
  readonly kind: SpanKind | null;
  /** Inside the sentence being spoken right now. */
  readonly spoken: boolean;
}

export interface SentenceRange {
  readonly start: number;
  readonly end: number;
}

/** True for the spans the reader sets in gold italic: the user's own words. */
export function isUserWords(kind: SpanKind | null): boolean {
  return kind === "desire" || kind === "proof";
}

/** Clamp and order spans; drop empty ones and any that overlap an earlier one. */
function cleanSpans(spans: readonly Span[], length: number): Span[] {
  const sorted = spans
    .map((s) => ({ ...s, start: Math.max(0, Math.min(length, s.start)), end: Math.max(0, Math.min(length, s.end)) }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) continue;
    out.push(s);
  }
  return out;
}

/**
 * Runs covering the whole text in order. Adjacent runs with the same kind and
 * spoken state are merged, so a paragraph with no spans and no sentence is one run.
 */
export function paragraphRuns(text: string, spans: readonly Span[], sentence: SentenceRange | null): Run[] {
  const length = text.length;
  if (length === 0) return [];
  const clean = cleanSpans(spans, length);
  const said =
    sentence && sentence.end > sentence.start
      ? { start: Math.max(0, Math.min(length, sentence.start)), end: Math.max(0, Math.min(length, sentence.end)) }
      : null;

  const cuts = new Set<number>([0, length]);
  for (const s of clean) {
    cuts.add(s.start);
    cuts.add(s.end);
  }
  if (said) {
    cuts.add(said.start);
    cuts.add(said.end);
  }
  const edges = [...cuts].sort((a, b) => a - b);

  const runs: Run[] = [];
  let spanAt = 0;
  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i];
    const end = edges[i + 1];
    if (end <= start) continue;
    while (spanAt < clean.length && clean[spanAt].end <= start) spanAt++;
    const span = clean[spanAt] && clean[spanAt].start <= start && clean[spanAt].end >= end ? clean[spanAt] : null;
    const kind = span?.kind ?? null;
    const spoken = said !== null && start >= said.start && end <= said.end;
    const prev = runs[runs.length - 1];
    if (prev && prev.kind === kind && prev.spoken === spoken && prev.end === start) {
      runs[runs.length - 1] = { ...prev, end, text: text.slice(prev.start, end) };
    } else {
      runs.push({ start, end, text: text.slice(start, end), kind, spoken });
    }
  }
  return runs;
}
