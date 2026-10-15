// The three kinds of proof, told apart by shape AND tint (never by gold):
// did = a four-point sparkle (warm), moved = a radiant burst (cool),
// learned = a ring around a point (pale blue).
import React from "react";
import Svg, { Circle, G, Line, Path } from "react-native-svg";
import type { ProofKind } from "@/contexts/arc.types";
import { colors } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";
import { LINE, type GlyphProps } from "./types";

export const PROOF_TINT: Record<ProofKind, string> = {
  did: colors.did,
  moved: colors.moved,
  learned: colors.learned,
};

export const PROOF_LABEL: Record<ProofKind, string> = {
  did: "I did it",
  moved: "Something moved",
  learned: "I learned",
};

export interface StarProofProps extends GlyphProps {
  kind: ProofKind;
}

/** The shape alone, drawn into an existing <Svg> at (cx, cy) with outer radius r. */
export function ProofStarShape({ kind, cx, cy, r, color }: { kind: ProofKind; cx: number; cy: number; r: number; color?: string }) {
  const tint = color ?? PROOF_TINT[kind];
  if (kind === "did") return <Path d={sparklePath(cx, cy, r, 0.2)} fill={tint} />;
  if (kind === "moved") {
    const long = r;
    const short = r * 0.62;
    const d = Math.SQRT1_2;
    const w = Math.max(1, r * 0.17);
    return (
      <G>
        <Line x1={cx} y1={cy - long} x2={cx} y2={cy + long} stroke={tint} strokeWidth={w} {...LINE} />
        <Line x1={cx - long} y1={cy} x2={cx + long} y2={cy} stroke={tint} strokeWidth={w} {...LINE} />
        <Line x1={cx - short * d} y1={cy - short * d} x2={cx + short * d} y2={cy + short * d} stroke={tint} strokeWidth={w} {...LINE} />
        <Line x1={cx - short * d} y1={cy + short * d} x2={cx + short * d} y2={cy - short * d} stroke={tint} strokeWidth={w} {...LINE} />
        <Circle cx={cx} cy={cy} r={r * 0.24} fill={tint} />
      </G>
    );
  }
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r * 0.78} stroke={tint} strokeWidth={Math.max(1, r * 0.16)} fill="none" />
      <Circle cx={cx} cy={cy} r={r * 0.28} fill={tint} />
    </G>
  );
}

export function StarProof({ kind, size = 24, color, testID }: StarProofProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <ProofStarShape kind={kind} cx={12} cy={12} r={10} color={color} />
    </Svg>
  );
}
