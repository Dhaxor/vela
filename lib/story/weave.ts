// PROOF TOKENS. Turns a saved proof ('Sent my portfolio to two studios.')
// into the values the weave library is written against:
//
//   {proof.quote}  “Sent my portfolio to two studios”
//   {proof.done}   you sent your portfolio to two studios   (fallback: you wrote “…”)
//   {proof.ago}    earlier today · yesterday · twelve days ago
//   {proof.date}   October 14
//
// plus the cumulative counts. Pure; dates are LOCAL calendar days.

import { AMBIGUOUS, verbByBase, verbByParticiple, verbByPast } from "./verbs";
import { collapse, curlyQuote, lowerFirst, numberWord, plural, stripPictographs, stripTrailingPunct } from "./text";

/** Longest proof clause woven unquoted. Longer sentences stay in quotes (their words are the user's). */
export const MAX_PROOF_DONE_WORDS = 12;

/** “exact words”, trailing punctuation removed. */
export function proofQuote(text: string): string {
  return curlyQuote(text) ?? "“”";
}

const LEADING_TIME = /^(?:today|tonight|yesterday|earlier|this (?:morning|afternoon|evening)|at last|so)[,\s]+/iu;

const SWAP: Readonly<Record<string, string>> = {
  my: "your", our: "your", mine: "yours", ours: "yours", me: "you", us: "you", myself: "yourself",
  ourselves: "yourselves", i: "you", we: "you",
};

function swapWords(tokens: readonly string[]): string[] {
  return tokens.map((t) => {
    const m = t.match(/^([\p{L}'’]+)(.*)$/u);
    if (!m) return t;
    const lower = m[1].toLowerCase().replace(/’/gu, "'");
    if (lower === "i'm") return `you're${m[2]}`;
    if (lower === "i've") return `you've${m[2]}`;
    if (lower === "i'd") return `you'd${m[2]}`;
    const swapped = SWAP[lower];
    return swapped ? swapped + m[2] : t;
  });
}

/** A regular past form we can trust without the table: lowercase, -ed, long enough ('emailed', 'applied'). */
const looksPast = (w: string) => /^[a-z]{3,}ed$/u.test(w);

const OBJECTISH = /^(?:a|an|the|my|our|me|us|myself|it|them|one|two|three|four|five|ten|twenty|thirty|\d+|for|to|with|around|up|out|home)$/u;

/**
 * The proof as a second-person past clause, or null when it cannot be
 * shaped safely (several sentences, a noun-first note, too long). The engine
 * then uses the fallback `you wrote {proof.quote}`.
 */
export function proofDoneClause(text: string): string | null {
  const core = stripTrailingPunct(stripPictographs(collapse(text)));
  if (!core || /[.!?;]\s*\S/u.test(core) || /["“”]/u.test(core)) return null;
  let tokens = core.replace(LEADING_TIME, "").split(" ").filter(Boolean);
  if (tokens.length === 0 || tokens.length > MAX_PROOF_DONE_WORDS) return null;
  const lower = (i: number) => (tokens[i] ?? "").toLowerCase().replace(/’/gu, "'");

  // Drop the subject: 'I sent…', 'I've started…', 'I was brave'.
  let verbAt = 0;
  if (["i", "we"].includes(lower(0))) verbAt = 1;
  if (["i've", "we've"].includes(lower(0))) {
    const p = verbByParticiple(lower(1));
    if (!p) return null;
    tokens = [p.past, ...tokens.slice(2)];
  } else if (["i'm", "im"].includes(lower(0))) {
    tokens = ["were", ...tokens.slice(1)];
  } else if (verbAt === 1) {
    if (["am", "was"].includes(lower(1))) tokens = ["were", ...tokens.slice(2)];
    else if (["have", "had"].includes(lower(1)) && verbByParticiple(lower(2))) tokens = [verbByParticiple(lower(2))!.past, ...tokens.slice(3)];
    else tokens = tokens.slice(1);
  }
  if (tokens.length === 0) return null;

  const head = tokens[0].toLowerCase().replace(/’/gu, "'");
  const next = (tokens[1] ?? "").toLowerCase();
  let verb: string | null = null;
  if (head === "were" || /n't$/u.test(head)) verb = head;
  else if (verbByPast(head)) verb = head;
  // 'Walk 20 minutes' → 'you walked…'; an ambiguous word needs an object ('Design review went well' stays quoted).
  else if (verbByBase(head) && (!AMBIGUOUS.has(head) || OBJECTISH.test(next))) verb = verbByBase(head)!.past;
  else if (looksPast(head)) verb = head;
  if (!verb) return null;

  const rest = swapWords(tokens.slice(1)).join(" ");
  return lowerFirst(`you ${verb}${rest ? ` ${rest}` : ""}`);
}

/** {proof.done}: the clause, or the always-safe fallback. */
export function proofDone(text: string): string {
  return proofDoneClause(text) ?? `you wrote ${proofQuote(text)}`;
}

/** Whole LOCAL days between two 'YYYY-MM-DD' keys (b − a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** {proof.ago}: 'earlier today', 'yesterday', 'twelve days ago', 'three weeks ago', 'two months ago'. */
export function proofAgo(proofDateKey: string, todayKey: string): string {
  const d = Math.max(0, daysBetween(proofDateKey, todayKey));
  if (d === 0) return "earlier today";
  if (d === 1) return "yesterday";
  if (d < 14) return `${numberWord(d)} days ago`;
  if (d < 60) return `${numberWord(Math.floor(d / 7))} weeks ago`;
  if (d < 365) return `${numberWord(Math.floor(d / 30))} months ago`;
  const years = Math.floor(d / 365);
  return years === 1 ? "a year ago" : `${numberWord(years)} years ago`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** {proof.date}: 'October 14', with the year only when it differs from today's. */
export function proofDate(proofDateKey: string, todayKey: string): string {
  const [y, m, d] = proofDateKey.split("-").map(Number);
  const label = `${MONTHS[(m ?? 1) - 1] ?? "January"} ${d ?? 1}`;
  return todayKey.slice(0, 4) === String(y) ? label : `${label}, ${y}`;
}

/** {proofs.count} / {proofs.phrase}. */
export function proofsCount(n: number): { count: string; phrase: string } {
  return { count: numberWord(n), phrase: plural(n, "proof") };
}
