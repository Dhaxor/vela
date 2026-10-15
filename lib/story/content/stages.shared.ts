// PLACEHOLDER — replaced by content writer (A3).
// Shared stage beats: 7 stages × (opening ×2 dayparts, sensory, reflection, closing ×2 dayparts).
// Targets: 5 per pool (POOL_TARGETS.shared), 30–60 words per fragment.
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

import type { ContentStatus, Fragment, SharedStages } from "./types";

export const STATUS: ContentStatus = "placeholder";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const SHARED_STAGES: SharedStages = {
  1: {
    opening: {
      morning: [fr("sh1-op-m1", "Placeholder morning opening for stage I. The day opens quietly, {name}.")],
      evening: [fr("sh1-op-e1", "Placeholder evening opening for stage I. Let the day settle, {name}.")],
    },
    sensory: [fr("sh1-se1", "Placeholder sensory beat for stage I. The air is cool and the light is soft.")],
    reflection: [fr("sh1-re1", "Placeholder reflection for stage I. You feel {feeling}, and it fits.")],
    closing: {
      morning: [fr("sh1-cl-m1", "Placeholder morning closing for stage I. You carry one small step into the day.")],
      evening: [fr("sh1-cl-e1", "Placeholder evening closing for stage I. You let the day go and rest.")],
    },
  },
  2: {
    opening: {
      morning: [fr("sh2-op-m1", "Placeholder morning opening for stage II. The day opens quietly, {name}.")],
      evening: [fr("sh2-op-e1", "Placeholder evening opening for stage II. Let the day settle, {name}.")],
    },
    sensory: [fr("sh2-se1", "Placeholder sensory beat for stage II. The air is cool and the light is soft.")],
    reflection: [fr("sh2-re1", "Placeholder reflection for stage II. You feel {feeling}, and it fits.")],
    closing: {
      morning: [fr("sh2-cl-m1", "Placeholder morning closing for stage II. You carry one small step into the day.")],
      evening: [fr("sh2-cl-e1", "Placeholder evening closing for stage II. You let the day go and rest.")],
    },
  },
  3: {
    opening: {
      morning: [fr("sh3-op-m1", "Placeholder morning opening for stage III. The day opens quietly, {name}.")],
      evening: [fr("sh3-op-e1", "Placeholder evening opening for stage III. Let the day settle, {name}.")],
    },
    sensory: [fr("sh3-se1", "Placeholder sensory beat for stage III. The air is cool and the light is soft.")],
    reflection: [fr("sh3-re1", "Placeholder reflection for stage III. You feel {feeling}, and it fits.")],
    closing: {
      morning: [fr("sh3-cl-m1", "Placeholder morning closing for stage III. You carry one small step into the day.")],
      evening: [fr("sh3-cl-e1", "Placeholder evening closing for stage III. You let the day go and rest.")],
    },
  },
  4: {
    opening: {
      morning: [fr("sh4-op-m1", "Placeholder morning opening for stage IV. The day opens quietly, {name}.")],
      evening: [fr("sh4-op-e1", "Placeholder evening opening for stage IV. Let the day settle, {name}.")],
    },
    sensory: [fr("sh4-se1", "Placeholder sensory beat for stage IV. The air is cool and the light is soft.")],
    reflection: [fr("sh4-re1", "Placeholder reflection for stage IV. You feel {feeling}, and it fits.")],
    closing: {
      morning: [fr("sh4-cl-m1", "Placeholder morning closing for stage IV. You carry one small step into the day.")],
      evening: [fr("sh4-cl-e1", "Placeholder evening closing for stage IV. You let the day go and rest.")],
    },
  },
  5: {
    opening: {
      morning: [fr("sh5-op-m1", "Placeholder morning opening for stage V. The day opens quietly, {name}.")],
      evening: [fr("sh5-op-e1", "Placeholder evening opening for stage V. Let the day settle, {name}.")],
    },
    sensory: [fr("sh5-se1", "Placeholder sensory beat for stage V. The air is cool and the light is soft.")],
    reflection: [fr("sh5-re1", "Placeholder reflection for stage V. You feel {feeling}, and it fits.")],
    closing: {
      morning: [fr("sh5-cl-m1", "Placeholder morning closing for stage V. You carry one small step into the day.")],
      evening: [fr("sh5-cl-e1", "Placeholder evening closing for stage V. You let the day go and rest.")],
    },
  },
  6: {
    opening: {
      morning: [fr("sh6-op-m1", "Placeholder morning opening for stage VI. The day opens quietly, {name}.")],
      evening: [fr("sh6-op-e1", "Placeholder evening opening for stage VI. Let the day settle, {name}.")],
    },
    sensory: [fr("sh6-se1", "Placeholder sensory beat for stage VI. The air is cool and the light is soft.")],
    reflection: [fr("sh6-re1", "Placeholder reflection for stage VI. You feel {feeling}, and it fits.")],
    closing: {
      morning: [fr("sh6-cl-m1", "Placeholder morning closing for stage VI. You carry one small step into the day.")],
      evening: [fr("sh6-cl-e1", "Placeholder evening closing for stage VI. You let the day go and rest.")],
    },
  },
  7: {
    opening: {
      morning: [fr("sh7-op-m1", "Placeholder morning opening for stage VII. The day opens quietly, {name}.")],
      evening: [fr("sh7-op-e1", "Placeholder evening opening for stage VII. Let the day settle, {name}.")],
    },
    sensory: [fr("sh7-se1", "Placeholder sensory beat for stage VII. The air is cool and the light is soft.")],
    reflection: [fr("sh7-re1", "Placeholder reflection for stage VII. You feel {feeling}, and it fits.")],
    closing: {
      morning: [fr("sh7-cl-m1", "Placeholder morning closing for stage VII. You carry one small step into the day.")],
      evening: [fr("sh7-cl-e1", "Placeholder evening closing for stage VII. You let the day go and rest.")],
    },
  },
};
