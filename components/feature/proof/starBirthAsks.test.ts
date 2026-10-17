import { describe, expect, test } from "bun:test";
import { createAskRuntime, parseAskLedger, type AskKind } from "@/lib/asks";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { createStarBirthAsks } from "./starBirthAsks";

/** The real arbiter over an in-memory store, plus a manual timer queue. */
function rig(reviewDue = true) {
  const mem = new Map<string, string>();
  const store = { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => void mem.set(k, v) };
  const clock = { t: new Date(2026, 9, 21, 21, 4) };
  const arbiter = createAskRuntime(() => store, () => clock.t);
  const timers: { run: () => void; cancelled: boolean }[] = [];
  const asked: string[] = [];
  const asks = createStarBirthAsks({
    claim: (c: readonly AskKind[]) => arbiter.claimAsk(c),
    reviewIsDue: async () => reviewDue,
    requestReview: async () => void asked.push("review"),
    schedule: (run) => {
      const entry = { run, cancelled: false };
      timers.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    delayMs: 1500,
  });
  const fire = async () => {
    for (const t of timers.splice(0)) if (!t.cancelled) t.run();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  };
  const ledger = () => parseAskLedger(mem.get(STORAGE_KEYS.asks) ?? null);
  return { asks, arbiter, fire, ledger, asked, clock };
}

describe("Star Birth asks: the once-ever review is never used up unseen", () => {
  test("still on the Star Birth after the delay: claimed, then asked", async () => {
    const r = rig();
    expect(await r.asks.afterStarBirth(false)).toBe("review-pending");
    expect(r.ledger().history.review.count).toBe(0);
    await r.fire();
    expect(r.asked).toEqual(["review"]);
    expect(r.ledger().history.review.settled).toBe(true);
  });

  test("'Carry it forward' within the delay: nothing claimed, so the Named Sky (or the next birth) still asks", async () => {
    const r = rig();
    expect(await r.asks.afterStarBirth(false)).toBe("review-pending");
    r.asks.dispose(); // router.replace(weave) unmounts the screen
    await r.fire();
    expect(r.asked).toEqual([]);
    expect(r.ledger().history.review).toEqual({ count: 0, lastAt: null, settled: false });
    // A later moment in the same session can still claim it.
    expect(await r.arbiter.claimAsk(["review"])).toBe("review");
  });

  test("the Plus nudge outranks the review and is claimed at once", async () => {
    const r = rig();
    expect(await r.asks.afterStarBirth(true)).toBe("plus-nudge");
    await r.fire();
    expect(r.asked).toEqual([]);
    expect(r.ledger().history["plus-nudge"].count).toBe(1);
    expect(r.ledger().history.review.settled).toBe(false);
  });

  test("a nudge in its cooldown falls through to the review", async () => {
    const r = rig();
    expect(await r.arbiter.claimAsk(["plus-nudge"])).toBe("plus-nudge");
    // A new session (30 minutes in the background), the nudge now cooling down for 7 days.
    r.arbiter.onAppStateChange("background", r.clock.t);
    r.clock.t = new Date(r.clock.t.getTime() + 31 * 60 * 1000);
    r.arbiter.onAppStateChange("active", r.clock.t);
    expect(await r.asks.afterStarBirth(true)).toBe("review-pending");
    await r.fire();
    expect(r.asked).toEqual(["review"]);
  });

  test("no review due: nothing pending", async () => {
    const r = rig(false);
    expect(await r.asks.afterStarBirth(false)).toBeNull();
    await r.fire();
    expect(r.asked).toEqual([]);
  });
});
