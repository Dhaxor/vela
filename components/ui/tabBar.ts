// Tab bar metrics (app/(tabs)/_layout.tsx). Pure (tabBar.test.ts).
//
// The bar's height is fixed (React Navigation gives it `height`), so it must
// leave the label its full caption line, or the label (one line, overflow
// hidden) clips its descenders: 'Today' lost the foot of its y at 60pt. The
// label may grow with Dynamic Type up to TAB_LABEL_MAX_SCALE, and the bar
// grows with it. Past that, iOS's Large Content Viewer (a long press on a
// tab; React Navigation turns it on) shows the label large, as UIKit does.
//
// The home-indicator inset is added on top, by the layout, with
// useSafeAreaInsets: the content box sits above it.
import { typeScale } from "@/constants/theme";

/** Dynamic Type ceiling for tab labels (and for the bar height computed from it). */
export const TAB_LABEL_MAX_SCALE = 1.35;

/** The pieces of the bar, top to bottom, in points (React Navigation's uikit tab item: 5pt padding, 28pt icon box). */
export const TAB_BAR_PARTS = {
  border: 1,
  paddingTop: 2,
  itemPadding: 5,
  icon: 28,
  paddingBottom: 2,
} as const;

/** The label's line height at this font scale (never below the design size). */
export function tabLabelLineHeight(fontScale: number): number {
  const s = Number.isFinite(fontScale) ? Math.min(Math.max(fontScale, 1), TAB_LABEL_MAX_SCALE) : 1;
  return Math.ceil(typeScale.caption.lineHeight * s);
}

/** Bar height above the home-indicator inset: border, padding, item padding, icon box, the label's full line. */
export function tabBarHeight(fontScale: number): number {
  const p = TAB_BAR_PARTS;
  return p.border + p.paddingTop + p.itemPadding * 2 + p.icon + tabLabelLineHeight(fontScale) + p.paddingBottom;
}
