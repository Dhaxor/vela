import { describe, expect, test } from "bun:test";
import { FOCUS_AREAS } from "./focus";
import {
  bridgeOffers,
  bridgePool,
  bridgeText,
  dateKey,
  learnedRetryLine,
  ownBridgeText,
  proofConstellation,
  proofEnding,
  reshapeStarters,
  sanitizeEvidence,
  suggestedTier,
  type FutureAction,
  type OfferInput,
} from "./futureMemory";
import { BRIDGE_TIERS, type BridgeEntry, type BridgeLibrary } from "./story/content";

const entry = (id: string, tier: BridgeEntry["tier"], extra: Partial<BridgeEntry> = {}): BridgeEntry => ({
  id,
  focus: "career",
  tier,
  text: `Step ${id} toward {desire.np}.`,
  ...extra,
});

/** A synthetic library with several entries per tier, so selection rules are observable. */
const LIB: BridgeLibrary = {
  entries: [
    ...["a", "b", "c", "d"].map((x) => entry(`2-${x}`, "2min")),
    ...["a", "b", "c", "d"].map((x) => entry(`15-${x}`, "15min")),
    ...["a", "b", "c", "d"].map((x) => entry(`br-${x}`, "brave")),
    entry("15-stage4", "15min", { stage: 4 }),
    entry("br-studio", "brave", { motif: "own-business", text: "Sketch the sign above {motif.place}." }),
  ],
  reshape: Object.fromEntries(FOCUS_AREAS.map((f) => [f.id, [{ id: `rs-${f.id}`, text: "One piece of {desire.np}, sized for today." }]])) as unknown as BridgeLibrary["reshape"],
  learnedRetry: [{ id: "lr1", text: "Last time taught you something, {name}. Try the smallest piece of {bridge.quote}." }],
};

const input = (over: Partial<OfferInput> = {}): OfferInput => ({
  chapterId: "c1",
  focus: "career",
  stage: 2,
  desire: "To open my own design studio",
  motifIds: [],
  lastProofKind: null,
  pastLibraryIds: [],
  ...over,
});

describe("bridge offers", () => {
  test("exactly one per tier, in tier order, exactly one suggested", () => {
    const offers = bridgeOffers(input(), LIB);
    expect(offers.map((o) => o.tier)).toEqual(["2min", "15min", "brave"]);
    expect(offers.filter((o) => o.suggested).map((o) => o.tier)).toEqual(["15min"]);
  });

  test("the suggestion follows the last proof: learned → smaller, did → brave", () => {
    expect(suggestedTier(null)).toBe("15min");
    expect(suggestedTier("learned")).toBe("2min");
    expect(suggestedTier("moved")).toBe("15min");
    expect(suggestedTier("did")).toBe("brave");
    expect(bridgeOffers(input({ lastProofKind: "did" }), LIB).find((o) => o.suggested)?.tier).toBe("brave");
  });

  test("deterministic per chapter, varied across chapters", () => {
    expect(bridgeOffers(input(), LIB)).toEqual(bridgeOffers(input(), LIB));
    const seen = new Set<string>();
    for (let i = 0; i < 20; i += 1) seen.add(bridgeOffers(input({ chapterId: `c${i}` }), LIB)[0].libraryId);
    expect(seen.size).toBeGreaterThan(1);
  });

  test("never the previous bridge back to back, and recent bridges come last", () => {
    for (let i = 0; i < 30; i += 1) {
      const offers = bridgeOffers(input({ chapterId: `c${i}`, pastLibraryIds: ["2-a", "2-b", "2-c"] }), LIB);
      expect(offers[0].libraryId).toBe("2-d");
    }
  });

  test("stage-tagged entries are preferred; motif-tagged ones need their motif", () => {
    expect(bridgeOffers(input({ stage: 4 }), LIB)[1].libraryId).toBe("15-stage4");
    expect(bridgePool("career", [], LIB).some((b) => b.motif)).toBe(false);
    const studio = bridgeOffers(input({ motifIds: ["own-business"] }), LIB)[2];
    expect(studio.libraryId).toBe("br-studio");
  });

  test("text is filled, sentence case, one final period", () => {
    const [two] = bridgeOffers(input(), LIB);
    expect(two.text).toMatch(/^Step 2-[a-d] toward opening your own design studio\.$/u);
    expect(bridgeText({ text: "call the bank" }, "x", [])).toBe("Call the bank.");
    expect(bridgeText({ text: "Ask once. " }, "x", [])).toBe("Ask once.");
  });

  test("a motif-tagged bridge names its own motif's place, not the dream's first motif", () => {
    const entry = { text: "sketch the sign that will hang above {motif.place}", motif: "own-business" as const };
    expect(bridgeText(entry, "my own design studio", ["freelance", "own-business"])).toBe("Sketch the sign that will hang above the studio.");
    expect(bridgeText({ text: "tidy {motif.place}" }, "x", ["freelance", "own-business"])).toBe("Tidy the desk by the window.");
  });

  test("the shipped library offers all three tiers for every focus", () => {
    for (const f of FOCUS_AREAS) {
      const offers = bridgeOffers(input({ focus: f.id }));
      expect(offers.map((o) => o.tier)).toEqual([...BRIDGE_TIERS]);
      for (const o of offers) expect(o.text).toMatch(/^[A-Z].*[.!?]$/u);
    }
  });
});

