// 'Your line' on the open sky: today's identity line, born from the person's
// newest proof (kind × focus), with where it came from underneath. Before the
// first proof it is the day's line from the library, and says so. Tapping the
// line opens it full screen (/affirmation); carrying it records 'line-carried'.
import React from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { Press, SecondaryButton, T, UserWords } from "@/components/ui";
import { StarProof } from "@/components/glyphs";
import type { ProofKind } from "@/contexts/arc.types";
import { colors, space } from "@/constants/theme";
import type { YourLine } from "@/lib/rituals";
import { dayParts } from "./dates";
import { SectionHead } from "./SectionHead";

export const BORN_FROM: Record<ProofKind, string> = {
  did: "Born from what you did",
  moved: "Born from a step you took",
  learned: "Born from what you learned",
};

export interface YourLineBlockProps {
  line: YourLine | null;
  /** The library's line for today, shown before the first proof. */
  fallback: { text: string; area: string } | null;
  carried: boolean;
  onCarry: () => void;
  onOpen: () => void;
  onLibrary: () => void;
}

export function YourLineBlock({ line, fallback, carried, onCarry, onOpen, onLibrary }: YourLineBlockProps) {
  const text = line?.text ?? fallback?.text ?? "";
  if (!text) return null;
  return (
    <View style={styles.block}>
      <SectionHead
        title={line ? "Your line" : "Today's line"}
        action={{ label: "Library", onPress: onLibrary, testID: "rituals-library", accessibilityLabel: "Open the line library" }}
      />
      <Press onPress={onOpen} testID="rituals-line" accessibilityLabel={`Your line: ${text}`} accessibilityHint="Opens the line full screen" pressScale={0.99} style={styles.line}>
        {line ? (
          <View style={styles.kindRow}>
            <StarProof kind={line.kind} size={16} />
            <T variant="caption" tone="muted">
              {BORN_FROM[line.kind]}
            </T>
          </View>
        ) : null}
        <T variant="title">{text}</T>
      </Press>
      {line ? (
        <View style={styles.source}>
          <T variant="caption" tone="faint" numeric>
            {`Your proof of ${dayParts(line.proof.dateKey).short}`}
          </T>
          <UserWords variant="caption" numberOfLines={1}>
            {line.proof.text}
          </UserWords>
        </View>
      ) : fallback ? (
        <T variant="caption" tone="muted">
          {`${fallback.area} · your own lines are born from your first proof.`}
        </T>
      ) : null}
      {carried ? (
        <View style={styles.carried} testID="rituals-carried" accessible accessibilityLabel="Carried today">
          <View style={styles.check}>
            <Check color={colors.onGold} size={12} strokeWidth={3} />
          </View>
          <T variant="caption" strong tone="gold">
            Carried today
          </T>
        </View>
      ) : (
        <SecondaryButton label="Carry it today" onPress={onCarry} testID="rituals-carry" style={styles.carry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  line: { gap: space.sm },
  kindRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  source: { gap: space.xxs },
  carry: { alignSelf: "flex-start", height: 44, marginTop: space.xs },
  carried: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44, marginTop: space.xs },
  check: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold300, alignItems: "center", justifyContent: "center" },
});
