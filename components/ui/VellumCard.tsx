// VELLUM: the everyday material. sky700 at 72%, a 1px hairline, a 1px top
// highlight, radius 20, padding 24. Selected = raised surface + 1.5px gold300
// border + an 18px check badge. The 'bridge' tone is the violet wash that
// marks the loop's action.
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Check } from "@/components/glyphs/icons";
import { cardShadow, colors, radius, space } from "@/constants/theme";
import { Press } from "./Press";
import { haptics } from "./haptics";

export type CardPadding = "default" | "compact" | "none";

const PADDING: Record<CardPadding, number> = { default: space.lg, compact: space.base, none: 0 };

export interface VellumCardProps {
  children?: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  tone?: "default" | "bridge";
  padding?: CardPadding;
  /** Soft sky-tinted drop shadow for cards that float over busy sky. */
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function CheckBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, style]}>
      <Check color={colors.onGold} size={12} strokeWidth={3} />
    </View>
  );
}

export function VellumCard({
  children,
  onPress,
  selected = false,
  tone = "default",
  padding = "default",
  raised = false,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: VellumCardProps) {
  const surface: StyleProp<ViewStyle> = [
    styles.card,
    tone === "bridge" && styles.bridge,
    selected && styles.selected,
    raised && cardShadow,
    { padding: PADDING[padding] },
    style,
  ];
  const inner = (
    <>
      <View style={styles.highlight} />
      {children}
      {selected ? <CheckBadge style={styles.badgeCorner} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={surface} testID={testID} accessibilityLabel={accessibilityLabel}>
        {inner}
      </View>
    );
  }
  return (
    <Press
      style={surface}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      pressScale={0.98}
    >
      {inner}
    </Press>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.vellum,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  bridge: { backgroundColor: colors.violetWash, borderColor: colors.violetLine },
  selected: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5 },
  highlight: {
    position: "absolute",
    top: 0,
    left: radius.card,
    right: radius.card,
    height: 1,
    backgroundColor: colors.highlight,
    pointerEvents: "none",
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gold300,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  badgeCorner: { position: "absolute", top: space.md, right: space.md },
});
