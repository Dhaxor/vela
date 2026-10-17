// 'One thing you've already done toward this': the optional seed proof. It is
// saved as a dated 'did' proof, becomes the first star, and Chapter I weaves
// it in gold, so the woven-proof payoff lands in the first minute.
import React from "react";
import { StyleSheet, View } from "react-native";
import type { FocusId } from "@/lib/focus";
import { LIMITS } from "@/contexts/arc.types";
import { StarProof } from "@/components/glyphs";
import { T, TextField } from "@/components/ui";
import { space } from "@/constants/theme";

/** A small, true-sounding example per focus (placeholder only; never saved). */
const EXAMPLES: Record<FocusId, string> = {
  love: "Said yes to dinner with friends.",
  abundance: "Opened a savings account.",
  career: "Bought the domain name.",
  health: "Went to bed before eleven.",
  confidence: "Spoke first in a meeting.",
  peace: "Left my phone in another room.",
};

export interface SeedFieldProps {
  focus: FocusId | null;
  value: string;
  onChangeText: (text: string) => void;
  testID: string;
}

export function SeedField({ focus, value, onChangeText, testID }: SeedFieldProps) {
  const filled = value.trim().length > 0;
  return (
    <View>
      <TextField
        voice="words"
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={focus ? EXAMPLES[focus] : "Anything you've already done counts."}
        maxLength={LIMITS.proofText}
        testID={testID}
        accessibilityLabel="One thing you've already done toward this, optional"
      />
      <View style={styles.row} testID={`${testID}-preview`}>
        <StarProof kind="did" size={20} />
        <T variant="caption" tone={filled ? "secondary" : "muted"} style={styles.text}>
          {filled ? "Your first star. Chapter I will begin with it." : "Leave it blank and your first star waits for your first step."}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  text: { flex: 1 },
});
