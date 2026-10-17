// First Light top bar: back (every step after the welcome) and the sail
// progress in the centre. The trailing side mirrors the back control so the
// figure stays optically centred.
import React from "react";
import { StyleSheet, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { IconButton, useGutter } from "@/components/ui";
import { colors, hitSize, space } from "@/constants/theme";
import { SailProgress } from "./SailProgress";

export interface StepTopBarProps {
  step: number;
  total: number;
  onBack?: () => void;
  testID?: string;
}

export function StepTopBar({ step, total, onBack, testID = "onboarding" }: StepTopBarProps) {
  const gutter = useGutter();
  const inset = Math.max(0, gutter - space.md);
  return (
    <View style={[styles.row, { paddingHorizontal: inset }]}>
      <View style={styles.side}>
        {onBack ? (
          <IconButton accessibilityLabel="Back" onPress={onBack} testID={`${testID}-back`}>
            <ChevronLeft color={colors.ink80} size={26} strokeWidth={1.75} />
          </IconButton>
        ) : null}
      </View>
      <View style={styles.center}>
        <SailProgress step={step} total={total} testID={`${testID}-progress`} />
      </View>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 56, flexDirection: "row", alignItems: "center" },
  side: { width: hitSize + space.sm },
  center: { flex: 1, alignItems: "center" },
});
