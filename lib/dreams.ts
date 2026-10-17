// How a dream is named wherever it appears in a list (Today's pills, the Arc
// switcher, Scenes filters, the sky header): its given name (label, else the
// newest Named Sky), else the first words of the person's own desire. One rule,
// so two tabs never call the same dream two things. Pure and tested.
import type { Dream } from "@/contexts/arc.types";
import { collapse } from "@/lib/story/text";

/** A dream's given name: its label, else its newest named sky. null → show the person's own words. */
export function dreamGivenName(dream: Pick<Dream, "label" | "constellations">): string | null {
  if (dream.label?.trim()) return dream.label.trim();
  const named = [...dream.constellations].sort((a, b) => b.season - a.season)[0]?.name.trim();
  return named || null;
}

/**
 * How a dream is named on chips and tiles (the same rule as the Arc switcher):
 * its given name, else the first words of the desire, sentence-cased
 * ('My own design studio…').
 */
export function dreamName(dream: Pick<Dream, "label" | "constellations" | "desire">, maxWords = 4): string {
  const given = dreamGivenName(dream);
  if (given) return given;
  const words = collapse(dream.desire.replace(/^["'“”‘’]+|["'“”‘’.!?]+$/gu, "")).split(" ").filter(Boolean);
  const cut = words.slice(0, maxWords).join(" ").replace(/[,;:]+$/u, "");
  const text = words.length > maxWords ? `${cut}…` : cut;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
