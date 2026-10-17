import { describe, expect, test } from "bun:test";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";
import { canUseArea } from "@/lib/purchase";
import { toggleFocus } from "@/components/feature/onboarding/logic";
import { FREE_AREA_LIMIT, areaAllowance, areaLimitCopy, tapArea } from "./areas";

const ALL = FOCUS_AREAS.map((f) => f.id);

/** Tap every chip, in every order a person might, as many times as they like. */
function tapEverything(start: FocusId[], isPlus: boolean): FocusId[] {
  let areas = [...start];
  const allowance = areaAllowance(start, isPlus);
  for (let round = 0; round < 3; round++) {
    for (const area of [...ALL, ...[...ALL].reverse()]) {
      if (areas.includes(area)) continue; // only ever add
      const r = tapArea(areas, area, allowance);
      if (r.kind === "save") areas = r.areas;
    }
  }
  return areas;
}

describe("free affirmation areas can't be widened to all six", () => {
  test("a free user ticking every area in Settings stops at three; Plus still opens the rest", () => {
    const areas = tapEverything(["career"], false);
    expect(areas.length).toBe(FREE_AREA_LIMIT);
    const open = ALL.filter((a) => canUseArea(a, areas, false));
    expect(open.length).toBe(FREE_AREA_LIMIT);
    expect(ALL.every((a) => canUseArea(a, areas, true))).toBe(true);
  });

  test("the tap past the allowance offers Plus instead of saving", () => {
    expect(tapArea(["career", "love", "peace"], "health", areaAllowance(["career", "love", "peace"], false))).toEqual({ kind: "plus" });
    expect(tapArea(["career"], "love", areaAllowance(["career"], false))).toEqual({ kind: "save", areas: ["career", "love"] });
  });

  test("Plus may hold all six", () => {
    expect(tapEverything(["career"], true).length).toBe(ALL.length);
  });

  test("nothing is taken away: a 1.0 or lapsed profile with more areas keeps them, but can't grow", () => {
    const five: FocusId[] = ["career", "love", "peace", "health", "confidence"];
    expect(areaAllowance(five, false)).toBe(5);
    expect(tapArea(five, "abundance", areaAllowance(five, false))).toEqual({ kind: "plus" });
    // Within one visit, an accidental untick can be undone.
    const allowance = areaAllowance(five, false);
    const less = tapArea(five, "peace", allowance);
    expect(less.kind).toBe("save");
    if (less.kind === "save") expect(tapArea(less.areas, "peace", allowance).kind).toBe("save");
  });

  test("the last area can't be removed", () => {
    expect(tapArea(["career"], "career", 3)).toEqual({ kind: "keep-one" });
  });

  test("First Light's focus step stops at the same allowance", () => {
    let picked: FocusId[] = [];
    for (const area of ALL) picked = toggleFocus(picked, area, FREE_AREA_LIMIT);
    expect(picked).toEqual(ALL.slice(0, FREE_AREA_LIMIT));
    expect(toggleFocus(picked, picked[0], FREE_AREA_LIMIT)).toEqual(ALL.slice(1, FREE_AREA_LIMIT));
  });

  test("copy for the limit", () => {
    expect(areaLimitCopy(3)).toContain("Plus opens all six");
    expect(areaLimitCopy(5)).toContain("stay free");
  });
});
