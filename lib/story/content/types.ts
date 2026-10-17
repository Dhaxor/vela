// CONTENT SCHEMA v2 — Vela 1.1 "Night Atlas". FROZEN CONTRACT.
//
// Steward: A2 (engine). Writers: A3 (stages.shared, love, abundance, career,
// weave) and A4 (health, confidence, peace, bridges, motifs, lib/content/*).
// Writers only ever edit DATA files that satisfy these types. They never edit
// this file. Changes are additive only (a new optional field or a new export)
// and are logged in docs/CONTRACTS.md §Changelog.
//
// This module is a leaf: it imports nothing at runtime. lib/** and contexts/**
// may both import it. The full writer guide, with examples, is
// docs/CONTRACTS.md §7 (content) and §8 (template tokens).

import type { FocusId } from "@/lib/focus";

export type { FocusId };

/* =========================================================================
 * Stages (one season = seven chapters, one per stage)
 * ========================================================================= */

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const STAGE_IDS: readonly StageId[] = [1, 2, 3, 4, 5, 6, 7];

export type StageNumeral = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";

export interface StageMeta {
  readonly id: StageId;
  readonly numeral: StageNumeral;
  /** Shown as 'Chapter III · The Hard Day'. */
  readonly name: string;
  /** One-line brief for writers: what the scene is about. Not shown in the UI. */
  readonly brief: string;
}

export const STAGES: Readonly<Record<StageId, StageMeta>> = {
  1: { id: 1, numeral: "I", name: "The First Glimpse", brief: "The first morning inside the life where it is real. Wonder, quiet, small details." },
  2: { id: 2, numeral: "II", name: "The Night Before", brief: "The evening before the big day. Rehearsal, readiness, nerves that settle." },
  3: { id: 3, numeral: "III", name: "The Hard Day", brief: "Something goes wrong and you handle it. Realistic, steady, never catastrophic." },
  4: { id: 4, numeral: "IV", name: "Someone Notices", brief: "Another person reflects the change back to you." },
  5: { id: 5, numeral: "V", name: "The Threshold", brief: "The first sixty seconds after the news." },
  6: { id: 6, numeral: "VI", name: "An Ordinary Day", brief: "Integration. The dream has become normal life." },
  7: { id: 7, numeral: "VII", name: "Becoming", brief: "Identity. Who you are now, and the path that made you." },
};

/* =========================================================================
 * Dayparts, beats, positions
 * ========================================================================= */

/**
 * The LISTENER'S frame, chosen at READ time (never stored as the only text):
 * morning variants hand the listener into the day carrying the bridge;
 * evening variants hand them into rest. The scene itself can be any time.
 */
export type Daypart = "morning" | "evening";
export const DAYPARTS: readonly Daypart[] = ["morning", "evening"];

/** The 6-beat skeleton every engine-written chapter follows, in this order. */
export type BeatSlot = "opening" | "arrival" | "sensory" | "living" | "reflection" | "closing";
export const BEAT_SKELETON: readonly BeatSlot[] = [
  "opening", // shared, per daypart
  "arrival", // focus × stage
  "sensory", // shared × stage
  "living", // focus × stage
  "reflection", // shared × stage
  "closing", // shared, per daypart
];

/**
 * Paragraphs the engine inserts around the skeleton:
 * - recall: 'Previously' line citing an older proof by date (stage ≥ II)
 * - weave: the newly woven proof (exactly one per chapter that weaves one)
 * - motif: a living moment or witness line from the matched motif archetype
 * - cumulative: 'Reality has answered you four times now' (≥ 3 proofs)
 */
export type InsertSlot = "recall" | "weave" | "motif" | "cumulative";
export type ParagraphBeat = BeatSlot | InsertSlot;

/** Where a weave line may sit: inside arrival, as the witness, or just before closing. */
export type WeavePosition = "arrival" | "witness" | "preClosing";
export const WEAVE_POSITIONS: readonly WeavePosition[] = ["arrival", "witness", "preClosing"];

/* =========================================================================
 * Proof and bridge vocabulary (shared with contexts/arc.types.ts)
 * ========================================================================= */

