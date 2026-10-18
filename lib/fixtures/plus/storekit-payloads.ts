// StoreKit payloads EXACTLY as expo-iap 4.7.2 / openiap-apple 2.4.4 hands them
// to JS on iOS, for the Plus entitlement tests (lib/purchase.lifetime.test.ts,
// contexts/PlusContext.lifetime.test.tsx). 1.0.1 and 1.1 ship the same
// versions (package-lock: expo-iap 4.7.2; openiap-versions.json apple 2.4.4).
//
// Where the shape comes from (github.com/hyodotdev/openiap, tag 2.4.4):
// - packages/apple/Sources/Helpers/StoreKitTypesBridge.swift purchaseIOS(from:):
//   expirationDateIOS = transaction.expirationDate (nil for a non-consumable),
//   revocationDateIOS = transaction.revocationDate (set only for a refund),
//   isAutoRenewing = renewalInfo?.willAutoRenew ?? false (renewal info exists
//   only for .autoRenewable, so a lifetime is always false), productId =
//   transaction.productID, currentPlanId = productId for subscriptions only,
//   purchaseState always 'purchased', revocationReasonIOS = the reason's raw
//   value as text ('0' other, '1' developer issue).
// - OpenIapSerialization.encode: a synthesized JSONEncoder, so every nil
//   optional is OMITTED (never null), plus `__typename: 'PurchaseIOS'`.
// - OpenIapModule.getAvailablePurchases: onlyIncludeActiveItemsIOS reads
//   Transaction.currentEntitlements (every non-consumable the account owns,
//   refunds excluded by StoreKit) and also skips anything with an
//   expirationDate in the past. Transaction.updates skips revoked
//   transactions before purchaseUpdatedListener sees them.
import type { PurchaseIOS } from "expo-iap";

type Payload = PurchaseIOS & { __typename: "PurchaseIOS" };

const LIFETIME_SKU = "app.vela.manifest.plus.lifetime";
const MONTHLY_SKU = "app.vela.manifest.plus.monthly";
const YEARLY_SKU = "app.vela.manifest.plus.yearly";

/** 5 Oct 2026 20:51 BST: the 1.0.x lifetime purchase (Production, UK storefront). */
const BOUGHT = Date.UTC(2026, 9, 5, 19, 51, 7, 412);

/** A 1.0.x customer's Lifetime, from getAvailablePurchases({ onlyIncludeActiveItemsIOS: true }) or purchaseUpdatedListener. */
export const LIFETIME_PURCHASE: Payload = {
  __typename: "PurchaseIOS",
  appBundleIdIOS: "app.vela.manifest",
  countryCodeIOS: "GBR",
  currencyCodeIOS: "GBP",
  currencySymbolIOS: "£",
  environmentIOS: "Production",
  id: "2000001023456789",
  isAutoRenewing: false,
  isUpgradedIOS: false,
  originalTransactionDateIOS: BOUGHT,
  originalTransactionIdentifierIOS: "2000001023456789",
  ownershipTypeIOS: "purchased",
  platform: "ios",
  productId: LIFETIME_SKU,
  purchaseState: "purchased",
  purchaseToken: "eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlFTURDQ0E3YWdBd0lCQWdJUWZUbGZkMGZOdkZXdnpDMVlJQU5zWGpBS0JnZ3Foa2pPUFFRREF6QjFNVVF3UWdZRFZRUURERHRCY0hCc1pTQlhiM0pzWkhkcFpHVWdSR1YyWld4dmNHVnlJRkpsYkdGMGFXOXVjeUJEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURUxNQWtHQTFVRUN3d0NSell4RXpBUkJnTlZCQW9NQ2tGd2NHeGxJRWx1WXk0eEN6QUpCZ05WQkFZVEFsVlQiXX0.eyJ0cmFuc2FjdGlvbklkIjoiMjAwMDAwMTAyMzQ1Njc4OSIsInByb2R1Y3RJZCI6ImFwcC52ZWxhLm1hbmlmZXN0LnBsdXMubGlmZXRpbWUiLCJ0eXBlIjoiTm9uLUNvbnN1bWFibGUifQ.c2lnbmF0dXJl",
  quantity: 1,
  quantityIOS: 1,
  reasonIOS: "purchase",
  reasonStringRepresentationIOS: "purchase",
  store: "apple",
  storefrontCountryCodeIOS: "GBR",
  transactionDate: BOUGHT,
  transactionId: "2000001023456789",
  transactionReasonIOS: "PURCHASE",
};

