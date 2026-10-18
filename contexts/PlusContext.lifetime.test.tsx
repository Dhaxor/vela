// RELEASE-BLOCKING: the 1.0.x LIFETIME owner's first launches of 1.1, through
// the REAL PlusProvider (contexts/PlusContext.tsx, unmodified) rendered by the
// real React 19 / react-dom client. Only the seams are stand-ins: expo-iap
// (fed the exact openiap 2.4.4 payloads, lib/fixtures/plus/storekit-payloads),
// AsyncStorage (an in-memory disk holding 1.0.1's vela.plus.v1), react-native
// (iOS, AppState) and useUser. Payload-level proof: lib/purchase.lifetime.test.ts.
import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import React, { act } from "react";
import { BEDS, type BedId } from "@/lib/audio/types";
import { FOCUS_AREAS } from "@/lib/focus";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { LIFETIME_PURCHASE, LIFETIME_REFUNDED, MONTHLY_EXPIRED, YEARLY_ACTIVE, overTheBridge } from "@/lib/fixtures/plus/storekit-payloads";

/* ------------------------------------------------------------------ seams */

const PLUS_KEY = STORAGE_KEYS.plus;
expect(PLUS_KEY).toBe("vela.plus.v1"); // 1.0.1's key, unchanged

/** The phone's AsyncStorage: what 1.0.1 left behind, and every write 1.1 makes. */
const disk = new Map<string, string>();
const writes: [string, string][] = [];
mock.module("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      writes.push([k, v]);
      disk.set(k, v);
    },
  },
}));

const appStateHandlers = new Set<(s: string) => void>();
mock.module("react-native", () => ({
  Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default },
  AppState: {
    addEventListener: (_event: string, handler: (s: string) => void) => {
      appStateHandlers.add(handler);
      return { remove: () => appStateHandlers.delete(handler) };
    },
  },
}));

mock.module("./UserContext", () => ({ useUser: () => ({ ready: true, profile: { focusAreas: ["career", "love"] } }) }));

type Fn = (...args: never[]) => unknown;
/** expo-iap as the app calls it; each test swaps the behaviour behind it. */
const PRODUCTS = {
  subs: [
    { id: "app.vela.manifest.plus.monthly", displayPrice: "£4.99", price: 4.99, currency: "GBP" },
    { id: "app.vela.manifest.plus.yearly", displayPrice: "£29.99", price: 29.99, currency: "GBP" },
  ],
  "in-app": [{ id: "app.vela.manifest.plus.lifetime", displayPrice: "£69.99", price: 69.99, currency: "GBP" }],
};
function freshStore() {
  return {
    listeners: [] as ((p: unknown) => void)[],
    initConnection: mock(async () => true),
    getAvailablePurchases: mock(async (_o?: unknown): Promise<unknown[]> => []),
    fetchProducts: mock(async ({ type }: { type: "subs" | "in-app" }) => PRODUCTS[type]),
    finishTransaction: mock(async (_a: unknown) => true),
    requestPurchase: mock(async (_a: unknown) => null),
    syncIOS: mock(async () => true),
    restorePurchases: mock(async () => undefined),
  };
}
let store = freshStore();
const call = (name: keyof ReturnType<typeof freshStore>) => (...args: unknown[]) => (store[name] as unknown as Fn)(...(args as never[]));
mock.module("expo-iap", () => ({
  initConnection: call("initConnection"),
  getAvailablePurchases: call("getAvailablePurchases"),
  fetchProducts: call("fetchProducts"),
  finishTransaction: call("finishTransaction"),
  requestPurchase: call("requestPurchase"),
  syncIOS: call("syncIOS"),
  restorePurchases: call("restorePurchases"),
  purchaseUpdatedListener: (fn: (p: unknown) => void) => {
    store.listeners.push(fn);
    return { remove: () => (store.listeners = store.listeners.filter((l) => l !== fn)) };
  },
}));

const { PlusProvider, usePlus } = await import("./PlusContext");
type Plus = ReturnType<typeof usePlus>;

/* ------------------------------------------------------------------ react-dom on a bare container */

