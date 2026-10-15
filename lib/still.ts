// Still mode: every animation renders at its end state and the clock is pinned
// (lib/clock.ts), so web screenshots are deterministic.
//
// It is requested with ?still=1 in the URL or EXPO_PUBLIC_STILL=1 at bundle
// time, and HONOURED only on web, and only in a dev bundle or when the URL
// asks for it explicitly (ELEVATE §8). A release build that accidentally
// inlines EXPO_PUBLIC_STILL therefore still runs on a live clock.

export interface StillEnv {
  /** Platform.OS */
  readonly platform: string;
  /** __DEV__ */
  readonly dev: boolean;
  /** window.location.search, or '' off web. */
  readonly search: string;
  /** process.env.EXPO_PUBLIC_STILL */
  readonly envFlag: string | undefined;
}

const TRUTHY = new Set(["1", "true", "yes"]);

/** True when the query string carries still=1 (or true/yes). */
export function urlRequestsStill(search: string): boolean {
  const query = search.startsWith("?") ? search.slice(1) : search;
  for (const part of query.split("&")) {
    const [key, value = ""] = part.split("=");
    if (decodeURIComponent(key) === "still") return TRUTHY.has(decodeURIComponent(value).toLowerCase());
  }
  return false;
}

/** Pure decision, unit-tested. */
export function resolveStill(env: StillEnv): boolean {
  if (env.platform !== "web") return false;
  if (urlRequestsStill(env.search)) return true;
  return env.dev && TRUTHY.has((env.envFlag ?? "").toLowerCase());
}

let cached: boolean | null = null;

/**
 * Resolved once per page load, so the flag survives client-side navigation
 * that drops the query string.
 */
export function isStill(): boolean {
  if (cached !== null) return cached;
  cached = false;
  try {
    const { Platform } = require("react-native") as typeof import("react-native");
    const search = Platform.OS === "web" && typeof window !== "undefined" ? window.location?.search ?? "" : "";
    cached = resolveStill({
      platform: Platform.OS,
      dev: typeof __DEV__ !== "undefined" && __DEV__,
      search,
      envFlag: process.env.EXPO_PUBLIC_STILL,
    });
  } catch {
    // No React Native (bun tests): never still.
  }
  return cached;
}

/** Test seam: forget the cached decision. */
export function resetStillForTests(): void {
  cached = null;
}
