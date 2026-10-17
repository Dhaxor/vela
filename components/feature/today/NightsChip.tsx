// '13 nights · 5 stars': the forgiving progress chip. Nights never reset;
// stars only add up. Keeps the 1.0 testID 'streak-chip' (App Review notes and
// the e2e harness look for it), even though it no longer counts a streak.
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { T } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";

export interface NightsChipProps {
  label: string;
  nights: number;
  stars: number;
  testID?: string;
}

export function NightsChip({ label, nights, stars, testID = "streak-chip" }: NightsChipProps) {
  return (
    <View
      style={styles.chip}
      testID={testID}
      accessible
      accessibilityLabel={`${nights} ${nights === 1 ? "night" : "nights"} shown up, ${stars} ${stars === 1 ? "star" : "stars"} in your sky`}
    >
      <Svg width={12} height={12}>
        <Path d={sparklePath(6, 6, 5.5, 0.2)} fill={colors.gold300} />
      </Svg>
      <T variant="caption" tone="secondary" numeric>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.sm,
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
});
