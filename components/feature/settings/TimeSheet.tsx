// The precise ritual-time picker (onboarding offers presets; Settings keeps
// the exact control). No native picker dependency, so it behaves the same on
// iOS and the web: the time in display numerals, an hour stepper, a minute
// stepper in 5-minute steps, and four quick picks for the slot.
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Minus, Plus } from "@/components/glyphs/icons";
import type { HHmm } from "@/contexts/user.types";
import { Chip, GhostButton, IconButton, PrimaryButton, Sheet, T } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { SLOT_LABEL, TIME_PRESETS, deviceUses12h, formatClock, hourLabel, parseHHmm, stepHour, stepMinutes, type RitualSlot } from "./time";

export interface TimeSheetProps {
  visible: boolean;
  slot: RitualSlot;
  value: HHmm;
  onSave: (value: HHmm) => void;
  onClose: () => void;
}

export function TimeSheet({ visible, slot, value, onSave, onClose }: TimeSheetProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const [hour12] = useState(deviceUses12h);
  const t = parseHHmm(draft) ?? { h: 21, m: 0 };
  const shown = formatClock(draft, hour12);
  const label = SLOT_LABEL[slot];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`${label} chapter`}
      subtitle="Your ritual time. Reminders, when they're on, arrive then."
      testID="settings-time-sheet"
      footer={
        <>
          <PrimaryButton label={`Set ${shown}`} onPress={() => onSave(draft)} testID="settings-time-save" />
          <GhostButton label="Cancel" tone="muted" onPress={onClose} testID="settings-time-cancel" />
        </>
      }
    >
      <View style={styles.face} accessibilityLiveRegion="polite">
        <T variant="display" numeric center testID="settings-time-value" accessibilityLabel={`${label} time, ${shown}`}>
          {shown}
        </T>
      </View>

      <View style={styles.steppers}>
        <Stepper
          label="Hour"
          value={hourLabel(draft, hour12)}
          onLess={() => setDraft(stepHour(draft, -1))}
          onMore={() => setDraft(stepHour(draft, 1))}
          lessLabel="An hour earlier"
          moreLabel="An hour later"
          testID="settings-time-hour"
        />
        <Stepper
          label="Minutes"
          value={String(t.m).padStart(2, "0")}
          onLess={() => setDraft(stepMinutes(draft, -1))}
          onMore={() => setDraft(stepMinutes(draft, 1))}
          lessLabel="Five minutes earlier"
          moreLabel="Five minutes later"
          testID="settings-time-minute"
        />
      </View>

      <View style={styles.presets} accessibilityLabel="Quick picks">
        {TIME_PRESETS[slot].map((p) => (
          <Chip key={p} label={formatClock(p, hour12)} selected={p === draft} role="radio" onPress={() => setDraft(p)} testID={`settings-time-preset-${p.replace(":", "")}`} />
        ))}
      </View>
    </Sheet>
  );
}

interface StepperProps {
  label: string;
  value: string;
  onLess: () => void;
  onMore: () => void;
  lessLabel: string;
  moreLabel: string;
  testID: string;
}

function Stepper({ label, value, onLess, onMore, lessLabel, moreLabel, testID }: StepperProps) {
  return (
    <View style={styles.stepper} testID={testID}>
      <T variant="eyebrow" center>
        {label}
      </T>
      <View style={styles.stepRow}>
        <IconButton accessibilityLabel={lessLabel} onPress={onLess} variant="vellum" testID={`${testID}-less`}>
          <Minus color={colors.ink80} size={18} strokeWidth={1.75} />
        </IconButton>
        <T variant="title" numeric center style={styles.stepValue}>
          {value}
        </T>
        <IconButton accessibilityLabel={moreLabel} onPress={onMore} variant="vellum" testID={`${testID}-more`}>
          <Plus color={colors.ink80} size={18} strokeWidth={1.75} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: space.base,
    marginBottom: space.base,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.goldEngrave,
  },
  steppers: { flexDirection: "row", gap: space.base },
  stepper: { flex: 1, gap: space.sm },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepValue: { flex: 1 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.lg },
});
