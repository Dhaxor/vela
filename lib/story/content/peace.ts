// PLACEHOLDER — replaced by content writer (A4).
// Peace: 7 stages × (4 arrival, 4 living, 3 titles) + hand-tuned Chapter I scripts.
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

export const PEACE: FocusContent = {
  focus: "peace",
  stages: {
    1: {
      arrival: [fr("pe1-ar1", "Placeholder peace arrival for stage I. It is simply true now: {desire.quote}.")],
      living: [fr("pe1-li1", "Placeholder peace living beat for stage I. You move through it and feel {feeling}.")],
      titles: [ti("pe1-t1", "Placeholder Peace I")],
    },
    2: {
      arrival: [fr("pe2-ar1", "Placeholder peace arrival for stage II. It is simply true now: {desire.quote}.")],
      living: [fr("pe2-li1", "Placeholder peace living beat for stage II. You move through it and feel {feeling}.")],
      titles: [ti("pe2-t1", "Placeholder Peace II")],
    },
    3: {
      arrival: [fr("pe3-ar1", "Placeholder peace arrival for stage III. It is simply true now: {desire.quote}.")],
      living: [fr("pe3-li1", "Placeholder peace living beat for stage III. You move through it and feel {feeling}.")],
      titles: [ti("pe3-t1", "Placeholder Peace III")],
    },
    4: {
      arrival: [fr("pe4-ar1", "Placeholder peace arrival for stage IV. It is simply true now: {desire.quote}.")],
      living: [fr("pe4-li1", "Placeholder peace living beat for stage IV. You move through it and feel {feeling}.")],
      titles: [ti("pe4-t1", "Placeholder Peace IV")],
    },
    5: {
      arrival: [fr("pe5-ar1", "Placeholder peace arrival for stage V. It is simply true now: {desire.quote}.")],
      living: [fr("pe5-li1", "Placeholder peace living beat for stage V. You move through it and feel {feeling}.")],
      titles: [ti("pe5-t1", "Placeholder Peace V")],
    },
    6: {
      arrival: [fr("pe6-ar1", "Placeholder peace arrival for stage VI. It is simply true now: {desire.quote}.")],
      living: [fr("pe6-li1", "Placeholder peace living beat for stage VI. You move through it and feel {feeling}.")],
      titles: [ti("pe6-t1", "Placeholder Peace VI")],
    },
    7: {
      arrival: [fr("pe7-ar1", "Placeholder peace arrival for stage VII. It is simply true now: {desire.quote}.")],
      living: [fr("pe7-li1", "Placeholder peace living beat for stage VII. You move through it and feel {feeling}.")],
      titles: [ti("pe7-t1", "Placeholder Peace VII")],
    },
  },
  chapterOne: [
    {
      id: "pe-one-default",
      motifs: [],
      title: ti("pe-one-default-t", "Placeholder Peace First Light"),
      opening: {
        morning: fr("pe-one-default-op-m", "Placeholder Chapter I morning opening. Morning finds you, {name}."),
        evening: fr("pe-one-default-op-e", "Placeholder Chapter I evening opening. Close your eyes, {name}. It is morning there."),
      },
      body: [
        { kind: "text", fragment: fr("pe-one-default-p1", "Placeholder peace Chapter I arrival. Here it is, the life you named: {desire.quote}.") },
        { kind: "weave" },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("pe-one-default-p2", "Placeholder Chapter I reflection. You feel {feeling}, all the way through.") },
      ],
      closing: {
        morning: fr("pe-one-default-cl-m", "Placeholder Chapter I morning closing. You step into the day carrying one small step."),
        evening: fr("pe-one-default-cl-e", "Placeholder Chapter I evening closing. Rest now. The story will keep."),
      },
    },
  ],
};
