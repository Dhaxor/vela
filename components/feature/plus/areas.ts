// How many affirmation areas are free. Plus opens all six (BENEFITS 'Every
// affirmation area'); the gate itself is lib/purchase canUseArea, which frees
// the profile's own focusAreas. Those are chosen by the person, so the places
// that WRITE them (First Light's focus step and Settings > Your areas) keep a
// free profile to FREE_AREA_LIMIT; otherwise ticking all six in Settings
// would give away the Plus benefit. Nothing is ever taken away: a profile that
// already holds more (1.0, or a lapsed Plus member) keeps what it has. Pure.
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";

/** Areas a free profile may hold. */
export const FREE_AREA_LIMIT = 3;

/** The most areas this profile may hold: all six with Plus, else three or what it already holds. */
export function areaAllowance(current: readonly FocusId[], isPlus: boolean): number {
  return isPlus ? FOCUS_AREAS.length : Math.max(FREE_AREA_LIMIT, new Set(current).size);
}

export type AreaTap =
  | { readonly kind: "save"; readonly areas: FocusId[] }
  /** Removing the last area: keep at least one. */
  | { readonly kind: "keep-one" }
  /** Adding past the free allowance: offer Plus instead of saving. */
  | { readonly kind: "plus" };

/** A tap on an area chip in Settings, against an allowance from areaAllowance(). */
export function tapArea(current: readonly FocusId[], area: FocusId, allowance: number): AreaTap {
  if (current.includes(area)) {
    const areas = current.filter((a) => a !== area);
    return areas.length === 0 ? { kind: "keep-one" } : { kind: "save", areas };
  }
  if (current.length >= allowance) return { kind: "plus" };
  return { kind: "save", areas: [...current, area] };
}

/** The toast when a free profile reaches its allowance. */
export function areaLimitCopy(allowance: number): string {
  return allowance <= FREE_AREA_LIMIT
    ? "Three areas are free. Plus opens all six."
    : "The areas you have stay free. Plus opens all six.";
}
