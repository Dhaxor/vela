// The engraved 'Free forever' panel: an atlas certificate, not a sales badge.
// A double rule (gold engrave outside, a fine chart line inside), the title
// set between two short engraved rules, and the five things that stay free,
// each with a starlight sparkle, set as one centred inscription. It comes
// BEFORE what Plus adds, on purpose.
import React from "react";
import { StyleSheet, View } from "react-native";
import { T } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { FREE_FOREVER, FREE_FOREVER_NOTE } from "./copy";
import { FreeStar } from "./PlusGlyph";

export interface FreeForeverPanelProps {
  /** Shown above the list: 'Free forever', or 'Still free, always' once Plus is on. */
  title?: string;
  testID?: string;
}

export function FreeForeverPanel({ title = "Free forever", testID = "paywall-free-promise" }: FreeForeverPanelProps) {
  const items = FREE_FOREVER.map((f) => f.label);
  return (
    <View style={styles.outer} testID={testID} accessible accessibilityLabel={`${title}: ${items.join(", ")}. ${FREE_FOREVER_NOTE}`}>
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <View style={styles.rule} />
          <T variant="eyebrow" tone="gold">
            {title}
          </T>
          <View style={styles.rule} />
        </View>
        <View style={styles.grid}>
          {items.map((label) => (
            <View key={label} style={styles.item}>
              <FreeStar />
              <T variant="body" tone="primary" style={styles.itemText}>
                {label}
              </T>
            </View>
          ))}
        </View>
        <T variant="caption" tone="muted" center style={styles.note}>
          {FREE_FOREVER_NOTE}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.goldEngrave,
    backgroundColor: colors.vellum,
    padding: space.xs,
  },
  inner: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: space.base,
    paddingTop: space.base,
    paddingBottom: space.base,
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md, marginBottom: space.base },
  rule: { width: space.lg, height: 1, backgroundColor: colors.goldEngrave },
  // An inscription, not a grid: each item keeps its words together and the
  // lines wrap and centre naturally at any width.
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: space.lg, rowGap: space.sm },
  item: { flexDirection: "row", alignItems: "center", gap: space.sm },
  itemText: { flexShrink: 0 },
  note: { marginTop: space.base, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.hairline },
});
