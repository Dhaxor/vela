import { describe, expect, test } from "bun:test";
import {
  NO_AMOUNTS,
  buyLabel,
  formatMoney,
  isPlanAmount,
  perMonthEquivalent,
  planPrice,
  readPlanAmounts,
  yearlyIsBetterValue,
} from "./price";

const usd = (amount: number) => ({ amount, currency: "USD" });
/** Intl uses narrow/no-break spaces in some locales; compare on plain spaces. */
const plain = (s: string | null) => (s === null ? null : s.replace(/[\u00a0\u202f]/g, " "));

describe("per-month equivalent (Guideline 3.1.2)", () => {
  test("is computed from the numeric yearly price with Intl, never hard-coded", () => {
    expect(perMonthEquivalent("yearly", usd(29.99), "en-US")).toBe("$2.50");
    expect(perMonthEquivalent("yearly", usd(23.99), "en-US")).toBe("$2.00");
    expect(plain(perMonthEquivalent("yearly", { amount: 29.99, currency: "EUR" }, "de-DE"))).toBe("2,50 €");
    expect(plain(perMonthEquivalent("yearly", { amount: 24.99, currency: "GBP" }, "en-GB"))).toBe("£2.08");
  });

  test("respects zero-decimal currencies", () => {
    expect(perMonthEquivalent("yearly", { amount: 4800, currency: "JPY" }, "ja-JP")).toMatch(/400$/);
    expect(perMonthEquivalent("yearly", { amount: 4800, currency: "JPY" }, "ja-JP")).not.toContain(".");
  });

  test("only the yearly plan gets one", () => {
    expect(perMonthEquivalent("monthly", usd(4.99), "en-US")).toBeNull();
    expect(perMonthEquivalent("lifetime", usd(69.99), "en-US")).toBeNull();
  });

  test("unknown or broken amounts give nothing", () => {
    expect(perMonthEquivalent("yearly", null, "en-US")).toBeNull();
    expect(perMonthEquivalent("yearly", undefined, "en-US")).toBeNull();
    expect(perMonthEquivalent("yearly", usd(0), "en-US")).toBeNull();
    expect(perMonthEquivalent("yearly", usd(Number.NaN), "en-US")).toBeNull();
    expect(perMonthEquivalent("yearly", { amount: 29.99, currency: "dollars" }, "en-US")).toBeNull();
  });
});

describe("formatMoney", () => {
  test("formats in the store currency", () => {
    expect(formatMoney(69.99, "USD", "en-US")).toBe("$69.99");
    expect(formatMoney(4.99, "usd", "en-US")).toBe("$4.99");
  });
  test("rejects bad input instead of throwing", () => {
    expect(formatMoney(-1, "USD", "en-US")).toBeNull();
    expect(formatMoney(1, "", "en-US")).toBeNull();
    expect(formatMoney(1, "ZZ", "en-US")).toBeNull();
  });
});

describe("planPrice", () => {
  test("neutral (null) while the store has not answered", () => {
    expect(planPrice("yearly", null, null)).toBeNull();
    expect(planPrice("monthly", "  ", null)).toBeNull();
  });

  test("billed text is StoreKit's own string; per-month is computed", () => {
    expect(planPrice("yearly", "$29.99", usd(29.99), "en-US")).toEqual({ billed: "$29.99", perMonth: "$2.50" });
    expect(planPrice("monthly", "$4.99", usd(4.99), "en-US")).toEqual({ billed: "$4.99", perMonth: null });
  });

  test("a display string without an amount shows no per-month figure", () => {
    expect(planPrice("yearly", "$29.99", null, "en-US")).toEqual({ billed: "$29.99", perMonth: null });
  });

  test("an amount without a display string is formatted with Intl", () => {
    expect(planPrice("lifetime", null, usd(69.99), "en-US")).toEqual({ billed: "$69.99", perMonth: null });
  });
});

describe("yearlyIsBetterValue", () => {
  test("true only when both are known, in one currency, and yearly costs less", () => {
    expect(yearlyIsBetterValue({ monthly: usd(4.99), yearly: usd(29.99), lifetime: null })).toBe(true);
    expect(yearlyIsBetterValue({ monthly: usd(2), yearly: usd(29.99), lifetime: null })).toBe(false);
    expect(yearlyIsBetterValue({ monthly: null, yearly: usd(29.99), lifetime: null })).toBe(false);
    expect(yearlyIsBetterValue({ monthly: { amount: 4.99, currency: "EUR" }, yearly: usd(29.99), lifetime: null })).toBe(false);
    expect(yearlyIsBetterValue(NO_AMOUNTS)).toBe(false);
  });
});

describe("readPlanAmounts", () => {
  test("reads PlusContext's numeric prices when present and valid", () => {
    const plus = { priceAmounts: { yearly: usd(29.99), monthly: usd(4.99), lifetime: { amount: "69.99", currency: "USD" } } };
    expect(readPlanAmounts(plus)).toEqual({ yearly: usd(29.99), monthly: usd(4.99), lifetime: null });
  });

  test("anything else is neutral", () => {
    expect(readPlanAmounts({ prices: { yearly: "$29.99" } })).toEqual(NO_AMOUNTS);
    expect(readPlanAmounts(null)).toEqual(NO_AMOUNTS);
    expect(readPlanAmounts({ priceAmounts: null })).toEqual(NO_AMOUNTS);
  });

  test("isPlanAmount", () => {
    expect(isPlanAmount(usd(1))).toBe(true);
    expect(isPlanAmount({ amount: Infinity, currency: "USD" })).toBe(false);
    expect(isPlanAmount("USD 1")).toBe(false);
  });
});

describe("buyLabel", () => {
  test("names the billed price and cadence, or stays neutral", () => {
    expect(buyLabel("yearly", { billed: "$29.99", perMonth: "$2.50" })).toBe("Unlock Plus · $29.99 a year");
    expect(buyLabel("monthly", { billed: "$4.99", perMonth: null })).toBe("Unlock Plus · $4.99 a month");
    expect(buyLabel("lifetime", { billed: "$69.99", perMonth: null })).toBe("Unlock Plus · $69.99 once");
    expect(buyLabel("yearly", null)).toBe("Unlock Plus");
  });
});
