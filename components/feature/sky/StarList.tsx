// 'See as a list': the same stars as plain rows, for VoiceOver, large text
// and anyone who would rather read than tap points of light. The anchor (the
// dream) comes first, then each star in the order it was lit, then the
// stars still to come as quiet placeholders.
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ChevronRight } from "lucide-react-native";
import { useArc } from "@/contexts/ArcContext";
import { STARS_PER_SEASON, type Dream, type Proof } from "@/contexts/arc.types";
import { sparklePath } from "@/lib/sky/shapes";
import { toRoman } from "@/lib/sky/numerals";
import { PROOF_LABEL, StarProof } from "@/components/glyphs";
import { Press, T } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { dayMonth, dreamDay } from "@/components/feature/today/time";
import type { StarSelection } from "./StarDetailSheet";

export interface StarListProps {
  dream: Dream;
  season: number;
  proofs: readonly Proof[];
  onSelect: (selection: StarSelection) => void;
}

function Anchor() {
  return (
    <Svg width={28} height={28}>
      <Path d={sparklePath(14, 14, 12, 0.2)} fill={colors.gold300} />
    </Svg>
  );
}

export function StarList({ dream, season, proofs, onSelect }: StarListProps) {
  const arc = useArc();
  const remaining = Math.max(0, STARS_PER_SEASON - proofs.length);
  return (
    <View style={styles.list} testID="sky-list" accessibilityRole="list">
      <Press
        onPress={() => onSelect({ kind: "anchor", season })}
        accessibilityLabel={`The anchor, your dream: ${dream.desire}`}
        testID="sky-list-anchor"
        pressScale={0.98}
        style={styles.row}
      >
        <View style={styles.glyph}>
          <Anchor />
        </View>
        <View style={styles.text}>
          <T variant="eyebrow" tone="gold">
            The anchor · your dream
          </T>
          <T variant="reading" italic tone="gold" numberOfLines={2}>
            “{dream.desire}”
          </T>
        </View>
        <ChevronRight color={colors.ink48} size={18} strokeWidth={1.75} />
      </Press>

      {proofs.map((p) => {
        const chapter = p.wovenInChapterId ? arc.chapterMeta(p.wovenInChapterId) : undefined;
        const day = `Day ${dreamDay(dream.createdAt, p.dateKey)} · ${dayMonth(p.dateKey)}`;
        return (
          <Press
            key={p.id}
            onPress={() => onSelect({ kind: "proof", proofId: p.id })}
            accessibilityLabel={`Star ${p.starIndex}, ${PROOF_LABEL[p.kind]}, ${day}: ${p.text}${chapter ? `. Changed Chapter ${toRoman(chapter.number)}` : ""}`}
            testID={`sky-list-star-${p.starIndex}`}
            pressScale={0.98}
            style={styles.row}
          >
            <View style={styles.glyph}>
              <StarProof kind={p.kind} size={24} />
            </View>
            <View style={styles.text}>
              <T variant="eyebrow" tone={p.kind}>
                Star {p.starIndex} · {PROOF_LABEL[p.kind]}
              </T>
              <T variant="body" tone="primary" numberOfLines={3}>
                {p.text}
              </T>
              <T variant="caption" tone="muted" numeric>
                {day}
                {chapter ? ` · changed Chapter ${toRoman(chapter.number)}` : ""}
              </T>
            </View>
            <ChevronRight color={colors.ink48} size={18} strokeWidth={1.75} />
          </Press>
        );
      })}

      {remaining > 0 ? (
        <View style={styles.rest} accessible accessibilityLabel={`${remaining} ${remaining === 1 ? "star" : "stars"} still to light`}>
          <View style={styles.dots}>
            {Array.from({ length: remaining }, (_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
          <T variant="caption" tone="faint">
            {remaining === STARS_PER_SEASON ? "Seven stars to light this season." : `${remaining} ${remaining === 1 ? "star" : "stars"} still to light.`}
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.base,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  glyph: { width: 32, alignItems: "center" },
  text: { flex: 1, gap: space.xxs },
  rest: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.base, paddingTop: space.sm },
  dots: { flexDirection: "row", gap: space.sm, width: 32 + space.base, flexWrap: "wrap" },
  dot: { width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: colors.ink48 },
});
