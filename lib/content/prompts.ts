// PLACEHOLDER — replaced by content writer (A4).
// Ritual prompts for the Rituals tab (exactly 3 practices: Script, 3·6·9, Gratitude).
// script: 12 per focus · scriptArc: 12 arc-linked (use {chapter.numeral},
// {chapter.title}, {stage.name}, {bridge.quote}, {proof.quote}; a prompt is
// offered only when every token it uses can be filled) · gratitude: 48 stems
// ending with '…' · frames369: 10 per focus, FIRST person, filled through the
// shaper ({desire.done.i}, {desire.np.my}, {feeling}). Targets: POOL_TARGETS.prompts.
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

import type { ContentStatus, Fragment, RitualPrompts } from "@/lib/story/content/types";

export const STATUS: ContentStatus = "placeholder";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const RITUAL_PROMPTS: RitualPrompts = {
  script: {
    love: [fr("sp-lo1", "Placeholder. Write the quiet evening after {desire.np} became ordinary.")],
    abundance: [fr("sp-ab1", "Placeholder. Write the morning you paid a bill without flinching.")],
    career: [fr("sp-ca1", "Placeholder. Write the moment someone asks how you built {desire.np}.")],
    health: [fr("sp-he1", "Placeholder. Write a day where your energy lasts until evening.")],
    confidence: [fr("sp-co1", "Placeholder. Write the meeting where you spoke first and meant it.")],
    peace: [fr("sp-pe1", "Placeholder. Write a slow morning with nothing to rush.")],
  },
  scriptArc: [fr("sp-arc1", "Placeholder. Write the scene just after Chapter {chapter.numeral} ends.")],
  gratitude: [
    fr("gs1", "Placeholder. Something small that went right today…"),
    fr("gs2", "Placeholder. A person I am glad exists…"),
  ],
  frames369: {
    love: [fr("f369-lo1", "Placeholder. I am so {feeling} that {desire.done.i}.")],
    abundance: [fr("f369-ab1", "Placeholder. I am so {feeling} that {desire.done.i}.")],
    career: [fr("f369-ca1", "Placeholder. I am so {feeling} that {desire.done.i}.")],
    health: [fr("f369-he1", "Placeholder. I am so {feeling} that {desire.done.i}.")],
    confidence: [fr("f369-co1", "Placeholder. I am so {feeling} that {desire.done.i}.")],
    peace: [fr("f369-pe1", "Placeholder. I am so {feeling} that {desire.done.i}.")],
  },
};
