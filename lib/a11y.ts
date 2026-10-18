// Spoken labels (VoiceOver). Two rules every accessibilityLabel follows, both
// learned from 1.0 bugs read aloud: a count agrees with its noun ('1 chapter',
// never '1 chapters'), and a sentence ends with exactly one mark, even when
// the user's own words already end in one ('…two studios I admire.', never
// 'admire..'). Pure, so bun can test it.

/** '1 chapter', '3 chapters', '0 proofs'. Digits: VoiceOver reads them as numbers. */
export function countOf(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Ends in . ! ? or …, optionally followed by closing quotes or brackets. */
const ENDED = /[.!?…]["'”’)\]]*$/u;

/** One spoken sentence: trimmed, and given a full stop only when it has no closing mark of its own. Empty stays empty. */
export function sentence(text: string | null | undefined): string {
  const t = (text ?? "").replace(/\s+/gu, " ").trim();
  if (!t) return "";
  return ENDED.test(t) ? t : `${t}.`;
}

/** Fragments read as sentences, in order, skipping empty ones: spoken('Star 1', 'I did it, day 2', 'Sent it.') → 'Star 1. I did it, day 2. Sent it.' */
export function spoken(...parts: readonly (string | null | undefined | false)[]): string {
  return parts
    .map((p) => (p ? sentence(p) : ""))
    .filter(Boolean)
    .join(" ");
}
