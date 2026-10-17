// Listening > Soundscape: the default bed under every chapter. Night is free;
// a Plus bed without Plus shows a small lock and opens the paywall at the
// soundscapes (from=bed) instead of pretending to switch.
import React from "react";
import { StyleSheet, View } from "react-native";
import { Lock } from "lucide-react-native";
import { SOUNDSCAPES, isBedLocked, type BedId } from "@/lib/audio";
import { Chip } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export interface BedPickerProps {
  value: BedId;
  isPlus: boolean;
  onChange: (bed: BedId) => void;
  onLocked: (bed: BedId) => void;
}

export function BedPicker({ value, isPlus, onChange, onLocked }: BedPickerProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Soundscape">
      {SOUNDSCAPES.map((b) => {
        const locked = isBedLocked(b.id, isPlus);
        return (
          <Chip
            key={b.id}
            label={b.label}
            role="radio"
            selected={b.id === value}
            icon={locked ? <Lock color={colors.ink48} size={14} strokeWidth={1.75} /> : undefined}
            onPress={() => (locked ? onLocked(b.id) : onChange(b.id))}
            testID={`settings-bed-${b.id}`}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
