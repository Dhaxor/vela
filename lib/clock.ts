// The one clock. Every context, effect and screen reads time through now(),
// so still mode (web screenshots) can pin it in ONE place. Pure lib functions
// never call it: they take `now: Date` as a parameter.
//
// Still mode pins the clock to 21:04 local time on STILL_DATE, the evening
// ritual moment the store screenshots are staged at. Overrides are honoured
// only in tests and on web (ELEVATE §8), never in a native release build.
import { isStill } from "./still";

/** The still-mode instant, in LOCAL time: Wednesday 21 October 2026, 21:04. */
export const STILL_DATE = { year: 2026, month: 10, day: 21, hour: 21, minute: 4 } as const;

export function stillInstant(): Date {
  const { year, month, day, hour, minute } = STILL_DATE;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

let override: (() => Date) | null = null;

function overridesAllowed(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "test") return true;
  if (typeof Bun !== "undefined") return true;
  try {
    const { Platform } = require("react-native") as typeof import("react-native");
    return Platform.OS === "web";
  } catch {
    return false;
  }
}

/**
 * Pin the clock (tests, web harness). Pass a Date for a frozen instant or a
 * function for a moving one; null restores the live clock. Ignored on native.
 */
export function setClock(next: Date | (() => Date) | null): void {
  if (next === null) {
    override = null;
    return;
  }
  if (!overridesAllowed()) return;
  override = typeof next === "function" ? next : () => new Date(next.getTime());
}

export function now(): Date {
  if (override) return override();
  if (isStill()) return stillInstant();
  return new Date();
}

export function nowMs(): number {
  return now().getTime();
}
