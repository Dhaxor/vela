// PLACEHOLDER — replaced by content writer (A4).
// 'Your lines': first-person identity lines born from proof, kind × focus × 6
// ('I am someone who ships before I’m ready'). Token-free. These lead the
// daily line; the 1.0 affirmation library (lib/affirmations.ts) is NOT grown.
// Targets: POOL_TARGETS.lines.
// STYLE HEADER (binding for every content file; full guide: docs/CONTRACTS.md §7–§8)
// - Original prose only. Second person, present tense. Never 'I' in narration.
// - Template sentences ≤ 24 words (each {token} counts as one word). No parentheses,
//   abbreviations or '&'. Curly quotes only. At most one em dash per fragment.
// - No 'not X but Y'. Nothing from BANNED_PHRASES in lib/story/content/types.ts: no 'future self', no
//   moon or astrology, no weekdays, no health or money guarantees, no stock LLM words.
// - No gendered pronouns for other people. Never assume a body, gender or relationship:
//   a line that assumes a partner, child, boss or client declares `requires: [flag]`.
// - Only the tokens ALLOWED_TOKENS permits for this content kind. Never start a sentence
//   with a lowercase-valued token ({desire.np}, {desire.done}, {proof.done}, {feeling}…).
// - Ids are permanent once shipped: never rename, never reuse. Prefixes: CONTRACTS.md §7.2.
// - Self-check: bun test lib/story/content

import type { ContentStatus, Fragment, IdentityLines } from "@/lib/story/content/types";

export const STATUS: ContentStatus = "placeholder";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const IDENTITY_LINES: IdentityLines = {
  did: {
    love: [fr("yl-d-lo1", "Placeholder. I am someone who shows up for the people I love.")],
    abundance: [fr("yl-d-ab1", "Placeholder. I am someone who takes care of money calmly.")],
    career: [fr("yl-d-ca1", "Placeholder. I am someone who ships before I feel ready.")],
    health: [fr("yl-d-he1", "Placeholder. I am someone who keeps small promises to my body.")],
    confidence: [fr("yl-d-co1", "Placeholder. I am someone who acts before the doubt finishes talking.")],
    peace: [fr("yl-d-pe1", "Placeholder. I am someone who makes room to breathe.")],
  },
  moved: {
    love: [fr("yl-m-lo1", "Placeholder. I move toward connection one honest step at a time.")],
    abundance: [fr("yl-m-ab1", "Placeholder. Small amounts add up when I keep moving them.")],
    career: [fr("yl-m-ca1", "Placeholder. A rough draft still moves the work forward.")],
    health: [fr("yl-m-he1", "Placeholder. Some movement counts, every single time.")],
    confidence: [fr("yl-m-co1", "Placeholder. I can take a half step and call it progress.")],
    peace: [fr("yl-m-pe1", "Placeholder. Each thing I set down makes the day lighter.")],
  },
  learned: {
    love: [fr("yl-l-lo1", "Placeholder. I learn what closeness needs and I keep learning.")],
    abundance: [fr("yl-l-ab1", "Placeholder. Every money lesson makes the next choice clearer.")],
    career: [fr("yl-l-ca1", "Placeholder. What did not work taught me what will.")],
    health: [fr("yl-l-he1", "Placeholder. I listen to my body and adjust.")],
    confidence: [fr("yl-l-co1", "Placeholder. Trying and learning is how my courage grows.")],
    peace: [fr("yl-l-pe1", "Placeholder. I notice what drains me and I choose again.")],
  },
};
