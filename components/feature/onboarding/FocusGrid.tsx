// Focus as AreaSign cards (onboarding). The first card chosen is the area the
// first story lives in ('First'); any others are optional extras ('Also')
// that personalise later suggestions, up to `max` in all (more areas are a
// Plus benefit). Invitations are never truncated: rows stretch so both cards
// in a row share the taller height.
import React from "react";
import { StyleSheet, View } from "react-native";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";
import { AreaSign } from "@/components/glyphs";
import { CheckBadge, T, VellumCard } from "@/components/ui";
import { colors, space } from "@/constants/theme";
import { toggleFocus } from "./logic";

export interface FocusGridProps {
  /** Selection in tap order; [0] is the primary area. */
  value: readonly FocusId[];
  onChange: (next: FocusId[]) => void;
  /** testID per card: `${testIDPrefix}${id}`. */
  testIDPrefix?: string;
  /** Most areas to hold; a tap past it is ignored and a quiet note says so. */
  max?: number;
}

export function FocusGrid({ value, onChange, testIDPrefix = "focus-", max }: FocusGridProps) {
  const full = max !== undefined && value.length >= max;
  const rows: (typeof FOCUS_AREAS)[number][][] = [];
  for (let i = 0; i < FOCUS_AREAS.length; i += 2) rows.push(FOCUS_AREAS.slice(i, i + 2));
  return (
    <View style={styles.grid} accessibilityLabel="Focus areas">
      {rows.map((row) => (
        <View key={row[0].id} style={styles.row}>
          {row.map((f) => {
            const index = value.indexOf(f.id);
            const on = index >= 0;
            const primary = index === 0;
            return (
              <VellumCard
                key={f.id}
                padding="compact"
                style={[styles.card, on && styles.on]}
                onPress={() => onChange(toggleFocus(value, f.id, max))}
                testID={`${testIDPrefix}${f.id}`}
                accessibilityLabel={`${f.label}. ${f.invitation}${primary ? " Your first story." : on ? " Also chosen." : full ? " Unavailable: three are chosen." : ""}`}
              >
                <View style={styles.top}>
                  <AreaSign focus={f.id} size={28} color={on ? colors.gold300 : colors.ink80} />
                  {on ? (
                    <View style={styles.tag}>
                      <T variant="eyebrow" tone={primary ? "gold" : "muted"}>
                        {primary ? "First" : "Also"}
                      </T>
                      <CheckBadge />
                    </View>
                  ) : null}
                </View>
                <T variant="body" strong tone="primary" style={styles.label}>
                  {f.label}
                </T>
                <T variant="caption" tone={on ? "secondary" : "muted"}>
                  {f.invitation}
                </T>
              </VellumCard>
            );
          })}
        </View>
      ))}
      {full ? (
        <T variant="caption" tone="muted" center testID={`${testIDPrefix}full`}>
          Three to begin with. You can change them any time in Settings.
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.md },
  row: { flexDirection: "row", gap: space.md, alignItems: "stretch" },
  card: { flex: 1, flexBasis: 0 },
  on: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 },
  tag: { flexDirection: "row", alignItems: "center", gap: space.xs },
  label: { marginTop: space.md, marginBottom: space.xs },
});
