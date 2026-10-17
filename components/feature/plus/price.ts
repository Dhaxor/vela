// Plan prices for the paywall (ELEVATE §0.12 and the §8 'paywall price math'
// fix, Guideline 3.1.2):
// - The billed price is StoreKit's own displayPrice string, shown as given.
// - The per-month equivalent is COMPUTED from StoreKit's numeric price and ISO
//   currency with Intl (never a hard-coded '$2.50'), only for the yearly plan,
//   and the screen renders it smaller than the billed price.
// - While prices are null (web, offline, before the store answers) nothing is
//   invented: the plates show a neutral state.
// Pure: no React, no React Native. Tested in price.test.ts.
import type { PlanId } from "@/lib/purchase";

/** A store price as a number plus its ISO 4217 currency ('USD'). */
export interface PlanAmount {
  readonly amount: number;
  readonly currency: string;
}

export type PlanAmounts = Readonly<Record<PlanId, PlanAmount | null>>;

export interface PlanPrice {
  /** What the App Store charges, as StoreKit formats it ('$29.99'). */
  readonly billed: string;
  /** The yearly plan's per-month equivalent ('$2.50'); null for other plans or when the amount is unknown. */
  readonly perMonth: string | null;
}

export const PLAN_ORDER: readonly PlanId[] = ["yearly", "monthly", "lifetime"];

export const NO_AMOUNTS: PlanAmounts = { monthly: null, yearly: null, lifetime: null };

const CURRENCY_RE = /^[A-Za-z]{3}$/;

export function isPlanAmount(value: unknown): value is PlanAmount {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { amount?: unknown; currency?: unknown };
  return typeof v.amount === "number" && Number.isFinite(v.amount) && v.amount > 0 && typeof v.currency === "string" && CURRENCY_RE.test(v.currency);
}

/**
 * Numeric prices from PlusContext (`priceAmounts`, StoreKit's numeric price and
 * currency), validated. On web, before the store answers, or for anything
 * malformed, every plan is null and the paywall stays neutral about the
 * per-month figure.
 */
export function readPlanAmounts(plus: unknown): PlanAmounts {
  const raw = typeof plus === "object" && plus !== null ? (plus as { priceAmounts?: unknown }).priceAmounts : undefined;
  if (typeof raw !== "object" || raw === null) return NO_AMOUNTS;
  const r = raw as Record<string, unknown>;
  return {
    monthly: isPlanAmount(r.monthly) ? r.monthly : null,
    yearly: isPlanAmount(r.yearly) ? r.yearly : null,
    lifetime: isPlanAmount(r.lifetime) ? r.lifetime : null,
  };
}

/** Locale-aware currency text ('$2.50', '2,50 €', '¥250'), or null for a bad amount or currency. */
export function formatMoney(amount: number, currency: string, locale?: string): string | null {
  if (!Number.isFinite(amount) || amount <= 0 || !CURRENCY_RE.test(currency)) return null;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(amount);
  } catch {
    return null;
  }
}

/** The yearly plan's price divided by 12, formatted in its own currency. Every other plan: null. */
export function perMonthEquivalent(plan: PlanId, amount: PlanAmount | null | undefined, locale?: string): string | null {
  if (plan !== "yearly" || !amount || !isPlanAmount(amount)) return null;
  return formatMoney(amount.amount / 12, amount.currency, locale);
}

/**
 * What a plan plate shows, or null for the neutral state. The billed text is
 * StoreKit's display string; without one, the numeric amount formatted by Intl.
 */
export function planPrice(plan: PlanId, display: string | null | undefined, amount: PlanAmount | null | undefined, locale?: string): PlanPrice | null {
  const shown = typeof display === "string" && display.trim() ? display.trim() : amount && isPlanAmount(amount) ? formatMoney(amount.amount, amount.currency, locale) : null;
  if (!shown) return null;
  return { billed: shown, perMonth: perMonthEquivalent(plan, amount, locale) };
}

/**
 * True only when it is honestly so: both amounts known, the same currency, and
 * twelve months of the monthly plan cost more than one year. Drives the
 * 'Best value' tag; with unknown prices there is no tag.
 */
export function yearlyIsBetterValue(amounts: PlanAmounts): boolean {
  const y = amounts.yearly;
  const m = amounts.monthly;
  if (!y || !m || y.currency.toUpperCase() !== m.currency.toUpperCase()) return false;
  return y.amount < m.amount * 12;
}

/**
 * Should the paywall ask PlusContext for prices again (usePlus().reloadPrices)?
 * Yes while any plan still has no price from StoreKit (an offline launch);
 * reloadPrices itself is a no-op once prices are known.
 */
export function pricesMissing(prices: Readonly<Record<PlanId, string | null | undefined>>): boolean {
  return PLAN_ORDER.some((p) => !prices[p]);
}

/** How the plan bills, for the plate's second line and the dock button. */
export const PLAN_COPY: Readonly<Record<PlanId, { readonly label: string; readonly cadence: string; readonly per: string }>> = {
  yearly: { label: "Yearly", cadence: "Billed once a year", per: "a year" },
  monthly: { label: "Monthly", cadence: "Billed each month", per: "a month" },
  lifetime: { label: "Lifetime", cadence: "One payment, yours for good", per: "once" },
};

/** The dock button: 'Unlock Plus · $29.99 a year', or 'Unlock Plus' while prices are unknown. */
export function buyLabel(plan: PlanId, price: PlanPrice | null): string {
  return price ? `Unlock Plus · ${price.billed} ${PLAN_COPY[plan].per}` : "Unlock Plus";
}