/** did = crossed the bridge · moved = partial step · learned = it taught you something (incl. 'Not today'). */
export type ProofKind = "did" | "moved" | "learned";
export const PROOF_KINDS: readonly ProofKind[] = ["did", "moved", "learned"];

/** Library tiers. The user may also write their own ('own' lives in arc.types, not in content). */
export type BridgeTier = "2min" | "15min" | "brave";
export const BRIDGE_TIERS: readonly BridgeTier[] = ["2min", "15min", "brave"];

/* =========================================================================
 * Motifs (24 archetypes, matched on-device by keyword)
 * ========================================================================= */

export type MotifId =
  // work and making
  | "own-business"
  | "food-venture"
  | "creative-work"
  | "promotion"
  | "new-job"
  | "freelance"
  | "study"
  // money and place
  | "debt-free"
  | "savings"
  | "home"
  | "relocation"
  | "travel"
  // people
  | "partner"
  | "wedding"
  | "family"
  | "family-repair"
  | "friendship"
  // body and rest
  | "running"
  | "strength"
  | "healing"
  | "sleep"
  // self
  | "visibility"
  | "work-confidence"
  | "calm-mind";

export const MOTIF_IDS: readonly MotifId[] = [
  "own-business", "food-venture", "creative-work", "promotion", "new-job", "freelance", "study",
  "debt-free", "savings", "home", "relocation", "travel",
  "partner", "wedding", "family", "family-repair", "friendship",
  "running", "strength", "healing", "sleep",
  "visibility", "work-confidence", "calm-mind",
];

/**
 * What a fragment ASSUMES about the user's life. A fragment that mentions a
 * partner must declare `requires: ["romance"]`; the engine only picks it when
 * a matched motif carries that flag. This is how love content splits into
 * romance / family / friendship without assuming a partner.
 */
export type MotifFlag =
  | "romance" // a partner exists or is arriving
  | "family" // parents, siblings or chosen family are in the picture
  | "children" // a child is in the picture
  | "friendship" // friends or community
  | "business" // the user runs something: clients, customers, a shop
  | "employer" // a boss, team or colleagues
  | "home" // a specific home or flat
  | "relocation"; // a move to a new city or country

export interface MotifArchetype {
  readonly id: MotifId;
  /** Primary focus; used for bridge selection and tie-breaks. Matching itself is cross-focus. */
  readonly focus: FocusId;
  /** Writer-facing label, e.g. 'Own business or studio'. */
  readonly label: string;
  /** Lowercase whole words or phrases matched against the desire ('studio', 'my own business'). */
  readonly keywords: readonly string[];
  readonly flags: readonly MotifFlag[];
  /** Value of {motif.place}: a lowercase noun phrase with its article, e.g. 'the studio'. */
  readonly place: string;
  /** Values of {motif.detail}: 6 lowercase sensory noun phrases, no final punctuation. */
  readonly details: readonly string[];
  /** 3 'living moments': full sentences, inserted as motif paragraphs. */
  readonly living: readonly Fragment[];
  /** 2 'witness lines': full sentences, used at the witness position. */
  readonly witness: readonly Fragment[];
}

/* =========================================================================
 * Fragments
 * ========================================================================= */

/**
 * One piece of original writing. `id` is stored in each dream's repetition
 * guard forever, so it must be globally unique and NEVER renamed after it
 * ships. See docs/CONTRACTS.md §7.2 for the id prefix convention.
 */
export interface Fragment {
  readonly id: string;
  /** Template text. Only the tokens allowed for its ContentKind (ALLOWED_TOKENS). */
  readonly text: string;
  /** Picked only when the matched motifs carry ALL these flags. */
  readonly requires?: readonly MotifFlag[];
  /** Never picked when a matched motif carries ANY of these flags. */
  readonly excludes?: readonly MotifFlag[];
}

/** A chapter title: Title Case, at most 6 words, token-free. */
export interface Title {
  readonly id: string;
  readonly text: string;
}

/* =========================================================================
 * Focus content (A3: love, abundance, career · A4: health, confidence, peace)
 * ========================================================================= */

