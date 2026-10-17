// Purchase and restore with honest, non-blocking feedback (no Alert.alert;
// Alert is a no-op on web). Shared by the paywall and Settings > Vela Plus.
//
// - purchased: the grant arrives through PlusContext's purchase listener, so
//   the caller waits for `isPlus` (see `awaitingGrant`) instead of assuming it.
// - cancelled: a normal choice, no message.
// - unavailable (web, simulator without StoreKit): a calm note that the free
//   loop is untouched.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlus } from "@/contexts/PlusContext";
import type { PlanId, PurchaseResult } from "@/lib/purchase";
import { haptics, useToast } from "@/components/ui";

/** How long to wait for the App Store's grant before saying it is on its way. */
const GRANT_WAIT_MS = 12_000;

export interface PlusActions {
  readonly isPlus: boolean;
  readonly busy: "buy" | "restore" | null;
  /** A purchase went through and the entitlement has not arrived yet. */
  readonly awaitingGrant: boolean;
  buy(plan: PlanId): Promise<PurchaseResult | null>;
  restore(): Promise<PurchaseResult | null>;
}

export function usePlusActions(): PlusActions {
  const plus = usePlus();
  const toast = useToast();
  const [busy, setBusy] = useState<PlusActions["busy"]>(null);
  const [awaitingGrant, setAwaiting] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!awaitingGrant) return;
    if (plus.isPlus) {
      setAwaiting(false);
      return;
    }
    const t = setTimeout(() => {
      setAwaiting(false);
      toast.show({ message: "Your purchase is on its way. Plus turns on as soon as the App Store confirms it.", duration: 4500 });
    }, GRANT_WAIT_MS);
    return () => clearTimeout(t);
  }, [awaitingGrant, plus.isPlus, toast]);

  const run = useCallback(
    async (kind: "buy" | "restore", fn: () => Promise<PurchaseResult>): Promise<PurchaseResult | null> => {
      if (lock.current) return null;
      lock.current = true;
      setBusy(kind);
      try {
        return await fn();
      } catch {
        return "failed";
      } finally {
        lock.current = false;
        setBusy(null);
      }
    },
    []
  );

  const buy = useCallback(
    async (plan: PlanId) => {
      const result = await run("buy", () => plus.purchase(plan));
      if (result === "purchased") {
        haptics.success();
        if (!plus.isPlus) setAwaiting(true);
      } else if (result === "unavailable") {
        toast.show({ message: "Purchases open with the App Store version of Vela. Everything free stays yours.", duration: 4500 });
      } else if (result === "failed") {
        toast.show({ message: "That purchase didn't go through. Nothing changed; you can try again.", tone: "error", duration: 4500 });
      } else if (result === "error") {
        toast.show({ message: "The App Store couldn't be reached. Nothing changed; try again in a moment.", tone: "error", duration: 4500 });
      }
      return result;
    },
    [run, plus, toast]
  );

  const restore = useCallback(async () => {
    const result = await run("restore", plus.restore);
    if (result === "purchased") {
      haptics.success();
      toast.show({ message: "Vela Plus is restored on this device.", tone: "proof" });
    } else if (result === "unavailable") {
      toast.show({ message: "Restore works in the App Store version of Vela.", duration: 4000 });
    } else if (result === "failed") {
      toast.show({ message: "No Vela Plus purchase was found for this Apple Account.", tone: "error", duration: 4000 });
    } else if (result === "error") {
      // Not 'no purchase found': the App Store didn't answer, so nothing was checked.
      toast.show({ message: "The App Store couldn't be reached, so nothing was restored. Try again in a moment.", tone: "error", duration: 4500 });
    }
    return result;
  }, [run, plus, toast]);

  return { isPlus: plus.isPlus, busy, awaitingGrant, buy, restore };
}
