// Import a backup when this device already holds something: what the file
// holds next to what is here, then merge (recommended: keeps everything and
// adds what is new) or replace (the file becomes the truth). Replace asks
// once more in a destructive ConfirmSheet before anything changes.
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ImportMode, ImportPlan } from "@/lib/backup";
import { DangerButton, GhostButton, PrimaryButton, Sheet, T, VellumCard } from "@/components/ui";
import { colors, space } from "@/constants/theme";
import { backupSummaryLine } from "./time";

export interface ImportSheetProps {
  visible: boolean;
  plan: ImportPlan | null;
  /** '21 Oct 2026', or null. */
  exportedOn: string | null;
  busy?: boolean;
  onChoose: (mode: ImportMode) => void;
  onClose: () => void;
}

const CHOICES: readonly { mode: ImportMode; title: string; body: string }[] = [
  { mode: "merge", title: "Merge", body: "Keep everything on this device and add what's new from the file." },
  { mode: "replace", title: "Replace", body: "Make this device match the file. What's here now is removed." },
];

export function ImportSheet({ visible, plan, exportedOn, busy, onChoose, onClose }: ImportSheetProps) {
  const [mode, setMode] = useState<ImportMode>("merge");
  useEffect(() => {
    if (visible) setMode(plan?.recommended ?? "merge");
  }, [visible, plan]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Import backup"
      subtitle={exportedOn ? `Saved ${exportedOn}.` : undefined}
      scroll
      testID="settings-import-sheet"
      footer={
        <>
          {mode === "merge" ? (
            <PrimaryButton label="Merge backup" onPress={() => onChoose("merge")} loading={busy} testID="settings-import-merge" />
          ) : (
            <DangerButton label="Replace with backup" onPress={() => onChoose("replace")} loading={busy} testID="settings-import-replace" />
          )}
          <GhostButton label="Cancel" tone="muted" onPress={onClose} testID="settings-import-cancel" />
        </>
      }
    >
      {plan ? (
        <View style={styles.compare}>
          <Line label="In the file" value={backupSummaryLine(plan.incoming)} />
          <Line label="On this device" value={backupSummaryLine(plan.current)} />
        </View>
      ) : null}
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="How to import">
        {CHOICES.map((c) => (
          <VellumCard
            key={c.mode}
            padding="compact"
            selected={mode === c.mode}
            onPress={() => setMode(c.mode)}
            testID={`settings-import-choice-${c.mode}`}
            accessibilityLabel={`${c.title}${c.mode === plan?.recommended ? ", recommended" : ""}. ${c.body}`}
          >
            <T variant="body" strong tone={c.mode === "replace" && mode === "replace" ? "danger" : "primary"}>
              {c.mode === plan?.recommended ? `${c.title} · recommended` : c.title}
            </T>
            <T variant="caption" tone="muted" style={styles.choiceBody}>
              {c.body}
            </T>
          </VellumCard>
        ))}
      </View>
    </Sheet>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <T variant="eyebrow">{label}</T>
      <T variant="body" tone="secondary" numeric>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  compare: {
    gap: space.md,
    paddingBottom: space.base,
    marginBottom: space.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  line: { gap: space.xxs },
  choices: { gap: space.sm },
  choiceBody: { marginTop: space.xxs, paddingRight: space.lg },
});
