// PLACEHOLDER — replaced by content writer (A4).
// Motif lexicon: all 24 MotifIds (types.ts MOTIF_IDS), each with lowercase
// keywords, flags, a place phrase, 6 sensory details, 3 living moments and
// 2 witness lines. Keywords are matched as whole words/phrases against the
// user's desire on the device, across focus areas.
// `place` and `details` are TOKEN VALUES ({motif.place}, {motif.detail}):
// lowercase noun phrases, no final punctuation, readable mid-sentence.
// Targets: POOL_TARGETS.motifs.
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

import type { ContentStatus, Fragment, MotifArchetype } from "./types";

export const STATUS: ContentStatus = "placeholder";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const MOTIFS: readonly MotifArchetype[] = [
  {
    id: "own-business",
    focus: "career",
    label: "Own business or studio",
    keywords: ["my own business", "my own company", "start a business", "studio", "shop", "agency"],
    flags: ["business"],
    place: "the studio",
    details: ["a key with a paper tag", "fabric swatches pinned above the desk"],
    living: [fr("mo-own-business-li1", "Placeholder living moment. You open {motif.place} and the room is waiting for you.")],
    witness: [fr("mo-own-business-wi1", "Placeholder witness line. A first client lingers at the door and says it feels like you.")],
  },
  {
    id: "partner",
    focus: "love",
    label: "Partner",
    keywords: ["partner", "soulmate", "relationship", "boyfriend", "girlfriend", "husband", "wife", "the one"],
    flags: ["romance"],
    place: "the kitchen",
    details: ["two cups on the counter", "a coat that is not yours on the hook"],
    living: [fr("mo-partner-li1", "Placeholder living moment. Someone who loves you hands you a cup without asking how you take it.")],
    witness: [fr("mo-partner-wi1", "Placeholder witness line. A friend watches the two of you laugh and smiles at you.")],
  },
];
