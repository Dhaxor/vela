// The soft Plus nudge (ELEVATE §0.12 'after the 2nd proof via the asks
// arbiter'): one quiet row under the Star Birth, never a sheet over it and no
// filled button, so the moment keeps its one CTA. Honest about what is free.
// The dismiss control sits beside the card, not inside it (no nested buttons).
import React from "react";
import { StyleSheet, View } from "react-native";
import { X } from "@/components/glyphs/icons";
import { IconButton, T, VellumCard } from "@/components/ui";
import { VelaMark } from "@/components/glyphs";
import { colors, hitSize, space } from "@/constants/theme";

export interface PlusNudgeCardProps {
  onOpen: () => void;
  onDismiss: () => void;
  testID?: string;
}

export function PlusNudgeCard({ onOpen, onDismiss, testID = "evidence-plus-nudge" }: PlusNudgeCardProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <VellumCard
        padding="compact"
        onPress={onOpen}
        testID={`${testID}-open`}
        accessibilityLabel="Room for a second dream. See Vela Plus"
        accessibilityHint="Opens Vela Plus. Everything you have charted stays free."
      >
        <View style={styles.row}>
          <VelaMark size={28} />
          <View style={styles.copy}>
            <T variant="body" strong tone="primary" numberOfLines={1}>
              Room for a second dream
            </T>
            <T variant="caption" tone="muted">
              Vela Plus keeps more dreams weaving. What you've charted stays free.
            </T>
          </View>
        </View>
      </VellumCard>
      <IconButton accessibilityLabel="Not now" onPress={onDismiss} testID={`${testID}-close`} style={styles.close}>
        <X color={colors.ink48} size={16} strokeWidth={1.75} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingRight: hitSize - space.sm },
  copy: { flex: 1, gap: space.xxs },
  close: { position: "absolute", right: space.xs },
});