/** The slice of react-dom/client used here (the repo has no @types/react-dom). */
interface Root {
  render(node: React.ReactNode): void;
  unmount(): void;
}
const REACT_DOM_CLIENT: string = "react-dom/client";
const saved = { window: (globalThis as { window?: unknown }).window, act: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT };
let createRoot: (c: unknown) => Root;
beforeAll(async () => {
  // react-dom's client needs a window and a container; the tree renders no host nodes.
  class HTMLIFrameElement {}
  const win: Record<string, unknown> = { event: undefined, HTMLIFrameElement, getSelection: () => null };
  const doc: Record<string, unknown> = { nodeType: 9, defaultView: win, activeElement: null, body: null, addEventListener() {}, removeEventListener() {} };
  win.document = doc;
  Object.assign(globalThis, { window: win, IS_REACT_ACT_ENVIRONMENT: true });
  createRoot = ((await import(REACT_DOM_CLIENT)) as { createRoot: (c: unknown) => Root }).createRoot;
});
afterAll(async () => {
  if (mounted) await act(async () => mounted!.unmount());
  mounted = null;
  Object.assign(globalThis, { window: saved.window, IS_REACT_ACT_ENVIRONMENT: saved.act });
  if (saved.window === undefined) delete (globalThis as { window?: unknown }).window;
});

const container = () => ({
  nodeType: 1,
  nodeName: "DIV",
  tagName: "DIV",
  namespaceURI: "http://www.w3.org/1999/xhtml",
  ownerDocument: (globalThis as unknown as { window: { document: unknown } }).window.document,
  childNodes: [],
  firstChild: null,
  addEventListener() {},
  removeEventListener() {},
  appendChild() {},
  removeChild() {},
});

/** Let promises and zero-delay timers run (StoreKit and storage answer asynchronously). */
const settle = () =>
  act(async () => {
    for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
  });

let mounted: Root | null = null;
async function launch() {
  const seen: Plus[] = [];
  function Probe() {
    seen.push(usePlus());
    return null;
  }
  mounted = createRoot(container());
  await act(async () => mounted!.render(<PlusProvider><Probe /></PlusProvider>));
  await settle();
  return { plus: () => seen[seen.length - 1], seen };
}
const foreground = async () => {
  await act(async () => appStateHandlers.forEach((h) => h("active")));
  await settle();
};
const emitPurchase = async (p: unknown) => {
  await act(async () => store.listeners.forEach((l) => l(p)));
  await settle();
};
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

const lifetime = overTheBridge(LIFETIME_PURCHASE);
const OFFLINE = { code: "network-error", message: "The Internet connection appears to be offline." };

beforeEach(async () => {
  if (mounted) await act(async () => mounted!.unmount());
  mounted = null;
  disk.clear();
  writes.length = 0;
  appStateHandlers.clear();
  store = freshStore();
});

/** The 1.0.1 owner's phone: Plus cached by 1.0.x. */
const updatedFrom101 = () => disk.set(PLUS_KEY, "1");

/* ------------------------------------------------------------------ first launch after the update */

describe("(d) the cached vela.plus.v1 = '1' shows Plus before StoreKit answers", () => {
  test("ready and Plus from the very first ready render, while StoreKit is still out", async () => {
    updatedFrom101();
    const answer = deferred<unknown[]>();
    store.getAvailablePurchases = mock(() => answer.promise);
    const { plus, seen } = await launch();

    expect(store.getAvailablePurchases).toHaveBeenCalledWith({ onlyIncludeActiveItemsIOS: true });
    const firstReady = seen.find((v) => v.ready)!;
    expect(firstReady.isPlus).toBe(true); // ArcProvider waits for ready: no free frame ever reaches a screen
    expect(plus().isPlus).toBe(true);
    expect(plus().plan).toBeNull(); // how it is owned is not known until StoreKit answers
    expect(writes).toEqual([]); // nothing rewritten yet

    // (f) StoreKit answers with the Lifetime
    await act(async () => answer.resolve([lifetime]));
    await settle();
    expect(plus().isPlus).toBe(true);
    expect(plus().plan).toBe("lifetime");
    expect(plus().subscriptionActive).toBe(false);
    expect(disk.get(PLUS_KEY)).toBe("1");
  });
});

