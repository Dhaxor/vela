// PLACEHOLDER — replaced by content writer (A3).
// Proof weave library: kind × position × 6, seed 6, not-today 6, recall 12, cumulative 8.
// Every weave line is a STANDALONE paragraph (12–35 words) that carries the
// 'Woven from your proof' tag, so it must make sense on its own.
// Targets: POOL_TARGETS.weave.
// STYLE HEADER (binding for every content file; full guide: docs/CONTRACTS.md §7–§8)
// - Original prose only. Second person, present tense. Never 'I' in narration.
// - Template sentences ≤ 24 words (each {token} counts as one word). No parentheses,
//   abbreviations or '&'. Curly quotes only. At most one em dash per fragment.
// - No 'not X but Y'. Nothing from BANNED_PHRASES in ./types.ts: no 'future self', no
//   moon or astrology, no weekdays, no health or money guarantees, no stock LLM words.
// - No gendered pronouns for other people. Never assume a body, gender or relationship:
//   a line that assumes a partner, child, boss or client declares `requires: [flag]`.
// - Only the tokens ALLOWED_TOKENS permits for this content kind. Never start a sentence
//   with a lowercase-valued token ({desire.np}, {desire.done}, {proof.done}, {feeling}…).
// - Ids are permanent once shipped: never rename, never reuse. Prefixes: CONTRACTS.md §7.2.
// - Self-check: bun test lib/story/content

import type { ContentStatus, Fragment, WeaveLibrary } from "./types";

export const STATUS: ContentStatus = "placeholder";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const WEAVE: WeaveLibrary = {
  woven: {
    did: {
      arrival: [fr("wv-d-ar1", "Placeholder did weave at arrival. You remember the afternoon you {proof.done}. This morning began there.")],
      witness: [fr("wv-d-wi1", "Placeholder did weave as witness. Someone asks how it started, and you tell them: {proof.quote}.")],
      preClosing: [fr("wv-d-pc1", "Placeholder did weave before closing. Before you rest, you think of the day you {proof.done}.")],
    },
    moved: {
      arrival: [fr("wv-m-ar1", "Placeholder moved weave at arrival. It began with a small move, the day you {proof.done}.")],
      witness: [fr("wv-m-wi1", "Placeholder moved weave as witness. You wrote it down once: {proof.quote}. It counted.")],
      preClosing: [fr("wv-m-pc1", "Placeholder moved weave before closing. A half step is still a step. You took one when you {proof.done}.")],
    },
    learned: {
      arrival: [fr("wv-l-ar1", "Placeholder learned weave at arrival. Reality taught you something: {proof.quote}. You kept it.")],
      witness: [fr("wv-l-wi1", "Placeholder learned weave as witness. You tell someone what the hard day taught you: {proof.quote}.")],
      preClosing: [fr("wv-l-pc1", "Placeholder learned weave before closing. You carry the lesson from the day you {proof.done}.")],
    },
  },
  seed: [fr("wv-sd1", "Placeholder seed weave. Before tonight, you had already started. You {proof.done}, and it shows.")],
  notToday: [fr("wv-nt1", "Placeholder not-today weave. It was not the day, and you said so honestly: {proof.quote}.")],
  recall: [fr("wv-rc1", "Placeholder recall. On {proof.date} you wrote {proof.quote}. It still holds.")],
  cumulative: [fr("wv-cu1", "Placeholder cumulative. Reality has answered you {proofs.count} times.")],
};
