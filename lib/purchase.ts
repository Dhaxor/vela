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

/**
 * expo-iap (OpenIAP) ErrorCode values that mean the App Store was not reached,
 * so nothing was decided: network-error, service-error, service-timeout,
 * service-disconnected, connection-closed, init-connection, remote-error,
 * sync-error, not-prepared. Older 'E_NETWORK_ERROR' spellings match too.
 */
const UNREACHABLE_CODES: ReadonlySet<string> = new Set([
  "network-error",
  "service-error",
  "service-timeout",
  "service-disconnected",
  "connection-closed",
  "init-connection",
  "remote-error",
  "sync-error",
  "not-prepared",
]);

/** Did the purchase fail because the App Store could not be reached (not because it said no)? */
export function isStoreUnreachable(error: unknown): boolean {
  if (!error) return false;
  const e = error as { code?: string | number; message?: string };
  if (typeof e.code === "string") {
    const code = e.code.toLowerCase().replace(/_/g, "-").replace(/^e-/, "");
    if (UNREACHABLE_CODES.has(code)) return true;
  }
  const msg = String(e.message ?? "").toLowerCase();
  return /network|offline|not connected to the internet|timed out/.test(msg);
}

/** cancelled (a normal choice) · error (the App Store was not reached) · failed (it answered no). */
export function classifyPurchaseError(error: unknown): PurchaseResult {
  if (isCancellation(error)) return "cancelled";
  return isStoreUnreachable(error) ? "error" : "failed";
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

/** Which Plus a payload proves. */
export type PlusPlan = "lifetime" | "subscription";

const proving = (purchases: readonly OwnedPurchase[] | null | undefined, skus: readonly string[]) =>
  (purchases ?? []).some((p) => {
    const id = p.productId ?? p.id;
    return !!id && skus.includes(id) && !revoked(p);
  });

/**
 * 'lifetime' when the payload holds the unrevoked non-consumable (whatever
 * else is there), 'subscription' when only a monthly or yearly proves Plus,
 * null when nothing does. Expiry is StoreKit's job: currentEntitlements
 * (onlyIncludeActiveItemsIOS) never lists an expired subscription.
 */
export function plusPlanOf(purchases: readonly OwnedPurchase[] | null | undefined): PlusPlan | null {
  if (proving(purchases, INAPP_SKUS)) return "lifetime";
  return proving(purchases, SUBSCRIPTION_SKUS) ? "subscription" : null;
}

/** Does the payload hold an unrevoked monthly or yearly subscription (the one thing 'Manage subscription' manages)? */
export function hasPlusSubscription(purchases: readonly OwnedPurchase[] | null | undefined): boolean {
  return proving(purchases, SUBSCRIPTION_SKUS);
}

/**
 * What this session knows about HOW Plus is owned. `plan` and
 * `subscriptionActive` are null until StoreKit has answered (a launch that
 * has not heard back yet, an offline launch, web): the vela.plus.v1 cache
 * says only whether Plus is on.
 */
export interface PlusKnowledge {
  readonly plan: PlusPlan | null;
  readonly subscriptionActive: boolean | null;
}

export const UNKNOWN_PLUS: PlusKnowledge = { plan: null, subscriptionActive: null };

/** A full StoreKit answer (getAvailablePurchases, currentEntitlements). */
export function plusKnowledgeFrom(purchases: readonly OwnedPurchase[] | null | undefined): PlusKnowledge {
  return { plan: plusPlanOf(purchases), subscriptionActive: hasPlusSubscription(purchases) };
}

/** One purchase (purchaseUpdatedListener) adds to what is known; it never takes Lifetime or a subscription away. */
export function withPurchase(prev: PlusKnowledge, purchase: OwnedPurchase): PlusKnowledge {
  const plan = plusPlanOf([purchase]);
  if (plan === "lifetime") return { plan: "lifetime", subscriptionActive: prev.subscriptionActive };
  if (plan === "subscription") return { plan: prev.plan === "lifetime" ? "lifetime" : "subscription", subscriptionActive: true };
  return prev;
}

/**
 * What a restore decided. `syncError` is what the App Store sync threw (null
 * when it answered). Only an answered sync that finds no Plus is the genuine
 * none ('failed', entitlement off). When the sync could not reach the App
 * Store, local entitlements alone cannot prove a none: 'error' (or
 * 'cancelled' when the person dismissed the Apple Account sign-in), and the
 * entitlement stays as it is (null). Plus found locally still restores.
 */
export function restoreOutcome(
  owned: readonly OwnedPurchase[] | null | undefined,
  syncError: unknown
): { result: PurchaseResult; entitlement: boolean | null } {
  if (ownsPlus(owned)) return { result: "purchased", entitlement: true };
  if (syncError !== null && syncError !== undefined) {
    return { result: isCancellation(syncError) ? "cancelled" : "error", entitlement: null };
  }
  return { result: "failed", entitlement: false };
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

// ------------------------------------------------------- where Plus is offered
//
// Every place the app may OFFER Plus decides it here (or through the selectors
// above), so 'never to a Plus member' is one tested rule, not a condition
// repeated per screen (lib/lifetimeOwner.test.ts).

/** The soft Plus nudge after a Star Birth is offered from the 2nd logged proof on (the onboarding seed not counted). */
export const PLUS_NUDGE_MIN_PROOFS = 2;

/** May a Star Birth offer the soft Plus nudge (through the asks arbiter)? Never to a Plus member. */
export function plusNudgeEligible(isPlus: boolean, loggedProofs: number): boolean {
  return !isPlus && loggedProofs >= PLUS_NUDGE_MIN_PROOFS;
}

/** The reader's end-of-chapter zone (app/story/[id]). */
export type ReaderEndZone = "choose" | "open" | "season-complete" | "crossed" | "resting" | "none";

/**
 * May the reader ask for its one soft Plus note? Never to a Plus member, never
 * before Chapter III, only on the chapter being lived (not a reread), and
 * never over the bridge chooser, a resting dream or the season's peak.
 */
export function softPlusNoteDue(input: { isPlus: boolean; chapterNumber: number; isLatest: boolean; zone: ReaderEndZone }): boolean {
  const { isPlus, chapterNumber, isLatest, zone } = input;
  return !isPlus && chapterNumber >= 3 && isLatest && zone !== "choose" && zone !== "resting" && zone !== "season-complete";
}

/**
 * Waking a resting dream asks first ('On the free plan one dream weaves at a
 * time, so <other> will rest') only without Plus, when another dream is
 * active. Narrows `otherActive` for the confirm's copy.
 */
export function wakeNeedsConfirm<T>(isPlus: boolean, otherActive: T | null | undefined): otherActive is T {
  return !isPlus && otherActive !== null && otherActive !== undefined;
}