export interface FocusStageContent {
  /** Target 4. The scene arriving: what is true in this stage. */
  readonly arrival: readonly Fragment[];
  /** Target 4. Living inside it: an action or exchange in the scene. */
  readonly living: readonly Fragment[];
  /** Exactly 3. */
  readonly titles: readonly Title[];
}

/** One element of a hand-tuned Chapter I body. */
export type ScriptItem =
  | { readonly kind: "text"; readonly fragment: Fragment }
  /** Where the onboarding seed proof is woven (WEAVE.seed line). Skipped when there is no seed. */
  | { readonly kind: "weave" }
  /** A motif living moment / witness line / nothing. Skipped when no motif matched. */
  | { readonly kind: "motif"; readonly part: "living" | "witness" };

/**
 * Chapter I is the emotional peak, so it is HAND-TUNED, not rolled from pools.
 * Each focus ships one default script (motifs: []) plus optional scripts tuned
 * for its top motifs. The engine picks the first script whose `motifs` contains
 * a matched motif, else the default. Total 300–380 words with the seed line.
 */
export interface ChapterOneScript {
  readonly id: string;
  readonly motifs: readonly MotifId[];
  readonly title: Title;
  readonly opening: { readonly morning: Fragment; readonly evening: Fragment };
  readonly body: readonly ScriptItem[];
  readonly closing: { readonly morning: Fragment; readonly evening: Fragment };
}

export interface FocusContent {
  readonly focus: FocusId;
  /** Stage 1 pools are used for re-rendered Chapter I and as a fallback. */
  readonly stages: Readonly<Record<StageId, FocusStageContent>>;
  /** At least one script with motifs: [] (the default). */
  readonly chapterOne: readonly ChapterOneScript[];
}

/* =========================================================================
 * Shared stage content (A3: stages.shared.ts)
 * ========================================================================= */

export interface SharedStageContent {
  readonly opening: { readonly morning: readonly Fragment[]; readonly evening: readonly Fragment[] };
  readonly sensory: readonly Fragment[];
  readonly reflection: readonly Fragment[];
  readonly closing: { readonly morning: readonly Fragment[]; readonly evening: readonly Fragment[] };
}

export type SharedStages = Readonly<Record<StageId, SharedStageContent>>;

/* =========================================================================
 * Proof weave library (A3: weave.ts)
 * ========================================================================= */

export interface WeaveLibrary {
  /** kind × position, 6 variants each. Standalone paragraph, 12–35 words. */
  readonly woven: Readonly<Record<ProofKind, Readonly<Record<WeavePosition, readonly Fragment[]>>>>;
  /** 6. Weave lines for the onboarding seed proof ('You had already …'). Chapter I only. */
  readonly seed: readonly Fragment[];
  /** 6. Weave lines for a learned proof that came from 'Not today'. */
  readonly notToday: readonly Fragment[];
  /** 12. Recall an OLDER proof by date ('Twelve days ago you wrote …'). */
  readonly recall: readonly Fragment[];
  /** 8. Cumulative lines. Only used when the dream has ≥ 3 proofs, so write plural. */
  readonly cumulative: readonly Fragment[];
}

/* =========================================================================
 * Bridge library (A4: bridges.ts)
 * ========================================================================= */

export interface BridgeEntry {
  readonly id: string;
  readonly focus: FocusId;
  readonly tier: BridgeTier;
  /** Imperative sentence ending with a period, ≤ 18 words, observable today. */
  readonly text: string;
  /** Stage it fits best. Omitted = any stage. */
  readonly stage?: StageId;
  /** Offered only when this motif matched. Omitted = any desire. */
  readonly motif?: MotifId;
}

export interface BridgeLibrary {
  /** 25 per focus, at least 6 per tier per focus. */
  readonly entries: readonly BridgeEntry[];
  /** 3 per focus: starter phrasings shown in 'Write my own'. */
  readonly reshape: Readonly<Record<FocusId, readonly Fragment[]>>;
  /** 6. Chooser header after a learned proof ('Try the smallest piece of it'). */
  readonly learnedRetry: readonly Fragment[];
}

/* =========================================================================
 * App copy (A4: lib/content/*)
 * ========================================================================= */

