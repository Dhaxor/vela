// Today's bridge, as the proof form's anchor: the violet bridge card with the
// tier, the bridge sentence and the if-then line the user rehearsed.
import React from "react";
import { StyleSheet, View } from "react-native";
import type { Bridge } from "@/contexts/arc.types";
import { TIER_LABEL } from "@/lib/futureMemory";
import { GhostButton, T, VellumCard } from "@/components/ui";
import { BridgeGlyph } from "@/components/glyphs";
import { colors, space } from "@/constants/theme";

/** 'If it's 9am and I hesitate, then I open the sketchbook.' */
export function ifThenLine(bridge: Pick<Bridge, "ifThen">): string | null {
  const it = bridge.ifThen;
  if (!it || !it.when.trim() || !it.then.trim()) return null;
  const then = it.then.trim().replace(/[.!?…]+$/u, "");
  return `If it's ${it.when.trim()} and I hesitate, then I ${then}.`;
}

export interface BridgeSummaryProps {
  bridge: Bridge;
  /** Shows the bridge's other honest outcome, 'Not today' (a learned star). */
  onNotToday?: () => void;
  /** Short screens: the bridge in two lines, without the if-then rehearsal. */
  compact?: boolean;
  testID?: string;
}

export function BridgeSummary({ bridge, onNotToday, compact = false, testID }: BridgeSummaryProps) {
  const plan = compact ? null : ifThenLine(bridge);
  return (
    <VellumCard tone="bridge" testID={testID}>
      <View style={styles.head}>
        <BridgeGlyph size={20} />
        <T variant="eyebrow" tone="violet" numberOfLines={1} style={styles.flex}>
          {`Today's bridge · ${TIER_LABEL[bridge.tier]}`}
        </T>
      </View>
      <T variant="body" tone="primary" style={styles.text} numberOfLines={compact ? 2 : undefined}>
        {bridge.text}
      </T>
      {plan ? (
        <T variant="caption" tone="muted" style={styles.plan}>
          {plan}
        </T>
      ) : null}
      {onNotToday ? (
        <View style={styles.footer}>
          <T variant="caption" tone="muted" style={styles.flex}>
            Didn't happen today?
          </T>
          <GhostButton
            label="Not today"
            tone="violet"
            onPress={onNotToday}
            accessibilityHint="Keep it as a learned star instead"
            testID={testID ? `${testID}-not-today` : undefined}
            style={styles.notToday}
          />
        </View>
      ) : null}
    </VellumCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  text: { marginTop: space.md },
  plan: { marginTop: space.sm },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.base,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.violetLine,
  },
  notToday: { marginRight: -space.md },
});
