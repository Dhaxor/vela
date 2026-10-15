// PLACEHOLDER — replaced by content writer (A3).
// Love: 7 stages × (4 arrival, 4 living, 3 titles) + hand-tuned Chapter I scripts.
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

export const LOVE: FocusContent = {
  focus: "love",
  stages: {
    1: {
      arrival: [fr("lo1-ar1", "Placeholder love arrival for stage I. It is simply true now: {desire.quote}.")],
      living: [fr("lo1-li1", "Placeholder love living beat for stage I. You move through it and feel {feeling}.")],
      titles: [ti("lo1-t1", "Placeholder Love I")],
    },
    2: {
      arrival: [fr("lo2-ar1", "Placeholder love arrival for stage II. It is simply true now: {desire.quote}.")],
      living: [fr("lo2-li1", "Placeholder love living beat for stage II. You move through it and feel {feeling}.")],
      titles: [ti("lo2-t1", "Placeholder Love II")],
    },
    3: {
      arrival: [fr("lo3-ar1", "Placeholder love arrival for stage III. It is simply true now: {desire.quote}.")],
      living: [fr("lo3-li1", "Placeholder love living beat for stage III. You move through it and feel {feeling}.")],
      titles: [ti("lo3-t1", "Placeholder Love III")],
    },
    4: {
      arrival: [fr("lo4-ar1", "Placeholder love arrival for stage IV. It is simply true now: {desire.quote}.")],
      living: [fr("lo4-li1", "Placeholder love living beat for stage IV. You move through it and feel {feeling}.")],
      titles: [ti("lo4-t1", "Placeholder Love IV")],
    },
    5: {
      arrival: [fr("lo5-ar1", "Placeholder love arrival for stage V. It is simply true now: {desire.quote}.")],
      living: [fr("lo5-li1", "Placeholder love living beat for stage V. You move through it and feel {feeling}.")],
      titles: [ti("lo5-t1", "Placeholder Love V")],
    },
    6: {
      arrival: [fr("lo6-ar1", "Placeholder love arrival for stage VI. It is simply true now: {desire.quote}.")],
      living: [fr("lo6-li1", "Placeholder love living beat for stage VI. You move through it and feel {feeling}.")],
      titles: [ti("lo6-t1", "Placeholder Love VI")],
    },
    7: {
      arrival: [fr("lo7-ar1", "Placeholder love arrival for stage VII. It is simply true now: {desire.quote}.")],
      living: [fr("lo7-li1", "Placeholder love living beat for stage VII. You move through it and feel {feeling}.")],
      titles: [ti("lo7-t1", "Placeholder Love VII")],
    },
  },
  chapterOne: [
    {
      id: "lo-one-default",
      motifs: [],
      title: ti("lo-one-default-t", "Placeholder Love First Light"),
      opening: {
        morning: fr("lo-one-default-op-m", "Placeholder Chapter I morning opening. Morning finds you, {name}."),
        evening: fr("lo-one-default-op-e", "Placeholder Chapter I evening opening. Close your eyes, {name}. It is morning there."),
      },
      body: [
        { kind: "text", fragment: fr("lo-one-default-p1", "Placeholder love Chapter I arrival. Here it is, the life you named: {desire.quote}.") },
        { kind: "weave" },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("lo-one-default-p2", "Placeholder Chapter I reflection. You feel {feeling}, all the way through.") },
      ],
      closing: {
        morning: fr("lo-one-default-cl-m", "Placeholder Chapter I morning closing. You step into the day carrying one small step."),
        evening: fr("lo-one-default-cl-e", "Placeholder Chapter I evening closing. Rest now. The story will keep."),
      },
    },
    {
      id: "lo-one-partner",
      motifs: ["partner"],
      title: ti("lo-one-partner-t", "Placeholder Two Cups"),
      opening: {
        morning: fr("lo-one-partner-op-m", "Placeholder partner script opening. Morning comes slowly, {name}."),
        evening: fr("lo-one-partner-op-e", "Placeholder partner script opening. Let this evening soften, {name}."),
      },
      body: [
        { kind: "text", fragment: fr("lo-one-partner-p1", "Placeholder. Someone who loves you hums in the kitchen. This is {desire.np}.", { requires: ["romance"] }) },
        { kind: "weave" },
        { kind: "motif", part: "witness" },
      ],
      closing: {
        morning: fr("lo-one-partner-cl-m", "Placeholder partner script closing. You head out lighter."),
        evening: fr("lo-one-partner-cl-e", "Placeholder partner script closing. You sleep easily."),
      },
    },
  ],
};
