// The 3·6·9 sheet as eighteen stars: three in the morning, six at midday,
// nine in the evening, each lit as a line is written. Each row is also the
// block picker (testIDs slot-morning / slot-afternoon / slot-evening, kept
// from 1.0). The clock only suggests a block; any open block can be chosen.
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Press, ProgressStars, T, haptics, type StarState } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { SLOT_CAPS, type Slot369 } from "@/lib/journal";

export const SLOT_LABEL: Record<Slot369, string> = {
  morning: "Morning",
  afternoon: "Midday",
  evening: "Evening",
};

export const SLOTS_369: readonly Slot369[] = ["morning", "afternoon", "evening"];

export interface StarRows369Props {
  bySlot: Record<Slot369, { done: number; cap: number }>;
  selected: Slot369 | null;
  onSelect?: (slot: Slot369) => void;
}

function rowStates(done: number, cap: number, active: boolean): StarState[] {
  return Array.from({ length: cap }, (_, i) => (i < done ? "lit" : i === done && active ? "current" : "upcoming"));
}

/** ProgressStars geometry: 18pt stars joined by links with 2pt margins on each side. */
const STAR = 18;
const LINK_MARGIN = space.xxs * 2;

/** Width of a row of `n` stars that keeps the spacing of a full-width row of 9 (a widening fan). */
function rowWidth(n: number, full: number): number | undefined {
  if (full <= 0 || n >= 9) return undefined;
  const link = (full - 9 * STAR) / 8 - LINK_MARGIN;
  return n * STAR + (n - 1) * (link + LINK_MARGIN);
}

export function StarRows369({ bySlot, selected, onSelect }: StarRows369Props) {
  const [trackW, setTrackW] = useState(0);
  return (
    <View style={styles.rows} accessibilityRole="radiogroup" accessibilityLabel="Blocks of the day">
      {SLOTS_369.map((slot) => {
        const { done, cap } = bySlot[slot];
        const on = selected === slot;
        const full = done >= SLOT_CAPS[slot];
        const measure = cap === SLOT_CAPS.evening;
        return (
          <Press
            key={slot}
            testID={`slot-${slot}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${SLOT_LABEL[slot]}, ${done} of ${cap} written`}
            disabled={!onSelect}
            pressScale={0.98}
            onPress={() => {
              if (on) return;
              haptics.select();
              onSelect?.(slot);
            }}
            style={[styles.row, on && styles.rowOn]}
          >
            <View style={styles.head}>
              <T variant="eyebrow" tone={on ? "gold" : full ? "secondary" : "muted"}>
                {SLOT_LABEL[slot]}
              </T>
              <T variant="caption" tone={full ? "gold" : on ? "primary" : "muted"} numeric>
                {`${done} / ${cap}`}
              </T>
            </View>
            <View
              style={styles.track}
              onLayout={measure ? (e) => setTrackW(Math.round(e.nativeEvent.layout.width)) : undefined}
            >
              <ProgressStars states={rowStates(done, cap, on)} accessibilityLabel={`${done} of ${cap}`} style={{ width: rowWidth(cap, trackW) }} />
            </View>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space.sm },
  row: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: space.md,
    paddingHorizontal: space.base,
    gap: space.sm,
  },
  rowOn: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5, paddingHorizontal: space.base - 0.5, paddingVertical: space.md - 0.5 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: { alignSelf: "stretch" },
});
