// The bottom dock: thumb-zone actions over a gradient scrim, so content can
// scroll beneath without fighting the buttons. Optionally carries the reader's
// horizon progress line along its top edge.
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space } from "@/constants/theme";
import { useGutter } from "./Screen";

export interface DockProps {
  children: React.ReactNode;
  /** 0..1 draws the horizon progress line; null/undefined hides it. */
  progress?: number | null;
  /** Add the home-indicator inset. Default true (false inside tab screens). */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SCRIM = [colors.transparent, "rgba(5, 4, 13, 0.82)", colors.chrome] as const;

export function Dock({ children, progress, inset = true, style, testID }: DockProps) {
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const p = progress == null ? null : Math.max(0, Math.min(1, progress));
  return (
    <View testID={testID} style={style}>
      <LinearGradient colors={SCRIM} locations={[0, 0.42, 1]} style={styles.scrim} />
      {p !== null ? (
        <View
          style={[styles.track, { marginHorizontal: gutter }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
        >
          <View style={[styles.elapsed, { width: `${p * 100}%` }]} />
          <View style={[styles.head, { left: `${p * 100}%` }]} />
        </View>
      ) : null}
      <View
        style={[
          styles.content,
          { paddingTop: p === null ? space.xl : space.base, paddingHorizontal: gutter, paddingBottom: (inset ? insets.bottom : 0) + space.base },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" },
  track: { height: 1, marginTop: space.xl, backgroundColor: colors.hairline },
  elapsed: { height: 1, backgroundColor: colors.ink64 },
  head: {
    position: "absolute",
    top: -2,
    width: 5,
    height: 5,
    marginLeft: -2.5,
    borderRadius: 2.5,
    backgroundColor: colors.ink100,
    boxShadow: `0px 0px 4px ${colors.did}`,
  },
  content: { gap: space.md },
});
