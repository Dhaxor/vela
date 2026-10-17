// 'Past pages': every sealed Script and Gratitude page, newest first, as an
// atlas index (the day in gold numerals, the practice, a line of the page).
// Each opens /journal/entry/[id].
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "@/components/glyphs/icons";
import { GhostButton, Press, T, VellumCard } from "@/components/ui";
import { colors, space } from "@/constants/theme";
import type { JournalEntry } from "@/lib/journal";
import { pagePreview } from "@/lib/rituals";
import { dayParts } from "./dates";
import { RitualGlyph } from "./RitualGlyph";
import { SectionHead } from "./SectionHead";

export const KIND_LABEL: Record<JournalEntry["kind"], string> = { script: "Script", gratitude: "Gratitude" };

const FIRST = 6;

export interface PastPagesProps {
  entries: readonly JournalEntry[];
  onOpen: (id: string) => void;
}

export function PastPages({ entries, onOpen }: PastPagesProps) {
  const [all, setAll] = useState(false);
  const shown = all ? entries : entries.slice(0, FIRST);
  return (
    <View style={styles.block}>
      <SectionHead title="Past pages" note={entries.length > 0 ? String(entries.length) : undefined} />
      {entries.length === 0 ? (
        <View style={styles.empty} testID="pages-empty">
          <RitualGlyph name="page" size={28} color={colors.ink48} />
          <T variant="caption" tone="muted" style={styles.emptyText}>
            Pages you seal rest here, and Vela keeps every one.
          </T>
        </View>
      ) : (
        <VellumCard padding="none">
          {shown.map((e, i) => {
            const d = dayParts(e.dateKey);
            return (
              <Press
                key={e.id}
                onPress={() => onOpen(e.id)}
                testID={`page-${e.id}`}
                accessibilityLabel={`${KIND_LABEL[e.kind]}, ${d.long}. ${pagePreview(e)}`}
                pressScale={0.99}
                style={[styles.row, i > 0 && styles.divider]}
              >
                <View style={styles.date}>
                  <T variant="title" tone="gold" numeric center>
                    {d.day}
                  </T>
                  <T variant="caption" tone="faint" center>
                    {d.month}
                  </T>
                </View>
                <View style={styles.text}>
                  <T variant="eyebrow" tone="faint">
                    {KIND_LABEL[e.kind]}
                  </T>
                  <T variant="reading" tone="secondary" numberOfLines={2}>
                    {pagePreview(e)}
                  </T>
                </View>
                <ChevronRight color={colors.ink48} size={18} strokeWidth={1.75} />
              </Press>
            );
          })}
        </VellumCard>
      )}
      {!all && entries.length > FIRST ? (
        <GhostButton label={`Show all ${entries.length} pages`} onPress={() => setAll(true)} testID="pages-more" tone="muted" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.base, paddingVertical: space.base, paddingHorizontal: space.base },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  date: { width: 40, alignItems: "center" },
  text: { flex: 1, gap: space.xxs },
  empty: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  emptyText: { flex: 1 },
});
