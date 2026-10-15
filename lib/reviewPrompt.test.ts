import { describe, expect, test } from "bun:test";
import type { Proof } from "@/contexts/arc.types";
import type { AskKind } from "./asks";
import type { FutureAction } from "./futureMemory";
import {
  maybeRequestStoreReview,
  proofTimesFromProofs,
  recordedProofTimes,
  requestReviewIfDue,
  requestReviewNow,
  REVIEW_MIN_RETURN_GAP_MS,
  REVIEW_REQUESTED_KEY,
  reviewIsDue,
  shouldRequestReview,
  type ReviewDeps,
} from "./reviewPrompt";
import { STORAGE_KEYS } from "./storageKeys";

const HOUR = 60 * 60 * 1000;
const T0 = Date.parse("2026-09-01T09:00:00.000Z");

function proof(id: string, completedAtMs: number, overrides: Partial<FutureAction> = {}): FutureAction {
  const iso = new Date(completedAtMs).toISOString();
  return {
    id,
    intentId: "i",
    storyId: "s",
    text: "step",
    state: "completed",
    createdAt: iso,
    completedAt: iso,
    evidence: `proof ${id}`,
    evidenceKind: "did",
    ...overrides,
  };
}

function fakeDeps(options: { stored?: string | null; available?: boolean; now: number }) {
  const store = new Map<string, string>();
  if (options.stored) store.set(REVIEW_REQUESTED_KEY, options.stored);
  const calls = { requestReview: 0, setItem: 0 };
  const deps: ReviewDeps = {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      calls.setItem += 1;
      store.set(key, value);
    },
    isAvailableAsync: async () => options.available ?? true,
    requestReview: async () => {
      calls.requestReview += 1;
    },
    now: () => options.now,
  };
  return { deps, store, calls };
}

describe("recordedProofTimes", () => {
  test("counts only completed actions that carry evidence and a valid date", () => {
    const actions: FutureAction[] = [
      proof("b", T0 + 5 * HOUR),
      proof("a", T0),
      proof("open", T0, { state: "open", completedAt: undefined, evidence: undefined }),
      proof("reshaped", T0, { state: "reshaped" }),
      proof("blank", T0, { evidence: "   " }),
      proof("bad-date", T0, { completedAt: "not a date" }),
    ];
    expect(recordedProofTimes(actions)).toEqual([T0, T0 + 5 * HOUR]);
  });
});

describe("shouldRequestReview", () => {
  test("never on the first proof", () => {
    expect(shouldRequestReview({ proofTimes: [T0], now: T0 + 48 * HOUR, alreadyRequested: false })).toBe(false);
  });

  test("on the second proof once the user has come back", () => {
    expect(
      shouldRequestReview({ proofTimes: [T0, T0 + 24 * HOUR], now: T0 + 24 * HOUR, alreadyRequested: false })
    ).toBe(true);
  });

  test("not when both proofs land inside the first session", () => {
    const now = T0 + 10 * 60 * 1000;
    expect(shouldRequestReview({ proofTimes: [T0, now], now, alreadyRequested: false })).toBe(false);
    expect(
      shouldRequestReview({
        proofTimes: [T0, T0 + REVIEW_MIN_RETURN_GAP_MS - 1],
        now: T0 + REVIEW_MIN_RETURN_GAP_MS - 1,
        alreadyRequested: false,
      })
    ).toBe(false);
  });

  test("a later proof still qualifies when the second came too soon", () => {
    const now = T0 + 30 * HOUR;
    expect(
      shouldRequestReview({ proofTimes: [T0, T0 + 60_000, now], now, alreadyRequested: false })
    ).toBe(true);
  });

  test("never twice", () => {
    expect(
      shouldRequestReview({ proofTimes: [T0, T0 + 24 * HOUR], now: T0 + 24 * HOUR, alreadyRequested: true })
    ).toBe(false);
  });

  test("a clock set backwards never triggers", () => {
    expect(shouldRequestReview({ proofTimes: [T0, T0 + HOUR], now: T0 - HOUR, alreadyRequested: false })).toBe(
      false
    );
  });
});

describe("maybeRequestStoreReview", () => {
  const eligible = [proof("a", T0), proof("b", T0 + 24 * HOUR)];
  const now = T0 + 24 * HOUR;

  test("asks once, persists the flag, and never asks again", async () => {
    const { deps, store, calls } = fakeDeps({ now });
    expect(await maybeRequestStoreReview(eligible, deps)).toBe(true);
    expect(calls.requestReview).toBe(1);
    expect(store.get(REVIEW_REQUESTED_KEY)).toBe(new Date(now).toISOString());

    const third = [...eligible, proof("c", now + 24 * HOUR)];
    deps.now = () => now + 24 * HOUR;
    expect(await maybeRequestStoreReview(third, deps)).toBe(false);
    expect(calls.requestReview).toBe(1);
  });

  test("does nothing before the milestone, without touching storage", async () => {
    const { deps, calls } = fakeDeps({ now });
    let reads = 0;
    const getItem = deps.getItem;
    deps.getItem = async (key) => {
      reads += 1;
      return getItem(key);
    };
    expect(await maybeRequestStoreReview([proof("a", T0)], deps)).toBe(false);
    expect(reads).toBe(0);
    expect(calls.setItem).toBe(0);
  });

  test("respects an earlier ask and StoreKit unavailability (TestFlight, web)", async () => {
    const asked = fakeDeps({ now, stored: "2026-08-01T00:00:00.000Z" });
    expect(await maybeRequestStoreReview(eligible, asked.deps)).toBe(false);
    expect(asked.calls.requestReview).toBe(0);

    const unavailable = fakeDeps({ now, available: false });
    expect(await maybeRequestStoreReview(eligible, unavailable.deps)).toBe(false);
    expect(unavailable.calls.requestReview).toBe(0);
    expect(unavailable.store.has(REVIEW_REQUESTED_KEY)).toBe(false);
  });

  test("swallows every native failure", async () => {
    const storageDown = fakeDeps({ now });
    storageDown.deps.getItem = async () => {
      throw new Error("storage unavailable");
    };
    expect(await maybeRequestStoreReview(eligible, storageDown.deps)).toBe(false);

    const sheetFails = fakeDeps({ now });
    sheetFails.deps.requestReview = async () => {
      throw new Error("StoreKit error");
    };
    expect(await maybeRequestStoreReview(eligible, sheetFails.deps)).toBe(false);
    // The flag was written first, so a failed sheet is still never retried.
    expect(sheetFails.store.has(REVIEW_REQUESTED_KEY)).toBe(true);
  });
});

