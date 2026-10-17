// Vela Plus entitlement. Same architecture that shipped and was StoreKit-
// round-trip verified in Anker: the store call sits behind a seam, the grant
// arrives via purchaseUpdatedListener (the only path Apple guarantees for
// deferred/interrupted purchases), and restores are strict about revocation
// (expo-iap's PurchaseIOS reports a refund as revocationDateIOS; ownsPlus).
//
// - Prices: fetched at launch and fetched AGAIN while they are still missing
//   (an offline launch): on foreground, on a short retry, and when the paywall
//   asks (reloadPrices), so the plans never stay without a price for a session.
// - Restore: asks the App Store to sync (restorePurchases, AppStore.sync) before
//   reading what is owned, and tells 'nothing owned' ('failed') apart from 'the
//   App Store could not be reached' ('error', entitlement untouched).
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  canAddDream,
  canUseArea,
  canUseBed,
  classifyPurchaseError,
  displayablePrice,
  FREE_SCENES,
  INAPP_SKUS,
  numericPrice,
  ownsPlus,
  PlanId,
  PLUS_SKUS,
  PurchaseResult,
  SUBSCRIPTION_SKUS,
  type NumericPrice,
} from "@/lib/purchase";
import type { BedId } from "@/lib/audio/types";
import type { FocusId } from "@/lib/focus";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { useUser } from "./UserContext";

const PLUS_KEY = STORAGE_KEYS.plus;

export const PURCHASES_ENABLED = Platform.OS === "ios";

/** Retries of a product fetch that found no prices (then the next foreground or reloadPrices tries again). */
const PRICE_RETRY_MS = [5_000, 20_000, 60_000] as const;

function iap(): typeof import("expo-iap") | null {
  if (!PURCHASES_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-iap") as typeof import("expo-iap");
  } catch {
    return null;
  }
}

interface PlusValue {
  ready: boolean;
  isPlus: boolean;
  /** May another dream become active? `activeDreams` = dreams with status 'active' (ArcValue.canCreateDream applies this). */
  canAddDream: (activeDreams: number) => boolean;
  /** Soundscape bed gate: Night free, the rest Plus. A locked bed falls back to Night. */
  canUseBed: (bedId: BedId) => boolean;
  /** Affirmation area gate: the user's own focus areas free, every area with Plus. */
  canUseArea: (area: FocusId) => boolean;
  /** Hand-added Scenes allowed for free (Infinity with Plus). Proof photos never count. */
  sceneLimit: number;
  /** Localised prices per plan, or null until the store answers. */
  prices: Record<PlanId, string | null>;
  /** Fetch prices again when they are still missing (the paywall calls it on mount). No-op once known. */
  reloadPrices: () => void;
  /** StoreKit's numeric price and currency per plan (the paywall's per-month figure), or null. */
  priceAmounts: Record<PlanId, NumericPrice | null>;
  purchase: (plan: PlanId) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  /** dev/QA only — never reachable from shipped UI */
  setPlusForTesting: (v: boolean) => void;
}

const Ctx = createContext<PlusValue | null>(null);

