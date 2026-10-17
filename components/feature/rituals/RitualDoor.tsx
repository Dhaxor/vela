// A practice door on the Rituals tab: an arched medallion with the practice's
// sign, its name in the serif title voice, one line of tonight's context, and
// a quiet status on the right (11 / 18, or 'Kept tonight').
import React from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { T, VellumCard } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { RitualGlyph, type RitualGlyphName } from "./RitualGlyph";

export interface RitualDoorProps {
  glyph: RitualGlyphName;
  title: string;
  /** Tonight's context: the prompt, the line, the stems. */
  line: string;
  /** Short eyebrow above the line ('Tonight's prompt'). */
  eyebrow?: string;
  /** Right-hand status (numerals in gold), e.g. '11 / 18'. */
  status?: string;
  /** Done for today: the status reads in gold with a seal. */
  done?: boolean;
  /** 369 only: lit dots in the sign. */
  lit?: number;
  /** Render the line in the serif italic (a prompt or the person's line). */
  lineVoice?: "ui" | "words";
  onPress: () => void;
  testID: string;
  accessibilityHint?: string;
}

export function RitualDoor({ glyph, title, line, eyebrow, status, done = false, lit, lineVoice = "ui", onPress, testID, accessibilityHint }: RitualDoorProps) {
  return (
    <VellumCard
      onPress={onPress}
      padding="compact"
      testID={testID}
      accessibilityLabel={`${title}. ${status ? `${status}. ` : ""}${line}`}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.row}>
        <View style={[styles.arch, done && styles.archDone]}>
          <RitualGlyph name={glyph} size={30} lit={lit} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <T variant="title" numberOfLines={1} style={styles.title}>
              {title}
            </T>
            {status ? (
              <T variant="caption" tone={done ? "gold" : "muted"} numeric numberOfLines={1}>
                {status}
              </T>
            ) : null}
          </View>
          {eyebrow ? (
            <T variant="eyebrow" tone="faint" numberOfLines={1}>
              {eyebrow}
            </T>
          ) : null}
          <T variant="caption" italic={lineVoice === "words"} tone="secondary" numberOfLines={2}>
            {line}
          </T>
        </View>
        <ChevronRight color={colors.ink48} size={20} strokeWidth={1.75} />
      </View>
    </VellumCard>
  );
}

const ARCH_W = 56;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.base },
  // A door: square foot, round head, like the arched windows of an old observatory.
  arch: {
    width: ARCH_W,
    height: 68,
    borderTopLeftRadius: ARCH_W / 2,
    borderTopRightRadius: ARCH_W / 2,
    borderBottomLeftRadius: radius.xs,
    borderBottomRightRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.sky800,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: space.xs,
  },
  archDone: { borderColor: colors.goldLine },
  body: { flex: 1, gap: space.xxs },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.sm },
  title: { flexShrink: 1 },
});
