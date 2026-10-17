// Layout QA only: `?demoPrices=1` on the web DEV build fills the plates with
// sample US prices so the priced state can be checked on react-native-web,
// where StoreKit never answers. Never active in a release build (__DEV__ is
// false), never on iOS, and never without the explicit query parameter.
import { Platform } from "react-native";
import type { PlanId } from "@/lib/purchase";
import type { PlanAmounts } from "./price";

export function demoPricesRequested(): boolean {
  if (typeof __DEV__ === "undefined" || !__DEV__ || Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("demoPrices") === "1";
  } catch {
    return false;
  }
}

export const DEMO_PRICES: { readonly display: Readonly<Record<PlanId, string>>; readonly amounts: PlanAmounts } = {
  display: { monthly: "$4.99", yearly: "$29.99", lifetime: "$69.99" },
  amounts: {
    monthly: { amount: 4.99, currency: "USD" },
    yearly: { amount: 29.99, currency: "USD" },
    lifetime: { amount: 69.99, currency: "USD" },
  },
};
