import { describe, expect, test } from "bun:test";
import type { PurchaseResult } from "@/lib/purchase";
import { NO_PURCHASE_FOUND_COPY, STORE_UNREACHABLE_COPY, plusResultToast } from "./resultCopy";

const RESULTS: readonly PurchaseResult[] = ["purchased", "cancelled", "unavailable", "failed", "error"];

describe("plusResultToast", () => {
  test("'error' (the App Store could not be reached) reads the same for a buy and a restore", () => {
    for (const action of ["buy", "restore"] as const) {
      expect(plusResultToast(action, "error")).toEqual({ message: STORE_UNREACHABLE_COPY, tone: "error", duration: 4500 });
    }
    expect(STORE_UNREACHABLE_COPY).toBe("Couldn't reach the App Store. Check your connection and try again.");
  });

  test("'No Vela Plus purchase was found' only for a restore the App Store answered with nothing", () => {
    for (const action of ["buy", "restore"] as const) {
      for (const r of RESULTS) {
        const t = plusResultToast(action, r);
        const genuineNone = action === "restore" && r === "failed";
        expect(t?.message === NO_PURCHASE_FOUND_COPY).toBe(genuineNone);
      }
    }
  });

  test("a cancel is a normal choice; a buy's grant speaks through the paywall", () => {
    expect(plusResultToast("buy", "cancelled")).toBeNull();
    expect(plusResultToast("restore", "cancelled")).toBeNull();
    expect(plusResultToast("buy", "purchased")).toBeNull();
  });

  test("the rest", () => {
    expect(plusResultToast("restore", "purchased")).toEqual({ message: "Vela Plus is restored on this device.", tone: "proof" });
    expect(plusResultToast("buy", "failed")?.message).toBe("That purchase didn't go through. Nothing changed; you can try again.");
    expect(plusResultToast("buy", "unavailable")?.tone).toBe("info");
    expect(plusResultToast("restore", "unavailable")?.message).toBe("Restore works in the App Store version of Vela.");
  });
});
