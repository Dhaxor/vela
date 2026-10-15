// A row of stars joined by hairlines: onboarding steps (6 stars that connect
// as you go) and the weekly rhythm (lit nights, hollow REST nights; a rest
// night is never shown as a miss).
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, space } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";

export type StarState = "lit" | "current" | "rest" | "upcoming";

export interface ProgressStarsProps {
  /** Number of stars when `states` is not given. */
  total?: number;
  /** Stars completed so far; the next one is 'current'. */
  value?: number;
  /** Explicit per-star states (weekly rhythm). Overrides total/value. */
  states?: readonly StarState[];
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Pure: completed stars are lit, the next is current, the rest upcoming. */
export function stepStates(total: number, value: number): StarState[] {
  return Array.from({ length: Math.max(0, total) }, (_, i) => (i < value ? "lit" : i === value ? "current" : "upcoming"));
}

const SIZE = 18;

function StarDot({ state }: { state: StarState }) {
  const c = SIZE / 2;
  return (
    <Svg width={SIZE} height={SIZE}>
      {state === "lit" && <Path d={sparklePath(c, c, 6.5, 0.2)} fill={colors.did} />}
      {state === "current" && (
        <>
          <Circle cx={c} cy={c} r={8} fill={colors.starGlow} opacity={0.5} />
          <Path d={sparklePath(c, c, 8.5, 0.2)} fill={colors.ink100} />
        </>
      )}
      {state === "rest" && <Circle cx={c} cy={c} r={3.5} stroke={colors.ink48} strokeWidth={1.25} fill="none" />}
      {state === "upcoming" && <Circle cx={c} cy={c} r={2.5} stroke={colors.ink48} strokeWidth={1} fill="none" />}
    </Svg>
  );
}

export function ProgressStars({ total = 6, value = 0, states, accessibilityLabel, testID, style }: ProgressStarsProps) {
  const row = states ?? stepStates(total, value);
  const lit = row.filter((s) => s === "lit").length;
  return (
    <View
      style={[styles.row, style]}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${lit} of ${row.length}`}
      accessibilityValue={{ min: 0, max: row.length, now: lit }}
    >
      {row.map((state, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={[styles.link, state === "lit" || (state === "current" && row[i - 1] === "lit") ? styles.linkLit : null]} /> : null}
          <StarDot state={state} />
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  link: { flex: 1, height: 1, minWidth: space.sm, marginHorizontal: space.xxs, backgroundColor: colors.hairline },
  linkLit: { backgroundColor: colors.ink48 },
});
