// A section of the Rituals atlas: an eyebrow, an engraved rule, and an
// optional quiet action on the right ('See all').
import React from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Press, T } from "@/components/ui";
import { colors, hitSize, space } from "@/constants/theme";

export interface SectionHeadProps {
  title: string;
  /** Trailing count or note, in numerals ('4 pages'). */
  note?: string;
  action?: { label: string; onPress: () => void; testID: string; accessibilityLabel?: string };
}

export function SectionHead({ title, note, action }: SectionHeadProps) {
  return (
    <View style={styles.row}>
      <T variant="eyebrow" accessibilityRole="header">
        {title}
      </T>
      {note ? (
        <T variant="caption" tone="faint" numeric>
          {note}
        </T>
      ) : null}
      <View style={styles.rule} />
      {action ? (
        <Press onPress={action.onPress} testID={action.testID} accessibilityLabel={action.accessibilityLabel ?? action.label} hitSlop={8} style={styles.action}>
          <T variant="caption" strong tone="secondary">
            {action.label}
          </T>
          <ChevronRight color={colors.ink64} size={16} strokeWidth={1.75} />
        </Press>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: hitSize },
  rule: { flex: 1, height: 1, backgroundColor: colors.hairline },
  action: { flexDirection: "row", alignItems: "center", gap: space.xxs, minHeight: hitSize, paddingLeft: space.xs },
});
