// Notification copy: token values, filling, and rotation without replacement
// (N4). Pure; the copy itself is A4's (lib/content/notifications.ts).
//
// A template is used only when EVERY token it contains has a value, and only
// when the filled title and body fit the Lock Screen limits. So a template
// quoting a proof is simply skipped until there is a proof, and a long desire
// never gets truncated mid-word: a shorter template is picked instead.

import type { HHmm } from "@/contexts/user.types";
import {
  PERSONAL_TOKENS,
  type NotificationTemplate,
  type Token,
} from "@/lib/story/content/types";
import { doublesWriteVerb } from "@/lib/story/weave";
import { NOTIFICATION_LIMITS } from "./types";

export type TokenValues = Readonly<Partial<Record<Token, string>>>;

export interface FilledCopy {
  readonly title: string;
  readonly body: string;
}

const TOKEN_RE = /\{[a-z]+(?:\.[a-z]+)*\}/g;
const PERSONAL = new Set<string>(PERSONAL_TOKENS);

export function tokensIn(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

/** No personal tokens: safe for the Lock Screen with 'Keep my words off the Lock Screen' on. */
export function isNeutral(template: NotificationTemplate): boolean {
  return ![...tokensIn(template.title), ...tokensIn(template.body)].some((t) => PERSONAL.has(t));
}

/** Fill every token, or null when a token has no value or the copy overflows the limits. */
export function fillTemplate(template: NotificationTemplate, values: TokenValues): FilledCopy | null {
  let missing = false;
  const fill = (text: string) =>
    text.replace(TOKEN_RE, (token) => {
      const value = values[token as Token];
      if (value === undefined || value === "") missing = true;
      return value ?? "";
    });
  const title = fill(template.title);
  const body = fill(template.body);
  if (missing) return null;
  if (title.length > NOTIFICATION_LIMITS.maxTitleChars || body.length > NOTIFICATION_LIMITS.maxBodyChars) return null;
  return { title, body };
}

export interface PickedTemplate {
  readonly template: NotificationTemplate;
  readonly copy: FilledCopy;
  /** The slot's rotation memory after this pick. */
  readonly used: readonly string[];
}

/**
 * Rotation without replacement: the first eligible template (library order)
 * not used in the current cycle. When every eligible template has been used,
 * a new cycle starts, skipping the most recent one so nothing repeats
 * back-to-back.
 */
export function pickTemplate(
  pool: readonly NotificationTemplate[],
  used: readonly string[],
  values: TokenValues,
  neutralOnly: boolean
): PickedTemplate | null {
  const eligible: { template: NotificationTemplate; copy: FilledCopy }[] = [];
  const quote = values["{proof.quote}"] ?? "";
  for (const template of pool) {
    if (neutralOnly && !isNeutral(template)) continue;
    // 'You wrote “Wrote to Mum…”' doubles the verb: skip the frame for such a proof.
    if (quote && (doublesWriteVerb(template.title, quote) || doublesWriteVerb(template.body, quote))) continue;
    const copy = fillTemplate(template, values);
    if (copy) eligible.push({ template, copy });
  }
  if (eligible.length === 0) return null;
  const fresh = eligible.find((e) => !used.includes(e.template.id));
  if (fresh) return { ...fresh, used: [...used, fresh.template.id] };
  const last = used[used.length - 1];
  const restart = eligible.find((e) => e.template.id !== last) ?? eligible[0];
  return { ...restart, used: [restart.template.id] };
}

/** Record a delivered template in a slot's cycle (a repeat means a new cycle began). */
export function noteDelivered(used: readonly string[], templateId: string): string[] {
  return used.includes(templateId) ? [templateId] : [...used, templateId];
}

/* =========================================================================
 * Token values
 * ========================================================================= */

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** English number words for TTS-friendly copy: 'twelve', 'forty-two', 'three hundred one'. Digits from 10 000. */
export function numberWord(n: number): string {
  const v = Math.floor(n);
  if (!Number.isFinite(v) || v < 0 || v >= 10000) return String(v);
  if (v < 20) return ONES[v];
  if (v < 100) return v % 10 === 0 ? TENS[v / 10] : `${TENS[Math.floor(v / 10)]}-${ONES[v % 10]}`;
  if (v < 1000) {
    const rest = v % 100;
    return `${ONES[Math.floor(v / 100)]} hundred${rest ? ` ${numberWord(rest)}` : ""}`;
  }
  const rest = v % 1000;
  return `${ONES[Math.floor(v / 1000)]} thousand${rest ? ` ${numberWord(rest)}` : ""}`;
}

const ROMAN: readonly [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function romanNumeral(n: number): string {
  let v = Math.floor(n);
  if (!Number.isFinite(v) || v < 1 || v > 3999) return String(n);
  let out = "";
  for (const [value, numeral] of ROMAN) {
    while (v >= value) {
      out += numeral;
      v -= value;
    }
  }
  return out;
}

/** “text” with trailing sentence punctuation removed and inner straight quotes curled. */
export function curlyQuote(text: string): string {
  const clean = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?…\s]+$/u, "")
    .replace(/"([^"]*)"/g, "“$1”")
    .replace(/"/g, "”");
  return clean ? `“${clean}”` : "";
}

/** A user's phrase as a mid-sentence value: trimmed, no final punctuation, first letter lowered unless it starts an acronym or 'I'. */
export function midSentence(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ").replace(/[.!?…;:,\s]+$/u, "");
  if (!clean) return "";
  if (/^(?:[A-Z]{2}|I\b)/.test(clean)) return clean;
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

/** 'earlier today', 'yesterday', 'twelve days ago'. Null for a proof dated after the notification. */
export function agoPhrase(days: number): string | null {
  if (days < 0) return null;
  if (days === 0) return "earlier today";
  if (days === 1) return "yesterday";
  return `${numberWord(days)} days ago`;
}

/** Plural count values, offered only from 2 up (writers write plural). */
export function countValues(n: number, noun: string): { count: string; phrase: string } | null {
  if (!Number.isFinite(n) || n < 2) return null;
  const count = numberWord(n);
  return { count, phrase: `${count} ${noun}` };
}

/** 'HH:mm' → minutes after midnight, or null. */
export function parseHHmm(value: HHmm): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

/** '9:00 PM' (en-US), '21:00' (en-GB): the device's own clock format. */
export function formatRitualTime(value: HHmm, locale?: string): string {
  const t = parseHHmm(value);
  if (!t) return value;
  try {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(
      new Date(2000, 0, 1, t.hour, t.minute)
    );
  } catch {
    return `${t.hour}:${String(t.minute).padStart(2, "0")}`;
  }
}
