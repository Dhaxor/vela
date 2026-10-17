// What Plus adds: four rows, each a glyph on a small engraved disc, a title
// and one plain line. The entry point's own benefit leads (the bed tap shows
// soundscapes first) and its disc wears the gold line.
import React from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "@/components/glyphs/icons";
import { T } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import type { Benefit, BenefitId } from "./copy";
import { PlusGlyph } from "./PlusGlyph";

export interface BenefitListProps {
  benefits: readonly Benefit[];
  featured?: BenefitId | null;
  /** Plus is on: each row carries a check instead of reading as an offer. */
  owned?: boolean;
  testID?: string;
}

export function BenefitList({ benefits, featured = null, owned = false, testID = "paywall-benefits" }: BenefitListProps) {
  return (
    <View style={styles.list} testID={testID}>
      {benefits.map((b) => {
        const lead = b.id === featured;
        return (
          <View key={b.id} style={styles.row} testID={`paywall-benefit-${b.id}`} accessible accessibilityLabel={`${b.title}. ${b.body}${owned ? " Included." : ""}`}>
            <View style={[styles.disc, lead && styles.discLead]}>
              <PlusGlyph id={b.id} color={lead ? colors.ink100 : colors.ink80} />
            </View>
            <View style={styles.copy}>
              <T variant="body" strong tone="primary">
                {b.title}
              </T>
              <T variant="caption" tone="muted">
                {b.body}
              </T>
            </View>
            {owned ? <Check color={colors.gold300} size={18} strokeWidth={2} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const DISC = 44;

const styles = StyleSheet.create({
  list: { gap: space.base },
  row: { flexDirection: "row", alignItems: "center", gap: space.base },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.vellum,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  discLead: { borderColor: colors.goldLine, backgroundColor: colors.vellumRaised },
  copy: { flex: 1, gap: space.xxs },
});