describe("(e) it stays Plus when StoreKit cannot be reached", () => {
  test("initConnection fails (offline launch): Plus, and the cache is never set to '0'", async () => {
    updatedFrom101();
    store.initConnection = mock(async () => {
      throw { code: "init-connection", message: "offline" };
    });
    const { plus } = await launch();
    expect(plus().isPlus).toBe(true);
    await foreground();
    expect(plus().isPlus).toBe(true);
    expect(writes.filter(([k]) => k === PLUS_KEY)).toEqual([]);
    expect(disk.get(PLUS_KEY)).toBe("1");
  });

  test("getAvailablePurchases throws: Plus; back online, StoreKit confirms the Lifetime", async () => {
    updatedFrom101();
    store.getAvailablePurchases = mock(async () => {
      throw OFFLINE;
    });
    const { plus } = await launch();
    expect(plus().isPlus).toBe(true);
    expect(disk.get(PLUS_KEY)).toBe("1");

    store.getAvailablePurchases = mock(async () => [lifetime]);
    await foreground();
    expect(plus().isPlus).toBe(true);
    expect(plus().plan).toBe("lifetime");
  });
});

describe("(f) StoreKit returning the Lifetime makes or keeps Plus", () => {
  test("keeps it: the 1.0.1 cache plus the real payload", async () => {
    updatedFrom101();
    store.getAvailablePurchases = mock(async () => [lifetime]);
    const { plus } = await launch();
    expect(plus().isPlus).toBe(true);
    expect(plus().plan).toBe("lifetime");
    expect(disk.get(PLUS_KEY)).toBe("1");
  });

  test("makes it: no cache (a reinstall, a new phone, a backup import), StoreKit alone grants Plus", async () => {
    store.getAvailablePurchases = mock(async () => [lifetime]);
    const { plus } = await launch();
    expect(plus().isPlus).toBe(true);
    expect(disk.get(PLUS_KEY)).toBe("1");
  });

  test("mixed: an expired monthly next to the Lifetime", async () => {
    store.getAvailablePurchases = mock(async () => [overTheBridge(MONTHLY_EXPIRED), lifetime]);
    const { plus } = await launch();
    expect(plus().isPlus).toBe(true);
    expect(plus().plan).toBe("lifetime");
  });

  test("control: StoreKit answering with nothing does turn Plus off (the harness can see a loss)", async () => {
    updatedFrom101();
    store.getAvailablePurchases = mock(async () => []);
    const { plus } = await launch();
    expect(plus().isPlus).toBe(false);
    expect(disk.get(PLUS_KEY)).toBe("0");
  });

  test("a refunded Lifetime is not Plus", async () => {
    updatedFrom101();
    store.getAvailablePurchases = mock(async () => [overTheBridge(LIFETIME_REFUNDED)]);
    const { plus } = await launch();
    expect(plus().isPlus).toBe(false);
  });
});

describe("(g) Restore with the Lifetime", () => {
  test("'purchased', after asking the App Store to sync", async () => {
    updatedFrom101();
    store.getAvailablePurchases = mock(async () => [lifetime]);
    const { plus } = await launch();
    let result: unknown;
    await act(async () => {
      result = await plus().restore();
    });
    expect(result).toBe("purchased");
    expect(store.syncIOS).toHaveBeenCalledTimes(1);
    expect(plus().isPlus).toBe(true);
    expect(plus().plan).toBe("lifetime");
  });

  test("still 'purchased' when the sync could not reach the App Store, or the sign-in was dismissed", async () => {
    for (const syncError of [OFFLINE, { code: "user-cancelled" }]) {
      if (mounted) await act(async () => mounted!.unmount());
      store = freshStore();
      store.getAvailablePurchases = mock(async () => [lifetime]);
      store.syncIOS = mock(async () => {
        throw syncError;
      });
      const { plus } = await launch();
      let result: unknown;
      await act(async () => {
        result = await plus().restore();
      });
      expect(result).toBe("purchased");
      expect(plus().isPlus).toBe(true);
    }
  });

  test("from a free-looking start (no cache, StoreKit slow at launch): restore turns Plus on", async () => {
    store.getAvailablePurchases = mock(async () => {
      throw OFFLINE;
    });
    const { plus } = await launch();
    expect(plus().isPlus).toBe(false);
    store.getAvailablePurchases = mock(async () => [lifetime]);
    let result: unknown;
    await act(async () => {
      result = await plus().restore();
    });
    expect(result).toBe("purchased");
    expect(plus().isPlus).toBe(true);
    expect(disk.get(PLUS_KEY)).toBe("1");
  });
});

