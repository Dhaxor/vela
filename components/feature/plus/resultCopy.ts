// What a purchase or a restore says afterwards (usePlusActions). Pure and
// tested (resultCopy.test.ts). Every PurchaseResult maps to one honest line:
//
// - 'error' means the App Store could not be reached. Nothing was decided and
//   the entitlement is unchanged, so it says 'check your connection', never
//   'no purchase found'.
// - 'failed' after a restore is the genuine none: the App Store answered and
//   this Apple Account owns no Plus.
// - 'purchased' after a buy says nothing yet: the grant arrives through
//   PlusContext's listener and the paywall turns into its thank-you state.
// - 'cancelled' is a normal choice: no message.
import type { PurchaseResult } from "@/lib/purchase";

export type PlusAction = "buy" | "restore";

export interface PlusResultToast {
  readonly message: string;
  readonly tone: "info" | "proof" | "error";
  readonly duration?: number;
}

/** The App Store could not be reached (PurchaseResult 'error'), for a buy and a restore alike. */
export const STORE_UNREACHABLE_COPY = "Couldn't reach the App Store. Check your connection and try again.";

/** A restore the App Store answered with: no Plus on this Apple Account. */
export const NO_PURCHASE_FOUND_COPY = "No Vela Plus purchase was found for this Apple Account.";

export function plusResultToast(action: PlusAction, result: PurchaseResult): PlusResultToast | null {
  if (result === "error") return { message: STORE_UNREACHABLE_COPY, tone: "error", duration: 4500 };
  if (result === "cancelled") return null;
  if (action === "buy") {
    switch (result) {
      case "purchased":
        return null;
      case "unavailable":
        return { message: "Purchases open with the App Store version of Vela. Everything free stays yours.", tone: "info", duration: 4500 };
      case "failed":
        return { message: "That purchase didn't go through. Nothing changed; you can try again.", tone: "error", duration: 4500 };
    }
  }
  switch (result) {
    case "purchased":
      return { message: "Vela Plus is restored on this device.", tone: "proof" };
    case "unavailable":
      return { message: "Restore works in the App Store version of Vela.", tone: "info", duration: 4000 };
    case "failed":
      return { message: NO_PURCHASE_FOUND_COPY, tone: "error", duration: 4000 };
  }
  return null;
}