/** The six rolling-queue slots (lib/notifications). */
export type NotificationSlot =
  | "ritual-chapter" // at ritual time, a chapter is waiting
  | "ritual-bridge" // at ritual time, a bridge is open
  | "ifthen" // at the bridge's remindAt: the if-then cue
  | "next-woven" // a chapter woven from today's proof, saved for ritual time
  | "ledger" // Sunday Proof Ledger is ready
  | "quiet-return"; // after several quiet days. Never guilt.

export const NOTIFICATION_SLOTS: readonly NotificationSlot[] = [
  "ritual-chapter", "ritual-bridge", "ifthen", "next-woven", "ledger", "quiet-return",
];

export interface NotificationTemplate {
  readonly id: string;
  /** ≤ 40 characters after filling. */
  readonly title: string;
  /** ≤ 120 characters after filling. */
  readonly body: string;
}

/** 20 per slot; at least 8 per slot must be NEUTRAL (no PERSONAL_TOKENS) for the Lock Screen privacy setting. */
export type NotificationLibrary = Readonly<Record<NotificationSlot, readonly NotificationTemplate[]>>;

/** 'Your lines': first-person identity lines born from proof. kind × focus, 6 each. Token-free. */
export type IdentityLines = Readonly<Record<ProofKind, Readonly<Record<FocusId, readonly Fragment[]>>>>;

export interface RitualPrompts {
  /** 12 per focus. Scripting prompts addressed to the user. */
  readonly script: Readonly<Record<FocusId, readonly Fragment[]>>;
  /** 12. Arc-linked prompts ('Write the scene just after Chapter {chapter.numeral} ends'). */
  readonly scriptArc: readonly Fragment[];
  /** 48. Gratitude stems ending with '…'. Token-free. */
  readonly gratitude: readonly Fragment[];
  /** 10 per focus. 3·6·9 suggestion frames, first person ('I am so {feeling} that {desire.done.i}.'). */
  readonly frames369: Readonly<Record<FocusId, readonly Fragment[]>>;
}

export interface FeelingChip {
  /** Stable id; also the testID suffix (intake-feeling-<id>) and the {feeling} value. */
  readonly id: string;
  readonly label: string;
}

export interface OnboardingChips {
  /** 4 per focus: first-person phrases the user can tap into the desire field ('my own design studio'). */
  readonly desires: Readonly<Record<FocusId, readonly string[]>>;
  /** Must keep the 1.0 ids: grateful, peaceful, alive, proud, free, loved. */
  readonly feelings: readonly FeelingChip[];
}

/* =========================================================================
 * Template tokens — the canonical reference (docs/CONTRACTS.md §8)
 * ========================================================================= */

export interface TokenDoc {
  /** What the engine substitutes. */
  readonly value: string;
  readonly example: string;
  /** Highlight span the engine emits around the substituted value, if any. */
  readonly span?: "name" | "desire" | "proof";
  /** Contains the user's private words; hidden when lockScreenPrivate is on. */
  readonly personal?: true;
}