export function PlusProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isPlus, setIsPlus] = useState(false);
  const [prices, setPrices] = useState<Record<PlanId, string | null>>({
    monthly: null,
    yearly: null,
    lifetime: null,
  });
  const [priceAmounts, setPriceAmounts] = useState<Record<PlanId, NumericPrice | null>>({
    monthly: null,
    yearly: null,
    lifetime: null,
  });

  useEffect(() => {
    let stale = false;
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(PLUS_KEY);
        if (!stale && v === "1") setIsPlus(true);
      } catch {
        // treat unreadable storage as free; restore() recovers it
      } finally {
        if (!stale) setReady(true);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const setEntitlement = useCallback((owned: boolean) => {
    setIsPlus(owned);
    void AsyncStorage.setItem(PLUS_KEY, owned ? "1" : "0").catch(() => {});
  }, []);

  // ------------------------------------------------------------ prices
  const pricesKnown = useRef(false);
  const fetching = useRef(false);
  const alive = useRef(true);
  const retry = useRef<{ timer: ReturnType<typeof setTimeout> | null; attempt: number }>({ timer: null, attempt: 0 });

  /** One product fetch at a time; only while prices are still unknown. */
  const loadProducts = useCallback(async () => {
    const store = iap();
    if (!store || pricesKnown.current || fetching.current) return;
    fetching.current = true;
    let got = false;
    try {
      await store.initConnection();
      const [subs, inapp] = await Promise.all([
        store.fetchProducts({ skus: [...SUBSCRIPTION_SKUS], type: "subs" }),
        store.fetchProducts({ skus: [...INAPP_SKUS], type: "in-app" }),
      ]);
      if (!alive.current) return;
      const all = [...(subs ?? []), ...(inapp ?? [])] as {
        id?: string;
        productId?: string;
        displayPrice?: string;
        price?: number | null;
        currency?: string;
      }[];
      const productFor = (sku: string) => all.find((x) => (x.productId ?? x.id) === sku);
      const priceFor = (sku: string) => displayablePrice(productFor(sku));
      const next = {
        monthly: priceFor(PLUS_SKUS.monthly),
        yearly: priceFor(PLUS_SKUS.yearly),
        lifetime: priceFor(PLUS_SKUS.lifetime),
      };
      setPrices(next);
      setPriceAmounts({
        monthly: numericPrice(productFor(PLUS_SKUS.monthly)),
        yearly: numericPrice(productFor(PLUS_SKUS.yearly)),
        lifetime: numericPrice(productFor(PLUS_SKUS.lifetime)),
      });
      got = Object.values(next).some((v) => v !== null);
    } catch {
      // prices stay null; the paywall omits them rather than inventing any
    } finally {
      fetching.current = false;
    }
    if (got) {
      pricesKnown.current = true;
      retry.current.attempt = 0;
      return;
    }
    // Offline launch (or StoreKit briefly away): try again soon, a few times, then on the next foreground.
    if (alive.current && retry.current.timer === null && retry.current.attempt < PRICE_RETRY_MS.length) {
      const delay = PRICE_RETRY_MS[retry.current.attempt];
      retry.current.attempt += 1;
      retry.current.timer = setTimeout(() => {
        retry.current.timer = null;
        void loadProducts();
      }, delay);
    }
  }, []);

  const reloadPrices = useCallback(() => {
    if (pricesKnown.current) return;
    retry.current.attempt = 0;
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const store = iap();
    if (!store) return;
    let cancelled = false;

    const sub = store.purchaseUpdatedListener(async (p) => {
      if (!ownsPlus([p])) return;
      try {
        await store.finishTransaction({ purchase: p, isConsumable: false });
      } catch {
        // finishing is best-effort; the entitlement still stands
      }
      if (!cancelled) setEntitlement(true);
    });

    const refreshEntitlement = async () => {
      try {
        await store.initConnection();
        const owned = await store.getAvailablePurchases({
          onlyIncludeActiveItemsIOS: true,
        });
        if (!cancelled) setEntitlement(ownsPlus(owned as never));
      } catch {
        // Keep the last verified value when the App Store is temporarily offline.
      }
    };

    void refreshEntitlement();
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void refreshEntitlement();
      // Still no prices (an offline launch): fetch them again now that the app is back.
      if (!pricesKnown.current) {
        retry.current.attempt = 0;
        void loadProducts();
      }
    });

    alive.current = true;
    void loadProducts();

    return () => {
      cancelled = true;
      alive.current = false;
      if (retry.current.timer !== null) clearTimeout(retry.current.timer);
      retry.current.timer = null;
      appStateSub.remove();
      sub?.remove?.();
    };
  }, [setEntitlement, loadProducts]);

  const purchase = useCallback(async (plan: PlanId): Promise<PurchaseResult> => {
    const store = iap();
    if (!store) return "unavailable";
    try {
      await store.initConnection();
      const sku = PLUS_SKUS[plan];
      if ((SUBSCRIPTION_SKUS as readonly string[]).includes(sku)) {
        await store.requestPurchase({
          request: { apple: { sku } },
          type: "subs",
        });
      } else {
        await store.requestPurchase({
          request: { apple: { sku } },
          type: "in-app",
        });
      }
      // The grant arrives in purchaseUpdatedListener.
      return "purchased";
    } catch (e) {
      return classifyPurchaseError(e);
    }
  }, []);

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    const store = iap();
    if (!store) return "unavailable";
    try {
      await store.initConnection();
      // The user tapped Restore: ask the App Store to sync first (AppStore.sync), so stale local
      // entitlements are refreshed. A failed sync still leaves the local entitlements to read.
      try {
        await store.restorePurchases();
      } catch {
        // fall through to what StoreKit already has
      }
      const owned = await store.getAvailablePurchases({
        onlyIncludeActiveItemsIOS: true,
      });
      if (ownsPlus(owned as never)) {
        setEntitlement(true);
        return "purchased";
      }
      // The App Store answered, and this Apple Account owns no Plus.
      setEntitlement(false);
      return "failed";
    } catch {
      // The App Store could not be reached: nothing was decided, the entitlement stays as it is.
      return "error";
    }
  }, [setEntitlement]);

  const focusAreas = useUser().profile?.focusAreas;
  const value = useMemo<PlusValue>(
    () => ({
      ready,
      isPlus,
      canAddDream: (activeDreams: number) => canAddDream(activeDreams, isPlus),
      canUseBed: (bedId: BedId) => canUseBed(bedId, isPlus),
      canUseArea: (area: FocusId) => canUseArea(area, focusAreas ?? [], isPlus),
      sceneLimit: isPlus ? Number.POSITIVE_INFINITY : FREE_SCENES,
      prices,
      reloadPrices,
      priceAmounts,
      purchase,
      restore,
      setPlusForTesting: (v: boolean) => {
        setEntitlement(v);
      },
    }),
    [ready, isPlus, focusAreas, prices, reloadPrices, priceAmounts, purchase, restore, setEntitlement]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlus(): PlusValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlus must be used inside PlusProvider");
  return v;
}
