// The proof as a card: kind glyph, kind label and day, the user's sentence in
// their own gold italic, and the photo if there is one. It is what condenses
// into a star in the Star Birth, and the receipt that stays afterwards.
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ProofKind } from "@/contexts/arc.types";
import { StoredPhoto, T, UserWords, VellumCard } from "@/components/ui";
import { PROOF_LABEL, StarProof } from "@/components/glyphs";
import { radius, space } from "@/constants/theme";

export interface ProofReceiptProps {
  kind: ProofKind;
  text: string;
  /** 'Today', 'Yesterday' or '21 October'. */
  when?: string | null;
  photoUri?: string | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProofReceipt({ kind, text, when, photoUri, style, testID }: ProofReceiptProps) {
  return (
    <VellumCard style={style} testID={testID}>
      <View style={styles.head}>
        <StarProof kind={kind} size={20} />
        <T variant="caption" strong tone={kind} style={styles.flex} numberOfLines={1}>
          {when ? `${PROOF_LABEL[kind]} · ${when}` : PROOF_LABEL[kind]}
        </T>
      </View>
      <View style={styles.body}>
        <UserWords style={styles.flex}>{text}</UserWords>
        {photoUri ? (
          <StoredPhoto
            uri={photoUri}
            style={styles.photo}
            accessibilityIgnoresInvertColors
            accessible
            accessibilityLabel="Proof photo"
            testID={testID ? `${testID}-photo` : undefined}
          />
        ) : null}
      </View>
    </VellumCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  body: { flexDirection: "row", alignItems: "flex-start", gap: space.base, marginTop: space.md },
  photo: { width: 64, height: 64, borderRadius: radius.sm },
});
