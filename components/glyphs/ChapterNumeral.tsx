// Roman chapter numerals in gold300 (numerals are part of the future's colour),
// optionally ruled with engraved hairlines like an atlas plate caption.
import React from "react";
import { StyleSheet, View } from "react-native";
import { T } from "@/components/ui/T";
import { colors, space } from "@/constants/theme";
import { toRoman } from "@/lib/sky/numerals";

export interface ChapterNumeralProps {
  value: number;
  variant?: "display" | "title" | "eyebrow";
  /** Hairline rules either side: ——  IV  —— */
  ruled?: boolean;
  testID?: string;
}

export function ChapterNumeral({ value, variant = "display", ruled = false, testID }: ChapterNumeralProps) {
  const numeral = toRoman(value);
  const text = (
    <T variant={variant} tone="gold" numeric accessibilityLabel={`Chapter ${value}`} testID={testID}>
      {numeral}
    </T>
  );
  if (!ruled) return text;
  return (
    <View style={styles.row}>
      <View style={styles.rule} />
      {text}
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  rule: { width: space.xl, height: 1, backgroundColor: colors.goldEngrave },
});
