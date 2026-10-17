// The quiet end of the paywall: renewal terms in full, then Restore, Terms of
// Use and Privacy Policy as plain text links (44pt tall each). Restore stays
// here, next to the terms, where App Review and returning members look for it.
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Press, T } from "@/components/ui";
import { colors, hitSize, space } from "@/constants/theme";
import { LEGAL_URLS, RENEWAL_TERMS } from "./copy";

export interface LegalFooterProps {
  /** null hides Restore (Plus is already on). */
  onRestore: (() => void) | null;
  restoring?: boolean;
  /** iOS Plus members: a link to Apple's subscription management. */
  showManage?: boolean;
}

export function LegalFooter({ onRestore, restoring = false, showManage = false }: LegalFooterProps) {
  return (
    <View style={styles.wrap} testID="paywall-legal">
      <T variant="caption" tone="faint" center testID="paywall-renewal-terms">
        {RENEWAL_TERMS}
      </T>
      <View style={styles.links}>
        {onRestore ? <TextLink label={restoring ? "Restoring…" : "Restore purchases"} onPress={onRestore} disabled={restoring} testID="paywall-restore" /> : null}
        {showManage ? <TextLink label="Manage subscription" onPress={() => void Linking.openURL(LEGAL_URLS.manageSubscriptions)} testID="paywall-manage" /> : null}
        <TextLink label="Terms of Use" onPress={() => void Linking.openURL(LEGAL_URLS.terms)} testID="paywall-terms" />
        <TextLink label="Privacy Policy" onPress={() => void Linking.openURL(LEGAL_URLS.privacy)} testID="paywall-privacy" />
      </View>
    </View>
  );
}

function TextLink({ label, onPress, disabled, testID }: { label: string; onPress: () => void; disabled?: boolean; testID: string }) {
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityRole="link" accessibilityLabel={label} testID={testID} pressScale={0.96} style={styles.link}>
      <T variant="caption" strong tone="secondary" style={styles.linkText}>
        {label}
      </T>
    </Press>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  links: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: space.xs },
  link: { minHeight: hitSize, justifyContent: "center", paddingHorizontal: space.sm },
  linkText: { textDecorationLine: "underline", textDecorationColor: colors.ink48 },
});
