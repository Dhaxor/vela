// PLACEHOLDER — replaced by content writer (A4).
// Health: 7 stages × (4 arrival, 4 living, 3 titles) + hand-tuned Chapter I scripts.
// Chapter I: one default script (motifs: []) plus optional scripts for this focus's top motifs;
// 300–380 words including the seed weave line. Targets: POOL_TARGETS.focus.
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

import type { ContentStatus, FocusContent, Fragment, Title } from "./types";

export const STATUS: ContentStatus = "placeholder";

const fr = (id: string, text: string, flags?: Pick<Fragment, "requires" | "excludes">): Fragment => ({ id, text, ...flags });
const ti = (id: string, text: string): Title => ({ id, text });

export const HEALTH: FocusContent = {
  focus: "health",
  stages: {
    1: {
      arrival: [fr("he1-ar1", "Placeholder health arrival for stage I. It is simply true now: {desire.quote}.")],
      living: [fr("he1-li1", "Placeholder health living beat for stage I. You move through it and feel {feeling}.")],
      titles: [ti("he1-t1", "Placeholder Health I")],
    },
    2: {
      arrival: [fr("he2-ar1", "Placeholder health arrival for stage II. It is simply true now: {desire.quote}.")],
      living: [fr("he2-li1", "Placeholder health living beat for stage II. You move through it and feel {feeling}.")],
      titles: [ti("he2-t1", "Placeholder Health II")],
    },
    3: {
      arrival: [fr("he3-ar1", "Placeholder health arrival for stage III. It is simply true now: {desire.quote}.")],
      living: [fr("he3-li1", "Placeholder health living beat for stage III. You move through it and feel {feeling}.")],
      titles: [ti("he3-t1", "Placeholder Health III")],
    },
    4: {
      arrival: [fr("he4-ar1", "Placeholder health arrival for stage IV. It is simply true now: {desire.quote}.")],
      living: [fr("he4-li1", "Placeholder health living beat for stage IV. You move through it and feel {feeling}.")],
      titles: [ti("he4-t1", "Placeholder Health IV")],
    },
    5: {
      arrival: [fr("he5-ar1", "Placeholder health arrival for stage V. It is simply true now: {desire.quote}.")],
      living: [fr("he5-li1", "Placeholder health living beat for stage V. You move through it and feel {feeling}.")],
      titles: [ti("he5-t1", "Placeholder Health V")],
    },
    6: {
      arrival: [fr("he6-ar1", "Placeholder health arrival for stage VI. It is simply true now: {desire.quote}.")],
      living: [fr("he6-li1", "Placeholder health living beat for stage VI. You move through it and feel {feeling}.")],
      titles: [ti("he6-t1", "Placeholder Health VI")],
    },
    7: {
      arrival: [fr("he7-ar1", "Placeholder health arrival for stage VII. It is simply true now: {desire.quote}.")],
      living: [fr("he7-li1", "Placeholder health living beat for stage VII. You move through it and feel {feeling}.")],
      titles: [ti("he7-t1", "Placeholder Health VII")],
    },
  },
  chapterOne: [
    {
      id: "he-one-default",
      motifs: [],
      title: ti("he-one-default-t", "Placeholder Health First Light"),
      opening: {
        morning: fr("he-one-default-op-m", "Placeholder Chapter I morning opening. Morning finds you, {name}."),
        evening: fr("he-one-default-op-e", "Placeholder Chapter I evening opening. Close your eyes, {name}. It is morning there."),
      },
      body: [
        { kind: "text", fragment: fr("he-one-default-p1", "Placeholder health Chapter I arrival. Here it is, the life you named: {desire.quote}.") },
        { kind: "weave" },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("he-one-default-p2", "Placeholder Chapter I reflection. You feel {feeling}, all the way through.") },
      ],
      closing: {
        morning: fr("he-one-default-cl-m", "Placeholder Chapter I morning closing. You step into the day carrying one small step."),
        evening: fr("he-one-default-cl-e", "Placeholder Chapter I evening closing. Rest now. The story will keep."),
      },
    },
  ],
};