function v2Proof(id: string, createdAtMs: number): Proof {
  const iso = new Date(createdAtMs).toISOString();
  return {
    id,
    dreamId: "d1",
    bridgeId: null,
    kind: "did",
    text: `proof ${id}`,
    photoUri: null,
    createdAt: iso,
    dateKey: iso.slice(0, 10),
    wovenInChapterId: null,
    starIndex: 1,
    season: 1,
    origin: "bridge",
  };
}

/** fakeDeps plus a scripted asks arbiter. */
function arbiterDeps(options: { now: number; stored?: string | null; available?: boolean; grant?: AskKind | null }) {
  const fake = fakeDeps(options);
  const claims: (readonly AskKind[])[] = [];
  fake.deps.claimAsk = async (candidates) => {
    claims.push(candidates);
    return options.grant === undefined ? candidates[0] ?? null : options.grant;
  };
  return { ...fake, claims };
}

describe("1.1 review moments (2nd proof, Named Sky)", () => {
  const proofs = [v2Proof("seed", T0), v2Proof("p1", T0 + 26 * HOUR)];
  const now = T0 + 26 * HOUR;

  test("the 1.0 once-ever flag key is unchanged", () => {
    expect(REVIEW_REQUESTED_KEY).toBe("vela-review-requested-v1");
    expect(STORAGE_KEYS.reviewRequested).toBe(REVIEW_REQUESTED_KEY);
  });

  test("proof times come from v2 proofs, oldest first", () => {
    expect(proofTimesFromProofs([proofs[1], proofs[0], { ...proofs[0], createdAt: "nope" }])).toEqual([T0, T0 + 26 * HOUR]);
  });

  test("due after the 2nd proof once the user came back; never twice, never without StoreKit", async () => {
    expect(await reviewIsDue(proofs, fakeDeps({ now }).deps)).toBe(true);
    expect(await reviewIsDue(proofs.slice(0, 1), fakeDeps({ now }).deps)).toBe(false);
    expect(await reviewIsDue([v2Proof("a", T0), v2Proof("b", T0 + HOUR)], fakeDeps({ now: T0 + HOUR }).deps)).toBe(false);
    expect(await reviewIsDue(proofs, fakeDeps({ now, stored: "2026-08-01T00:00:00.000Z" }).deps)).toBe(false);
    expect(await reviewIsDue(proofs, fakeDeps({ now, available: false }).deps)).toBe(false);
  });

  test("goes through the asks arbiter and asks once", async () => {
    const { deps, calls, claims, store } = arbiterDeps({ now });
    expect(await requestReviewIfDue(proofs, deps)).toBe(true);
    expect(claims).toEqual([["review"]]);
    expect(calls.requestReview).toBe(1);
    expect(store.get(REVIEW_REQUESTED_KEY)).toBe(new Date(now).toISOString());
    // The Named Sky later: already asked, the arbiter is not even consulted.
    const seven = [...proofs, ...[2, 3, 4, 5, 6].map((i) => v2Proof(`p${i}`, now + i * 24 * HOUR))];
    deps.now = () => now + 7 * 24 * HOUR;
    expect(await requestReviewIfDue(seven, deps)).toBe(false);
    expect(claims.length).toBe(1);
    expect(calls.requestReview).toBe(1);
  });

  test("when the session's ask went elsewhere, nothing is shown and the review stays due", async () => {
    const { deps, calls, store } = arbiterDeps({ now, grant: null });
    expect(await requestReviewIfDue(proofs, deps)).toBe(false);
    expect(calls.requestReview).toBe(0);
    expect(store.has(REVIEW_REQUESTED_KEY)).toBe(false);
    expect(await reviewIsDue(proofs, deps)).toBe(true);
  });

  test("not due: the arbiter's ask is never spent", async () => {
    const { deps, claims } = arbiterDeps({ now: T0 + HOUR });
    expect(await requestReviewIfDue([v2Proof("a", T0), v2Proof("b", T0 + HOUR)], deps)).toBe(false);
    expect(claims).toEqual([]);
  });

  test("requestReviewNow flags first and never asks twice", async () => {
    const { deps, calls, store } = fakeDeps({ now });
    deps.requestReview = async () => {
      calls.requestReview += 1;
      throw new Error("StoreKit error");
    };
    expect(await requestReviewNow(deps)).toBe(false);
    expect(store.has(REVIEW_REQUESTED_KEY)).toBe(true);
    expect(await requestReviewNow(deps)).toBe(false);
    expect(calls.requestReview).toBe(1);
  });
});
