import { describe, expect, test } from "bun:test";
import {
  ALL_SKUS,
  canAddBoardCard,
  canAddDream,
  canAddScene,
  canCreateIntent,
  canUseArea,
  canUseBed,
  classifyPurchaseError,
  displayablePrice,
  FREE_BOARD_CARDS,
  FREE_INTENTS,
  isCancellation,
  ownsPlus,
  PLUS_SKUS,
  SUBSCRIPTION_SKUS,
  numericPrice,
} from "./purchase";

describe("sku catalog", () => {
  test("three distinct skus, subscriptions separated from inapp", () => {
    expect(new Set(ALL_SKUS).size).toBe(3);
    expect(SUBSCRIPTION_SKUS).toContain(PLUS_SKUS.monthly);
    expect(SUBSCRIPTION_SKUS).toContain(PLUS_SKUS.yearly);
    expect(SUBSCRIPTION_SKUS).not.toContain(PLUS_SKUS.lifetime);
  });
});

describe("isCancellation", () => {
  test("machine-readable signals win", () => {
    expect(isCancellation({ userCancelled: true })).toBe(true);
    expect(isCancellation({ code: 2 })).toBe(true);
    expect(isCancellation({ code: "E_USER_CANCELLED" })).toBe(true);
    expect(isCancellation({ code: "SKErrorPaymentCancelled" })).toBe(true);
  });
  test("localized text fallback: en, de, fr/it stems", () => {
    expect(isCancellation(new Error("Purchase was cancelled"))).toBe(true);
    expect(isCancellation(new Error("Der Kauf wurde abgebrochen"))).toBe(true);
    expect(isCancellation(new Error("Acquisto annullato"))).toBe(true);
  });
  test("real failures are not cancellations", () => {
    expect(isCancellation(new Error("Network unavailable"))).toBe(false);
    expect(isCancellation({ code: "E_UNKNOWN" })).toBe(false);
    expect(isCancellation(null)).toBe(false);
  });
  test("classify maps accordingly", () => {
    expect(classifyPurchaseError({ userCancelled: true })).toBe("cancelled");
    expect(classifyPurchaseError(new Error("boom"))).toBe("failed");
  });
});

describe("ownsPlus", () => {
  test("any live Plus sku grants", () => {
    expect(ownsPlus([{ productId: PLUS_SKUS.monthly }])).toBe(true);
    expect(ownsPlus([{ id: PLUS_SKUS.yearly }])).toBe(true);
    expect(ownsPlus([{ productId: PLUS_SKUS.lifetime }])).toBe(true);
  });
  test("foreign products never grant", () => {
    expect(ownsPlus([{ productId: "com.other.app.pro" }])).toBe(false);
    expect(ownsPlus([])).toBe(false);
    expect(ownsPlus(null)).toBe(false);
  });
  test("a refunded purchase must not re-grant", () => {
    expect(
      ownsPlus([{ productId: PLUS_SKUS.lifetime, revocationDate: 1700000000 }])
    ).toBe(false);
    expect(
      ownsPlus([{ productId: PLUS_SKUS.monthly, revocationDate: "2026-01-01" }])
    ).toBe(false);
    // null revocation means not revoked
    expect(
      ownsPlus([{ productId: PLUS_SKUS.monthly, revocationDate: null }])
    ).toBe(true);
  });
  test("one refunded sku does not poison a different live one", () => {
    expect(
      ownsPlus([
        { productId: PLUS_SKUS.monthly, revocationDate: 1700000000 },
        { productId: PLUS_SKUS.lifetime },
      ])
    ).toBe(true);
  });
});

describe("displayablePrice", () => {
  test("passes real prices, rejects junk", () => {
    expect(displayablePrice({ displayPrice: "$4.99" })).toBe("$4.99");
    expect(displayablePrice({ displayPrice: "  " })).toBeNull();
    expect(displayablePrice({ displayPrice: 4.99 as unknown as string })).toBeNull();
    expect(displayablePrice(undefined)).toBeNull();
  });
});

describe("free-tier rules", () => {
  test("free keeps one intent, Plus unlimited", () => {
    expect(canCreateIntent(0, false)).toBe(true);
    expect(canCreateIntent(FREE_INTENTS, false)).toBe(false);
    expect(canCreateIntent(99, true)).toBe(true);
  });
  test("free keeps three board cards, Plus unlimited", () => {
    expect(canAddBoardCard(FREE_BOARD_CARDS - 1, false)).toBe(true);
    expect(canAddBoardCard(FREE_BOARD_CARDS, false)).toBe(false);
    expect(canAddBoardCard(500, true)).toBe(true);
  });
});

describe("Plus gates (1.1)", () => {
  test("one active dream free; Plus holds many", () => {
    expect([canAddDream(0, false), canAddDream(1, false), canAddDream(5, true)]).toEqual([true, false, true]);
  });

  test("Night is the free bed; the others are Plus", () => {
    expect(canUseBed("night", false)).toBe(true);
    for (const bed of ["rain", "hearth", "dawn"] as const) {
      expect(canUseBed(bed, false)).toBe(false);
      expect(canUseBed(bed, true)).toBe(true);
    }
  });

  test("the user's own focus areas are free; every area with Plus", () => {
    expect(canUseArea("love", ["love", "career"], false)).toBe(true);
    expect(canUseArea("peace", ["love"], false)).toBe(false);
    expect(canUseArea("peace", ["love"], true)).toBe(true);
  });

  test("a few hand-added Scenes free; unlimited with Plus", () => {
    expect(canAddScene(FREE_BOARD_CARDS - 1, false)).toBe(true);
    expect(canAddScene(FREE_BOARD_CARDS, false)).toBe(false);
    expect(canAddScene(999, true)).toBe(true);
  });
});

describe("numericPrice", () => {
  test("reads StoreKit's numeric price and currency", () => {
    expect(numericPrice({ price: 29.99, currency: "usd" })).toEqual({ amount: 29.99, currency: "USD" });
  });
  test("null without both, or for nonsense", () => {
    expect(numericPrice({ price: 29.99 })).toBeNull();
    expect(numericPrice({ price: null, currency: "USD" })).toBeNull();
    expect(numericPrice({ price: "29.99", currency: "USD" })).toBeNull();
    expect(numericPrice({ price: 0, currency: "USD" })).toBeNull();
    expect(numericPrice({ price: 5, currency: "dollars" })).toBeNull();
    expect(numericPrice(undefined)).toBeNull();
  });
});