describe("(h) purchaseUpdatedListener with the Lifetime grants Plus", () => {
  test("grants, finishes the transaction as a non-consumable, caches '1'", async () => {
    const { plus } = await launch();
    expect(plus().isPlus).toBe(false);
    await emitPurchase(lifetime);
    expect(plus().isPlus).toBe(true);
    expect(plus().plan).toBe("lifetime");
    expect(store.finishTransaction).toHaveBeenCalledWith({ purchase: lifetime, isConsumable: false });
    expect(disk.get(PLUS_KEY)).toBe("1");
  });

  test("still grants when finishTransaction fails (best effort)", async () => {
    store.finishTransaction = mock(async () => {
      throw OFFLINE;
    });
    const { plus } = await launch();
    await emitPurchase(lifetime);
    expect(plus().isPlus).toBe(true);
  });

  test("a revoked payload grants nothing and is not finished", async () => {
    const { plus } = await launch();
    await emitPurchase(overTheBridge(LIFETIME_REFUNDED));
    expect(plus().isPlus).toBe(false);
    expect(store.finishTransaction).not.toHaveBeenCalled();
  });

  test("a read that began before the grant cannot take it back", async () => {
    const launchRead = deferred<unknown[]>();
    store.getAvailablePurchases = mock(() => launchRead.promise);
    const { plus } = await launch();
    await emitPurchase(lifetime); // the purchase lands while the launch read is still out
    expect(plus().isPlus).toBe(true);
    await act(async () => launchRead.resolve([])); // the read's answer predates the transaction
    await settle();
    expect(plus().isPlus).toBe(true);
    expect(disk.get(PLUS_KEY)).toBe("1");
    // The next foreground reads again and is believed.
    store.getAvailablePurchases = mock(async () => [lifetime]);
    await foreground();
    expect(plus().isPlus).toBe(true);
  });

  test("buying Lifetime while a yearly runs: Lifetime, and the yearly is still there to cancel", async () => {
    store.getAvailablePurchases = mock(async () => [overTheBridge(YEARLY_ACTIVE)]);
    const { plus } = await launch();
    expect(plus().plan).toBe("subscription");
    await emitPurchase(lifetime);
    expect(plus().plan).toBe("lifetime");
    expect(plus().subscriptionActive).toBe(true);
  });
});

describe("(i) every Plus gate opens for the Lifetime owner, through the provider", () => {
  const BED_IDS = Object.keys(BEDS) as BedId[];
  test("from the 1.0.1 cache alone (before StoreKit), and after it confirms", async () => {
    updatedFrom101();
    const answer = deferred<unknown[]>();
    store.getAvailablePurchases = mock(() => answer.promise);
    const { plus } = await launch();
    const check = () => {
      const p = plus();
      expect([1, 2, 3, 10].every((n) => p.canAddDream(n))).toBe(true);
      expect(BED_IDS.every((b) => p.canUseBed(b))).toBe(true);
      expect(FOCUS_AREAS.every((a) => p.canUseArea(a.id))).toBe(true);
      expect(p.sceneLimit).toBe(Number.POSITIVE_INFINITY);
    };
    check();
    await act(async () => answer.resolve([lifetime]));
    await settle();
    check();
  });

  test("control: without Plus the same gates are closed", async () => {
    const { plus } = await launch();
    const p = plus();
    expect(p.canAddDream(1)).toBe(false);
    expect(p.canUseBed("rain")).toBe(false);
    expect(p.canUseArea("health")).toBe(false);
    expect(p.sceneLimit).toBe(3);
  });
});
