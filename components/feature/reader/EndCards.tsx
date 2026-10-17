// What sits after the last paragraph when there is no choice to make:
// - OpenBridgeCard: the chosen bridge with its if-then, the violet
//   'I crossed it' that leads to the proof form, and 'Not today' (a lesson
//   star, never a dead end).
// - CrossedBridge: on an older chapter, the bridge it led to and the proof
//   that answered it (the Memory Book, read from inside the story).
// - SeasonCompleteCard: Chapter VII of a complete season: the Named Sky.
// - RestingNote: a dream that is resting or not weaving (Plus lapse).
// - SoftPlusCard: the one gentle Plus note, from Chapter III on, via lib/asks.
import React from "react";
import { StyleSheet, View } from "react-native";
import { BridgeButton, GhostButton, PrimaryButton, SecondaryButton, T, UserWords, VellumCard } from "@/components/ui";
import { BridgeGlyph, PROOF_LABEL, StarProof, Vignette } from "@/components/glyphs";
import type { Bridge, Proof } from "@/contexts/arc.types";
import { TIER_LABEL } from "@/lib/futureMemory";
import { colors, space } from "@/constants/theme";
import { clockLabel, ifThenLine } from "./cues";

export function OpenBridgeCard({
  bridge,
  now,
  onCrossed,
  onNotToday,
  onChange,
}: {
  bridge: Bridge;
  now: Date;
  onCrossed: () => void;
  onNotToday?: () => void;
  onChange?: () => void;
}) {
  const remind = bridge.remindAt && Date.parse(bridge.remindAt) > now.getTime() ? clockLabel(new Date(bridge.remindAt)) : null;
  return (
    <View style={styles.gap} testID="story-action-bridge">
      <VellumCard tone="bridge">
        <View style={styles.eyebrow}>
          <BridgeGlyph size={18} />
          <T variant="eyebrow" tone="violet">
            {`Today’s bridge · ${TIER_LABEL[bridge.tier]}`}
          </T>
        </View>
        <T variant="title" style={styles.bridgeText} testID="story-bridge-text">
          {bridge.text}
        </T>
        {bridge.ifThen ? (
          <T variant="reading" italic tone="secondary" style={styles.ifThen} testID="story-bridge-ifthen">
            {ifThenLine(bridge.ifThen)}
          </T>
        ) : null}
        {remind ? (
          <T variant="caption" tone="muted" numeric style={styles.remind}>
            {`Reminder at ${remind}`}
          </T>
        ) : null}
        <BridgeButton
          label="I crossed it"
          onPress={onCrossed}
          accessibilityHint="Opens the proof form"
          testID="story-record-proof"
          style={styles.cta}
        />
        {onNotToday ? (
          <GhostButton
            label="Not today"
            tone="muted"
            onPress={onNotToday}
            accessibilityHint="Keep what got in the way as a lesson star"
            testID="story-not-today"
            style={styles.notToday}
          />
        ) : null}
      </VellumCard>
      {onChange ? <GhostButton label="Choose a different bridge" tone="muted" onPress={onChange} testID="story-bridge-change" /> : null}
    </View>
  );
}

export function CrossedBridge({ bridge, proof, dateLabel }: { bridge: Bridge; proof: Proof | undefined; dateLabel: string | null }) {
  return (
    <View style={styles.memory} testID="story-action-bridge">
      <View style={styles.eyebrow}>
        <BridgeGlyph size={18} color={colors.ink64} />
        <T variant="eyebrow" tone="muted">
          The bridge from this chapter
        </T>
      </View>
      <T variant="body" tone="secondary">
        {bridge.text}
      </T>
      {proof ? (
        <View style={styles.proofRow}>
          <StarProof kind={proof.kind} size={16} />
          <View style={styles.flex}>
            <T variant="caption" tone="muted" numeric>
              {dateLabel ? `${PROOF_LABEL[proof.kind]} · ${dateLabel}` : PROOF_LABEL[proof.kind]}
            </T>
            <UserWords variant="reading">{proof.text}</UserWords>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function SeasonCompleteCard({ stars, named, onSky }: { stars: number; named: string | null; onSky: () => void }) {
  return (
    <VellumCard testID="story-season-complete">
      <View style={styles.center}>
        <Vignette name="horizon" width={160} />
        <T variant="eyebrow" tone="gold" numeric center style={styles.centerGap}>
          {`${stars} stars · season complete`}
        </T>
        <T variant="title" center>
          {named ? named : "Your sky is whole."}
        </T>
        <T variant="body" tone="muted" center>
          {named
            ? "Every star in it is something you did. The next season begins from your sky."
            : "Every star in it is something you did. Give it a name, then begin the next season."}
        </T>
      </View>
      <PrimaryButton label={named ? "See your sky" : "Name your sky"} onPress={onSky} testID="story-see-sky" style={styles.cta} />
    </VellumCard>
  );
}

export function RestingNote({ reason, onToday }: { reason: "resting" | "released" | "plan-locked"; onToday: () => void }) {
  const copy =
    reason === "plan-locked"
      ? "Vela Plus has ended, so this dream is resting. Every chapter stays yours to read. On Today, choose the dream that keeps weaving."
      : reason === "released"
        ? "You let this dream go. Its chapters stay here, kept, whenever you want to read them."
        : "This dream is resting, so it isn’t weaving new chapters. Every chapter stays yours to read.";
  return (
    <VellumCard testID="story-resting">
      <T variant="eyebrow" tone="muted">
        {reason === "released" ? "Released" : "Resting"}
      </T>
      <T variant="body" tone="secondary" style={styles.restCopy}>
        {copy}
      </T>
      {reason === "plan-locked" ? (
        <GhostButton label="Go to Today" tone="violet" onPress={onToday} testID="story-to-today" style={styles.left} />
      ) : null}
    </VellumCard>
  );
}

export function SoftPlusCard({ onSee, onLater }: { onSee: () => void; onLater: () => void }) {
  return (
    <VellumCard testID="soft-plus">
      <T variant="body" strong tone="primary">
        This story is yours. Unlimited listens, always.
      </T>
      <T variant="caption" tone="muted" style={styles.softBody}>
        When you are ready to hold more than one dream at a time, Vela Plus opens the rest.
      </T>
      <View style={styles.softRow}>
        <GhostButton label="Maybe later" tone="muted" onPress={onLater} testID="soft-plus-later" />
        <SecondaryButton label="See Plus" onPress={onSee} testID="soft-plus-see" style={styles.softCta} />
      </View>
    </VellumCard>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  flex: { flex: 1, gap: space.xxs },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  bridgeText: { marginTop: space.md },
  ifThen: { marginTop: space.md },
  remind: { marginTop: space.sm },
  cta: { marginTop: space.lg },
  notToday: { marginTop: space.sm },
  memory: { gap: space.md },
  proofRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingTop: space.xs },
  center: { alignItems: "center", gap: space.sm },
  centerGap: { marginTop: space.base },
  restCopy: { marginTop: space.sm },
  left: { alignSelf: "flex-start", paddingHorizontal: 0, marginTop: space.sm },
  softBody: { marginTop: space.xs },
  softRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.sm, marginTop: space.base },
  softCta: { alignSelf: "auto", height: 44 },
});
