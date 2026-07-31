// The story engine. Instant, offline, deterministic under a seed — the three
// properties the incumbent's server-side generator can't offer. Repetition is
// prevented by an avoid-set of fragment ids the caller accumulates per intent.

import type { FocusId } from "@/lib/focus";
import { focusById } from "@/lib/focus";
import { Beat, Fragment, TITLES, fragmentsFor } from "./fragments";
import { mulberry32, pickAvoiding } from "./rng";

export interface StoryInput {
  name: string;
  focus: FocusId;
  /** The user's own words — any shape, any characters. */
  desire: string;
  /** Adjective from the feeling chips ("proud", "peaceful", …). */
  feeling: string;
  seed: number;
  /** Fragment/title ids already used for this intent (repetition guard). */
  avoid?: ReadonlySet<string>;
}

export interface StoryParagraph {
  fragmentId: string;
  text: string;
}

export interface ComposedStory {
  title: string;
  titleId: string;
  paragraphs: StoryParagraph[];
  /** All ids consumed — feed back into `avoid` on the next regeneration. */
  usedIds: string[];
}

export const BEAT_ORDER: readonly Beat[] = [
  "opening",
  "arrival",
  "sensory",
  "living",
  "witness",
  "gratitude",
  "closing",
];

/**
 * Make the user's phrase sit gracefully inside a sentence frame:
 * trim, drop a trailing period, and lower a leading capital unless the
 * phrase starts with "I" or looks like a proper noun / all-caps token.
 */
export function normalizeDesire(raw: string): string {
  let d = raw.trim().replace(/[.!\s]+$/u, "");
  if (d.length === 0) return d;
  const first = d[0];
  const second = d.length > 1 ? d[1] : "";
  const firstWord = d.split(/\s+/)[0];
  const isI = firstWord === "I" || firstWord.startsWith("I'");
  if (!isI && first >= "A" && first <= "Z" && second >= "a" && second <= "z") {
    d = first.toLowerCase() + d.slice(1);
  }
  return d;
}

/** Literal slot replacement — split/join, so "$" in user text is never magic. */
function fill(template: string, slots: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(slots)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

export function composeStory(input: StoryInput): ComposedStory {
  const rng = mulberry32(input.seed);
  const avoid = input.avoid ?? new Set<string>();
  const area = focusById(input.focus);

  const slots: Record<string, string> = {
    name: input.name.trim() || "friend",
    desire: normalizeDesire(input.desire) || "the life you asked for",
    feeling: input.feeling.trim().toLowerCase() || "grateful",
    domain: area?.domainWord ?? "this",
  };

  const usedIds: string[] = [];
  const paragraphs: StoryParagraph[] = [];

  for (const beat of BEAT_ORDER) {
    const pool = fragmentsFor(beat, input.focus);
    const chosen: Fragment = pickAvoiding(rng, pool, avoid);
    usedIds.push(chosen.id);
    paragraphs.push({ fragmentId: chosen.id, text: fill(chosen.text, slots) });
  }

  const title = pickAvoiding(rng, TITLES, avoid);
  usedIds.push(title.id);

  return { title: title.text, titleId: title.id, paragraphs, usedIds };
}
