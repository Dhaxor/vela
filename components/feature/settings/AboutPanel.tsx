// About: the settings page ends on trust, not on a version string. The sail
// mark, an engraved 'Charted on this device' seal, the plain promise, then the
// version and the privacy policy.
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Press, T } from "@/components/ui";
import { VelaMark } from "@/components/glyphs";
import { colors, hitSize, radius, space } from "@/constants/theme";

export const PRIVACY_URL = "https://dhaxor.github.io/vela/privacy";

export function AboutPanel({ version }: { version: string | null }) {
  return (
    <View style={styles.wrap} testID="settings-about">
      <VelaMark size={40} color={colors.ink80} />
      <View style={styles.seal} testID="settings-charted-badge">
        <T variant="eyebrow" tone="gold">
          Charted on this device
        </T>
      </View>
      <T variant="body" tone="secondary" center>
        No account. No servers. No tracking.
      </T>
      <T variant="caption" tone="muted" center style={styles.promise}>
        What you write stays on this phone, unless you export it yourself.
      </T>
      <View style={styles.foot}>
        <T variant="caption" tone="faint" numeric testID="settings-version">
          {version ? `Vela ${version}` : "Vela"}
        </T>
        <T variant="caption" tone="faint">
          ·
        </T>
        <Press onPress={() => void Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel="Privacy Policy" testID="settings-privacy" style={styles.link}>
          <T variant="caption" strong tone="secondary" style={styles.underline}>
            Privacy Policy
          </T>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.md, marginTop: space.xxl, paddingHorizontal: space.base },
  seal: {
    paddingHorizontal: space.base,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldEngrave,
    backgroundColor: colors.vellum,
  },
  promise: { maxWidth: 280 },
  foot: { flexDirection: "row", alignItems: "center", gap: space.sm },
  link: { minHeight: hitSize, justifyContent: "center" },
  underline: { textDecorationLine: "underline", textDecorationColor: colors.ink48 },
});
