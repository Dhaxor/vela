// RELEASE-BLOCKING: a customer who bought LIFETIME (the non-consumable
// app.vela.manifest.plus.lifetime) on 1.0.x keeps Plus in 1.1. Payload-level
// proof against the exact StoreKit shape expo-iap 4.7.2 / openiap 2.4.4 hands
// to JS (lib/fixtures/plus/storekit-payloads.ts documents the Swift source),
// run through 1.1's lib/purchase AND 1.0.1's, frozen byte for byte in
// lib/fixtures/plus/purchase.1.0.1.ts. The provider-level proof (cache, offline,
// restore, listener) is contexts/PlusContext.lifetime.test.tsx.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PurchaseIOS } from "expo-iap";
import {
  PLUS_SKUS,
  UNKNOWN_PLUS,
  hasPlusSubscription,
  ownsPlus,
  plusKnowledgeFrom,
  plusPlanOf,
  restoreOutcome,
  withPurchase,
} from "./purchase";
import * as v101 from "./fixtures/plus/purchase.1.0.1";
import { LIFETIME_FAMILY_SHARED, LIFETIME_PURCHASE, LIFETIME_REFUNDED, MONTHLY_EXPIRED, YEARLY_ACTIVE, overTheBridge } from "./fixtures/plus/storekit-payloads";
import { plusStatusCopy } from "@/components/feature/plus/copy";

const lifetime = overTheBridge(LIFETIME_PURCHASE);

describe("the frozen 1.0.1 purchase logic", () => {
  test("is 15c43a7:lib/purchase.ts byte for byte (git blob 38feca83)", () => {
    const text = fs.readFileSync(path.join(import.meta.dir, "fixtures", "plus", "purchase.1.0.1.ts"), "utf8").replace(/\r\n/g, "\n");
    const blob = createHash("sha1").update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest("hex");
    expect(blob).toBe("38feca839283cbf8a7efb3f30d6aaa583f27f409");
  });
  test("used the same three SKUs as 1.1", () => {
    expect(v101.PLUS_SKUS).toEqual(PLUS_SKUS);
  });
});

describe("the Lifetime payload on iOS (openiap 2.4.4 StoreKitTypesBridge.purchaseIOS)", () => {
  test("is a PurchaseIOS for the lifetime SKU with no expiry, no revocation and no auto-renew", () => {
    const p: PurchaseIOS = lifetime;
    expect(p.productId).toBe(PLUS_SKUS.lifetime);
    expect(p.isAutoRenewing).toBe(false);
    expect(p.purchaseState).toBe("purchased");
    expect(p.platform).toBe("ios");
    // nil optionals are omitted by OpenIapSerialization.encode, never sent as null
    for (const absent of ["expirationDateIOS", "revocationDateIOS", "revocationReasonIOS", "currentPlanId", "renewalInfoIOS", "subscriptionGroupIdIOS", "webOrderLineItemIdIOS"]) {
      expect(Object.prototype.hasOwnProperty.call(p, absent)).toBe(false);
    }
    expect((p as PurchaseIOS & { __typename?: string }).__typename).toBe("PurchaseIOS");
  });
});

describe("(a) a real Lifetime proves Plus", () => {
  test("in 1.1 and in 1.0.1", () => {
    expect(ownsPlus([lifetime])).toBe(true);
    expect(v101.ownsPlus([lifetime])).toBe(true);
  });
  test("shared through Family Sharing, too", () => {
    const shared = overTheBridge(LIFETIME_FAMILY_SHARED);
    expect(ownsPlus([shared])).toBe(true);
    expect(v101.ownsPlus([shared])).toBe(true);
  });
  test("a restore that finds it restores, whether or not the App Store sync answered", () => {
    expect(restoreOutcome([lifetime], null)).toEqual({ result: "purchased", entitlement: true });
    expect(restoreOutcome([lifetime], { code: "network-error", message: "The Internet connection appears to be offline." })).toEqual({ result: "purchased", entitlement: true });
    expect(restoreOutcome([lifetime], { code: "user-cancelled" })).toEqual({ result: "purchased", entitlement: true });
  });
  test("is known as Lifetime, with no subscription to manage", () => {
    expect(plusPlanOf([lifetime])).toBe("lifetime");
    expect(hasPlusSubscription([lifetime])).toBe(false);
    expect(plusKnowledgeFrom([lifetime])).toEqual({ plan: "lifetime", subscriptionActive: false });
  });
});

