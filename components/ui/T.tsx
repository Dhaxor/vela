// <T variant> is the only way to set text in Vela. Each variant maps to an
// explicit font family and size from the scale (constants/theme typeScale),
// so weight and italic always come from real font files: fontWeight and
// fontStyle are stripped from any style passed in.
import React from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import type { TextSize } from "@/contexts/user.types";
import { colors, fonts, readerSizes, typeScale, type TypeVariant } from "@/constants/theme";

export type TTone =
  | "primary"
  | "secondary"
  | "muted"
  | "faint"
  | "gold"
  | "violet"
  | "onGold"
  | "onViolet"
  | "danger"
  | "did"
  | "moved"
  | "learned";

const TONES: Record<TTone, string> = {
  primary: colors.ink100,
  secondary: colors.ink80,
  muted: colors.ink64,
  faint: colors.ink48,
  gold: colors.gold300,
  violet: colors.violet400,
  onGold: colors.onGold,
  onViolet: colors.sky950,
  danger: colors.danger,
  did: colors.did,
  moved: colors.moved,
  learned: colors.learned,
};

/** Headings speak at full starlight, body copy at 80%, small print lower. */
const DEFAULT_TONE: Record<TypeVariant, TTone> = {
  display: "primary",
  title: "primary",
  body: "secondary",
  reading: "primary",
  caption: "muted",
  eyebrow: "muted",
};

/** Dynamic Type ceilings: big type grows less so layouts survive AX sizes. */
const MAX_SCALE: Record<TypeVariant, number> = {
  display: 1.3,
  title: 1.4,
  body: 1.6,
  reading: 1.8,
  caption: 1.8,
  eyebrow: 1.5,
};

const SANS: ReadonlySet<TypeVariant> = new Set(["body", "caption", "eyebrow"]);

export interface TProps extends TextProps {
  variant?: TypeVariant;
  tone?: TTone;
  /** Newsreader Italic, whatever the variant (the user's words, writing placeholders). */
  italic?: boolean;
  /** Instrument Sans SemiBold. Sans variants only; the serif has one weight. */
  strong?: boolean;
  /** Tabular numerals for counts, dates and timers. */
  numeric?: boolean;
  center?: boolean;
  /** Reader text size (ProfileV2.textSize). `reading` only. */
  size?: TextSize;
  children?: React.ReactNode;
}

export function familyFor(variant: TypeVariant, italic: boolean, strong: boolean): string {
  if (italic) return fonts.serifItalic;
  if (variant === "eyebrow") return fonts.sansSemiBold;
  if (SANS.has(variant)) return strong ? fonts.sansSemiBold : fonts.sans;
  return fonts.serif;
}

/** Remove the properties custom families must never carry. */
function sanitize(style: TextProps["style"]): TextStyle | undefined {
  if (!style) return undefined;
  const flat = { ...StyleSheet.flatten(style) };
  delete flat.fontWeight;
  delete flat.fontStyle;
  delete flat.fontFamily;
  return flat;
}

export function T({
  variant = "body",
  tone,
  italic = false,
  strong = false,
  numeric = false,
  center = false,
  size,
  style,
  children,
  ...rest
}: TProps) {
  const scale = typeScale[variant];
  const reading = variant === "reading" && size ? readerSizes[size] : null;
  return (
    <Text
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      {...rest}
      style={[
        scale,
        reading,
        {
          fontFamily: familyFor(variant, italic, strong),
          color: TONES[tone ?? DEFAULT_TONE[variant]],
        },
        variant === "eyebrow" && styles.eyebrow,
        numeric && styles.numeric,
        center && styles.center,
        sanitize(style),
      ]}
    >
      {children}
    </Text>
  );
}

/** Strip any quotes the user typed so we never print ““double”” quotes. */
export function stripQuotes(text: string): string {
  return text.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
}

export interface UserWordsProps extends Omit<TProps, "italic" | "tone" | "children"> {
  children: string;
}

/** The user's own words: Newsreader Italic in gold300, inside curly quotes. */
export function UserWords({ children, variant = "reading", ...rest }: UserWordsProps) {
  return (
    <T variant={variant} italic tone="gold" {...rest}>
      {`“${stripQuotes(children)}”`}
    </T>
  );
}

const styles = StyleSheet.create({
  eyebrow: { textTransform: "uppercase" },
  numeric: { fontVariant: ["tabular-nums"] },
  center: { textAlign: "center" },
});
