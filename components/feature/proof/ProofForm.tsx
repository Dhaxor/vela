// THE PROOF FORM (ELEVATE §3 core loop step 2): today's bridge, what kind of
// proof appeared (did / moved / learned), one honest sentence and an optional
// photo. The save CTA lives in the host screen's dock (thumb zone).
import React from "react";
import { StyleSheet, View } from "react-native";
import { LIMITS, type Bridge, type ProofKind } from "@/contexts/arc.types";
import { T, TextField } from "@/components/ui";
import { space } from "@/constants/theme";
import { BridgeSummary } from "./BridgeSummary";
import { KIND_PROMPT, KindPicker } from "./KindPicker";
import { PhotoField } from "./PhotoField";

export interface ProofDraft {
  kind: ProofKind;
  text: string;
  photoUri: string | null;
}

export interface ProofFormProps {
  bridge: Bridge;
  draft: ProofDraft;
  onChange: (draft: ProofDraft) => void;
  /** Opens the Not-today sheet (the bridge didn't happen: a learned star). */
  onNotToday?: () => void;
}

const PLACEHOLDER: Readonly<Record<ProofKind, string>> = {
  did: "What you did, in your own words.",
  moved: "The step you took, however small.",
  learned: "What got in the way, or what you noticed.",
};

export function ProofForm({ bridge, draft, onChange, onNotToday }: ProofFormProps) {
  return (
    <View style={styles.root} testID="evidence-form">
      <View style={styles.intro}>
        <T variant="eyebrow" tone="muted">
          Proof, not pressure
        </T>
        <T variant="display" accessibilityRole="header">
          {KIND_PROMPT[draft.kind]}
        </T>
      </View>

      <BridgeSummary bridge={bridge} onNotToday={onNotToday} testID="evidence-bridge" />

      <View style={styles.block}>
        <T variant="eyebrow" style={styles.label}>
          What kind of proof
        </T>
        <KindPicker value={draft.kind} onChange={(kind) => onChange({ ...draft, kind })} />
      </View>

      <TextField
        label="In one honest sentence"
        voice="words"
        multiline
        value={draft.text}
        onChangeText={(text) => onChange({ ...draft, text })}
        placeholder={PLACEHOLDER[draft.kind]}
        maxLength={LIMITS.proofText}
        hint="It becomes a star, and your next chapter begins with it."
        testID="evidence-note"
        style={styles.block}
      />

      <PhotoField uri={draft.photoUri} onChange={(photoUri) => onChange({ ...draft, photoUri })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg, paddingTop: space.sm },
  intro: { gap: space.sm },
  block: { gap: 0 },
  label: { marginBottom: space.sm },
});
