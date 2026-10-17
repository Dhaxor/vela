// THE PROOF FORM (ELEVATE §3 core loop step 2): today's bridge, what kind of
// proof appeared (did / moved / learned), one honest sentence and an optional
// photo. The save CTA lives in the host screen's dock (thumb zone).
// On short screens (iPhone SE/8, 375×667) the one required field must be in
// the first view, above the dock: the bridge card tightens and the sentence
// comes before the kind tiles.
import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
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

/** Below this window height the sentence comes first (the 375×667 gate in ELEVATE §8). */
export const SHORT_FORM_HEIGHT = 700;

export function ProofForm({ bridge, draft, onChange, onNotToday }: ProofFormProps) {
  const short = useWindowDimensions().height < SHORT_FORM_HEIGHT;
  const kinds = (
    <View style={styles.block}>
      <T variant="eyebrow" style={styles.label}>
        What kind of proof
      </T>
      <KindPicker value={draft.kind} onChange={(kind) => onChange({ ...draft, kind })} />
    </View>
  );
  return (
    <View style={[styles.root, short && styles.rootShort]} testID="evidence-form">
      <View style={styles.intro}>
        <T variant="eyebrow" tone="muted">
          Proof, not pressure
        </T>
        <T variant="display" accessibilityRole="header">
          {KIND_PROMPT[draft.kind]}
        </T>
      </View>

      <BridgeSummary bridge={bridge} onNotToday={onNotToday} compact={short} testID="evidence-bridge" />

      {short ? null : kinds}

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

      {short ? kinds : null}

      <PhotoField uri={draft.photoUri} onChange={(photoUri) => onChange({ ...draft, photoUri })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg, paddingTop: space.sm },
  rootShort: { gap: space.base, paddingTop: 0 },
  intro: { gap: space.sm },
  block: { gap: 0 },
  label: { marginBottom: space.sm },
});
