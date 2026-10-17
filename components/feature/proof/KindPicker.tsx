// What kind of proof appeared: did / moved / learned. Three vellum tiles,
// each with its StarProof glyph (kind is told by shape and tint, never gold).
// Selected = the shared selected state (raised, gold300 border, check badge).
import React from "react";
import { StyleSheet, View } from "react-native";
import type { ProofKind } from "@/contexts/arc.types";
import { T, VellumCard } from "@/components/ui";
import { PROOF_LABEL, StarProof } from "@/components/glyphs";
import { space } from "@/constants/theme";

export const PROOF_KINDS: readonly ProofKind[] = ["did", "moved", "learned"];

/** The question under the tiles changes with the kind. */
export const KIND_PROMPT: Readonly<Record<ProofKind, string>> = {
  did: "What became real?",
  moved: "What moved one step closer?",
  learned: "What did today teach you?",
};

export interface KindPickerProps {
  value: ProofKind;
  onChange: (kind: ProofKind) => void;
  /** Tile testIDs are `${testIDPrefix}${kind}` (1.0: evidence-kind-did). */
  testIDPrefix?: string;
}

export function KindPicker({ value, onChange, testIDPrefix = "evidence-kind-" }: KindPickerProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Kind of proof">
      {PROOF_KINDS.map((kind) => {
        const selected = kind === value;
        return (
          <VellumCard
            key={kind}
            selected={selected}
            padding="compact"
            onPress={() => onChange(kind)}
            testID={`${testIDPrefix}${kind}`}
            accessibilityLabel={PROOF_LABEL[kind]}
            style={styles.tile}
          >
            <View style={styles.inner}>
              <StarProof kind={kind} size={28} />
              <T variant="caption" strong tone={selected ? "primary" : "secondary"} center numberOfLines={2}>
                {PROOF_LABEL[kind]}
              </T>
            </View>
          </VellumCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  tile: { flex: 1, minHeight: 104 },
  inner: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm, paddingTop: space.xs },
});
