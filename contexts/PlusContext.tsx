// Vela Plus entitlement. Same architecture that shipped and was StoreKit-
// round-trip verified in Anker: the store call sits behind a seam, the grant
// arrives via purchaseUpdatedListener (the only path Apple guarantees for
// deferred/interrupted purchases), and restores are strict about revocation.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ALL_SKUS,
  classifyPurchaseError,
  displayablePrice,
  INAPP_SKUS,
  ownsPlus,
  PlanId,
  PLUS_SKUS,
  PurchaseResult,
  SUBSCRIPTION_SKUS,
} from "@/lib/purchase";

const PLUS_KEY = "vela.plus.v1";

export const PURCHASES_ENABLED = Platform.OS === "ios";

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
  /** Localised prices per plan, or null until the store answers. */
  prices: Record<PlanId, string | null>;
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

  const grant = useCallback(() => {
    setIsPlus(true);
    void AsyncStorage.setItem(PLUS_KEY, "1").catch(() => {});
  }, []);

  useEffect(() => {
    const store = iap();
    if (!store) return;
    let cancelled = false;

    const sub = store.purchaseUpdatedListener(async (p) => {
      try {
        await store.finishTransaction({ purchase: p, isConsumable: false });
      } catch {
        // finishing is best-effort; the entitlement still stands
      }
      if (!cancelled) grant();
    });

    void (async () => {
      try {
        await store.initConnection();
        const [subs, inapp] = await Promise.all([
          store.fetchProducts({ skus: [...SUBSCRIPTION_SKUS], type: "subs" }),
          store.fetchProducts({ skus: [...INAPP_SKUS], type: "in-app" }),
        ]);
        if (cancelled) return;
        const all = [...(subs ?? []), ...(inapp ?? [])] as {
          id?: string;
          productId?: string;
          displayPrice?: string;
        }[];
        const priceFor = (sku: string) =>
          displayablePrice(all.find((x) => (x.productId ?? x.id) === sku));
        setPrices({
          monthly: priceFor(PLUS_SKUS.monthly),
          yearly: priceFor(PLUS_SKUS.yearly),
          lifetime: priceFor(PLUS_SKUS.lifetime),
        });
      } catch {
        // prices stay null; the paywall omits them rather than inventing any
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, [grant]);

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
      const owned = await store.getAvailablePurchases();
      if (ownsPlus(owned as never)) {
        grant();
        return "purchased";
      }
      return "failed";
    } catch {
      return "failed";
    }
  }, [grant]);

  const value = useMemo<PlusValue>(
    () => ({
      ready,
      isPlus,
      prices,
      purchase,
      restore,
      setPlusForTesting: (v: boolean) => {
        setIsPlus(v);
        void AsyncStorage.setItem(PLUS_KEY, v ? "1" : "0").catch(() => {});
      },
    }),
    [ready, isPlus, prices, purchase, restore]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlus(): PlusValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlus must be used inside PlusProvider");
  return v;
}
