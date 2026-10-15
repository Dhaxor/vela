// PLACEHOLDER — replaced by content writer (A4).
// Bridge library: 25 per focus (≥ 6 per tier), each an observable step for TODAY,
// imperative, ≤ 18 words, ending with a period. Optional `stage` and `motif` tags.
// Plus 3 'write my own' reshape starters per focus and 6 learned-retry headers.
// The placeholder entries reuse the 1.0 actions (one per tier) so the engine can
// offer three sized choices before the real library lands.
// Targets: POOL_TARGETS.bridges.
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

import type { BridgeEntry, BridgeLibrary, ContentStatus, Fragment } from "./types";

export const STATUS: ContentStatus = "placeholder";

const fr = (id: string, text: string): Fragment => ({ id, text });

const ENTRIES: readonly BridgeEntry[] = [
  // love
  { id: "br-lo01", focus: "love", tier: "2min", text: "Send one honest line of appreciation to someone who matters." },
  { id: "br-lo02", focus: "love", tier: "15min", text: "Make ten undistracted minutes for a conversation you usually postpone." },
  { id: "br-lo03", focus: "love", tier: "brave", text: "Name one boundary that would make closeness feel safer, and say it once." },
  // abundance
  { id: "br-ab01", focus: "abundance", tier: "2min", text: "Write down one resource you already have and one way to use it today." },
  { id: "br-ab02", focus: "abundance", tier: "15min", text: "Take one five-minute step toward an opportunity you have been circling." },
  { id: "br-ab03", focus: "abundance", tier: "brave", text: "Move one small amount toward the life you described." },
  // career
  { id: "br-ca01", focus: "career", tier: "2min", text: "Open the file for your next piece of work and write its first line." },
  { id: "br-ca02", focus: "career", tier: "15min", text: "Protect twenty focused minutes for the skill this work relies on." },
  { id: "br-ca03", focus: "career", tier: "brave", text: "Send the message that could move this one conversation closer." },
  { id: "br-ca04", focus: "career", tier: "15min", text: "Sketch the sign that will hang above {motif.place}.", motif: "own-business" },
  // health
  { id: "br-he01", focus: "health", tier: "2min", text: "Choose one action your body will thank you for tonight." },
  { id: "br-he02", focus: "health", tier: "15min", text: "Give yourself ten minutes of gentle movement or rest, whichever today asks for." },
  { id: "br-he03", focus: "health", tier: "brave", text: "Prepare the next nourishing choice before you become tired or rushed." },
  // confidence
  { id: "br-co01", focus: "confidence", tier: "2min", text: "Say your preference once without explaining it away." },
  { id: "br-co02", focus: "confidence", tier: "15min", text: "Keep one promise to yourself that takes less than fifteen minutes." },
  { id: "br-co03", focus: "confidence", tier: "brave", text: "Do one small thing before you feel fully ready, then write down what happened." },
  // peace
  { id: "br-pe01", focus: "peace", tier: "2min", text: "Sit for three quiet minutes and name what does not need solving today." },
  { id: "br-pe02", focus: "peace", tier: "15min", text: "Finish one open loop that has been quietly taking your attention." },
  { id: "br-pe03", focus: "peace", tier: "brave", text: "Remove one avoidable demand from the next hour." },
];

export const BRIDGES: BridgeLibrary = {
  entries: ENTRIES,
  reshape: {
    love: [fr("rs-lo1", "Placeholder starter. One small way to show up for someone today.")],
    abundance: [fr("rs-ab1", "Placeholder starter. One small money step you could finish before lunch.")],
    career: [fr("rs-ca1", "Placeholder starter. One visible piece of work, however small.")],
    health: [fr("rs-he1", "Placeholder starter. One kind thing for your body, sized for today.")],
    confidence: [fr("rs-co1", "Placeholder starter. One sentence you will say out loud today.")],
    peace: [fr("rs-pe1", "Placeholder starter. One demand you can set down for an hour.")],
  },
  learnedRetry: [fr("lr1", "Placeholder retry header. Last time taught you something. Try the smallest piece of {bridge.quote}.")],
};