export const TOKEN_REFERENCE = {
  "{name}": { value: "The user's name as typed. Falls back to 'friend'. Narration speaks the pronunciation instead.", example: "Maya", span: "name" },
  "{feeling}": { value: "The feeling chip, lowercase adjective. Use as a predicate: 'you feel {feeling}'.", example: "proud" },
  "{desire.quote}": { value: "The user's exact words in curly quotes, trailing .!? removed. Always grammatical as a quotation.", example: "“my own design studio”", span: "desire", personal: true },
  "{desire.np}": { value: "Noun phrase, second person, lowercase first letter. Unshapeable desire → 'the life you described'.", example: "your own design studio · finding your soulmate · being debt free", span: "desire", personal: true },
  "{desire.done}": { value: "Completed clause, second person, lowercase first letter. Never sentence-initial. Unshapeable desire → 'you found your way to {desire.quote}'. A bare noun reads '… is part of your life', and '… is yours' right after a colon or 'the life where'.", example: "you opened your bakery · you are debt free", span: "desire", personal: true },
  "{desire.np.my}": { value: "First-person noun phrase. Rituals only, never narration.", example: "my own design studio", personal: true },
  "{desire.done.i}": { value: "First-person completed clause. Rituals only, never narration. Lowercase for noun desires, so it never opens a sentence.", example: "I opened my bakery · slow, quiet mornings are part of my life", personal: true },
  "{proof.quote}": { value: "The proof sentence in curly quotes, trailing punctuation removed.", example: "“Sent my portfolio to two studios”", span: "proof", personal: true },
  "{proof.done}": { value: "The proof as a second-person past clause, lowercase, without its own 'today' or 'this week'. Falls back to 'you wrote {proof.quote}' ('you noted …' when the proof opens with 'Wrote'), and always for a habit ('every day').", example: "you sent your portfolio to two studios", span: "proof", personal: true },
  "{proof.ago}": { value: "Relative day in words, lowercase.", example: "earlier today · yesterday · twelve days ago" },
  "{proof.date}": { value: "Month and day in English words for TTS.", example: "October 14" },
  "{proofs.count}": { value: "Number word for the dream's proofs. Only offered when ≥ 3 (cumulative) or ≥ 2 (notifications): write plural.", example: "four" },
  "{proofs.phrase}": { value: "Pluralised noun phrase.", example: "four proofs" },
  "{nights.count}": { value: "Number word for nights shown up. Only offered when ≥ 2: write plural.", example: "twelve" },
  "{nights.phrase}": { value: "Pluralised noun phrase.", example: "twelve nights" },
  "{motif.place}": { value: "The matched archetype's place, lowercase with article. Fragments using any {motif.*} token are only eligible when a motif matched.", example: "the studio" },
  "{motif.detail}": { value: "One sensory noun phrase from the matched archetype, lowercase, no final punctuation.", example: "fabric swatches pinned above the desk" },
  "{bridge.quote}": { value: "The open or previous bridge in curly quotes, final period removed.", example: "“Send one piece of work to someone whose eye you trust”", personal: true },
  "{ifthen.when}": { value: "The if-then cue label, lowercase.", example: "9am · lunch · after work", personal: true },
  "{ifthen.then}": { value: "The first move: a verb phrase without a subject, lowercase.", example: "open the portfolio file", personal: true },
  "{chapter.numeral}": { value: "Roman numeral of the relevant chapter.", example: "IV" },
  "{chapter.title}": { value: "Title of the relevant chapter.", example: "The Studio Door" },
  "{stage.name}": { value: "Stage name of the relevant chapter.", example: "Someone Notices" },
  "{ritual.time}": { value: "The user's ritual time, device-locale formatted.", example: "9:00 PM" },
} as const satisfies Readonly<Record<string, TokenDoc>>;

export type Token = keyof typeof TOKEN_REFERENCE;
export const ALL_TOKENS = Object.keys(TOKEN_REFERENCE) as readonly Token[];

/** Tokens that carry the user's private words (Lock Screen privacy). */
export const PERSONAL_TOKENS: readonly Token[] = ALL_TOKENS.filter(
  (t) => (TOKEN_REFERENCE[t] as TokenDoc).personal === true
);

/** Every kind of text a writer produces. The content walker tags each text with one. */
export type ContentKind =
  | "beat" // shared + focus stage fragments, Chapter I script text
  | "title"
  | "weave"
  | "seed"
  | "notToday"
  | "recall"
  | "cumulative"
  | "motifLine" // motif living + witness
  | "motifPhrase" // motif place + details (they ARE token values)
  | "bridge"
  | "reshape"
  | "learnedRetry"
  | "notification"
  | "identityLine"
  | "scriptPrompt"
  | "arcPrompt"
  | "gratitude"
  | "frame369"
  | "chip";

const STORY: readonly Token[] = [
  "{name}", "{feeling}", "{desire.quote}", "{desire.np}", "{desire.done}", "{motif.place}", "{motif.detail}",
];
const PROOF: readonly Token[] = ["{proof.quote}", "{proof.done}", "{proof.ago}", "{proof.date}"];

