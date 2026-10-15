// FUTURE MEMORY: the bridge from a chapter into today. Each chapter ends with
// three sized steps (2-minute, 15-minute, brave) from the bridge library, or
// one the user writes. The suggested size follows the last proof: a lesson
// earns a smaller retry, a step earns the middle, a deed earns the brave one.
// Never the same bridge twice in a row. Pure and deterministic per chapter.
//
// The 1.0 types and proof helpers at the bottom keep the current screens
// running until Phase 2 replaces them.

import type { BridgeOffer, BridgeOfferTier } from "@/contexts/arc.types";
import type { FocusId } from "./focus";
import {
  BRIDGES,
  BRIDGE_TIERS,
  MOTIFS,
  type BridgeEntry,
  type BridgeLibrary,
  type BridgeTier,
  type MotifArchetype,
  type MotifId,
  type ProofKind,
  type StageId,
} from "./story/content";
import { fillTemplate, type TokenValues } from "./story/fill";
import { primaryMotif } from "./story/motifs";
import { mulberry32 } from "./story/rng";
import { shapeDesire } from "./story/shaper";
import { capitalize, cleanUserText, collapse, curlyQuote, hash32, stripTrailingPunct } from "./story/text";
import { localDateKey } from "./progress";

/** The tier offered as `suggested`, from the kind of the dream's last proof (none yet → 15 minutes). */
export function suggestedTier(lastProofKind: ProofKind | null): BridgeTier {
  if (lastProofKind === "learned") return "2min";
  if (lastProofKind === "did") return "brave";
  return "15min";
}

export interface OfferInput {
  readonly chapterId: string;
  readonly focus: FocusId;
  readonly stage: StageId;
  readonly desire: string;
  readonly motifIds: readonly MotifId[];
  readonly lastProofKind: ProofKind | null;
  /** Library ids of the dream's earlier bridges, oldest first. The newest is never offered again. */
  readonly pastLibraryIds: readonly string[];
}

/** Library entries this desire may see: motif-tagged ones only when that motif matched. */
export function bridgePool(focus: FocusId, motifIds: readonly MotifId[], library: BridgeLibrary = BRIDGES): BridgeEntry[] {
  return library.entries.filter((b) => b.focus === focus && (!b.motif || motifIds.includes(b.motif)));
}

function bridgeValues(desire: string, motif: MotifArchetype | undefined): TokenValues {
  return {
    "{desire.np}": { value: shapeDesire(desire).np },
    ...(motif ? { "{motif.place}": { value: motif.place } } : {}),
  };
}

/** Final bridge text: tokens filled, sentence case, one closing period. */
export function bridgeText(entry: Pick<BridgeEntry, "text">, desire: string, motifIds: readonly MotifId[], motifs: readonly MotifArchetype[] = MOTIFS): string {
  const filled = fillTemplate(entry.text, bridgeValues(desire, primaryMotif(motifIds, motifs))).text;
  return `${capitalize(stripTrailingPunct(collapse(filled)))}.`;
}

/** A bridge the user wrote: trimmed, one line, sentence case, ends with a period (or their own ! / ?). */
export function ownBridgeText(text: string, max: number): string {
  const clean = cleanUserText(text, max);
  if (!clean) return "";
  return /[.!?]$/u.test(clean) ? capitalize(clean) : `${capitalize(clean)}.`;
}

/**
 * Exactly one offer per tier ('2min', '15min', 'brave', in that order), one of
 * them suggested. Within a tier: entries tagged with this stage or a matched
 * motif come first, bridges used recently come last, the previous bridge never
 * returns back-to-back while an alternative exists. Seeded by chapter id, so
 * reopening a chapter shows the same three.
 */
