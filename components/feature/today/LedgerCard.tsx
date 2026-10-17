// The Sunday Proof Ledger: a look back at the week, computed on the phone.
// Shown on the local Sunday when the week holds 2 or more proofs
// (lib/progress shouldShowLedger). The did / moved / learned mix is told by
// glyph and tint, the sentence of the week is the user's own words, and the
// open bridge (if any) is next week's first step.
import React from "react";
import { StyleSheet, View } from "react-native";
import type { Bridge, ProofKind } from "@/contexts/arc.types";
import type { ProofLedger } from "@/lib/progress";
import { PROOF_LABEL, StarProof } from "@/components/glyphs";
import { T, UserWords, VellumCard } from "@/components/ui";
import { colors, space } from "@/constants/theme";
import { dayMonth } from "./time";

const KINDS: readonly ProofKind[] = ["did", "moved", "learned"];
const SHORT: Record<ProofKind, string> = { did: "did", moved: "moved", learned: "learned" };

/** '19–25 October', or '28 September – 4 October' across a month. */
export function weekRange(start: string, end: string): string {
  const a = dayMonth(start);
  const b = dayMonth(end);
  const [aDay, ...aMonth] = a.split(" ");
  const [, ...bMonth] = b.split(" ");
  return aMonth.join(" ") === bMonth.join(" ") ? `${aDay}–${b}` : `${a} – ${b}`;
}

export interface LedgerCardProps {
  ledger: ProofLedger;
  nextBridge?: Bridge | null;
  /** __DEV__ preview on a non-Sunday. */
  preview?: boolean;
}

export function LedgerCard({ ledger, nextBridge, preview = false }: LedgerCardProps) {
  const total = ledger.total;
  const mix = KINDS.filter((k) => ledger.counts[k] > 0)
    .map((k) => `${ledger.counts[k]} ${PROOF_LABEL[k].toLowerCase()}`)
    .join(", ");
  return (
    <VellumCard testID="today-ledger" accessibilityLabel={`Proof Ledger: ${total} ${total === 1 ? "star" : "stars"} this week. ${mix}`}>
      <T variant="eyebrow" tone="gold">
        Proof Ledger{preview ? " · preview" : ""}
      </T>
      <T variant="title" accessibilityRole="header" style={styles.title}>
        This week, {total} {total === 1 ? "star" : "stars"}.
      </T>
      <T variant="caption" tone="muted" numeric>
        {weekRange(ledger.weekStart, ledger.weekEnd)}
      </T>
      <View style={styles.mix}>
        {KINDS.map((k) => {
          const quiet = ledger.counts[k] === 0;
          return (
            <View key={k} style={styles.kind} testID={`today-ledger-${k}`}>
              <StarProof kind={k} size={20} color={quiet ? colors.ink48 : undefined} />
              <T variant="body" tone={quiet ? "muted" : "primary"} strong numeric>
                {ledger.counts[k]}
              </T>
              <T variant="caption" tone="muted">
                {SHORT[k]}
              </T>
            </View>
          );
        })}
      </View>
      {ledger.sentenceOfWeek ? (
        <View style={styles.block}>
          <T variant="eyebrow" tone="muted">
            Sentence of the week
          </T>
          <UserWords variant="reading" numberOfLines={3} style={styles.words}>
            {ledger.sentenceOfWeek.text}
          </UserWords>
        </View>
      ) : null}
      {nextBridge ? (
        <View style={[styles.block, styles.next]}>
          <T variant="eyebrow" tone="violet">
            Next week starts with
          </T>
          <T variant="body" tone="secondary" numberOfLines={2} style={styles.words}>
            {nextBridge.text}
          </T>
        </View>
      ) : null}
    </VellumCard>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.sm, marginBottom: space.xxs },
  mix: { flexDirection: "row", gap: space.lg, marginTop: space.base },
  kind: { flexDirection: "row", alignItems: "center", gap: space.sm },
  block: { marginTop: space.lg },
  words: { marginTop: space.xs },
  next: { paddingTop: space.base, borderTopWidth: 1, borderTopColor: colors.hairline },
});
