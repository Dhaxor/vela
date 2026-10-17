// Template filling with highlight spans. Writers never write spans: the engine
// emits one around every substituted {desire.*}, {proof.*} and {name} value,
// as UTF-16 offsets into the final text (contexts/arc.types.ts Span). Pure.

import type { ProofId, Span, SpanKind } from "@/contexts/arc.types";
import type { Token } from "./content/types";

export interface TokenValue {
  readonly value: string;
  /** Used instead of `value` in a SHORT_SLOT, where the full value would echo its frame. */
  readonly short?: string;
  /** Emit a highlight span around the value. */
  readonly span?: SpanKind;
  readonly proofId?: ProofId;
}

export type TokenValues = Partial<Record<Token, TokenValue>>;

export interface Filled {
  readonly text: string;
  readonly spans: readonly Span[];
}

const TOKEN_RE = /\{[^{}]+\}/gu;

/** Tokens a template uses, deduplicated. */
export function tokensOf(template: string): string[] {
  return [...new Set(template.match(TOKEN_RE) ?? [])];
}

/** True when every token in the template has a value. */
export function canFill(template: string, values: TokenValues): boolean {
  return tokensOf(template).every((t) => values[t as Token] !== undefined);
}

/** Right after a colon (a frame's payoff) or after 'the life where': a value's short form, if it has one, reads better. */
const SHORT_SLOT = /(?::|(?<![\p{L}])life where)\s$/iu;

const atSentenceStart = (out: string) => out.length === 0 || /[.!?…]["”’)]?\s+$/u.test(out);

/**
 * Substitute every token. Missing tokens are a caller bug (the engine gates
 * fragments with canFill) and are dropped, never left visible. Fixes 'a/an'
 * directly before a value and capitalises a value that opens a sentence.
 */
export function fillTemplate(template: string, values: TokenValues): Filled {
  let out = "";
  const spans: Span[] = [];
  let last = 0;
  for (const m of template.matchAll(TOKEN_RE)) {
    const at = m.index ?? 0;
    out += template.slice(last, at);
    last = at + m[0].length;
    const v = values[m[0] as Token];
    if (!v || !v.value) {
      out = out.replace(/ $/u, "");
      continue;
    }
    // 'a {feeling} morning' → 'an alive morning'; 'an {x}' before a consonant → 'a'.
    const article = out.match(/(^|[\s(“])([Aa])(n?) $/u);
    if (article) {
      const vowel = /^[aeioAEIO]/u.test(v.value);
      const fixed = `${article[2]}${vowel ? "n" : ""} `;
      out = out.slice(0, out.length - (article[2].length + article[3].length + 1)) + fixed;
    }
    let value = v.short && SHORT_SLOT.test(out) ? v.short : v.value;
    // 'the afternoon you {proof.done}' + 'you sent…' → one subject, not 'you you sent'.
    const subject = out.match(/(?<![\p{L}])(you|I) $/iu);
    if (subject && new RegExp(`^${subject[1]} `, "iu").test(value)) value = value.slice(subject[1].length + 1);
    if (atSentenceStart(out) && /^\p{Ll}/u.test(value)) value = value[0].toUpperCase() + value.slice(1);
    const start = out.length;
    out += value;
    if (v.span) spans.push({ kind: v.span, start, end: out.length, ...(v.proofId ? { proofId: v.proofId } : {}) });
  }
  out += template.slice(last);
  return { text: out, spans };
}

/** Join filled pieces into one paragraph with single spaces, shifting spans. */
export function joinFilled(parts: readonly Filled[]): Filled {
  let text = "";
  const spans: Span[] = [];
  for (const p of parts) {
    const offset = text.length === 0 ? 0 : text.length + 1;
    text = text.length === 0 ? p.text : `${text} ${p.text}`;
    for (const s of p.spans) spans.push({ ...s, start: s.start + offset, end: s.end + offset });
  }
  return { text, spans };
}
