import { describe, expect, test } from "bun:test";
import type { FutureAction } from "./futureMemory";
import {
  maybeRequestStoreReview,
  recordedProofTimes,
  REVIEW_MIN_RETURN_GAP_MS,
  REVIEW_REQUESTED_KEY,
  shouldRequestReview,
  type ReviewDeps,
} from "./reviewPrompt";

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
