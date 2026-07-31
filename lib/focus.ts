// The six areas a person can call something into. Pure data — the UI layer
// maps ids to icons and tints. Everything downstream (stories, affirmations,
// journal prompts) keys off these ids, so they are append-only after launch.

export type FocusId =
  | "love"
  | "abundance"
  | "career"
  | "health"
  | "confidence"
  | "peace";

export interface FocusArea {
  id: FocusId;
  /** Short noun shown on chips and headers. */
  label: string;
  /** One-line invitation used in onboarding and intake. */
  invitation: string;
  /** The word the story engine uses for this life domain. */
  domainWord: string;
}

export const FOCUS_AREAS: readonly FocusArea[] = [
  {
    id: "love",
    label: "Love",
    invitation: "Deep connection, romance, and relationships that hold you.",
    domainWord: "love",
  },
  {
    id: "abundance",
    label: "Abundance",
    invitation: "Money that flows easily and a life of more than enough.",
    domainWord: "abundance",
  },
  {
    id: "career",
    label: "Career",
    invitation: "Work that lights you up and success on your own terms.",
    domainWord: "work",
  },
  {
    id: "health",
    label: "Health",
    invitation: "A body full of energy and a feeling of being truly well.",
    domainWord: "vitality",
  },
  {
    id: "confidence",
    label: "Confidence",
    invitation: "Standing tall, speaking clearly, trusting yourself.",
    domainWord: "self-belief",
  },
  {
    id: "peace",
    label: "Peace",
    invitation: "A calm mind, slow mornings, and room to breathe.",
    domainWord: "calm",
  },
] as const;

export function focusById(id: string): FocusArea | undefined {
  return FOCUS_AREAS.find((f) => f.id === id);
}

/** Validates persisted ids against the current catalog (forward-compatible). */
export function sanitizeFocusIds(ids: unknown): FocusId[] {
  if (!Array.isArray(ids)) return [];
  const valid = new Set(FOCUS_AREAS.map((f) => f.id as string));
  return ids.filter((x): x is FocusId => typeof x === "string" && valid.has(x));
}