describe("(b) a refunded Lifetime does not", () => {
  const refunded = overTheBridge(LIFETIME_REFUNDED);
  test("1.1 honours revocationDateIOS", () => {
    expect(refunded.revocationDateIOS).toBeGreaterThan(0);
    expect(ownsPlus([refunded])).toBe(false);
    expect(plusPlanOf([refunded])).toBeNull();
    expect(restoreOutcome([refunded], null)).toEqual({ result: "failed", entitlement: false });
  });
  test("1.0.1 read only `revocationDate`, so it missed it (harmless there: StoreKit never sent it one)", () => {
    // currentEntitlements excludes refunds and Transaction.updates skips revoked
    // transactions (OpenIapModule.swift 2.4.4), so neither 1.0.1 read could see this payload.
    expect(v101.ownsPlus([refunded])).toBe(true);
  });
});

describe("(c) mixed payloads", () => {
  const expiredMonthly = overTheBridge(MONTHLY_EXPIRED);
  test("an expired monthly beside an active Lifetime proves Plus, in either order", () => {
    expect(ownsPlus([expiredMonthly, lifetime])).toBe(true);
    expect(ownsPlus([lifetime, expiredMonthly])).toBe(true);
    expect(v101.ownsPlus([expiredMonthly, lifetime])).toBe(true);
    expect(plusPlanOf([expiredMonthly, lifetime])).toBe("lifetime");
  });
  test("a refunded Lifetime beside a live yearly is still Plus, by subscription", () => {
    const yearly = overTheBridge(YEARLY_ACTIVE);
    expect(ownsPlus([overTheBridge(LIFETIME_REFUNDED), yearly])).toBe(true);
    expect(plusPlanOf([overTheBridge(LIFETIME_REFUNDED), yearly])).toBe("subscription");
  });
  test("Lifetime wins over a live subscription, which stays manageable", () => {
    const both = [overTheBridge(YEARLY_ACTIVE), lifetime];
    expect(plusKnowledgeFrom(both)).toEqual({ plan: "lifetime", subscriptionActive: true });
  });
  test("other apps' products and junk never prove Plus", () => {
    expect(ownsPlus([{ ...lifetime, productId: "com.other.app.lifetime", id: "x" }])).toBe(false);
    expect(ownsPlus([])).toBe(false);
    expect(ownsPlus(null)).toBe(false);
  });
});

describe("a purchase update adds to what is known", () => {
  test("buying Lifetime while subscribed: Lifetime, and the subscription is still there to cancel", () => {
    const subscribed = plusKnowledgeFrom([overTheBridge(YEARLY_ACTIVE)]);
    expect(withPurchase(subscribed, lifetime)).toEqual({ plan: "lifetime", subscriptionActive: true });
  });
  test("a renewal never demotes Lifetime", () => {
    const owner = plusKnowledgeFrom([lifetime]);
    expect(withPurchase(owner, overTheBridge(YEARLY_ACTIVE))).toEqual({ plan: "lifetime", subscriptionActive: true });
  });
  test("a first Lifetime on a cold start; anything else changes nothing", () => {
    expect(withPurchase(UNKNOWN_PLUS, lifetime)).toEqual({ plan: "lifetime", subscriptionActive: null });
    expect(withPurchase(UNKNOWN_PLUS, { productId: "com.other" })).toBe(UNKNOWN_PLUS);
  });
});

describe("Settings tells Lifetime from a subscription (plusStatusCopy)", () => {
  test("a Lifetime owner: 'Lifetime', yours for good, never renewals, no 'Manage subscription'", () => {
    const s = plusStatusCopy("lifetime", false);
    expect(s.label).toContain("Lifetime");
    expect(s.detail).toContain("Yours for good");
    expect(s.manage).toBe(false);
    expect(`${s.label} ${s.detail}`).not.toMatch(/renew|subscri/i);
  });
  test("Lifetime with a subscription still running: says Lifetime covers it, offers the link to cancel", () => {
    const s = plusStatusCopy("lifetime", true);
    expect(s.label).toContain("Lifetime");
    expect(s.manage).toBe(true);
    expect(s.detail).toMatch(/cancel/);
  });
  test("a subscriber, and anyone before StoreKit answers, keeps today's row and the link", () => {
    expect(plusStatusCopy("subscription", true)).toEqual({ label: "Plus is on", detail: "Thank you. Every dream can weave at once.", manage: true });
    expect(plusStatusCopy(null, null)).toEqual(plusStatusCopy("subscription", true));
  });
  test("house style: no em dash, no 'future self'", () => {
    for (const plan of ["lifetime", "subscription", null] as const) {
      for (const sub of [true, false, null]) {
        const s = plusStatusCopy(plan, sub);
        expect(`${s.label} ${s.detail}`).not.toMatch(/—|future self/i);
      }
    }
  });
});
