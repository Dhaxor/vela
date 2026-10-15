// GILDED PLATE: reserved for the hero chapter card, chapter plates and the
// finale. A sky800 → sky700 body inside a 1px gradient stroke (bright gold at
// the top-left, fading out), four L-shaped corner ticks in gold300 and an
// inset mini constellation, like a plate cut from a star atlas.
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Figure } from "@/lib/sky/figures";
import { colors, radius, space } from "@/constants/theme";
import { ConstellationFigure } from "@/components/sky/ConstellationFigure";
import { Press } from "./Press";

export interface GildedPlateProps {
  children?: React.ReactNode;
  onPress?: () => void;
  /** Inset constellation; omit `figure` for the Vela sail. */
  figure?: Figure;
  lit?: number;
  /** Show the inset constellation. Default true. */
  inset?: boolean;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const STROKE = ["rgba(245, 213, 142, 0.62)", "rgba(233, 180, 76, 0.24)", "rgba(233, 180, 76, 0.05)"] as const;
const BODY = [colors.sky800, colors.sky700] as const;
const TICK = 12;
const TICK_INSET = 10;
const INSET_W = 76;
const INSET_H = 44;

function Ticks() {
  return (
    <>
      <View style={[styles.tick, { top: TICK_INSET, left: TICK_INSET, borderTopWidth: 1, borderLeftWidth: 1 }]} />
      <View style={[styles.tick, { top: TICK_INSET, right: TICK_INSET, borderTopWidth: 1, borderRightWidth: 1 }]} />
      <View style={[styles.tick, { bottom: TICK_INSET, left: TICK_INSET, borderBottomWidth: 1, borderLeftWidth: 1 }]} />
      <View style={[styles.tick, { bottom: TICK_INSET, right: TICK_INSET, borderBottomWidth: 1, borderRightWidth: 1 }]} />
    </>
  );
}

export function GildedPlate({
  children,
  onPress,
  figure,
  lit = 0,
  inset = true,
  padding = space.lg,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: GildedPlateProps) {
  const plate = (
    <LinearGradient colors={STROKE} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stroke}>
      <LinearGradient colors={BODY} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.body, { padding }]}>
        <View style={styles.highlight} />
        {inset ? (
          <View style={styles.inset}>
            <ConstellationFigure figure={figure} lit={lit} width={INSET_W} height={INSET_H} padding={6} variant="inset" />
          </View>
        ) : null}
        <Ticks />
        {children}
      </LinearGradient>
    </LinearGradient>
  );
  if (!onPress) {
    return (
      <View style={[styles.shadow, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
        {plate}
      </View>
    );
  }
  return (
    <Press
      style={[styles.shadow, style]}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      pressScale={0.985}
    >
      {plate}
    </Press>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.lg,
    boxShadow: "0px 10px 24px rgba(5, 4, 13, 0.6)",
  },
  stroke: { borderRadius: radius.lg, padding: 1 },
  body: { borderRadius: radius.lg - 1, overflow: "hidden" },
  highlight: {
    position: "absolute",
    top: 0,
    left: radius.lg,
    right: radius.lg,
    height: 1,
    backgroundColor: colors.highlight,
    pointerEvents: "none",
  },
  tick: { position: "absolute", width: TICK, height: TICK, borderColor: colors.gold300, opacity: 0.8, pointerEvents: "none" },
  inset: { position: "absolute", top: space.base, right: space.base, opacity: 0.9, pointerEvents: "none" },
});
