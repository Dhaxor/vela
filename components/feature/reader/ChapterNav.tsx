// Previous / next chapter within the dream, like the running foot of an atlas
// page. Quiet on purpose: the bridge above it is the action.
import React from "react";
import { StyleSheet, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Press, T } from "@/components/ui";
import type { ChapterMeta } from "@/contexts/arc.types";
import { colors, radius, space } from "@/constants/theme";
import { chapterLinkLabel } from "./cues";

export interface ChapterNavProps {
  prev: ChapterMeta | null;
  next: ChapterMeta | null;
  /** The season of the chapter being read, so a link into another season says so. */
  season: number;
  onOpen: (chapterId: string) => void;
}

function Link({ meta, dir, season, onOpen }: { meta: ChapterMeta; dir: "prev" | "next"; season: number; onOpen: (id: string) => void }) {
  const crossSeason = meta.season !== season;
  const eyebrow = `${dir === "prev" ? "Previous" : "Next"}${crossSeason ? ` · Season ${meta.season}` : ""}`;
  const label = chapterLinkLabel(meta);
  const Chevron = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Press
      onPress={() => onOpen(meta.id)}
      accessibilityRole="link"
      accessibilityLabel={`${eyebrow} chapter: ${label}`}
      style={[styles.link, dir === "next" && styles.linkNext]}
      testID={dir === "prev" ? "story-prev" : "story-next"}
    >
      {dir === "prev" ? <Chevron color={colors.ink64} size={20} strokeWidth={1.75} /> : null}
      <View style={[styles.text, dir === "next" && styles.textNext]}>
        <T variant="caption" tone="faint">
          {eyebrow}
        </T>
        <T variant="body" tone="secondary" numberOfLines={2} style={dir === "next" ? styles.right : null}>
          {label}
        </T>
      </View>
      {dir === "next" ? <Chevron color={colors.ink64} size={20} strokeWidth={1.75} /> : null}
    </Press>
  );
}

export function ChapterNav({ prev, next, season, onOpen }: ChapterNavProps) {
  if (!prev && !next) return null;
  // A lone link takes the whole row, so its title has room.
  return (
    <View style={styles.row} testID="story-nav">
      {prev ? (
        <View style={styles.cell}>
          <Link meta={prev} dir="prev" season={season} onOpen={onOpen} />
        </View>
      ) : null}
      {next ? (
        <View style={styles.cell}>
          <Link meta={next} dir="next" season={season} onOpen={onOpen} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.hairline },
  cell: { flex: 1 },
  link: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: space.xs, borderRadius: radius.sm },
  linkNext: { justifyContent: "flex-end" },
  text: { flexShrink: 1, gap: space.xxs },
  textNext: { alignItems: "flex-end" },
  right: { textAlign: "right" },
});
