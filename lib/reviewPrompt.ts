// The App Store rating ask — once, ever, at a genuinely good moment.
//
// The moment is the proof-confirmation card ("A point of proof") after a
// user has recorded their SECOND piece of proof and has come back to do it:
// they returned, acted in the real world twice, and are looking at evidence
// that it worked. Never onboarding, never the paywall, never mid-story.
//
// The gate is pure and tested. The native seam (AsyncStorage + StoreReview)
// is required lazily inside the wrapper — the same pattern as
// lib/notifications.ts — so bun can load this module without parsing
// react-native, and so the wrapper itself can be tested with fakes.

import type { FutureAction } from "./futureMemory";

export const REVIEW_REQUESTED_KEY = "vela-review-requested-v1";
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

export interface ReviewDeps {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  isAvailableAsync: () => Promise<boolean>;
  requestReview: () => Promise<void>;
  now: () => number;
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
    now: () => Date.now(),
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
