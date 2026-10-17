// Pure purchase decision logic — the Vela adaptation of the module that
// shipped (and was StoreKit-round-trip verified) in Anker. Three products:
// two auto-renewing subscriptions and a lifetime non-consumable.
//
// The store transaction itself is native; what's testable — and where the
// real bugs live — is interpretation: cancel vs failure, whether a restore
// genuinely proves Plus, and whether a price is safe to show.

import { FREE_BEDS, type BedId } from "./audio/types";
import type { FocusId } from "./focus";

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

/**
 * purchased · cancelled (a normal choice) · unavailable (no StoreKit here) ·
 * failed (the store answered: the purchase failed, or a restore found nothing) ·
 * error (the App Store could not be reached; nothing was decided, the
 * entitlement is unchanged; say 'try again', never 'no purchase found').
 */
export type PurchaseResult = "purchased" | "cancelled" | "unavailable" | "failed" | "error";

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

/**
 * The fields of an expo-iap Purchase that decide ownership. expo-iap 4.7.2's
 * PurchaseIOS reports a refund as `revocationDateIOS` (ms since epoch);
 * `revocationDate` is kept for other payload shapes. Either one revokes.
 */
export interface OwnedPurchase {
  productId?: string;
  id?: string;
  /** A refunded/revoked entitlement (PurchaseIOS); never honour it. */
  revocationDateIOS?: number | null;
  /** Same meaning, other payload shapes. */
  revocationDate?: number | string | null;
}

const revoked = (p: OwnedPurchase) =>
  (p.revocationDateIOS !== undefined && p.revocationDateIOS !== null) || (p.revocationDate !== undefined && p.revocationDate !== null);

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
    return !revoked(p);
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

/** A StoreKit price as numbers (for the per-month figure), or null when the store didn't give both. */
export interface NumericPrice {
  amount: number;
  currency: string;
}

export function numericPrice(product: { price?: unknown; currency?: unknown } | undefined | null): NumericPrice | null {
  const amount = product?.price;
  const currency = product?.currency;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency.trim())) return null;
  return { amount, currency: currency.trim().toUpperCase() };
}

// ------------------------------------------------------- free-tier rules
//
// Free forever: one dream at a time with the whole loop (chapters, bridges,
// proofs, the sky, unlimited listening, backup), the Night bed, the user's own
// focus areas for affirmations, and a few Scenes. Plus adds room: more dreams
// at once, every bed, every affirmation area, unlimited Scenes. Plus never
// locks anything a user made (the Plus-lapse rule lives in contexts/arc.types).

/** Free tier: one ACTIVE dream at a time (resting or releasing frees the slot). Same rule as arc.types FREE_ACTIVE_DREAMS. */
export const FREE_INTENTS = 1;
/** Free tier: Scenes the user adds by hand. Proof photos join Scenes automatically and never count. */
export const FREE_BOARD_CARDS = 3;
export const FREE_SCENES = FREE_BOARD_CARDS;

/** 1.0 name: may another dream start? `currentCount` = active dreams. */
export function canCreateIntent(currentCount: number, isPlus: boolean): boolean {
  return isPlus || currentCount < FREE_INTENTS;
}

export const canAddDream = canCreateIntent;

/** 1.0 name for the Scenes gate. */
export function canAddBoardCard(currentCount: number, isPlus: boolean): boolean {
  return isPlus || currentCount < FREE_SCENES;
}

export const canAddScene = canAddBoardCard;

/** Soundscape beds: Night is free; Rain on Glass, Hearth and Dawn are Plus. */
export function canUseBed(bedId: BedId, isPlus: boolean): boolean {
  return isPlus || FREE_BEDS.includes(bedId);
}

/** Affirmation areas: the user's own focus areas are free; every area with Plus. */
export function canUseArea(area: FocusId, ownAreas: readonly FocusId[], isPlus: boolean): boolean {
  return isPlus || ownAreas.includes(area);
}
