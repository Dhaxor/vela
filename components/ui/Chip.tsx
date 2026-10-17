// Chips for quick picks (feelings, desire suggestions, filters). Selected =
// raised sky surface + 1.5px gold300 border + a gold check, never a gold fill.
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Check } from "@/components/glyphs/icons";
import { colors, radius, space } from "@/constants/theme";
import { Press } from "./Press";
import { T } from "./T";
import { haptics } from "./haptics";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Leading glyph shown when not selected (selected shows the check). */
  icon?: React.ReactNode;
  /** 'radio' in single-select groups, 'checkbox' in multi-select ones. */
  role?: "radio" | "checkbox" | "button";
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, icon, role = "button", disabled, testID, style }: ChipProps) {
  return (
    <Press
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === "button" ? { selected } : { checked: selected }}
      disabled={disabled}
      hitSlop={{ top: 2, bottom: 2 }}
      pressScale={0.95}
      onPress={() => {
        haptics.select();
        onPress?.();
      }}
      style={[styles.chip, selected && styles.on, disabled && styles.inert, style]}
    >
      {selected ? <Check color={colors.gold300} size={16} strokeWidth={2.25} /> : icon}
      <T variant="body" tone={selected ? "primary" : "secondary"} numberOfLines={1}>
        {label}
      </T>
    </Press>
  );
}

export interface ChipOption<V extends string> {
  value: V;
  label: string;
  icon?: React.ReactNode;
}

interface ChipGroupBase<V extends string> {
  options: readonly ChipOption<V>[];
  /** testID per chip: `${testIDPrefix}${value}` (keeps 1.0 ids like 'feeling-proud'). */
  testIDPrefix?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export interface SingleChipGroupProps<V extends string> extends ChipGroupBase<V> {
  multiple?: false;
  value: V | null;
  onChange: (value: V) => void;
}

export interface MultiChipGroupProps<V extends string> extends ChipGroupBase<V> {
  multiple: true;
  value: readonly V[];
  onChange: (value: V[]) => void;
  /** Cap on selections; extra taps are ignored. */
  max?: number;
}

export type ChipGroupProps<V extends string> = SingleChipGroupProps<V> | MultiChipGroupProps<V>;

/** Toggle `value` in a multi-select list, honouring an optional cap. Pure. */
export function toggleSelection<V>(current: readonly V[], value: V, max?: number): V[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  if (max !== undefined && current.length >= max) return [...current];
  return [...current, value];
}

export function ChipGroup<V extends string>(props: SingleChipGroupProps<V>): React.JSX.Element;
export function ChipGroup<V extends string>(props: MultiChipGroupProps<V>): React.JSX.Element;
export function ChipGroup<V extends string>(props: ChipGroupProps<V>): React.JSX.Element {
  const { options, testIDPrefix, accessibilityLabel, style } = props;
  const isOn = (v: V) => (props.multiple ? props.value.includes(v) : props.value === v);
  const press = (v: V) => {
    if (props.multiple) props.onChange(toggleSelection(props.value, v, props.max));
    else props.onChange(v);
  };
  return (
    <View
      style={[styles.group, style]}
      accessibilityRole={props.multiple ? undefined : "radiogroup"}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          icon={o.icon}
          selected={isOn(o.value)}
          role={props.multiple ? "checkbox" : "radio"}
          onPress={() => press(o.value)}
          testID={testIDPrefix ? `${testIDPrefix}${o.value}` : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  on: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5, paddingHorizontal: space.base - 0.5 },
  inert: { opacity: 0.4 },
  group: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
