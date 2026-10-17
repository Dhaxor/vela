// Ritual: morning, evening or both, each with a time. Reminders are explained
// here but never requested: the permission ask belongs to the moment a bridge
// is chosen (CONTRACTS §11).
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { RitualTime } from "@/contexts/user.types";
import { sparklePath } from "@/lib/sky";
import { CheckBadge, Segmented, T, VellumCard } from "@/components/ui";
import { colors, space } from "@/constants/theme";
import { TIME_PRESETS, formatPreset, slotsFor, type RitualSlot } from "./ritualTimes";

/* ---------------------------------------------------------------- glyphs */

const LINE = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

/** Morning: the sun's first arc over the horizon. Evening: a star above it. Atlas line-art. */
export function RitualGlyph({ ritual, size = 28, color = colors.ink80 }: { ritual: RitualTime; size?: number; color?: string }) {
  const stroke = { stroke: color, strokeWidth: 1.5, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path d="M3.5 20 H24.5" {...stroke} />
      {ritual !== "evening" ? (
        <>
          <Path d={ritual === "both" ? "M5.5 20 A5 5 0 0 1 15.5 20" : "M8 20 A6 6 0 0 1 20 20"} {...stroke} />
          {ritual === "morning" ? (
            <>
              <Path d="M14 9.5 V11.5" {...stroke} />
              <Path d="M7.2 12.4 L8.6 13.8" {...stroke} />
              <Path d="M20.8 12.4 L19.4 13.8" {...stroke} />
            </>
          ) : null}
        </>
      ) : null}
      {ritual !== "morning" ? (
        <Path d={ritual === "both" ? sparklePath(20, 11.5, 4.2, 0.22) : sparklePath(14, 11, 5.4, 0.22)} fill={color} />
      ) : null}
      {ritual === "evening" ? <Circle cx={21.5} cy={6.5} r={1} fill={color} /> : null}
    </Svg>
  );
}

/* ---------------------------------------------------------------- picker */

const OPTIONS: { id: RitualTime; label: string; body: string }[] = [
  { id: "morning", label: "Morning", body: "Carry the chapter into your day." },
  { id: "evening", label: "Evening", body: "End the day inside the life you're building." },
  { id: "both", label: "Both", body: "Begin and close the day with it." },
];

const SLOT_LABEL: Record<RitualSlot, string> = { morning: "Morning", evening: "Evening" };

export interface RitualPickerProps {
  ritual: RitualTime | null;
  onRitual: (ritual: RitualTime) => void;
  times: Record<RitualSlot, string>;
  onTime: (slot: RitualSlot, preset: string) => void;
}

export function RitualPicker({ ritual, onRitual, times, onTime }: RitualPickerProps) {
  const slots = slotsFor(ritual);
  return (
    <View>
      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Ritual">
        {OPTIONS.map((o) => {
          const on = ritual === o.id;
          return (
            <VellumCard
              key={o.id}
              padding="compact"
              style={[styles.option, on && styles.on]}
              onPress={() => onRitual(o.id)}
              testID={`ritual-${o.id}`}
              accessibilityLabel={`${o.label}. ${o.body}`}
            >
              <RitualGlyph ritual={o.id} color={on ? colors.gold300 : colors.ink80} />
              <View style={styles.optionText}>
                <T variant="body" strong tone="primary">
                  {o.label}
                </T>
                <T variant="caption" tone={on ? "secondary" : "muted"}>
                  {o.body}
                </T>
              </View>
              {on ? <CheckBadge /> : <View style={styles.badgeSpace} />}
            </VellumCard>
          );
        })}
      </View>

      {slots.map((slot) => (
        <View key={slot} style={styles.slot}>
          <T variant="eyebrow" style={styles.slotLabel}>
            {`${SLOT_LABEL[slot]} chapter at`}
          </T>
          <Segmented
            options={TIME_PRESETS[slot].map((p) => ({ value: p, label: formatPreset(p), accessibilityLabel: `${SLOT_LABEL[slot]} at ${formatPreset(p)}` }))}
            value={times[slot]}
            onChange={(p) => onTime(slot, p)}
            testID={`onboarding-time-${slot}`}
            accessibilityLabel={`${SLOT_LABEL[slot]} time`}
          />
        </View>
      ))}

      {slots.length > 0 ? (
        <View style={styles.note} testID="onboarding-reminder-note">
          <T variant="eyebrow" style={styles.noteLabel}>
            Reminders
          </T>
          <T variant="caption" tone="secondary">
            When you choose your first step, Vela can offer a quiet reminder at this time. You decide then; nothing is asked now. Change times any day in Settings.
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { gap: space.md },
  option: { flexDirection: "row", alignItems: "center", gap: space.base },
  on: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5 },
  optionText: { flex: 1, gap: space.xxs },
  badgeSpace: { width: 18 },
  slot: { marginTop: space.lg },
  slotLabel: { marginBottom: space.sm },
  note: {
    marginTop: space.lg,
    paddingTop: space.base,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  noteLabel: { marginBottom: space.xs },
});
