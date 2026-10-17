// The full-screen constellation for one season: the gold anchor (the dream),
// the lit stars (shape and tint by kind of proof), the lines between them and
// the dashed course still to sail. Every lit star is a 44pt tap target with
// its own spoken label, so VoiceOver can visit each day.
import React from "react";
import { StyleSheet, View } from "react-native";
import type { Dream, Proof, ProofKind } from "@/contexts/arc.types";
import type { Figure } from "@/lib/sky/figures";
import { ConstellationFigure } from "@/components/sky";
import { PROOF_LABEL, StarProof } from "@/components/glyphs";
import { T, useGutter } from "@/components/ui";
import { space } from "@/constants/theme";
import { dayMonth } from "@/components/feature/today/time";
import type { StarSelection } from "./StarDetailSheet";

export interface ConstellationViewProps {
  dream: Dream;
  season: number;
  figure: Figure;
  /** This season's proofs, ascending by starIndex. */
  proofs: readonly Proof[];
  lit: number;
  width: number;
  height: number;
  onSelect: (selection: StarSelection) => void;
  testID?: string;
}

export function ConstellationView({ dream, season, figure, proofs, lit, width, height, onSelect, testID = "sky-figure" }: ConstellationViewProps) {
  const gutter = useGutter();
  const byStar = new Map(proofs.map((p) => [p.starIndex, p]));
  const kinds = Array.from({ length: 7 }, (_, i) => byStar.get(i + 1)?.kind ?? null);
  return (
    <View style={{ marginHorizontal: -gutter }}>
      <ConstellationFigure
        figure={figure}
        lit={lit}
        kinds={kinds}
        width={width}
        height={height}
        padding={Math.max(space.xl, Math.round(Math.min(width, height) * 0.1))}
        onStarPress={(i) => {
          if (i === 0) onSelect({ kind: "anchor", season });
          else {
            const p = byStar.get(i);
            if (p) onSelect({ kind: "proof", proofId: p.id });
          }
        }}
        starLabel={(i) => {
          if (i === 0) return `The anchor, your dream: ${dream.desire}`;
          const p = byStar.get(i);
          return p ? `Star ${i}, ${PROOF_LABEL[p.kind]}, ${dayMonth(p.dateKey)}: ${p.text}` : `Star ${i}`;
        }}
        testID={testID}
      />
    </View>
  );
}

const LEGEND: readonly ProofKind[] = ["did", "moved", "learned"];

/** The grammar of the stars: kind by shape and tint. */
export function KindLegend() {
  return (
    <View style={styles.legend} accessible accessibilityLabel="Stars: four points for I did it, a burst for something moved, a ring for I learned">
      {LEGEND.map((k) => (
        <View key={k} style={styles.item}>
          <StarProof kind={k} size={16} />
          <T variant="caption" tone="muted">
            {PROOF_LABEL[k]}
          </T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", columnGap: space.lg, rowGap: space.sm },
  item: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
