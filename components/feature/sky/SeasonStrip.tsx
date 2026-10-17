// Every season of a dream as a small engraved plate: the named skies already
// set into the atlas, then the figure still being drawn. Tapping one shows
// that season's stars in the big view. Only rendered from Season 2 on.
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { ProofKind } from "@/contexts/arc.types";
import type { Figure } from "@/lib/sky/figures";
import { ConstellationFigure } from "@/components/sky";
import { Press, T, haptics, useGutter } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";

export interface SeasonPlate {
  season: number;
  figure: Figure;
  lit: number;
  kinds: readonly ProofKind[];
  /** The Named Sky, or null while the season is open. */
  name: string | null;
  current: boolean;
}

export interface SeasonStripProps {
  plates: readonly SeasonPlate[];
  selected: number;
  onSelect: (season: number) => void;
}

const FIG_W = 104;
const FIG_H = 56;

export function SeasonStrip({ plates, selected, onSelect }: SeasonStripProps) {
  const gutter = useGutter();
  if (plates.length < 2) return null;
  return (
    <View style={{ marginHorizontal: -gutter }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
        accessibilityRole="tablist"
        testID="sky-seasons"
      >
        {plates.map((p) => {
          const on = p.season === selected;
          const title = p.name ?? (p.current ? "In progress" : `Season ${p.season}`);
          return (
            <Press
              key={p.season}
              onPress={() => {
                haptics.select();
                onSelect(p.season);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Season ${p.season}${p.name ? `, ${p.name}` : ""}, ${p.lit} of 7 stars`}
              testID={`sky-season-${p.season}`}
              pressScale={0.96}
              style={[styles.plate, on && styles.on]}
            >
              <ConstellationFigure figure={p.figure} lit={p.lit} kinds={p.kinds} width={FIG_W} height={FIG_H} padding={8} variant="inset" />
              <T variant="caption" tone={p.name ? "gold" : "secondary"} italic={!!p.name} numberOfLines={1} style={styles.name}>
                {title}
              </T>
              <T variant="caption" tone="muted" numeric>
                Season {p.season} · {p.lit}/7
              </T>
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  plate: {
    width: FIG_W + space.base * 2,
    paddingVertical: space.md,
    paddingHorizontal: space.base,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  on: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5 },
  name: { marginTop: space.sm },
});
