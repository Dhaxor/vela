// Pure helpers for First Light and the Weave (no React Native imports, bun-tested).
import type { FocusId } from "@/lib/focus";

/**
 * Focus selection is tap order: tap adds, tap again removes; [0] is the
 * primary area. An add past `max` is ignored (First Light passes
 * FREE_AREA_LIMIT: more areas are a Plus benefit).
 */
export function toggleFocus(current: readonly FocusId[], id: FocusId, max: number = Number.POSITIVE_INFINITY): FocusId[] {
  if (current.includes(id)) return current.filter((f) => f !== id);
  return current.length >= max ? [...current] : [...current, id];
}

/** Above this many words, neighbours travel together so the Weave's scatter stays legible. */
export const MAX_WORD_PIECES = 18;

/** The user's words split for the Weave: at most `max` pieces, reading order kept, outer quotes dropped. */
export function wordPieces(text: string, max = MAX_WORD_PIECES): string[] {
  const words = text
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= max) return words;
  const size = Math.ceil(words.length / max);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(" "));
  return out;
}
