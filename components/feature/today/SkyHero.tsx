// Today's sky hero: the focused dream's constellation on open sky, about 30%
// of the window tall (200pt floor, so the loop card's one CTA stays above the
// fold on an iPhone SE). The whole hero opens /sky/[intentId].
//
// When a star is added while Today is mounted (a 'Not today' lesson, or a
// proof logged elsewhere), the new line draws itself in: a quiet echo of Star
// Birth. Reduce Motion and still mode show the end state.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { ProofKind } from "@/contexts/arc.types";
import type { Figure } from "@/lib/sky/figures";
import { ConstellationFigure } from "@/components/sky";
import { Press, T, useGutter } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export interface SkyHeroProps {
  figure: Figure;
  lit: number;
  kinds: readonly (ProofKind | null | undefined)[];
  /** Window width; the hero bleeds past the gutter to the screen edges. */
  width: number;
  height: number;
  /** A key that changes when a different dream or season is shown (no line draw on switch). */
  identity: string;
  /** Bottom-left label, e.g. 'The Sail · 5 of 7'. */
  caption?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  testID?: string;
}

export function SkyHero({ figure, lit, kinds, width, height, identity, caption, onPress, accessibilityLabel, testID = "today-hero" }: SkyHeroProps) {
  const gutter = useGutter();
  const seen = useRef({ identity, lit });
  const [drawAt, setDrawAt] = useState<number | null>(null);

  useEffect(() => {
    const prev = seen.current;
    if (prev.identity === identity && lit > prev.lit) setDrawAt(lit);
    else if (prev.identity !== identity) setDrawAt(null);
    seen.current = { identity, lit };
  }, [identity, lit]);

  const figureNode = (
    <ConstellationFigure
      figure={figure}
      lit={lit}
      kinds={kinds}
      width={width}
      height={height}
      padding={Math.max(space.xl, Math.round(height * 0.14))}
      drawLatest={drawAt === lit}
      accessibilityLabel={accessibilityLabel}
      testID="proof-constellation"
    />
  );

  return (
    <View style={[styles.bleed, { marginHorizontal: -gutter, height }]}>
      {onPress ? (
        <Press
          onPress={onPress}
          pressScale={0.985}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Opens your constellation"
          testID={testID}
          style={styles.fill}
        >
          {figureNode}
          <View style={[styles.foot, { left: gutter, right: gutter }]} pointerEvents="none">
            <T variant="caption" tone="faint" numeric numberOfLines={1} style={styles.flex}>
              {caption ?? ""}
            </T>
            <View style={styles.open}>
              <T variant="caption" tone="muted">
                Open sky
              </T>
              <ChevronRight color={colors.ink64} size={14} strokeWidth={1.75} />
            </View>
          </View>
        </Press>
      ) : (
        // No dream yet: the sail is a faint promise of the sky to come.
        <View style={[styles.fill, styles.ghost]} testID={testID}>
          {figureNode}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { overflow: "visible" },
  fill: { flex: 1 },
  ghost: { opacity: 0.4 },
  foot: { position: "absolute", bottom: 0, flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  open: { flexDirection: "row", alignItems: "center", gap: space.xxs },
});