export function bridgeOffers(
  input: OfferInput,
  library: BridgeLibrary = BRIDGES,
  motifs: readonly MotifArchetype[] = MOTIFS
): BridgeOffer[] {
  const pool = bridgePool(input.focus, input.motifIds, library);
  const previous = input.pastLibraryIds[input.pastLibraryIds.length - 1];
  const recent = new Set(input.pastLibraryIds.slice(-6));
  const suggested = suggestedTier(input.lastProofKind);
  const offers: BridgeOffer[] = [];
  for (const tier of BRIDGE_TIERS) {
    const inTier = pool.filter((b) => b.tier === tier);
    const notPrevious = inTier.filter((b) => b.id !== previous);
    const candidates = notPrevious.length > 0 ? notPrevious : inTier;
    if (candidates.length === 0) continue;
    const score = (b: BridgeEntry) =>
      (b.stage === input.stage ? 4 : 0) + (b.motif ? 2 : 0) + (recent.has(b.id) ? -8 : 0);
    const best = Math.max(...candidates.map(score));
    const top = candidates.filter((b) => score(b) === best);
    const rng = mulberry32(hash32(`${input.chapterId}|${tier}`));
    const entry = top[Math.floor(rng() * top.length)];
    offers.push({ tier, libraryId: entry.id, text: bridgeText(entry, input.desire, input.motifIds, motifs), suggested: tier === suggested });
  }
  return offers;
}

/** Starter phrasings for 'Write my own' (desire filled). */
export function reshapeStarters(focus: FocusId, desire: string, library: BridgeLibrary = BRIDGES): string[] {
  const values = bridgeValues(desire, undefined);
  return library.reshape[focus].map((f) => fillTemplate(f.text, values).text);
}

/**
 * The chooser header after a learned proof ('Last time taught you something.
 * Try the smallest piece of …'). Deterministic per chapter. null when there is nothing to say.
 */
export function learnedRetryLine(
  input: { chapterId: string; name: string; bridgeText: string | null; proofText: string | null },
  library: BridgeLibrary = BRIDGES
): string | null {
  const values: TokenValues = {
    "{name}": { value: collapse(input.name) || "friend" },
    ...(input.bridgeText && curlyQuote(input.bridgeText) ? { "{bridge.quote}": { value: curlyQuote(input.bridgeText)! } } : {}),
    ...(input.proofText && curlyQuote(input.proofText) ? { "{proof.quote}": { value: curlyQuote(input.proofText)! } } : {}),
  };
  const usable = library.learnedRetry.filter((f) => (f.text.match(/\{[^{}]+\}/gu) ?? []).every((t) => t in values));
  if (usable.length === 0) return null;
  const rng = mulberry32(hash32(`retry|${input.chapterId}`));
  return fillTemplate(usable[Math.floor(rng() * usable.length)].text, values).text;
}

/** Tier label for UI copy. */
export const TIER_LABEL: Readonly<Record<BridgeOfferTier, string>> = {
  "2min": "2 minutes",
  "15min": "15 minutes",
  brave: "Brave",
  own: "Your own",
};

/* =========================================================================
 * 1.0 shapes, kept for the current screens (Phase 2 removes the importers)
 * ========================================================================= */

export type ActionState = "open" | "completed" | "reshaped";
export type EvidenceKind = ProofKind;

export interface FutureAction {
  id: string;
  intentId: string;
  storyId: string;
  text: string;
  state: ActionState;
  createdAt: string;
  completedAt?: string;
  evidence?: string;
  evidenceKind?: EvidenceKind;
}

export interface ProofPoint {
  dateKey: string;
  count: number;
}

/** Proof text as stored: one line, at most 240 characters, no doubled stops ('..', '!.'). */
export function sanitizeEvidence(value: string): string {
  return cleanUserText(value, 240);
}

/** LOCAL calendar day of an ISO instant ('' when unparseable). 1.0 sliced the UTC string here. */
export function dateKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : localDateKey(date);
}

/** The last seven local days with proof, oldest first, with a per-day count. */
export function proofConstellation(actions: readonly FutureAction[]): ProofPoint[] {
  const counts = new Map<string, number>();
  for (const action of actions) {
    if (!action.completedAt || !action.evidence) continue;
    const key = dateKey(action.completedAt);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, count]) => ({ dateKey: key, count }));
}

/** The proof-saved success line. */
export function proofEnding(kind: EvidenceKind): string {
  if (kind === "learned") return "A lesson is proof too. Your next chapter will remember it.";
  if (kind === "moved") return "A step counts. Your next chapter will remember it.";
  return "You made it real. Your next chapter will remember it.";
}
