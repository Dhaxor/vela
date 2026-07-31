// Pure purchase decision logic — the Vela adaptation of the module that
// shipped (and was StoreKit-round-trip verified) in Anker. Three products:
// two auto-renewing subscriptions and a lifetime non-consumable.
//
// The store transaction itself is native; what's testable — and where the
// real bugs live — is interpretation: cancel vs failure, whether a restore
// genuinely proves Plus, and whether a price is safe to show.

export const PLUS_SKUS = {
  monthly: "app.vela.manifest.plus.monthly",
  yearly: "app.vela.manifest.plus.yearly",
  lifetime: "app.vela.manifest.plus.lifetime",
} as const;

export type PlanId = keyof typeof PLUS_SKUS;

export const SUBSCRIPTION_SKUS: readonly string[] = [
  PLUS_SKUS.monthly,
  PLUS_SKUS.yearly,
];
export const INAPP_SKUS: readonly string[] = [PLUS_SKUS.lifetime];
export const ALL_SKUS: readonly string[] = [...SUBSCRIPTION_SKUS, ...INAPP_SKUS];

export type PurchaseResult = "purchased" | "cancelled" | "unavailable" | "failed";

/**
 * Did the user cancel, or did the purchase actually fail? A cancel is a
 * normal choice and must never raise an error alert. Match machine-readable
 * signals first; localized message text only as a last resort.
 */
export function isCancellation(error: unknown): boolean {
  if (!error) return false;
  const e = error as {
    code?: string | number;
    message?: string;
    userCancelled?: boolean;
  };

  if (e.userCancelled === true) return true;

  // SKErrorPaymentCancelled is 2.
  const code = typeof e.code === "string" ? e.code.toLowerCase() : e.code;
  if (code === 2) return true;
  if (typeof code === "string" && (code.includes("cancel") || code === "e_user_cancelled")) {
    return true;
  }

  const msg = String(e.message ?? error).toLowerCase();
  return /cancel|abgebrochen|abbruch|annull/.test(msg);
}

export function classifyPurchaseError(error: unknown): PurchaseResult {
  return isCancellation(error) ? "cancelled" : "failed";
}

export interface OwnedPurchase {
  productId?: string;
  id?: string;
  /** A refunded/revoked entitlement carries this; never honour it. */
  revocationDate?: number | string | null;
}

/**
 * Does this restore payload prove Plus? Any of the three SKUs counts —
 * getAvailablePurchases returns active subscriptions and non-consumables —
 * but a revoked purchase must NOT re-grant, or refund-and-keep becomes free.
 */
export function ownsPlus(
  purchases: readonly OwnedPurchase[] | null | undefined
): boolean {
  if (!purchases) return false;
  const skus = new Set<string>(ALL_SKUS);
  return purchases.some((p) => {
    const id = p.productId ?? p.id;
    if (!id || !skus.has(id)) return false;
    return p.revocationDate === undefined || p.revocationDate === null;
  });
}

/** Show a price only when the store handed us a real, non-empty string. */
export function displayablePrice(
  product: { displayPrice?: unknown } | undefined | null
): string | null {
  const p = product?.displayPrice;
  if (typeof p !== "string") return null;
  const trimmed = p.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ------------------------------------------------------- free-tier rules

/** Free tier: one living intent. Unlimited listens are free forever. */
export const FREE_INTENTS = 1;
/** Free tier: three board cards. */
export const FREE_BOARD_CARDS = 3;

export function canCreateIntent(currentCount: number, isPlus: boolean): boolean {
  return isPlus || currentCount < FREE_INTENTS;
}

export function canAddBoardCard(currentCount: number, isPlus: boolean): boolean {
  return isPlus || currentCount < FREE_BOARD_CARDS;
}
