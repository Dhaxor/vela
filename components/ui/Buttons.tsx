// Buttons, in loop grammar:
// - PrimaryButton: the ONE gold CTA per viewport (the future). 56pt pill,
//   1px inner highlight, the gold glow.
// - BridgeButton: filled violet with sky950 text, so the loop's action is
//   never a text link.
// - SecondaryButton: 1px gold300 outline.  - GhostButton: ink80 text.
// - DangerButton: destructive confirmations only.
// - IconButton: 44pt, accessibilityLabel required by type.
import React from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { accentGlow, colors, hitSize, radius, space } from "@/constants/theme";
import { Press } from "./Press";
import { T, type TTone } from "./T";
import { haptics } from "./haptics";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** Leading glyph (sized ~20). */
  icon?: React.ReactNode;
  /** Trailing glyph, e.g. an arrow. */
  trailing?: React.ReactNode;
  disabled?: boolean;
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

interface FilledSpec {
  fill: string;
  tone: TTone;
  glow: boolean;
  spinner: string;
}

const FILLS = {
  primary: { fill: colors.gold500, tone: "onGold", glow: true, spinner: colors.onGold },
  bridge: { fill: colors.violet400, tone: "onViolet", glow: false, spinner: colors.sky950 },
  danger: { fill: colors.danger, tone: "onViolet", glow: false, spinner: colors.sky950 },
} as const satisfies Record<string, FilledSpec>;

function Filled({ spec, label, onPress, icon, trailing, disabled, loading, testID, accessibilityLabel, accessibilityHint, style }: ButtonProps & { spec: FilledSpec }) {
  const inert = disabled || loading;
  return (
    <Press
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!loading }}
      disabled={inert}
      onPress={() => {
        haptics.step();
        onPress?.();
      }}
      style={[
        styles.filled,
        // Disabled never fades the fill (gold at 40% turns brown on indigo): it goes quiet instead.
        disabled ? styles.filledOff : { backgroundColor: spec.fill },
        spec.glow && !inert && accentGlow,
        style,
      ]}
    >
      {disabled ? null : <View style={styles.highlight} />}
      {loading ? (
        <ActivityIndicator color={spec.spinner} />
      ) : (
        <View style={styles.row}>
          {icon}
          <T variant="body" strong tone={disabled ? "faint" : spec.tone} numberOfLines={1}>
            {label}
          </T>
          {trailing}
        </View>
      )}
    </Press>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <Filled spec={FILLS.primary} {...props} />;
}

export function BridgeButton(props: ButtonProps) {
  return <Filled spec={FILLS.bridge} {...props} />;
}

export function DangerButton(props: ButtonProps) {
  return <Filled spec={FILLS.danger} {...props} />;
}

export function SecondaryButton({ label, onPress, icon, trailing, disabled, loading, testID, accessibilityLabel, accessibilityHint, style }: ButtonProps) {
  const inert = disabled || loading;
  return (
    <Press
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      disabled={inert}
      onPress={onPress}
      style={[styles.outline, disabled && styles.outlineOff, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.gold300} />
      ) : (
        <View style={styles.row}>
          {icon}
          <T variant="body" strong tone={disabled ? "faint" : "gold"} numberOfLines={1}>
            {label}
          </T>
          {trailing}
        </View>
      )}
    </Press>
  );
}

export interface GhostButtonProps extends ButtonProps {
  tone?: Extract<TTone, "secondary" | "muted" | "danger" | "violet">;
}

export function GhostButton({ label, onPress, icon, trailing, disabled, testID, accessibilityLabel, accessibilityHint, style, tone = "secondary" }: GhostButtonProps) {
  return (
    <Press
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={[styles.ghost, disabled && styles.inert, style]}
    >
      <View style={styles.row}>
        {icon}
        <T variant="body" strong tone={tone} numberOfLines={1}>
          {label}
        </T>
        {trailing}
      </View>
    </Press>
  );
}

export interface IconButtonProps {
  /** Required: an icon-only control must say what it does. */
  accessibilityLabel: string;
  onPress?: () => void;
  /** The icon node (a glyph, or a lucide icon at strokeWidth 1.75). */
  children: React.ReactNode;
  /** 'plain' floats on the sky; 'vellum' sits on a soft disc. */
  variant?: "plain" | "vellum";
  disabled?: boolean;
  testID?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ accessibilityLabel, onPress, children, variant = "plain", disabled, testID, accessibilityHint, style }: IconButtonProps) {
  return (
    <Press
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      pressScale={0.92}
      hitSlop={4}
      style={[styles.icon, variant === "vellum" && styles.iconVellum, disabled && styles.inert, style]}
    >
      {children}
    </Press>
  );
}

const styles = StyleSheet.create({
  filled: {
    height: 56,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  // Opaque, so content scrolling under a Dock never shows through a disabled CTA.
  filledOff: { backgroundColor: colors.sky700, borderWidth: 1, borderColor: colors.hairline },
  highlight: {
    position: "absolute",
    top: 0,
    left: space.xl,
    right: space.xl,
    height: 1,
    backgroundColor: colors.buttonHighlight,
    pointerEvents: "none",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  outline: {
    height: 56,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.gold300,
  },
  outlineOff: { borderColor: colors.hairline },
  ghost: {
    minHeight: hitSize,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  icon: {
    width: hitSize,
    height: hitSize,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconVellum: {
    backgroundColor: colors.vellum,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  inert: { opacity: 0.4 },
});
