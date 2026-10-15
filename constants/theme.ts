// Vela design system v2, "Night Atlas". The single source of truth for colour,
// type, spacing and motion. No screen may hardcode a hex, a font size or a
// weight (scripts/lint-ui.mjs enforces it in app/**).
//
// Colour grammar (docs/ELEVATE_1.1.md §2): the sky is 60%, one starlight hue in
// four tiers is 30%, and the loop owns the last 10%: GOLD is the future (the
// one filled CTA, numerals, the user's own words), VIOLET is the bridge,
// STARLIGHT is proof. Kind of proof is shown by tint and glyph, never by gold.
//
// The 1.0 token names survive as aliases at the bottom of `colors`, so screens
// that haven't been rebuilt yet pick up the new palette without edits.
import type { FocusId } from "@/lib/focus";

/** Raw v2 palette. Components read these through `colors`. */
export const palette = {
  // SKY (60%)
  sky950: "#05040D",
  sky900: "#0B0A18",
  sky800: "#110F2A",
  sky700: "#19163A",
  sky600: "#241F52",

  // STARLIGHT TEXT (30%): one hue, four tiers. ink48 is the floor on open sky,
  // ink56 the floor on cards. The 1.0 .38 tier is gone.
  ink100: "rgba(246, 242, 255, 1)",
  ink80: "rgba(246, 242, 255, 0.80)",
  ink64: "rgba(246, 242, 255, 0.64)",
  ink56: "rgba(246, 242, 255, 0.56)",
  ink48: "rgba(246, 242, 255, 0.48)",

  // GOLD = the future
  gold500: "#E9B44C",
  gold300: "#F5D58E",
  goldEngrave: "rgba(233, 180, 76, 0.24)",
  goldLine: "rgba(245, 213, 142, 0.44)",
  onGold: "#1E1503",

  // VIOLET = the bridge
  violet400: "#A897FF",
  violetWash: "rgba(168, 151, 255, 0.10)",
  violetLine: "rgba(168, 151, 255, 0.30)",

  // STARLIGHT = proof
  did: "#FFF3D6",
  moved: "#EEF0FF",
  learned: "#C9D8FF",
  starGlow: "rgba(255, 236, 190, 0.35)",

  // Lines and the one alarm colour
  hairline: "rgba(214, 206, 255, 0.10)",
  chartLine: "rgba(214, 206, 255, 0.06)",
  danger: "#E8938F",
  dangerWash: "rgba(232, 147, 143, 0.12)",

  // Atmosphere
  nebulaViolet: "#A897FF",
  nebulaTeal: "#6FD3C1",
  dawn: "#F2A27C",
  white: "#FFFFFF",
} as const;

export const colors = {
  ...palette,

  /** Vellum card base: sky700 at 72%. */
  vellum: "rgba(25, 22, 58, 0.72)",
  /** Raised/selected vellum (sky600 tint), the 1.0 gold-wash replacement. */
  vellumRaised: "rgba(36, 31, 82, 0.72)",
  /** Dock and tab bar: sky950 at 92%. */
  chrome: "rgba(5, 4, 13, 0.92)",
  /** Modal scrim behind sheets. */
  scrim: "rgba(5, 4, 13, 0.64)",
  /** 1px top highlight on vellum. */
  highlight: "rgba(255, 255, 255, 0.06)",
  /** 1px inner highlight on filled buttons. */
  buttonHighlight: "rgba(255, 255, 255, 0.35)",
  /** Shadows are tinted sky950, never grey. */
  shadow: "rgba(5, 4, 13, 0.6)",
  transparent: "transparent",

  // ---- 1.0 aliases (keep until Phase 2 screens stop using them) ----
  bg: palette.sky900,
  bgRaised: "rgba(17, 15, 42, 0)",
  surface: palette.sky800,
  card: "rgba(25, 22, 58, 0.72)",
  cardPressed: palette.sky600,
  text: palette.ink100,
  textSecondary: palette.ink80,
  textMuted: palette.ink64,
  textFaint: palette.ink48,
  accent: palette.gold500,
  accentPressed: "#D9A43C",
  onAccent: palette.onGold,
  /** Was a gold wash, which turns brown on indigo. Now a raised sky surface. */
  accentSoft: "rgba(36, 31, 82, 0.72)",
  accentBorder: palette.goldLine,
  aurora: palette.violet400,
  auroraSoft: palette.violetWash,
  auroraBorder: palette.violetLine,
  /** The success green is retired; proof is starlight. */
  success: palette.did,
  successSoft: "rgba(255, 243, 214, 0.06)",
  dangerSoft: palette.dangerWash,
} as const;

