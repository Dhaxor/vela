// Vela design system — single source of truth. No screen may hardcode a hex.
//
// Direction (mobile-app-ui-design skill): sleep/meditation conventions — deep
// indigo night sky, ambient low-contrast surfaces, soft transitions. 60/30/10:
// 60% indigo base, 30% starlight text, 10% gold accent reserved for primary
// actions and moments of abundance. Dark-only in v1: one perfect theme beats
// two adequate ones, and manifestation is an evening/morning ritual.
import { Platform } from "react-native";

export const colors = {
  // 60% — the night
  bg: "#0B0A18",
  bgRaised: "#12102400", // transparent helper for gradients-by-overlay
  surface: "#161430",
  card: "#1C1A3A",
  cardPressed: "#232052",
  hairline: "#2A2750",

  // 30% — starlight text (opacity tiers of one hue, per the skill)
  text: "rgba(244, 241, 255, 0.96)",
  textSecondary: "rgba(244, 241, 255, 0.72)",
  textMuted: "rgba(244, 241, 255, 0.55)",
  textFaint: "rgba(244, 241, 255, 0.38)",

  // 10% — gold, the color of the thing being called in
  accent: "#E9B44C",
  accentPressed: "#D9A43C",
  onAccent: "#241B04",
  accentSoft: "rgba(233, 180, 76, 0.12)", // secondary buttons / highlights
  accentBorder: "rgba(233, 180, 76, 0.28)",

  // supporting aurora violet — selection, links, secondary identity
  aurora: "#9D8CFF",
  auroraSoft: "rgba(157, 140, 255, 0.14)",
  auroraBorder: "rgba(157, 140, 255, 0.30)",

  // semantic, softened for a calm app
  success: "#7FC8A9",
  successSoft: "rgba(127, 200, 169, 0.14)",
  danger: "#E28B8B",
  dangerSoft: "rgba(226, 139, 139, 0.14)",

  // shadows tinted to the background, never gray
  shadow: "rgba(4, 3, 18, 0.6)",
} as const;

export type ThemeColors = typeof colors;

/** 8-point grid. No other spacing values exist. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
} as const;

/**
 * Two families with a clear division of labor:
 * UI speaks the system sans; the manifested world speaks a serif.
 * Four sizes, two weights — the skill's ceiling, treated as a budget.
 */
export const type = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
} as const;

/** Serif voice for stories and affirmations. */
export const serif = Platform.select({
  ios: "Georgia",
  default: "serif",
});

/** Soft ambient shadow for cards; tinted to the night, never gray. */
export const cardShadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.5,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
} as const;

/** Gold glow reserved for the primary CTA and peak moments. */
export const accentGlow = {
  shadowColor: colors.accent,
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
} as const;
