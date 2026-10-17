// The chapter's title plate on open sky: the gold numeral between engraved
// rules, the stage name, the chapter title and one quiet line of facts. When a
// bridge is waiting at the end, a violet link jumps straight to it.
import React from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { ArrowDown } from "@/components/glyphs/icons";
import { GhostButton, T } from "@/components/ui";
import { ChapterNumeral } from "@/components/glyphs";
import { colors, space } from "@/constants/theme";

export interface ReaderHeroProps {
  number: number;
  stageName: string;
  title: string;
  /** 'Season 1 · 3 min to listen'. */
  meta: string;
  /** Violet jump link to the bridge zone. */
  jump?: { label: string; onPress: () => void } | null;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function ReaderHero({ number, stageName, title, meta, jump, onLayout }: ReaderHeroProps) {
  return (
    <View style={styles.hero} onLayout={onLayout} testID="story-hero">
      <ChapterNumeral value={number} variant="display" ruled testID="story-numeral" />
      <T variant="eyebrow" tone="muted" center style={styles.stage} testID="story-stage">
        {stageName}
      </T>
      <T variant="display" center accessibilityRole="header" style={styles.title} testID="story-title">
        {title}
      </T>
      <T variant="caption" tone="faint" center numeric style={styles.meta}>
        {meta}
      </T>
      {jump ? (
        <GhostButton
          label={jump.label}
          tone="violet"
          onPress={jump.onPress}
          trailing={<ArrowDown color={colors.violet400} size={18} strokeWidth={1.75} />}
          testID="story-jump-bridge"
          style={styles.jump}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: space.base, paddingBottom: space.xl },
  stage: { marginTop: space.md },
  title: { marginTop: space.base },
  meta: { marginTop: space.md },
  jump: { marginTop: space.base },
});
