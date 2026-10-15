// PLACEHOLDER — replaced by content writer (A4).
// Notification copy for the rolling queue (lib/notifications, A6): 6 slots × 20.
// At least 8 per slot must be NEUTRAL (no personal tokens: {desire.*},
// {proof.*}, {bridge.*}, {ifthen.*}) for the default-on Lock Screen privacy
// setting. Title ≤ 40 chars and body ≤ 120 chars AFTER filling. No guilt, loss
// or streak framing (BANNED_IN_NOTIFICATIONS). Count tokens are only used when
// the count is ≥ 2, so write them plural. Targets: POOL_TARGETS.notifications.
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

import type { ContentStatus, NotificationLibrary, NotificationTemplate } from "@/lib/story/content/types";

export const STATUS: ContentStatus = "placeholder";

const nt = (id: string, title: string, body: string): NotificationTemplate => ({ id, title, body });

export const NOTIFICATIONS: NotificationLibrary = {
  "ritual-chapter": [nt("nt-rc1", "Your chapter is waiting", "Placeholder. Chapter {chapter.numeral} is ready when you are, {name}.")],
  "ritual-bridge": [nt("nt-rb1", "Today’s bridge", "Placeholder. One small step is waiting for you, {name}.")],
  ifthen: [nt("nt-if1", "This is the moment", "Placeholder. This is the moment you planned for.")],
  "next-woven": [nt("nt-nw1", "Chapter {chapter.numeral} is ready", "Placeholder. It begins with what you did.")],
  ledger: [nt("nt-lg1", "Your week in stars", "Placeholder. This week’s Proof Ledger is ready.")],
  "quiet-return": [nt("nt-qr1", "Your sky kept your place", "Placeholder. Your story is here whenever you are.")],
};