export type ThemeColors = typeof colors;
export type ColorToken = keyof typeof colors;

/**
 * Horizon tint per focus area, painted as a radial glow over the bottom 30% of
 * the sky. `null` (no dream yet) uses the neutral Night horizon.
 */
export const horizonTint: Record<FocusId | "none", string> = {
  love: "#3A2147",
  abundance: "#3A2A22",
  career: "#1C2B4A",
  health: "#123A3A",
  confidence: "#2A2160",
  peace: "#1A2E4F",
  none: "#1E1A44",
};

/** 8-point grid. No other spacing values exist. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
} as const;

/** Screen gutter: 24, or 16 below 380pt wide (iPhone SE and mini). */
export const gutter = { regular: 24, compact: 16, compactBelow: 380 } as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  /** Vellum cards. */
  card: 20,
  lg: 24,
  xl: 28,
  pill: 999,
} as const;

/** Minimum tap target (Apple HIG). */
export const hitSize = 44;

/**
 * Registered font family names. They must match the keys passed to useFonts in
 * app/_layout.tsx. Custom families never take fontWeight or fontStyle: the
 * weight and the italic are separate files.
 */
export const fonts = {
  serif: "Newsreader_400Regular",
  serifItalic: "Newsreader_400Regular_Italic",
  sans: "InstrumentSans_400Regular",
  sansSemiBold: "InstrumentSans_600SemiBold",
} as const;

/**
 * The scale: four sizes (32, 22, 17, 13), two weights (400, 600). `reading`
 * is the story voice at body size; `eyebrow` is the caption size set in 600
 * caps. `<T variant>` (components/ui) is the only consumer in screens.
 */
export const typeScale = {
  display: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, letterSpacing: -0.1 },
  body: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  reading: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 28, letterSpacing: 0 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18, letterSpacing: 1.2 },
} as const;

export type TypeVariant = keyof typeof typeScale;

/** Reader text size (ProfileV2.textSize). S is the design default; M and L are accessibility steps. */
export const readerSizes = {
  S: { fontSize: 17, lineHeight: 28 },
  M: { fontSize: 19, lineHeight: 31 },
  L: { fontSize: 21, lineHeight: 34 },
} as const;

/**
 * 1.0 alias. Spreading `type.x` now sets the v2 family and size with no
 * fontWeight, so untouched screens render Newsreader / Instrument Sans.
 */
export const type = {
  display: typeScale.display,
  title: typeScale.title,
  body: typeScale.body,
  caption: typeScale.caption,
} as const;

/** 1.0 alias: the serif voice. Georgia and the generic 'serif' are banned. */
export const serif = fonts.serif;

/** Soft ambient shadow for cards, tinted to the night (never grey). */
export const cardShadow = { boxShadow: "0px 8px 24px rgba(5, 4, 13, 0.6)" } as const;

/** The gold glow (r16, .35). It belongs to the primary button only. */
export const accentGlow = { boxShadow: "0px 4px 16px rgba(233, 180, 76, 0.35)" } as const;

/**
 * Motion vocabulary (ELEVATE §2.6). Easing is the "drift" bezier; components
 * build it with Reanimated's Easing.bezier(...motion.drift).
 */
export const motion = {
  tap: 120,
  state: 220,
  enter: 420,
  reveal: 900,
  ceremony: 2200,
  drift: [0.22, 1, 0.36, 1] as const,
  press: { damping: 18, stiffness: 160, scale: 0.97 },
  twinkle: { min: 2400, max: 5600, low: 0.35, high: 1 },
  nebulaDriftPx: 16,
  nebulaPeriodMs: 24000,
} as const;
