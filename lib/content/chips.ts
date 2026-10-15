// FIRST LIGHT ONBOARDING CHIPS (A4). desires: 4 per focus, first-person
// phrases the user taps into the 'Say it however it comes out' field. Each one
// shapes cleanly through the desire shaper and lands on a motif or a hand-tuned
// Chapter I script, so a tap is a good first story. feelings: the 1.0 six,
// ids unchanged (testIDs intake-feeling-<id>); the id is the {feeling} value.
// STYLE HEADER (binding for every content file; full guide: docs/CONTRACTS.md §7–§8)
// - Original prose only. Chips are the user's own first-person words.
// - No parentheses, abbreviations or '&'. Curly quotes only.
// - Nothing from BANNED_PHRASES in lib/story/content/types.ts: no 'future self', no
//   moon or astrology, no weekdays, no health or money guarantees, no stock LLM words.
// - No gendered pronouns for other people. Never assume a body, gender or relationship.
// - Self-check: bun test lib/story/content

import type { ContentStatus, OnboardingChips } from "@/lib/story/content/types";

export const STATUS: ContentStatus = "final";

export const ONBOARDING_CHIPS: OnboardingChips = {
  desires: {
    love: ["a love that feels like home", "finding my person", "deeper friendships", "being close to my family again"],
    abundance: ["being debt free", "a home of my own", "a real savings cushion", "travelling the world"],
    career: ["my own design studio", "a job that makes me proud", "getting promoted", "writing my first book"],
    health: ["waking up rested", "a body that feels strong", "energy that lasts all day", "running my first race"],
    confidence: ["speaking up in meetings", "trusting myself", "being seen for my work", "saying no without guilt"],
    peace: ["slow, quiet mornings", "a calm mind", "a quiet home by the sea", "a life with room to breathe"],
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