/** The same Lifetime shared through Family Sharing (StoreKit lists it for every family member). */
export const LIFETIME_FAMILY_SHARED: Payload = {
  ...LIFETIME_PURCHASE,
  id: "2000001023999001",
  transactionId: "2000001023999001",
  originalTransactionIdentifierIOS: "2000001023999001",
  ownershipTypeIOS: "family_shared",
};

/** The Lifetime after Apple refunded it (Transaction.all only: currentEntitlements and Transaction.updates never deliver it). */
export const LIFETIME_REFUNDED: Payload = {
  ...LIFETIME_PURCHASE,
  revocationDateIOS: Date.UTC(2026, 9, 9, 10, 2, 44, 18),
  revocationReasonIOS: "0",
  reasonIOS: "other",
  reasonStringRepresentationIOS: "other",
  transactionReasonIOS: "OTHER",
};

/** A monthly that lapsed before the Lifetime was bought (Transaction.all lists it; currentEntitlements would not). */
export const MONTHLY_EXPIRED: Payload = {
  __typename: "PurchaseIOS",
  appBundleIdIOS: "app.vela.manifest",
  countryCodeIOS: "GBR",
  currencyCodeIOS: "GBP",
  currencySymbolIOS: "£",
  currentPlanId: MONTHLY_SKU,
  environmentIOS: "Production",
  expirationDateIOS: Date.UTC(2026, 9, 3, 19, 0, 0, 0),
  id: "2000000998877665",
  isAutoRenewing: false,
  isUpgradedIOS: false,
  originalTransactionDateIOS: Date.UTC(2026, 8, 3, 19, 0, 0, 0),
  originalTransactionIdentifierIOS: "2000000998877665",
  ownershipTypeIOS: "purchased",
  platform: "ios",
  productId: MONTHLY_SKU,
  purchaseState: "purchased",
  purchaseToken: "eyJhbGciOiJFUzI1NiJ9.eyJwcm9kdWN0SWQiOiJhcHAudmVsYS5tYW5pZmVzdC5wbHVzLm1vbnRobHkifQ.c2ln",
  quantity: 1,
  quantityIOS: 1,
  reasonIOS: "purchase",
  reasonStringRepresentationIOS: "purchase",
  renewalInfoIOS: { autoRenewPreference: MONTHLY_SKU, willAutoRenew: false, expirationReason: "VOLUNTARY" },
  store: "apple",
  storefrontCountryCodeIOS: "GBR",
  subscriptionGroupIdIOS: "21771234",
  transactionDate: Date.UTC(2026, 8, 3, 19, 0, 0, 0),
  transactionId: "2000000998877665",
  transactionReasonIOS: "PURCHASE",
  webOrderLineItemIdIOS: "2000000099887766",
};

/** A live yearly subscription (renewing). */
export const YEARLY_ACTIVE: Payload = {
  ...MONTHLY_EXPIRED,
  currentPlanId: YEARLY_SKU,
  expirationDateIOS: Date.UTC(2027, 9, 1, 9, 0, 0, 0),
  id: "2000001011223344",
  isAutoRenewing: true,
  originalTransactionDateIOS: Date.UTC(2026, 9, 1, 9, 0, 0, 0),
  originalTransactionIdentifierIOS: "2000001011223344",
  productId: YEARLY_SKU,
  renewalInfoIOS: { autoRenewPreference: YEARLY_SKU, willAutoRenew: true, renewalDate: Date.UTC(2027, 9, 1, 9, 0, 0, 0) },
  transactionDate: Date.UTC(2026, 9, 1, 9, 0, 0, 0),
  transactionId: "2000001011223344",
  webOrderLineItemIdIOS: "2000000099880001",
};

/** The JS side receives JSON through the native bridge: a deep copy, exactly as delivered. */
export const overTheBridge = <T>(p: T): T => JSON.parse(JSON.stringify(p)) as T;
