// The dream's own fields, shared by First Light (onboarding) and the
// additional-dream intake (/story/new) so both read the same:
// - FocusChips: one area per dream, as AreaSign chips (compact single choice).
// - DesireField: 'Say it however it comes out', with 4 tap-in phrases per focus.
// - FeelingChips: how it feels when it's real (the six 1.0 feeling ids).
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";
import { LIMITS } from "@/contexts/arc.types";
import { ONBOARDING_CHIPS } from "@/lib/story/content";
import { AreaSign } from "@/components/glyphs";
import { Chip, ChipGroup, T, TextField, useGutter } from "@/components/ui";
import { colors, space } from "@/constants/theme";

/* ------------------------------------------------------------------ focus */

export interface FocusChipsProps {
  value: FocusId | null;
  onChange: (focus: FocusId) => void;
  /** Areas to list first (the user's own focus areas). */
  preferred?: readonly FocusId[];
  testIDPrefix: string;
}

export function FocusChips({ value, onChange, preferred = [], testIDPrefix }: FocusChipsProps) {
  const ordered = [...FOCUS_AREAS].sort((a, b) => Number(preferred.includes(b.id)) - Number(preferred.includes(a.id)));
  return (
    <ChipGroup
      accessibilityLabel="Where it lives"
      options={ordered.map((f) => ({
        value: f.id,
        label: f.label,
        icon: <AreaSign focus={f.id} size={20} color={colors.ink80} />,
      }))}
      value={value}
      onChange={onChange}
      testIDPrefix={testIDPrefix}
    />
  );
}

/* ----------------------------------------------------------------- desire */

export interface DesireFieldProps {
  focus: FocusId | null;
  value: string;
  onChangeText: (text: string) => void;
  testID: string;
  /** testID per suggestion: `${suggestionPrefix}${index}`. */
  suggestionPrefix: string;
  label?: string;
  autoFocus?: boolean;
}

export function DesireField({ focus, value, onChangeText, testID, suggestionPrefix, label, autoFocus }: DesireFieldProps) {
  const gutter = useGutter();
  const suggestions = focus ? ONBOARDING_CHIPS.desires[focus] : [];
  const trimmed = value.trim().toLowerCase();
  return (
    <View>
      <TextField
        label={label}
        voice="words"
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder="Say it however it comes out"
        maxLength={LIMITS.desire}
        autoCapitalize="none"
        autoFocus={autoFocus}
        testID={testID}
        accessibilityLabel={label ?? "In your own words"}
      />
      {suggestions.length > 0 ? (
        <>
          <T variant="eyebrow" style={styles.sublabel}>
            Or begin with
          </T>
          {/* One swipeable row, bleeding to the screen edges, so the feelings below stay in view. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ marginHorizontal: -gutter }}
            contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
            accessibilityLabel="Suggestions"
          >
            {suggestions.map((s, i) => (
              <Chip
                key={s}
                label={s}
                selected={trimmed === s.toLowerCase()}
                onPress={() => onChangeText(s)}
                testID={`${suggestionPrefix}${i}`}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- feeling */

export type FeelingId = (typeof ONBOARDING_CHIPS.feelings)[number]["id"];

export interface FeelingChipsProps {
  value: string | null;
  onChange: (feeling: string) => void;
  testIDPrefix: string;
}

export function FeelingChips({ value, onChange, testIDPrefix }: FeelingChipsProps) {
  return (
    <ChipGroup
      accessibilityLabel="When it's real, you feel"
      options={ONBOARDING_CHIPS.feelings.map((f) => ({ value: f.id, label: f.label }))}
      value={value}
      onChange={onChange}
      testIDPrefix={testIDPrefix}
    />
  );
}

const styles = StyleSheet.create({
  sublabel: { marginTop: space.lg, marginBottom: space.md },
  row: { flexDirection: "row", gap: space.sm },
});
