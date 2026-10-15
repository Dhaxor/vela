// THE DESIRE SHAPER. People say what they want in any shape: 'my own design
// studio', 'To open my bakery by next summer', 'Find my soulmate', 'I am debt
// free', 'I want to feel at home in my body'. 1.0 pasted those words raw into
// frames and produced 'into to open my bakery'. The shaper detects the shape,
// strips want-verbs and deadline tails, swaps my/I to your/you, and exposes the
// three slots the content is written against (docs/CONTRACTS.md §8):
//
//   {desire.quote}  the exact words in curly quotes; always safe
//   {desire.np}     a noun phrase: 'opening your bakery', 'your own design studio'
//   {desire.done}   a completed clause: 'you opened your bakery', 'you are debt free'
//
// plus first-person forms for the 3·6·9 frames ({desire.np.my}, {desire.done.i}).
// When a desire cannot be shaped, the slots fall back to safe phrases pinned by
// the golden tests. Pure; no React Native.

import {
  AMBIGUOUS,
  regularForms,
  verbByBase,
  verbByGerund,
  verbByParticiple,
  verbByPast,
  type VerbForms,
} from "./verbs";
import { collapse, curlyQuote, lowerFirst, stripPictographs, stripTrailingPunct } from "./text";

export type DesireShape =
  | "noun" // 'my own design studio'
  | "to-verb" // 'to open my bakery' (also what 'I want to …' reduces to)
  | "imperative" // 'Find my soulmate'
  | "i-clause" // 'I am debt free', 'I live by the sea'
  | "gerund" // 'Running a marathon'
  | "state" // 'debt free', 'calm and confident', 'in love'
  | "unshaped"; // fallbacks

export interface ShapedDesire {
  readonly shape: DesireShape;
  /** “exact words”, trailing .!? removed. */
  readonly quote: string;
  /** Second person, lowercase-safe noun phrase. */
  readonly np: string;
  /** Second person completed clause, starts with 'you'. */
  readonly done: string;
  /** First person noun phrase (3·6·9 frames only). */
  readonly npMy: string;
  /** First person clause starting with 'I' (3·6·9 frames only). */
  readonly doneI: string;
  /** True when np/done are the fallbacks. */
  readonly fallback: boolean;
}

export const NP_FALLBACK = "the life you described";
export const NP_MY_FALLBACK = "the life I described";
/** done fallback is built around the quote: 'you found your way to “…”'. */
export const doneFallback = (quote: string) => `you found your way to ${quote}`;
export const doneIFallback = (quote: string) => `I found my way to ${quote}`;

/** Longest shaped phrase we will weave into a ≤ 28-word sentence. */
export const MAX_SHAPED_WORDS = 14;

/* =========================================================================
 * Normalisation: want-verbs, deadline tails
 * ========================================================================= */

const TIME_NOUN =
  "(?:days?|weeks?|months?|years?|summer|winter|spring|autumn|fall|season|christmas|new year'?s?|easter|birthday|\\d{4}|january|february|march|april|may|june|july|august|september|october|november|december)";
const NUMBERISH = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a|an|a few|a couple of)";

