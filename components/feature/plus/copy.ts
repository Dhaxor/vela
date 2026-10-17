// What the paywall says, and why it was opened. Pure and tested (copy.test.ts).
//
// Honest Plus (ELEVATE §0.12): the free loop is named first and in full; Plus
// adds room around it. Never weekly plans, credits or trial language, never
// 'future self', and nothing a user made is ever described as locked.
import { BEDS } from "@/lib/audio/types";

/** Where the paywall was opened from (`/paywall?from=…`). */
export type PaywallSource = "general" | "second-dream" | "bed" | "area" | "scenes" | "nudge" | "lapsed";

export type BenefitId = "dreams" | "beds" | "areas" | "scenes";

/** expo-router params arrive as a string, an array or nothing. Unknown values read as 'general'. */
export function paywallSource(from: string | string[] | undefined | null): PaywallSource {
  const v = Array.isArray(from) ? from[0] : from;
  switch (v) {
    case "second-dream":
    case "bed":
    case "area":
    case "scenes":
    case "nudge":
    case "lapsed":
      return v;
    // The reader's soft Plus note (from Chapter III on) is a nudge too.
    case "reader":
      return "nudge";
    default:
      return "general";
  }
}

export interface ContextFacts {
  /** The dream in focus, as its area label ('Career'), or null with no dream yet. */
  readonly area: string | null;
  /** Stars across every dream. */
  readonly stars: number;
}

export interface PaywallCopy {
  /** Display type. An explicit line break sets where it wraps, so no width leaves a one-word widow. */
  readonly title: string;
  readonly lead: string;
  /** The benefit this entry point is about; listed first and marked. null = none. */
  readonly featured: BenefitId | null;
}

const PLUS_BEDS = Object.values(BEDS)
  .filter((b) => b.plus)
  .map((b) => b.label);

function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function paywallCopy(source: PaywallSource, facts: ContextFacts): PaywallCopy {
  const sky = facts.area ? `Your ${facts.area} sky` : "Your sky";
  switch (source) {
    case "second-dream":
      return {
        title: "Room for\na second dream.",
        lead: `${sky} keeps every star. Plus lets another dream weave beside it.`,
        featured: "dreams",
      };
    case "bed":
      return {
        title: "Three more\nsoundscapes.",
        lead: `Night stays free under every chapter. Plus adds ${listOf(PLUS_BEDS)}.`,
        featured: "beds",
      };
    case "area":
      return {
        title: "Lines for\nevery area.",
        lead: "Lines for your own areas stay free. Plus opens all six.",
        featured: "areas",
      };
    case "scenes":
      return {
        title: "Unlimited Scenes.",
        lead: "Your first three Scenes and every proof photo stay free. Plus lifts the limit.",
        featured: "scenes",
      };
    case "nudge":
      return {
        title: "Your sky is growing.",
        lead:
          facts.stars > 1
            ? `${facts.stars} stars so far, and every one stays free. If another dream is waiting, Plus makes room.`
            : "Every star stays free. If another dream is waiting, Plus makes room.",
        featured: "dreams",
      };
    case "lapsed":
      return {
        title: "Every dream can\nweave again.",
        lead: "Each chapter stays readable while Plus is off. With Plus, all your dreams move forward together.",
        featured: "dreams",
      };
    default:
      return {
        title: "Room for every\ndream you hold.",
        lead: "Your story, your sky and the whole loop stay free. Plus adds room around them.",
        featured: null,
      };
  }
}

export interface Benefit {
  readonly id: BenefitId;
  readonly title: string;
  readonly body: string;
}

/** What Plus adds, matching the real gates (Guideline 2.3.1): lib/purchase canAddDream, canUseBed, canUseArea, FREE_SCENES. */
export const BENEFITS: readonly Benefit[] = [
  { id: "dreams", title: "More than one dream at a time", body: "Keep another sky weaving beside this one." },
  { id: "beds", title: "Three more soundscapes", body: `${listOf(PLUS_BEDS)} under your chapters.` },
  { id: "areas", title: "Every affirmation area", body: "Lines for all six areas, not only yours." },
  { id: "scenes", title: "Unlimited Scenes", body: "Add as many as you like. Proof photos never count." },
];

/** The featured benefit first, the rest in their usual order. */
export function orderedBenefits(featured: BenefitId | null): readonly Benefit[] {
  if (!featured) return BENEFITS;
  return [...BENEFITS.filter((b) => b.id === featured), ...BENEFITS.filter((b) => b.id !== featured)];
}

/** The engraved 'Free forever' panel. */
export const FREE_FOREVER: readonly { readonly id: string; readonly label: string }[] = [
  { id: "story", label: "Your story" },
  { id: "loop", label: "The whole loop" },
  { id: "sky", label: "Your sky" },
  { id: "listens", label: "Unlimited listens" },
  { id: "backup", label: "Private backup" },
];

export const FREE_FOREVER_NOTE = "No account and no time limit. Nothing you make is ever locked away.";

/** 'Career · Season 1 · 5 proofs'. */
export function statsLine(area: string, season: number, proofs: number): string {
  return `${area} · Season ${Math.max(1, season)} · ${proofs} ${proofs === 1 ? "proof" : "proofs"}`;
}

/** Shown once Plus is on (after a purchase or restore, or for a Plus member). */
export const PLUS_ON_COPY = {
  title: "Plus is on.",
  lead: "Thank you. Every dream can weave at once, and every soundscape, area and Scene is yours.",
} as const;

export const RENEWAL_TERMS =
  "Monthly and yearly plans renew automatically unless cancelled at least 24 hours before the current period ends. Payment is charged to your Apple Account. Manage or cancel in your Apple Account settings. Lifetime is a one-time purchase.";

export const LEGAL_URLS = {
  terms: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  privacy: "https://dhaxor.github.io/vela/privacy",
  manageSubscriptions: "https://apps.apple.com/account/subscriptions",
} as const;
