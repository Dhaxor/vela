// The App Store rating ask — once, ever, at a genuinely good moment.
//
// 1.1 (S4): the moments are the Star Birth after the SECOND proof (or the
// first eligible proof after it) and the Named Sky at the season's seventh.
// The user has come back (the first proof is at least 4 hours old), acted in
// the real world twice, and is looking at a star made of it. Never
// onboarding, never the paywall, never mid-story. It goes through the asks
// arbiter (lib/asks), so it never stacks on another ask in the same session.
//
//   requestReviewIfDue(proofs)               // review is the only candidate (Named Sky)
//   if (await reviewIsDue(proofs)) candidates.push("review");
//   if ((await claimAsk(candidates)) === "review") await requestReviewNow();
//
// 1.0: maybeRequestStoreReview(actions) keeps its signature and behaviour for
// the 1.0 evidence screen until S4 replaces it.
//
// The gate is pure and tested. The native seam (AsyncStorage + StoreReview)
// is required lazily inside the wrapper, so bun can load this module without
// parsing react-native, and so the wrapper itself can be tested with fakes.

import type { Proof } from "@/contexts/arc.types";
import { claimAsk, type AskKind } from "./asks";
import type { FutureAction } from "./futureMemory";
import { now as clockNow } from "./clock";
import { STORAGE_KEYS } from "./storageKeys";

export const REVIEW_REQUESTED_KEY = STORAGE_KEYS.reviewRequested;
/** Ask on the second recorded proof (or the first eligible one after it). */
export const REVIEW_PROOF_MILESTONE = 2;
/**
 * The first proof must be at least this old. A second proof can be recorded
 * minutes after the first ("Weave chapter 2" is not time-gated), so the count
 * alone would allow an ask inside the very first session. This makes the ask
 * mean "they came back".
 */
export const REVIEW_MIN_RETURN_GAP_MS = 4 * 60 * 60 * 1000;
/** Let the success card land before a system sheet covers it. */
export const REVIEW_PROMPT_DELAY_MS = 1500;

/** Epoch-ms of every recorded proof, oldest first. Open/reshaped actions and malformed dates are ignored. */
export function recordedProofTimes(actions: readonly FutureAction[]): number[] {
  const times: number[] = [];
  for (const action of actions) {
    if (action.state !== "completed" || !action.evidence?.trim() || !action.completedAt) continue;
    const ms = Date.parse(action.completedAt);
    if (Number.isFinite(ms)) times.push(ms);
  }
  return times.sort((a, b) => a - b);
}

export function shouldRequestReview(input: {
  proofTimes: readonly number[];
  now: number;
  alreadyRequested: boolean;
}): boolean {
  if (input.alreadyRequested) return false;
  if (input.proofTimes.length < REVIEW_PROOF_MILESTONE) return false;
  const first = Math.min(...input.proofTimes);
  return input.now - first >= REVIEW_MIN_RETURN_GAP_MS;
}

/** Epoch-ms of every saved v2 proof (seed included), oldest first. Malformed dates are ignored. */
export function proofTimesFromProofs(proofs: readonly Proof[]): number[] {
  return proofs
    .map((p) => Date.parse(p.createdAt))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);
}

export interface ReviewDeps {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  isAvailableAsync: () => Promise<boolean>;
  requestReview: () => Promise<void>;
  now: () => number;
  /** The asks arbiter (lib/asks claimAsk). Only the 1.1 path uses it. */
  claimAsk?: (candidates: readonly AskKind[]) => Promise<AskKind | null>;
}

function nativeDeps(): ReviewDeps {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const AsyncStorage = (
    require("@react-native-async-storage/async-storage") as typeof import("@react-native-async-storage/async-storage")
  ).default;
  const StoreReview = require("expo-store-review") as typeof import("expo-store-review");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    isAvailableAsync: () => StoreReview.isAvailableAsync(),
    requestReview: () => StoreReview.requestReview(),
    now: () => clockNow().getTime(),
    claimAsk,
  };
}

/**
 * Ask for a rating if (and only if) this is the moment. `actions` must
 * include the proof that was just saved. Resolves true when the native ask
 * was made. Never throws, never blocks: every failure resolves false.
 */
export async function maybeRequestStoreReview(
  actions: readonly FutureAction[],
  deps?: ReviewDeps
): Promise<boolean> {
  try {
    const proofTimes = recordedProofTimes(actions);
    const d = deps ?? nativeDeps();
    const now = d.now();
    // Cheap pure check first — most calls never touch storage or StoreKit.
    if (!shouldRequestReview({ proofTimes, now, alreadyRequested: false })) return false;

    const [alreadyRequested, isAvailable] = await Promise.all([
      d.getItem(REVIEW_REQUESTED_KEY),
      d.isAvailableAsync(),
    ]);
    if (!isAvailable) return false;
    if (!shouldRequestReview({ proofTimes, now, alreadyRequested: Boolean(alreadyRequested) })) {
      return false;
    }

    // Flag first: even if the sheet fails, we never ask twice.
    await d.setItem(REVIEW_REQUESTED_KEY, new Date(now).toISOString());
    await d.requestReview();
    return true;
  } catch {
    return false;
  }
}

/**
 * 1.1: true when a review may be asked now: the proof gate passes, it was
 * never asked (1.0 included), and StoreKit can show it. Use it to build the
 * candidates for claimAsk. Never throws.
 */
export async function reviewIsDue(proofs: readonly Proof[], deps?: ReviewDeps): Promise<boolean> {
  try {
    const proofTimes = proofTimesFromProofs(proofs);
    const d = deps ?? nativeDeps();
    const now = d.now();
    if (!shouldRequestReview({ proofTimes, now, alreadyRequested: false })) return false;
    const [alreadyRequested, isAvailable] = await Promise.all([d.getItem(REVIEW_REQUESTED_KEY), d.isAvailableAsync()]);
    return isAvailable && !alreadyRequested;
  } catch {
    return false;
  }
}

/** 1.1: show the system rating sheet, once ever. Call only after claimAsk returned 'review'. Never throws. */
export async function requestReviewNow(deps?: ReviewDeps): Promise<boolean> {
  try {
    const d = deps ?? nativeDeps();
    if (await d.getItem(REVIEW_REQUESTED_KEY)) return false;
    // Flag first: even if the sheet fails, we never ask twice.
    await d.setItem(REVIEW_REQUESTED_KEY, new Date(d.now()).toISOString());
    await d.requestReview();
    return true;
  } catch {
    return false;
  }
}

/**
 * 1.1, when the review is the only candidate (after the Named Sky, or a proof
 * Star Birth with no Plus nudge due): gate, claim this session's ask, then
 * ask. `proofs` must include the proof that was just saved. Never throws.
 */
export async function requestReviewIfDue(proofs: readonly Proof[], deps?: ReviewDeps): Promise<boolean> {
  try {
    const d = deps ?? nativeDeps();
    if (!(await reviewIsDue(proofs, d))) return false;
    const claim = d.claimAsk ?? claimAsk;
    if ((await claim(["review"])) !== "review") return false;
    return await requestReviewNow(d);
  } catch {
    return false;
  }
}
