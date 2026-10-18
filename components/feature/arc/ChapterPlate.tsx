// A chapter in the Memory Book: a gilded plate with the chapter's generative
// cover flush left (its season's figure, with the stars that were lit when it
// was written) and, beside it, the stage, the numeral and title, the day it
// was written and whether it has been heard. Tap to reread.
import React from "react";
import { StyleSheet, View } from "react-native";
import type { ChapterMeta, Dream } from "@/contexts/arc.types";
import { GildedPlate, T } from "@/components/ui";
import { ChapterCover } from "@/components/sky";
import { toRoman } from "@/lib/sky";
import { stageMeta } from "@/lib/story/seasons";
import { colors, space } from "@/constants/theme";
import { COVER_W, PLATE_H } from "./metrics";
import { spoken } from "@/lib/a11y";
import { relativeDate, type ChapterRow } from "./model";

export interface ChapterPlateProps {
  row: ChapterRow;
  dream: Dream;
  today: string;
  onOpen: (meta: ChapterMeta) => void;
}

export const ChapterPlate = React.memo(function ChapterPlate({ row, dream, today, onOpen }: ChapterPlateProps) {
  const { meta, lit, kinds, writtenOn, heard, latest } = row;
  const stage = stageMeta(meta.stage);
  const waiting = latest && !heard;
  const when = relativeDate(writtenOn, today);
  const state = heard ? "Heard" : waiting ? "Waiting for you" : "Not heard yet";
  return (
    <GildedPlate
      inset={false}
      padding={0}
      onPress={() => onOpen(meta)}
      testID={`arc-chapter-${meta.id}`}
      accessibilityLabel={spoken(`Chapter ${meta.number}, ${meta.title}`, stage.name, `Written ${when}`, state)}
      accessibilityHint="Opens the chapter to reread"
    >
      <View style={styles.row}>
        <View style={styles.cover}>
          <ChapterCover
            dreamId={dream.id}
            season={meta.season}
            focus={dream.focus}
            chapter={meta.number}
            lit={lit}
            kinds={kinds}
            width={COVER_W}
            height={PLATE_H}
            showNumeral={false}
          />
          <View style={styles.coverEdge} />
        </View>
        <View style={styles.text}>
          <T variant="eyebrow" tone="muted" numberOfLines={1}>
            {stage.name}
          </T>
          <T variant="title" numberOfLines={2} style={styles.title}>
            <T variant="title" tone="gold" numeric>
              {toRoman(meta.number)}
            </T>
            {"  "}
            {meta.title}
          </T>
          <View style={styles.meta}>
            {waiting ? <View style={styles.dot} /> : null}
            <T variant="caption" tone={waiting ? "gold" : "muted"} numberOfLines={1}>
              {`${when} · ${state}`}
            </T>
          </View>
        </View>
      </View>
    </GildedPlate>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", height: PLATE_H },
  cover: { width: COVER_W, height: PLATE_H },
  // An engraved gutter between the cover and the page.
  coverEdge: { position: "absolute", top: 0, bottom: 0, right: 0, width: 1, backgroundColor: colors.goldEngrave },
  text: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: space.base,
    // Clear the plate's corner ticks on the right.
    paddingRight: space.lg,
    paddingVertical: space.md,
  },
  title: { marginTop: space.xs },
  meta: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold300 },
});