/** The ONLY tokens a text of each kind may contain. Enforced by lib/story/content/contract.test.ts. */
export const ALLOWED_TOKENS: Readonly<Record<ContentKind, readonly Token[]>> = {
  beat: STORY,
  title: [],
  weave: [...STORY, ...PROOF],
  seed: [...STORY, ...PROOF],
  notToday: [...STORY, ...PROOF],
  recall: ["{name}", ...PROOF],
  cumulative: ["{name}", "{desire.np}", "{proofs.count}", "{proofs.phrase}"],
  // No {feeling} in motif lines: the shared reflection names it, and a motif line beside it doubled the word.
  motifLine: STORY.filter((t) => t !== "{feeling}"),
  motifPhrase: [],
  // Bridges never splice the desire: a long one reads clunky inside a step (‘Book the call that moves your own
  // design studio with clients who trust your eye closer’). A motif-tagged bridge may name {motif.place}.
  bridge: ["{motif.place}"],
  reshape: [],
  learnedRetry: ["{name}", "{bridge.quote}", "{proof.quote}"],
  notification: [
    "{name}", "{desire.quote}", "{desire.np}", "{bridge.quote}", "{ifthen.when}", "{ifthen.then}",
    "{proof.quote}", "{proof.ago}", "{chapter.numeral}", "{chapter.title}", "{stage.name}", "{ritual.time}",
    "{proofs.count}", "{proofs.phrase}", "{nights.count}", "{nights.phrase}",
  ],
  identityLine: [],
  scriptPrompt: ["{desire.np}", "{desire.quote}"],
  arcPrompt: ["{name}", "{desire.np}", "{chapter.numeral}", "{chapter.title}", "{stage.name}", "{bridge.quote}", "{proof.quote}"],
  gratitude: [],
  frame369: ["{feeling}", "{desire.done.i}", "{desire.np.my}"],
  chip: [],
};

/* =========================================================================
 * Writing rules (style lint; enforced by tests where mechanical)
 * ========================================================================= */

export const WRITING_RULES = {
  /** Rendered sentences, excluding words inside the user's quoted words. */
  maxSentenceWords: 28,
  /** Template sentences, counting each {token} as ONE word. Leaves headroom for expansion. */
  maxTemplateSentenceWords: 24,
  /** At most one em dash per fragment (LLM tell when dense). */
  maxEmDashesPerFragment: 1,
  /** Engine-level: 'now' at most once per rendered chapter. Writers: prefer zero. */
  maxNowPerChapter: 1,
  /** Rendered chapter length (either daypart variant). */
  chapterWords: { min: 300, max: 380 },
} as const;

/** Word-count guides per piece (template words, tokens count as one). */
export const WORD_TARGETS = {
  beat: { min: 30, max: 60 },
  chapterOneTotal: { min: 300, max: 380 },
  weave: { min: 12, max: 35 },
  recall: { min: 8, max: 30 },
  cumulative: { min: 5, max: 20 },
  motifLine: { min: 10, max: 35 },
  bridge: { min: 4, max: 18 },
} as const;

/**
 * Case-insensitive, matched on word boundaries (a phrase may span words).
 * Applies to every ContentKind.
 */
export const BANNED_PHRASES: readonly string[] = [
  // product rules
  "future self", "future-self", "future you", "future-you", "manifest", "manifested", "manifesting",
  // LLM tells and stock words
  "whisper", "whispers", "whispered", "whispering", "tapestry", "testament", "symphony", "delve",
  "realm", "beacon", "embark", "ethereal", "kaleidoscope", "labyrinth", "nestled", "palpable",
  "unwavering", "intricate", "resonate", "resonates", "vibrant", "journey", "unlock", "unleash",
  "elevate", "transformative", "the universe", "vibration", "vibrations", "frequency", "a dance of",
  // moon / astrology (out of scope for 1.1, Guideline 4.3(b))
  "lunar", "full moon", "new moon", "zodiac", "horoscope", "astrology", "astrological", "tarot",
  "retrograde", "stars aligned",
  // no hard-coded weekdays
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  // no health, medical or money guarantees
  "guarantee", "guaranteed", "cure", "cured", "diagnosis", "weight loss", "lose weight",
  "millionaire", "get rich", "risk-free",
  // no gendered pronouns or roles for other people
  "he", "him", "his", "himself", "she", "her", "hers", "herself",
  "boyfriend", "girlfriend", "husband", "wife",
];

