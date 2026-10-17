// Settings v2 building blocks, in the Night Atlas materials:
// - SettingsGroup: an eyebrow, one vellum card of rows split by hairlines,
//   and an optional caption under the card.
// - SettingsRow: a 56pt row; tappable rows carry a chevron, values sit right.
// - SwitchRow: a row whose control is the Switch (the testID goes on it).
// - ControlRow: a label over a full-width control (segmented, chips, stars).
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Press, Switch, T, VellumCard } from "@/components/ui";
import { colors, hitSize, space } from "@/constants/theme";

export interface SettingsGroupProps {
  title: string;
  /** The first group sits closer to the header. */
  first?: boolean;
  /** Quiet line under the card. */
  caption?: string;
  children: React.ReactNode;
  testID?: string;
}

export function SettingsGroup({ title, first = false, caption, children, testID }: SettingsGroupProps) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, first && styles.firstGroup]} testID={testID}>
      <T variant="eyebrow" accessibilityRole="header" style={styles.groupTitle}>
        {title}
      </T>
      <VellumCard padding="none">
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </React.Fragment>
        ))}
      </VellumCard>
      {caption ? (
        <T variant="caption" tone="muted" style={styles.caption}>
          {caption}
        </T>
      ) : null}
    </View>
  );
}

export interface SettingsRowProps {
  label: string;
  /** One quiet line under the label. */
  detail?: string | null;
  /** Shown on the right (e.g. '9:00 PM'). */
  value?: string | null;
  /** Leading mark (a glyph at ~24pt). */
  icon?: React.ReactNode;
  onPress?: () => void;
  /** Right-side control instead of the chevron. */
  accessory?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  tone?: "primary" | "danger";
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function SettingsRow({ label, detail, value, icon, onPress, accessory, loading, disabled, tone = "primary", testID, accessibilityLabel, accessibilityHint }: SettingsRowProps) {
  const body = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.text}>
        <T variant="body" tone={tone === "danger" ? "danger" : "primary"}>
          {label}
        </T>
        {detail ? (
          <T variant="caption" tone="muted">
            {detail}
          </T>
        ) : null}
      </View>
      {value ? (
        <T variant="body" tone="muted" numeric numberOfLines={1} style={styles.value}>
          {value}
        </T>
      ) : null}
      {loading ? <ActivityIndicator color={colors.ink64} /> : accessory ?? (onPress ? <ChevronRight color={colors.ink48} size={18} strokeWidth={1.75} /> : null)}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} testID={testID} accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      pressScale={0.99}
      style={[styles.row, disabled && styles.inert]}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? [label, value, detail].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!loading, disabled: !!disabled }}
    >
      {body}
    </Press>
  );
}

export interface SwitchRowProps {
  label: string;
  detail?: string | null;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** On the Switch itself. */
  switchTestID: string;
  disabled?: boolean;
  testID?: string;
}

export function SwitchRow({ label, detail, value, onValueChange, switchTestID, disabled, testID }: SwitchRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.text}>
        <T variant="body" tone="primary">
          {label}
        </T>
        {detail ? (
          <T variant="caption" tone="muted">
            {detail}
          </T>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} disabled={disabled} testID={switchTestID} />
    </View>
  );
}

export interface ControlRowProps {
  label: string;
  detail?: string | null;
  /** Right of the label, e.g. the week's stars. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

export function ControlRow({ label, detail, aside, children, testID }: ControlRowProps) {
  return (
    <View style={styles.control} testID={testID}>
      <View style={styles.text}>
        <View style={styles.controlHead}>
          <T variant="body" tone="primary" style={styles.flex}>
            {label}
          </T>
          {aside}
        </View>
        {detail ? (
          <T variant="caption" tone="muted">
            {detail}
          </T>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: space.xl },
  firstGroup: { marginTop: space.sm },
  flex: { flex: 1 },
  groupTitle: { marginBottom: space.md },
  caption: { marginTop: space.sm, paddingHorizontal: space.xs },
  divider: { height: 1, backgroundColor: colors.hairline, marginLeft: space.base },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
  },
  icon: { width: hitSize - space.base, alignItems: "center" },
  text: { flex: 1, gap: space.xxs },
  value: { maxWidth: "45%" },
  inert: { opacity: 0.4 },
  control: { paddingHorizontal: space.base, paddingVertical: space.base, gap: space.md },
  controlHead: { flexDirection: "row", alignItems: "center", gap: space.md },
});
