import { describe, expect, test } from "bun:test";
import { typeScale } from "@/constants/theme";
import { TAB_BAR_PARTS, TAB_LABEL_MAX_SCALE, tabBarHeight, tabLabelLineHeight } from "./tabBar";

/** What React Navigation leaves the label: the bar minus everything else in it. */
const labelBox = (fontScale: number) => {
  const p = TAB_BAR_PARTS;
  return tabBarHeight(fontScale) - p.border - p.paddingTop - p.paddingBottom - p.itemPadding * 2 - p.icon;
};

describe("tab bar never clips its labels", () => {
  test("at the default text size the label gets its whole caption line", () => {
    expect(labelBox(1)).toBeGreaterThanOrEqual(typeScale.caption.lineHeight);
    expect(tabBarHeight(1)).toBe(61);
  });

  test("the 60pt bar that clipped 'Today' was too short", () => {
    const p = TAB_BAR_PARTS;
    // 1.1's bar: 60pt with 4pt top padding and 2pt bottom padding left the label 15pt.
    expect(60 - p.border - 4 - 2 - p.itemPadding * 2 - p.icon).toBeLessThan(typeScale.caption.lineHeight);
  });

  test("larger text sizes grow the bar with the label, up to the label's ceiling", () => {
    for (const s of [1.1, 1.2, 1.3, TAB_LABEL_MAX_SCALE]) {
      expect(labelBox(s)).toBeGreaterThanOrEqual(typeScale.caption.lineHeight * s);
      expect(tabBarHeight(s)).toBeGreaterThan(tabBarHeight(1));
    }
    // Past the ceiling the label stops growing (Large Content Viewer takes over), and so does the bar.
    expect(tabBarHeight(3)).toBe(tabBarHeight(TAB_LABEL_MAX_SCALE));
    expect(labelBox(3)).toBeGreaterThanOrEqual(typeScale.caption.lineHeight * TAB_LABEL_MAX_SCALE);
  });

  test("smaller text and junk scales keep the design size", () => {
    expect(tabLabelLineHeight(0.8)).toBe(typeScale.caption.lineHeight);
    expect(tabLabelLineHeight(Number.NaN)).toBe(typeScale.caption.lineHeight);
  });
});