describe("write my own, reshape, learned retry", () => {
  test("own bridge text is one clean sentence", () => {
    expect(ownBridgeText("  call   the printer ", 180)).toBe("Call the printer.");
    expect(ownBridgeText("Ask for the slot!", 180)).toBe("Ask for the slot!");
    expect(ownBridgeText("   ", 180)).toBe("");
  });

  test("reshape starters fill the desire", () => {
    expect(reshapeStarters("career", "Find my soulmate", LIB)).toEqual(["One piece of finding your soulmate, sized for today."]);
  });

  test("learned retry quotes the bridge, or stays silent without its tokens", () => {
    expect(learnedRetryLine({ chapterId: "c", name: "Maya", bridgeText: "Call the printer.", proofText: null }, LIB)).toBe(
      "Last time taught you something, Maya. Try the smallest piece of “Call the printer”."
    );
    expect(learnedRetryLine({ chapterId: "c", name: "Maya", bridgeText: null, proofText: null }, LIB)).toBeNull();
  });
});

describe("1.0 proof helpers (trust-pass fixes)", () => {
  test("evidence is one line, capped, and never ends in '..' or '!.'", () => {
    const long = sanitizeEvidence(`  I sent   the proposal.. ${"x".repeat(400)} `);
    expect(long.length).toBeLessThanOrEqual(240);
    expect(long.startsWith("I sent the proposal. xxx")).toBe(true);
    expect(sanitizeEvidence("Paid an extra 50 toward the card..")).toBe("Paid an extra 50 toward the card.");
    expect(sanitizeEvidence("Did it!.")).toBe("Did it!");
    expect(sanitizeEvidence("Wait for it...")).toBe("Wait for it...");
  });

  test("dateKey is the LOCAL calendar day (1.0 sliced the UTC string)", () => {
    const lateEvening = new Date(2026, 9, 15, 23, 30);
    expect(dateKey(lateEvening.toISOString())).toBe("2026-10-15");
    expect(dateKey("not a date")).toBe("");
  });

  test("the constellation groups completed evidence by local day, last seven", () => {
    const actions: FutureAction[] = Array.from({ length: 9 }, (_, i) => ({
      id: `${i}`,
      intentId: "i",
      storyId: "s",
      text: "step",
      state: "completed",
      createdAt: new Date(2026, 7, i + 1, 22).toISOString(),
      completedAt: new Date(2026, 7, i + 1, 22).toISOString(),
      evidence: `proof ${i}`,
      evidenceKind: "did",
    }));
    actions.push({ id: "open", intentId: "i", storyId: "s", text: "open", state: "open", createdAt: new Date(2026, 7, 10).toISOString() });
    const points = proofConstellation(actions);
    expect(points).toHaveLength(7);
    expect(points[0].dateKey).toBe("2026-08-03");
    expect(points[6].dateKey).toBe("2026-08-09");
  });

  test("success copy says the next chapter will remember it", () => {
    for (const k of ["did", "moved", "learned"] as const) expect(proofEnding(k)).toContain("Your next chapter will remember it.");
  });
});
