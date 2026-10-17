// Dream pills, shown only when there is more than one dream. Each pill carries
// the dream's area sign; the focused one wears the selected treatment (raised
// sky + gold300 border). A dream that is resting, or plan-locked after Plus
// lapsed, says so in its pill so switching never hides a state change.
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Dream } from "@/contexts/arc.types";
import { AreaSign } from "@/components/glyphs";
import { Press, T, haptics, useGutter } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { dreamName } from "@/lib/dreams";

export interface ArcSwitcherItem {
  dream: Dream;
  /** 'resting' | 'plan-locked' | null (weaving). */
  quiet: "resting" | "plan-locked" | null;
}

export interface ArcSwitcherProps {
  items: readonly ArcSwitcherItem[];
  selectedId: string | null;
  onSelect: (dreamId: string) => void;
  testID?: string;
}

/** A dream's short name: the one rule every tab uses (lib/dreams): given name, else the first words of the desire. */
export function dreamShortName(dream: Dream): string {
  return dreamName(dream, 3);
}

export function ArcSwitcher({ items, selectedId, onSelect, testID = "arc-switcher" }: ArcSwitcherProps) {
  const gutter = useGutter();
  if (items.length < 2) return null;
  return (
    <View style={{ marginHorizontal: -gutter }} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
        accessibilityRole="tablist"
      >
        {items.map(({ dream, quiet }) => {
          const on = dream.id === selectedId;
          const name = dreamShortName(dream);
          const note = quiet === "resting" ? "resting" : quiet === "plan-locked" ? "not weaving" : null;
          return (
            <Press
              key={dream.id}
              testID={`arc-switch-${dream.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${name}${note ? `, ${note}` : ""}`}
              onPress={() => {
                haptics.select();
                onSelect(dream.id);
              }}
              pressScale={0.95}
              style={[styles.pill, on && styles.on]}
            >
              <AreaSign focus={dream.focus} size={18} color={on ? colors.gold300 : colors.ink64} />
              <T variant="body" tone={on ? "primary" : "secondary"} strong={on} numberOfLines={1}>
                {name}
              </T>
              {note ? (
                <T variant="caption" tone="muted">
                  {note}
                </T>
              ) : null}
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  pill: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  on: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5 },
});
