import { describe, expect, test } from "bun:test";
import {
  ASK_RULES,
  createAskRuntime,
  emptyAskLedger,
  newAskSession,
  noteAsked,
  parseAskLedger,
  pickAsk,
  sessionAfterReturn,
  settleAsk,
  type AskLedger,
  type AskStore,
} from "./asks";
import { STORAGE_KEYS } from "./storageKeys";

const T0 = new Date("2026-10-15T20:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const later = (ms: number) => new Date(T0.getTime() + ms);

function memoryStore(initial?: string) {
  const map = new Map<string, string>();
  if (initial) map.set(STORAGE_KEYS.asks, initial);
  const store: AskStore = {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
  };
  return { store, map };
}

describe("pickAsk (pure)", () => {
  test("priority: notifications > plus-nudge > review (K2)", () => {
    const session = newAskSession(T0);
    const ledger = emptyAskLedger();
    expect(pickAsk(ledger, session, ["review", "plus-nudge", "notifications"], T0)).toBe("notifications");
    expect(pickAsk(ledger, session, ["review", "plus-nudge"], T0)).toBe("plus-nudge");
    expect(pickAsk(ledger, session, ["review"], T0)).toBe("review");
    expect(pickAsk(ledger, session, [], T0)).toBeNull();
  });

  test("one ask per session (K1)", () => {
    const { ledger, session } = noteAsked(emptyAskLedger(), newAskSession(T0), "plus-nudge", T0);
    expect(session.asked).toBe("plus-nudge");
    expect(pickAsk(ledger, session, ["notifications"], T0)).toBeNull();
    expect(pickAsk(ledger, newAskSession(later(DAY)), ["notifications"], later(DAY))).toBe("notifications");
  });

  test("cooldowns per kind", () => {
    const { ledger } = noteAsked(emptyAskLedger(), newAskSession(T0), "notifications", T0);
    const at = (ms: number) => pickAsk(ledger, newAskSession(later(ms)), ["notifications"], later(ms));
    expect(at(3 * DAY - 1)).toBeNull();
    expect(at(3 * DAY)).toBe("notifications");
  });

  test("a lower-priority ask still wins when the higher one is cooling down", () => {
    const { ledger } = noteAsked(emptyAskLedger(), newAskSession(T0), "notifications", T0);
    expect(pickAsk(ledger, newAskSession(later(DAY)), ["notifications", "review"], later(DAY))).toBe("review");
  });

  test("maxEver settles an ask for good (K4)", () => {
    let ledger: AskLedger = emptyAskLedger();
    for (let i = 0; i < ASK_RULES["plus-nudge"].maxEver; i += 1) {
      ledger = noteAsked(ledger, newAskSession(later(i * 8 * DAY)), "plus-nudge", later(i * 8 * DAY)).ledger;
    }
    expect(ledger.history["plus-nudge"]).toMatchObject({ count: 3, settled: true });
    expect(pickAsk(ledger, newAskSession(later(365 * DAY)), ["plus-nudge"], later(365 * DAY))).toBeNull();

    const reviewed = noteAsked(emptyAskLedger(), newAskSession(T0), "review", T0).ledger;
    expect(reviewed.history.review.settled).toBe(true);
  });

  test("settled asks never come back", () => {
    const ledger = settleAsk(emptyAskLedger(), "notifications");
    expect(ledger.history.notifications.settled).toBe(true);
    expect(pickAsk(ledger, newAskSession(T0), ["notifications"], T0)).toBeNull();
    expect(settleAsk(ledger, "notifications")).toBe(ledger);
  });

  test("a clock set back before the last ask never counts as a cooldown passed", () => {
    const { ledger } = noteAsked(emptyAskLedger(), newAskSession(T0), "notifications", T0);
    expect(pickAsk(ledger, newAskSession(later(-30 * DAY)), ["notifications"], later(-30 * DAY))).toBeNull();
  });
});

describe("sessions", () => {
  test("a new session only after 30 minutes away", () => {
    const s = noteAsked(emptyAskLedger(), newAskSession(T0), "review", T0).session;
    const back = T0.getTime() + 60_000;
    expect(sessionAfterReturn(s, back, later(60_000 + ASK_RULES.sessionGapMs - 1))).toBe(s);
    const fresh = sessionAfterReturn(s, back, later(60_000 + ASK_RULES.sessionGapMs));
    expect(fresh.asked).toBeNull();
    expect(fresh.id).not.toBe(s.id);
    expect(sessionAfterReturn(s, null, later(DAY))).toBe(s);
  });
});

describe("parseAskLedger", () => {
  test("round-trips and repairs leniently", () => {
    const { ledger } = noteAsked(emptyAskLedger(), newAskSession(T0), "notifications", T0);
    expect(parseAskLedger(JSON.stringify(ledger))).toEqual(ledger);
    expect(parseAskLedger("garbage")).toEqual(emptyAskLedger());
    expect(parseAskLedger({ history: { review: { count: -2, lastAt: "nope", settled: "yes" } } })).toEqual(emptyAskLedger());
  });
});

describe("runtime", () => {
  test("claimAsk consumes the session's one ask and persists the ledger", async () => {
    const { store, map } = memoryStore();
    let clock = T0;
    const rt = createAskRuntime(() => store, () => clock);
    expect(await rt.claimAsk(["review", "plus-nudge"])).toBe("plus-nudge");
    expect(await rt.claimAsk(["notifications"])).toBeNull();
    expect(parseAskLedger(map.get(STORAGE_KEYS.asks)).history["plus-nudge"].count).toBe(1);

    // Backgrounded 10 minutes: same session.
    rt.onAppStateChange("background", clock);
    clock = later(10 * 60_000);
    rt.onAppStateChange("active", clock);
    expect(await rt.claimAsk(["notifications"])).toBeNull();

    // Away 31 minutes: a new session.
    rt.onAppStateChange("background", clock);
    clock = later(41 * 60_000);
    rt.onAppStateChange("inactive", clock);
    rt.onAppStateChange("active", clock);
    expect(await rt.claimAsk(["notifications"])).toBe("notifications");
  });

  test("simultaneous claims: exactly one wins", async () => {
    const { store } = memoryStore();
    const rt = createAskRuntime(() => store, () => T0);
    const results = await Promise.all([rt.claimAsk(["review"]), rt.claimAsk(["notifications"]), rt.claimAsk(["plus-nudge"])]);
    expect(results.filter((r) => r !== null)).toEqual(["review"]);
  });

  test("the ledger survives a restart; settle is permanent", async () => {
    const { store, map } = memoryStore();
    const first = createAskRuntime(() => store, () => T0);
    await first.settle("notifications");
    const restarted = createAskRuntime(() => store, () => later(DAY));
    expect(await restarted.claimAsk(["notifications", "review"])).toBe("review");
    expect(parseAskLedger(map.get(STORAGE_KEYS.asks)).history.notifications.settled).toBe(true);
  });

  test("storage failures never throw and never grant a second ask", async () => {
    const broken: AskStore = {
      getItem: async () => {
        throw new Error("down");
      },
      setItem: async () => {
        throw new Error("down");
      },
    };
    const rt = createAskRuntime(() => broken, () => T0);
    expect(await rt.claimAsk(["review"])).toBe("review");
    expect(await rt.claimAsk(["notifications"])).toBeNull();
    await rt.settle("notifications");
  });
});
