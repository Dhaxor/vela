// 'Pause my sky': a rest of up to 30 nights. Reminders stop, the weekly
// rhythm shows paused nights instead of rest nights, and nothing is taken:
// every star and chapter stays. Choices name the day the sky picks up again.
import React from "react";
import { StyleSheet, View } from "react-native";
import { GhostButton, Sheet, T, VellumCard } from "@/components/ui";
import { space } from "@/constants/theme";
import { formatDay, type PauseOption } from "./time";

export interface PauseSheetProps {
  visible: boolean;
  options: readonly PauseOption[];
  onPick: (option: PauseOption) => void;
  onClose: () => void;
}

export function PauseSheet({ visible, options, onPick, onClose }: PauseSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Pause my sky"
      subtitle="Rest without reminders. Your stars, chapters and rhythm stay exactly as they are."
      testID="settings-pause-sheet"
      footer={<GhostButton label="Not now" tone="muted" onPress={onClose} testID="settings-pause-cancel" />}
    >
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="How long">
        {options.map((o) => (
          <VellumCard
            key={o.nights}
            padding="compact"
            onPress={() => onPick(o)}
            testID={`settings-pause-${o.nights}`}
            accessibilityLabel={`${o.label}. Resumes ${formatDay(o.resumes)}`}
          >
            <View style={styles.row}>
              <T variant="body" strong tone="primary" style={styles.flex}>
                {o.label}
              </T>
              <T variant="caption" tone="muted" numeric>
                {`Resumes ${formatDay(o.resumes)}`}
              </T>
            </View>
          </VellumCard>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
});