/** Extra bans for notification copy: no guilt, loss or streak framing. */
export const BANNED_IN_NOTIFICATIONS: readonly string[] = [
  "streak", "don't break", "you missed", "missed", "falling behind", "last chance", "hurry",
  "lose your", "losing your", "disappointed", "fail", "failed",
];

/** Regex sources (flag 'i'). TTS hygiene and structural LLM tells. */
export const BANNED_PATTERNS: readonly { readonly id: string; readonly source: string; readonly why: string }[] = [
  { id: "not-x-but-y", source: "\\bnot\\b[^.!?;:]{1,60}?\\bbut\\b", why: "'not X but Y' construction" },
  { id: "its-not-its", source: "\\bit'?s not\\b[^.!?]{1,60}\\bit'?s\\b", why: "'it's not X, it's Y' construction" },
  { id: "parens", source: "[()]", why: "TTS reads parentheses badly" },
  { id: "abbrev", source: "\\b(?:e\\.g|i\\.e|etc)\\.", why: "TTS-unfriendly abbreviation" },
  { id: "ampersand", source: "&", why: "TTS-unfriendly symbol" },
  { id: "double-stop", source: "\\.\\.(?!\\.)|!\\.|\\?\\.", why: "doubled punctuation" },
  { id: "to-to", source: "\\b(?:in)?to to\\b", why: "broken frame around a 'to'-verb desire" },
  { id: "straight-quotes", source: "\"", why: "use curly quotes “ ” in copy" },
];

/**
 * Opening and closing CADENCES: the stock moves a listener hears as a formula
 * when they come round again ('Let your breathing slow…', 'Come back…', 'give
 * it a time', 'Good morning, Maya.'). A season reads one chapter per stage, so
 * each family lives in ONE stage only, and inside that stage in its openings
 * or its closings, never both. Then no season repeats a cadence, whatever the
 * dice roll. Chapter I scripts count as stage I. Regex sources (flags 'iu'),
 * tested on the template text. Enforced by golden.test.ts.
 */
