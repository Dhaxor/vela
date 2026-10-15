// PLACEHOLDER — replaced by content writer (A4).
// First Light onboarding chips. desires: 4 per focus, first-person phrases the
// user taps into the 'Say it however it comes out' field (shaped later by the
// desire shaper). feelings: the 1.0 six MUST keep their ids (they are testIDs:
// intake-feeling-<id>) and are the {feeling} values. Targets: POOL_TARGETS.chips.
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

import type { ContentStatus, OnboardingChips } from "@/lib/story/content/types";

export const STATUS: ContentStatus = "placeholder";

export const ONBOARDING_CHIPS: OnboardingChips = {
  desires: {
    love: ["a love that feels like home"],
    abundance: ["being debt free"],
    career: ["my own design studio"],
    health: ["waking up rested"],
    confidence: ["speaking up in meetings"],
    peace: ["slow, quiet mornings"],
  },
  feelings: [
    { id: "grateful", label: "Grateful" },
    { id: "peaceful", label: "Peaceful" },
    { id: "alive", label: "Alive" },
    { id: "proud", label: "Proud" },
    { id: "free", label: "Free" },
    { id: "loved", label: "Loved" },
  ],
};
