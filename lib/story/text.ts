// Text hygiene shared by the shaper, the weave tokens and the engine. Pure.
// Every rule here exists because a 1.0 rendering broke on it: '..' after a
// proof that already ended in a period, doubled spaces, emoji read aloud.

/** Trim and collapse every whitespace run (incl. newlines) to one space. */
export function collapse(s: string): string {
  return s.replace(/\s+/gu, " ").trim();
}

/** Collapse, then cut to `max` characters on a word boundary when possible. */
export function clip(s: string, max: number): string {
  const c = collapse(s);
  if (c.length <= max) return c;
  const cut = c.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trim();
}

/** Remove trailing sentence punctuation (. ! ? … and runs of them) and spaces. */
export function stripTrailingPunct(s: string): string {
  return s.replace(/[\s.!?…]+$/u, "");
}

/**
 * The user's words as a curly quotation: wrapping quotes and trailing .!?
 * removed, inner straight double quotes turned into curly pairs. Empty → null.
 */
export function curlyQuote(raw: string): string | null {
  const inner = stripTrailingPunct(collapse(raw).replace(/^["“”]+|["“”]+$/gu, ""))
    .replace(/"([^"]*)"/gu, "“$1”")
    .replace(/"/gu, "”");
  return inner ? `“${inner}”` : null;
}

/** Doubled or clashing stops: '..' → '.', '!.' → '!', '?.' → '?', ' ,' → ','. Keeps a real ellipsis ('...'). */
export function fixPunctuation(s: string): string {
  return s
    .replace(/(?<!\.)\.\.(?!\.)/gu, ".")
    .replace(/([!?])\./gu, "$1")
    .replace(/\s+([,.!?;:])/gu, "$1")
    .replace(/ {2,}/gu, " ");
}

/** Sanitize one line of the user's own writing: collapse, clip, fix doubled stops. */
export function cleanUserText(s: string, max: number): string {
  return fixPunctuation(clip(s, max));
}

export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Lower a leading capital when the first word looks like an ordinary
 * sentence-case word ('To open…' → 'to open…'). Keeps 'I', acronyms ('NYC')
 * and words with inner capitals ('McKinsey').
 */
export function lowerFirst(s: string): string {
  const first = s.split(/\s/u)[0] ?? "";
  if (first === "I" || /^I['’]/u.test(first)) return s;
  if (!/^\p{Lu}\p{Ll}*$/u.test(first.replace(/[^\p{L}]/gu, ""))) return s;
  return s[0].toLowerCase() + s.slice(1);
}

/** Emoji and pictographs: kept in quotes, removed from shaped phrases (TTS reads them aloud). */
export function stripPictographs(s: string): string {
  return collapse(s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ""));
}

/** Words as a reader counts them (anything with a letter or digit). */
export function words(s: string): string[] {
  return s.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w));
}

export function wordCount(s: string): number {
  return words(s).length;
}

/** FNV-1a 32-bit. Stable seeds from ids. */
export function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** English number words for TTS: 4 → 'four', 42 → 'forty-two', 312 → 'three hundred twelve'. Digits from 1000 up. */
export function numberWord(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v < 20) return ONES[v];
  if (v < 100) return TENS[Math.floor(v / 10)] + (v % 10 ? `-${ONES[v % 10]}` : "");
  if (v < 1000) return `${ONES[Math.floor(v / 100)]} hundred${v % 100 ? ` ${numberWord(v % 100)}` : ""}`;
  return String(v);
}

/** 'four proofs', 'one night'. */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${numberWord(n)} ${n === 1 ? singular : pluralForm}`;
}

const ROMAN: readonly (readonly [number, string])[] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

/** 4 → 'IV'. Chapter numbers and season labels. */
export function toRoman(n: number): string {
  let v = Math.max(1, Math.floor(n));
  let out = "";
  for (const [value, sym] of ROMAN) {
    while (v >= value) {
      out += sym;
      v -= value;
    }
  }
  return out;
}