export const CADENCES: readonly { readonly id: string; readonly source: string }[] = [
  // greetings and settling in
  { id: "good-morning", source: "^good morning\\b" },
  { id: "morning-name", source: "^morning, " },
  { id: "get-comfortable", source: "\\bget comfortable\\b" },
  { id: "settle-in", source: "\\bsettle in\\b" },
  { id: "start-here", source: "^start (?:here|the day)\\b" },
  { id: "here-is", source: "^here is\\b" },
  { id: "head-out", source: "\\bbefore you head\\b" },
  { id: "few-minutes", source: "\\bfew (?:quiet )?minutes\\b" },
  { id: "day-wait", source: "\\b(?:the|your(?: own)?) day (?:wait|hold off)\\b|\\bday a few minutes to wait\\b|\\bhold the day off\\b" },
  { id: "before-the-day", source: "\\bbefore the day\\b" },
  { id: "somewhere-ahead", source: "\\bsomewhere ahead of you\\b" },
  { id: "scene-ahead", source: "\\bthe scene ahead\\b" },
  { id: "further-on", source: "\\ba little further on\\b" },
  { id: "than-you-think", source: "\\bthan you think\\b" },
  // putting the day down
  { id: "let-day-close", source: "\\blet the day close\\b|\\bclose the day\\b" },
  { id: "let-day-go", source: "\\blet the (?:work of )?(?:day|today) go\\b|\\blet go of the day\\b" },
  { id: "let-day-end", source: "\\blet (?:the day|today) end\\b" },
  { id: "let-tonight", source: "\\blet tonight go\\b" },
  { id: "let-evening", source: "\\blet the evening\\b" },
  { id: "leave-day", source: "\\bleave the day\\b|\\bset the day aside\\b" },
  { id: "room-quiet", source: "\\blet the room\\b|\\bthe room around you\\b" },
  // the body
  { id: "breath-let", source: "\\blet your breath(?:ing)?\\b" },
  { id: "breathe-out", source: "\\bbreathe out\\b" },
  { id: "long-breath", source: "\\btake (?:a|one) (?:slow|long|deep) breath\\b" },
  { id: "close-eyes", source: "\\bclose your eyes\\b" },
  { id: "open-eyes", source: "\\bopen your eyes\\b" },
  { id: "shoulders-drop", source: "\\blet your shoulders\\b|\\bshoulders drop\\b" },
  { id: "hands-loose", source: "\\bhands (?:go|fall) (?:heavy|loose|open)\\b|\\blet your hands (?:rest|go|fall)\\b" },
  { id: "jaw", source: "\\byour jaw\\b" },
  { id: "stretch", source: "\\bstretch\\b" },
  // leaving the scene
  { id: "come-back", source: "\\bcome back\\b(?! to it)|\\breturn (?:slowly|to)\\b|(?:^|[.!?]\\s)back to your\\b" },
  { id: "chapter-go", source: "\\blet the (?:chapter|scene|evening scene|story)\\b[^.!?]{0,20}?\\b(?:go|fade|close)\\b|\\bset the chapter down\\b|\\blet go of the scene\\b" },
  { id: "that-is", source: "^that is\\b" },
  { id: "before-you-go", source: "^before you go\\b" },
  { id: "when-ready", source: "\\bwhen(?:ever)? you are ready\\b" },
  // the step below (morning closings)
  { id: "give-a-time", source: "\\bgive (?:it|one small step|the thing you make) (?:a )?(?:little )?(?:time|place|moment)\\b" },
  { id: "just-below", source: "\\bjust below\\b" },
  { id: "under-this-page", source: "\\bunder this page\\b" },
  // into sleep (evening closings)
  { id: "nothing-left", source: "\\bnothing left to\\b" },
  { id: "dark-come", source: "\\blet the dark come\\b" },
  { id: "let-sleep", source: "\\blet sleep\\b|\\bsleep (?:is allowed to|comes easier)\\b" },
  { id: "sleep-well", source: "\\b(?:sleep|rest) well\\b" },
  { id: "rest-imperative", source: "^rest\\b|(?:^|[.!?]\\s)rest\\.\\s*$" },
];

/* =========================================================================
 * Pool targets (enforced only once a file's status is 'final')
 * ========================================================================= */

export const POOL_TARGETS = {
  shared: { openingPerDaypart: 5, sensory: 5, reflection: 5, closingPerDaypart: 5 },
  focus: { arrival: 4, living: 4, titles: 3, chapterOneMin: 1 },
  weave: { perKindPosition: 6, seed: 6, notToday: 6, recall: 12, cumulative: 8 },
  bridges: { perFocus: 25, minPerTierPerFocus: 6, reshapePerFocus: 3, learnedRetry: 6 },
  motifs: { archetypes: 24, details: 6, living: 3, witness: 2 },
  notifications: { perSlot: 20, neutralPerSlot: 8 },
  lines: { perKindFocus: 6 },
  prompts: { scriptPerFocus: 12, scriptArc: 12, gratitude: 48, frames369PerFocus: 10 },
  chips: { desiresPerFocus: 4, feelings: 6 },
} as const;

/* =========================================================================
 * Content file status
 * ========================================================================= */

/** 'placeholder' = stub; 'draft' = writer at work; 'final' = pool targets and style lint are release-blocking. */
export type ContentStatus = "placeholder" | "draft" | "final";

export type ContentFileId =
  | "stages.shared" | "love" | "abundance" | "career" | "weave" // A3
  | "health" | "confidence" | "peace" | "bridges" | "motifs" // A4
  | "notifications" | "lines" | "prompts" | "chips"; // A4 (lib/content)

export const CONTENT_OWNERS: Readonly<Record<ContentFileId, "A3" | "A4">> = {
  "stages.shared": "A3", love: "A3", abundance: "A3", career: "A3", weave: "A3",
  health: "A4", confidence: "A4", peace: "A4", bridges: "A4", motifs: "A4",
  notifications: "A4", lines: "A4", prompts: "A4", chips: "A4",
};
