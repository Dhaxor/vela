// The last page of the Memory Book: a ghost plate for a new dream, drawn as an
// empty, dashed constellation. It opens /story/new when another dream can
// begin, and the paywall when the free dream is already weaving (Plus = more
// than one dream at a time). testID 'new-story' is kept from 1.0.
import React from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "@/components/glyphs/icons";
import { Press, T } from "@/components/ui";
import { ConstellationFigure } from "@/components/sky";
import { figureFor } from "@/lib/sky";
import { colors, radius, space } from "@/constants/theme";

export interface GhostPlateProps {
  /** How many dreams the user has now (any status). */
  dreamCount: number;
  /** How many of them are active (weaving or waiting for Plus). */
  activeCount: number;
  /** arc.canCreateDream: false sends the plate to the paywall. */
  canCreate: boolean;
  onPress: () => void;
}

const FIGURE = { width: 160, height: 72 } as const;

export function GhostPlate({ dreamCount, activeCount, canCreate, onPress }: GhostPlateProps) {
  const figure = React.useMemo(() => figureFor(`ghost-${dreamCount}`, 1), [dreamCount]);
  const lead = activeCount === 0 ? "A new dream" : dreamCount <= 1 ? "A second dream" : "Another dream";
  const title = `${lead} needs its own sky`;
  const body = canCreate
    ? "Begin it here. It gets its own chapters, its own stars and its own book."
    : "With Vela Plus, more than one dream weaves at a time. Everything you have made stays free.";
  return (
    <Press
      onPress={onPress}
      pressScale={0.985}
      style={styles.plate}
      testID="new-story"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityHint={canCreate ? "Begins a new dream" : "Opens Vela Plus"}
    >
      <ConstellationFigure figure={figure} lit={0} width={FIGURE.width} height={FIGURE.height} padding={space.sm} variant="inset" />
      {/* A set break ('… needs / its own sky') reads better than wherever the width falls. */}
      <T variant="title" center style={styles.title}>
        {`${lead} needs
its own sky`}
      </T>
      <T variant="body" tone="muted" center style={styles.body}>
        {body}
      </T>
      <View style={styles.cta}>
        {canCreate ? null : (
          <View style={styles.plus}>
            <T variant="eyebrow" tone="gold">
              Plus
            </T>
          </View>
        )}
        <T variant="body" strong tone="gold">
          {canCreate ? "Begin a dream" : "See Vela Plus"}
        </T>
        <ChevronRight color={colors.gold300} size={18} strokeWidth={1.75} />
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  plate: {
    marginTop: space.xl,
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.goldLine,
    backgroundColor: colors.chartLine,
  },
  title: { marginTop: space.base },
  body: { marginTop: space.sm, maxWidth: 320 },
  cta: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.base, minHeight: 44 },
  plus: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldLine,
  },
});