const DEADLINE_TAILS: readonly RegExp[] = [
  new RegExp(`[\\s,]*\\b(?:by|before|within|until|in|around)\\s+(?:the\\s+)?(?:end\\s+of\\s+)?(?:this\\s+|next\\s+|the\\s+)?(?:${NUMBERISH}\\s+)?${TIME_NOUN}\\b.*$`, "iu"),
  new RegExp(`[\\s,]*\\b(?:this|next)\\s+${TIME_NOUN}\\b.*$`, "iu"),
  /[\s,]*\b(?:in|within)\s+(?:the\s+)?(?:next|coming)\b.*$/iu,
  /[\s,]*\bbefore\s+(?:i|i'm|i’m|my|we|our|the)\b.*$/iu,
  /[\s,]*\bby\s+(?:the\s+)?(?:age\s+(?:of\s+)?)?\d{1,4}\b.*$/iu,
  /[\s,]*\bby\s+the\s+time\b.*$/iu,
  /[\s,]*\b(?:soon|someday|some day|one day|asap|right now|this time|already)\s*$/iu,
];

const LEADING_TIME: readonly RegExp[] = [
  new RegExp(`^(?:this|next)\\s+${TIME_NOUN}\\s*,?\\s+`, "iu"),
  new RegExp(`^(?:by|before|in|within)\\s+(?:the\\s+end\\s+of\\s+)?(?:${NUMBERISH}\\s+)?${TIME_NOUN}\\s*,\\s*`, "iu"),
];

const ADVERB = "(?:really|truly|just|so|finally|deeply|desperately|also|still|honestly|badly)";
const SUBJECT = `(?:i|we)\\s+(?:${ADVERB}\\s+)*`;
const WANT_VERB =
  "(?:would like|would love|am going|are going|am ready|am determined|am manifesting|am calling in|want|wish|hope|need|desire|long|crave|deserve|plan|intend|aim|choose|dream)";

/**
 * Want-verb prefixes. A following 'to' is KEPT so the verb reading survives
 * ('I want to travel' → 'to travel'); modals become 'to' for the same reason.
 * Each entry is [pattern, replacement].
 */
const WANT_PREFIXES: readonly (readonly [RegExp, string])[] = [
  [new RegExp(`^${SUBJECT}(?:will|shall|can|could|must|should|wanna)\\s+`, "iu"), "to "],
  [/^(?:i|we)['’](?:ll)\s+/iu, "to "],
  [/^wanna\s+/iu, "to "],
  [new RegExp(`^${SUBJECT}${WANT_VERB}(?:\\s+(?:for|of|that|about))?\\s+`, "iu"), ""],
  [/^(?:i|we)['’](?:d like|d love|m going|re going|m ready|m determined|m manifesting|m calling in)(?:\s+(?:for|that))?\s+/iu, ""],
  [/^im\s+(?:going|ready)(?:\s+for)?\s+/iu, ""],
  [/^my\s+(?:goal|dream|wish|intention|hope|plan|desire|aim|prayer)\s+(?:is|was)\s+(?:that\s+)?/iu, ""],
  [/^(?:want|wish|hope|need|desire|long|crave)(?:\s+(?:for|of|that))?\s+/iu, ""],
  [/^(?:manifesting|calling in|attracting|praying for)\s+/iu, ""],
];

function stripWant(s: string): string {
  let out = s;
  for (let guard = 0; guard < 4; guard += 1) {
    const before = out;
    for (const [re, to] of WANT_PREFIXES) out = out.replace(re, to);
    if (out === before) break;
  }
  return out;
}

function stripDeadlines(s: string): string {
  let out = s;
  for (const re of LEADING_TIME) out = out.replace(re, "");
  for (let guard = 0; guard < 4; guard += 1) {
    const before = out;
    for (const re of DEADLINE_TAILS) out = out.replace(re, "");
    out = stripTrailingPunct(out.replace(/[\s,;:–—-]+$/u, ""));
    if (out === before) break;
  }
  return out;
}

/** The analysable core of a desire: trimmed, no wrapping quotes, no emoji, no want-verb, no deadline. */
export function desireCore(raw: string): string {
  let s = stripTrailingPunct(collapse(raw)).replace(/^["“”'‘’]+|["“”'‘’]+$/gu, "");
  s = stripPictographs(s);
  s = stripTrailingPunct(stripDeadlines(stripWant(stripDeadlines(s))));
  return collapse(s);
}

/** Words that open a modifier rather than a new list item ('a studio, WITH clients who…'). */
const MODIFIER_START =
  "with|without|who|whose|where|which|that|by|near|beside|overlooking|facing|in|on|at|for|from|under|over|among|surrounded|filled|full|close|doing|working|living|making|built";
const MODIFIER_COMMA = new RegExp(`,\\s+(?=(?:${MODIFIER_START})(?![\\p{L}]))`, "giu");

/**
 * Drop a comma that only introduces a modifier. Inside a sentence the shaped
 * phrase has no closing comma, so 'what your own design studio, with clients
 * who trust your eye felt like' reads as a broken appositive; without it the
 * modifier is restrictive and fits any frame. List commas ('a home, a garden
 * and a dog') are kept. The quote keeps the user's exact words.
 */
export function closeModifierCommas(core: string): string {
  return core.replace(MODIFIER_COMMA, " ");
}

/* =========================================================================
 * Word classes
 * ========================================================================= */

/** Words that make an ambiguous head word read as a verb ('love MYSELF', 'move TO Lisbon'). */
const OBJECT_START: ReadonlySet<string> = new Set([
  "a", "an", "the", "my", "our", "your", "his", "her", "their", "this", "that", "these", "those",
  "more", "less", "some", "enough", "every", "each", "all", "one", "two", "three", "myself", "me",
  "us", "ourselves", "it", "them", "someone", "something", "up", "down", "out", "off", "away", "back",
  "to", "in", "into", "on", "at", "with", "from", "for", "through", "around", "abroad", "home",
  "again", "together", "often", "daily", "well", "better", "freely", "full-time", "fulltime", "without",
]);

/** Adjectives/adverbs that make a stative phrase: 'calm and confident', 'financially free'. */
const STATE_WORDS: ReadonlySet<string> = new Set([
  "happy", "healthy", "confident", "calm", "free", "debt-free", "rich", "wealthy", "fit", "strong",
  "married", "engaged", "pregnant", "promoted", "loved", "peaceful", "grateful", "safe", "secure",
  "stable", "independent", "successful", "abundant", "whole", "healed", "rested", "present", "seen",
  "known", "brave", "bold", "proud", "content", "joyful", "joyous", "balanced", "grounded", "centered",
  "centred", "focused", "organized", "organised", "energized", "energised", "well", "better", "kind",
  "patient", "gentle", "relaxed", "comfortable", "valued", "respected", "appreciated", "creative",
  "productive", "disciplined", "consistent", "unstoppable", "fearless", "settled", "employed",
  "self-employed", "published", "certified", "qualified", "sober", "smoke-free", "pain-free", "able",
  "ready", "enough", "worthy", "lovable", "visible", "heard", "understood", "connected", "loving",
  "financially", "emotionally", "physically", "mentally", "fully", "truly", "completely", "totally",
  "very", "really", "more", "so", "and", "or", "deeply", "genuinely", "quietly", "finally",
]);

const STATE_PREPOSITIONS: ReadonlySet<string> = new Set(["in", "at", "out", "together", "back", "on", "with"]);

const COORDINATORS: ReadonlySet<string> = new Set(["and", "or", "then", "&"]);

const LEADING_ADVERBS: ReadonlySet<string> = new Set([
  "finally", "really", "truly", "just", "never", "always", "actually", "fully", "completely",
  "consistently", "confidently", "easily", "effortlessly", "happily", "peacefully", "deeply", "also",
  "still", "genuinely", "gently", "quietly", "boldly", "regularly", "proudly", "openly", "freely",
]);

// \p{L} lookarounds instead of \b: \b is ASCII-only and misses 'café'.
const BUSINESS_OBJECT = /(?<!\p{L})(?:business|company|studio|shop|bakery|café|cafe|agency|practice|clinic|salon|restaurant|team|store|brand|firm|startup|nonprofit|charity|school|gym|farm|label|consultancy)(?!\p{L})/iu;
const HABIT_MARKER = /(?<!\p{L})(?:every|each|daily|weekly|a month|a year|a week|per month|per year|per week|monthly|yearly|always|never|more|regularly|full[- ]time|from home|for a living)(?!\p{L})/iu;

/** -ing words that are nouns, not gerunds ('something new', 'a wedding'). */
const ING_NOUNS: ReadonlySet<string> = new Set([
  "something", "anything", "everything", "nothing", "morning", "evening", "wedding", "building", "clothing",
  "ceiling", "offspring", "string", "thing", "king", "ring", "spring", "sibling", "darling", "ending",
  "meeting", "wellbeing", "belonging", "upbringing", "savings", "earnings", "painting", "drawing",
]);

/* =========================================================================
 * Tokens and pronouns
 * ========================================================================= */

const norm = (w: string) => w.toLowerCase().replace(/[’]/gu, "'").replace(/[^\p{L}\p{N}'-]/gu, "");

/** Second person swap, one token at a time (keeps attached punctuation and apostrophe style). */
function swapToken(token: string, next: string | undefined): { out: string; consumeNext?: string } {
  const lead = token.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
  const trail = token.match(/[^\p{L}\p{N}'’]*$/u)?.[0] ?? "";
  const core = token.slice(lead.length, token.length - trail.length);
  const apos = core.includes("’") ? "’" : "'";
  const n = norm(core);
  const cap = /^\p{Lu}/u.test(core) && n !== "i";
  const fix = (w: string) => lead + (cap ? w[0].toUpperCase() + w.slice(1) : w) + trail;
  switch (n) {
    case "my": case "our": return { out: fix("your") };
    case "mine": case "ours": return { out: fix("yours") };
    case "me": case "us": return { out: fix("you") };
    case "myself": return { out: fix("yourself") };
    case "ourselves": return { out: fix("yourselves") };
    case "i'm": case "we're": return { out: fix(`you${apos}re`) };
    case "i've": case "we've": return { out: fix(`you${apos}ve`) };
    case "i'll": case "we'll": return { out: fix(`you${apos}ll`) };
    case "i'd": case "we'd": return { out: fix(`you${apos}d`) };
    case "i": case "we": {
      const nn = next ? norm(next) : "";
      if (nn === "am") return { out: fix("you"), consumeNext: "are" };
      if (nn === "was") return { out: fix("you"), consumeNext: "were" };
      return { out: fix("you") };
    }
    default: return { out: token };
  }
}

function toSecondPerson(tokens: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const { out: t, consumeNext } = swapToken(tokens[i], tokens[i + 1]);
    out.push(t);
    if (consumeNext) {
      out.push(consumeNext);
      i += 1;
    }
  }
  return out;
}

/* =========================================================================
 * Analysis
 * ========================================================================= */

type Analysis =
  | { readonly kind: "noun"; readonly tokens: readonly string[] }
  | { readonly kind: "state"; readonly tokens: readonly string[] }
  | {
      readonly kind: "verb";
      readonly shape: "to-verb" | "imperative" | "i-clause" | "gerund";
      readonly adverbs: readonly string[];
      readonly verb: VerbForms;
      readonly rest: readonly string[];
      /** Completed-clause tense. */
      readonly tense: "past" | "present" | "perfect" | "progressive";
      /** 'stop overthinking' → np 'no longer overthinking'. */
      readonly cessation?: boolean;
    };

const isLowerWord = (w: string) => /^\p{Ll}[\p{Ll}'’-]*$/u.test(w);

/** `token` as typed: an unknown capitalised word after 'to' is a place ('to Paris'), never a verb. */
function lookupVerb(token: string, forceVerb: boolean): VerbForms | undefined {
  const word = norm(token);
  const known = verbByBase(word);
  if (known) return known;
  if (forceVerb && isLowerWord(token) && /^[a-z]+$/u.test(word) && word.length > 1) return regularForms(word);
  return undefined;
}

function splitAdverbs(tokens: readonly string[]): { adverbs: string[]; rest: string[] } {
  let i = 0;
  while (i < tokens.length - 1 && LEADING_ADVERBS.has(norm(tokens[i]))) i += 1;
  return { adverbs: tokens.slice(0, i), rest: tokens.slice(i) };
}

function isStatePhrase(tokens: readonly string[]): boolean {
  const lower = tokens.map(norm);
  if (lower.length <= 3 && /^[\p{L}-]+[- ]?free$/u.test(lower.join(" "))) return true;
  if (STATE_PREPOSITIONS.has(lower[0]) && lower.length > 1) return true;
  let sawState = false;
  for (const w of lower) {
    if (STATE_WORDS.has(w)) {
      if (!["and", "or", "so", "very", "really", "more"].includes(w)) sawState = true;
      continue;
    }
    if (/-free$/u.test(w)) {
      sawState = true;
      continue;
    }
    // a prepositional tail after the adjectives is fine: 'confident at work'
    return sawState && ["at", "in", "on", "with", "about", "around", "under", "of", "for", "to"].includes(w);
  }
  return sawState;
}

function habitualFor(verb: VerbForms, rest: readonly string[], adverbs: readonly string[]): boolean {
  const restText = [...adverbs, ...rest].join(" ");
  if (verb.habitual) return true;
  if (["run", "own", "manage", "lead"].includes(verb.base) && BUSINESS_OBJECT.test(restText)) return true;
  return HABIT_MARKER.test(restText);
}

function verbAnalysis(
  shape: "to-verb" | "imperative",
  tokens: readonly string[],
  forceVerb: boolean
): Analysis | undefined {
  const { adverbs, rest } = splitAdverbs(tokens);
  if (rest.length === 0) return undefined;
  const head = norm(rest[0]);
  const verb = lookupVerb(rest[0], forceVerb);
  if (!verb) return undefined;
  const tail = rest.slice(1);
  if (!forceVerb && AMBIGUOUS.has(head) && (tail.length === 0 || !OBJECT_START.has(norm(tail[0])))) return undefined;
  if (verb.base === "be") return tail.length > 0 ? { kind: "state", tokens: [...adverbs, ...tail] } : undefined;
  if (verb.base === "have") return tail.length > 0 ? { kind: "noun", tokens: [...adverbs, ...tail] } : undefined;
  if ((verb.base === "stop" || verb.base === "quit") && tail.length > 0 && /ing$/u.test(norm(tail[0]))) {
    return { kind: "verb", shape, adverbs, verb, rest: tail, tense: "past", cessation: true };
  }
  return { kind: "verb", shape, adverbs, verb, rest: tail, tense: habitualFor(verb, tail, adverbs) ? "present" : "past" };
}

function iClauseAnalysis(tokens: readonly string[]): Analysis | undefined {
  const first = norm(tokens[0]);
  let rest = tokens.slice(1);
  let mode: "am" | "have" | "plain";
  if (first === "i'm" || first === "im") mode = "am";
  else if (first === "i've" || first === "ive") mode = "have";
  else if (first === "i" && rest.length > 0 && norm(rest[0]) === "am") {
    mode = "am";
    rest = rest.slice(1);
  } else if (first === "i" && rest.length > 0 && norm(rest[0]) === "have") {
    mode = "have";
    rest = rest.slice(1);
  } else if (first === "i") mode = "plain";
  else return undefined;
  if (rest.length === 0) return undefined;

  if (mode === "am") {
    const { adverbs, rest: r } = splitAdverbs(rest);
    const g = r.length > 0 ? verbByGerund(norm(r[0])) : undefined;
    if (g && r.length > 1) return { kind: "verb", shape: "i-clause", adverbs, verb: g, rest: r.slice(1), tense: "progressive" };
    return { kind: "state", tokens: rest };
  }
  if (mode === "have") {
    const { adverbs, rest: r } = splitAdverbs(rest);
    if (norm(r[0] ?? "") === "got") return r.length > 1 ? { kind: "noun", tokens: r.slice(1) } : undefined;
    const p = r.length > 0 ? verbByParticiple(norm(r[0])) : undefined;
    if (p && r.length > 1) return { kind: "verb", shape: "i-clause", adverbs, verb: p, rest: r.slice(1), tense: "perfect" };
    return { kind: "noun", tokens: rest };
  }
  const { adverbs, rest: r } = splitAdverbs(rest);
  if (r.length === 0) return undefined;
  const w = norm(r[0]);
  const base = verbByBase(w);
  if (base) {
    if (base.base === "be" || base.base === "have") return undefined;
    return { kind: "verb", shape: "i-clause", adverbs, verb: base, rest: r.slice(1), tense: "present" };
  }
  const past = verbByPast(w);
  if (past) return { kind: "verb", shape: "i-clause", adverbs, verb: past, rest: r.slice(1), tense: "past" };
  return undefined;
}

function gerundAnalysis(tokens: readonly string[]): Analysis | undefined {
  const { adverbs, rest } = splitAdverbs(tokens);
  const head = rest.length > 0 ? norm(rest[0]) : "";
  if (!/^[a-z]{2,}ing$/u.test(head)) return undefined;
  const known = verbByGerund(head);
  const tail = rest.slice(1);
  if (known?.base === "be") return rest.length > 1 ? { kind: "state", tokens: [...adverbs, ...rest.slice(1)] } : undefined;
  if (known?.base === "have") return rest.length > 1 ? { kind: "noun", tokens: [...adverbs, ...rest.slice(1)] } : undefined;
  if (known) {
    return { kind: "verb", shape: "gerund", adverbs, verb: known, rest: tail, tense: habitualFor(known, tail, adverbs) ? "present" : "past" };
  }
  // Unknown -ing word ('decluttering my flat'): the progressive is always grammatical.
  if (ING_NOUNS.has(head) || head.length < 7 || (tail.length > 0 && !OBJECT_START.has(norm(tail[0])))) return undefined;
  const pseudo: VerbForms = { base: head, past: head, participle: head, gerund: head, habitual: true };
  return { kind: "verb", shape: "gerund", adverbs, verb: pseudo, rest: rest.slice(1), tense: "progressive" };
}

function analyse(core: string): Analysis | undefined {
  const tokens = core.split(" ").filter(Boolean);
  if (tokens.length === 0) return undefined;
  const first = norm(tokens[0]);
  if (first === "to" && tokens.length > 1) return verbAnalysis("to-verb", tokens.slice(1), true);
  if (["i", "i'm", "im", "i've", "ive"].includes(first)) return iClauseAnalysis(tokens);
  return (
    gerundAnalysis(tokens) ??
    verbAnalysis("imperative", tokens, false) ??
    (isStatePhrase(tokens) ? { kind: "state", tokens } : { kind: "noun", tokens })
  );
}

/* =========================================================================
 * Rendering
 * ========================================================================= */

/** Conjugate coordinated verbs ('find love AND BUY a house') in the same form as the head. */
function conjugateCoordinated(tokens: readonly string[], form: (v: VerbForms) => string): string[] {
  const out = [...tokens];
  for (let i = 0; i < out.length - 1; i += 1) {
    if (!COORDINATORS.has(norm(out[i]))) continue;
    let j = i + 1;
    while (j < out.length - 1 && LEADING_ADVERBS.has(norm(out[j]))) j += 1;
    const w = norm(out[j]);
    const v = verbByBase(w);
    if (!v || v.base === "be" || v.base === "have") continue;
    const follower = out[j + 1] ? norm(out[j + 1]) : "";
    if (AMBIGUOUS.has(w) && !OBJECT_START.has(follower)) continue;
    out[j] = form(v);
  }
  return out;
}

interface Rendered {
  readonly np: string;
  readonly done: string;
}

function renderVerb(a: Extract<Analysis, { kind: "verb" }>, person: 1 | 2): Rendered {
  const swap = (ts: readonly string[]) => (person === 2 ? toSecondPerson(ts) : [...ts]);
  const adv = swap(a.adverbs.map((w) => w.toLowerCase()));
  const restFor = (form: (v: VerbForms) => string) => swap(conjugateCoordinated(a.rest, form));
  const subj = person === 2 ? "you" : "I";
  const npHead = a.cessation ? ["no", "longer"] : [a.verb.gerund];
  const npRest = a.cessation ? swap(a.rest) : restFor((v) => v.gerund);
  const np = [...adv, ...npHead, ...npRest].join(" ");
  let done: string[];
  switch (a.tense) {
    case "present":
      done = [subj, ...adv, a.verb.base, ...restFor((v) => v.base)];
      break;
    case "perfect":
      done = [subj, "have", ...adv, a.verb.participle, ...restFor((v) => v.participle)];
      break;
    case "progressive":
      done = [subj, person === 2 ? "are" : "am", ...adv, a.verb.gerund, ...restFor((v) => v.gerund)];
      break;
    default:
      done = [subj, ...adv, a.verb.past, ...(a.cessation ? swap(a.rest) : restFor((v) => v.past))];
  }
  return { np, done: done.join(" ") };
}

/** Noun phrases that read well after 'you have' ('you have YOUR own studio', 'you have MORE time'). */
const DETERMINER =
  /^(?:(?:a|an|the|my|our|your|his|her|their|this|that|these|those|more|less|some|enough|no|every|each|all|one|two|three|four|five|six|seven|eight|nine|ten|plenty|lots|something|everything|anything)(?![\p{L}])|[$£€¥₹\d])/iu;
const NP_BREAK = new Set(["who", "that", "which", "with", "in", "on", "at", "for", "of", "from", "to", "by", "where", "and", "or"]);

/** Bare noun phrases take 'is/are part of your life' ('travel', 'new clients'): 'you have travel' is not English. */
function bareNounIsPlural(tokens: readonly string[]): boolean {
  let head = "";
  for (const t of tokens) {
    const w = norm(t);
    // A list before any modifier is plural: 'travel and good friends', 'travel, art …'.
    if (w === "and") return true;
    if (NP_BREAK.has(w)) break;
    if (/,$/u.test(t)) return true;
    head = w;
  }
  return /s$/u.test(head) && !/(?:ss|ness|us|is|ics)$/u.test(head);
}

function render(a: Analysis, person: 1 | 2): Rendered {
  const swap = (ts: readonly string[]) => (person === 2 ? toSecondPerson(ts) : [...ts]);
  const subj = person === 2 ? "you" : "I";
  if (a.kind === "verb") return renderVerb(a, person);
  const phrase = lowerFirst(swap(a.tokens).join(" "));
  if (a.kind === "state") return { np: `being ${phrase}`, done: `${subj} ${person === 2 ? "are" : "am"} ${phrase}` };
  if (DETERMINER.test(phrase)) return { np: phrase, done: `${subj} have ${phrase}` };
  const life = person === 2 ? "your life" : "my life";
  return { np: phrase, done: `${phrase} ${bareNounIsPlural(a.tokens) ? "are" : "is"} part of ${life}` };
}

const SHAPE_OF: Readonly<Record<Analysis["kind"], DesireShape>> = { noun: "noun", state: "state", verb: "imperative" };

function shapeOf(a: Analysis, core: string): DesireShape {
  if (a.kind === "verb") return a.shape;
  const first = norm(core.split(" ")[0] ?? "");
  if (["i", "i'm", "im", "i've", "ive"].includes(first)) return "i-clause";
  if (first === "to") return "to-verb";
  return SHAPE_OF[a.kind];
}

function usable(phrase: string, maxWords: number): boolean {
  const n = phrase.split(" ").filter(Boolean).length;
  return n > 0 && n <= maxWords && /\p{L}/u.test(phrase) && !/[.!?;]\s*\S/u.test(phrase) && !/["“”]/u.test(phrase);
}

/** The exact words in curly quotes, trailing .!? removed. */
export function quoteDesire(raw: string): string {
  return curlyQuote(raw) ?? "“your dream”";
}

/** Shape a desire into its token values. Never throws; unshapeable input falls back safely. */
export function shapeDesire(raw: string): ShapedDesire {
  const quote = quoteDesire(raw);
  const fallback: ShapedDesire = {
    shape: "unshaped",
    quote,
    np: NP_FALLBACK,
    done: doneFallback(quote),
    npMy: NP_MY_FALLBACK,
    doneI: doneIFallback(quote),
    fallback: true,
  };
  const core = closeModifierCommas(desireCore(raw));
  if (!core || /[.!?;]\s*\S/u.test(core)) return fallback;
  const a = analyse(core);
  if (!a) return fallback;
  const second = render(a, 2);
  const first = render(a, 1);
  if (!usable(second.np, MAX_SHAPED_WORDS) || !usable(second.done, MAX_SHAPED_WORDS + 4)) return fallback;
  return { shape: shapeOf(a, core), quote, np: second.np, done: second.done, npMy: first.np, doneI: first.done, fallback: false };
}
