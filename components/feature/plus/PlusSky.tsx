// The paywall's hero: the user's OWN sky (their real constellations, lit with
// their real proofs) and, beside it, ghost constellations for dreams not yet
// begun. A ghost is chart line-work only: a dashed course, hollow points and
// an unlit gold anchor (gold is the future). Once Plus is on, the ghosts'
// anchors light: the room is open.
//
// The hero bleeds to the screen edges like Today's SkyHero and is one image
// to VoiceOver, with a sentence that says what it shows.
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";
import type { ProofKind } from "@/contexts/arc.types";
import { fitFigure, sparklePath, type Figure } from "@/lib/sky";
import { ConstellationFigure, useSvgId } from "@/components/sky";
import { T, useGutter } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export interface SkyDream {
  readonly id: string;
  readonly figure: Figure;
  readonly lit: number;
  readonly kinds: readonly ProofKind[];
  /** The legend under the plate: 'The Studio · 7 of 7', or '5 of 7 stars'. */
  readonly caption: string;
  /** For VoiceOver: 'Career, 5 of 7 stars'. */
  readonly spoken: string;
}

export interface PlusSkyProps {
  /** The user's dreams to draw (the first is the one in focus); at most 2 are shown. */
  dreams: readonly SkyDream[];
  /** Ghost figures for dreams not yet begun (seeded, so each user's ghosts differ). */
  ghosts: readonly Figure[];
  /** Plus is on: the ghosts' anchors are lit. */
  open?: boolean;
  /** Full width of the screen (the hero bleeds past the gutter). */
  width: number;
  height: number;
  accessibilityLabel: string;
  testID?: string;
}

/** A box in fractions of the hero: x, y, w, h. */
type Box = readonly [number, number, number, number];

/** Hand-placed compositions, like plates in an atlas: real figures large, ghosts smaller and scattered to the right. */
const LAYOUTS: Readonly<Record<number, { real: readonly Box[]; ghost: readonly Box[] }>> = {
  0: { real: [], ghost: [[0.02, 0.04, 0.44, 0.9], [0.42, 0.3, 0.3, 0.66], [0.7, 0.0, 0.3, 0.62]] },
  1: { real: [[0, 0, 0.6, 1]], ghost: [[0.55, 0.0, 0.3, 0.58], [0.7, 0.4, 0.3, 0.6]] },
  2: { real: [[0, 0, 0.44, 1], [0.38, 0.14, 0.36, 0.86]], ghost: [[0.72, 0.04, 0.28, 0.62]] },
};

const CAPTION_H = 18;

export function PlusSky({ dreams, ghosts, open = false, width, height, accessibilityLabel, testID = "paywall-sky" }: PlusSkyProps) {
  const gutter = useGutter();
  const shown = dreams.slice(0, 2);
  const layout = LAYOUTS[shown.length];
  const inner = width - gutter; // half a gutter of air at each edge
  const boxFor = (b: Box) => ({
    left: gutter / 2 + b[0] * inner,
    top: b[1] * height,
    width: b[2] * inner,
    height: b[3] * height,
  });

  return (
    <View
      style={[styles.bleed, { width, height: height + CAPTION_H, marginHorizontal: -gutter }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {layout.ghost.slice(0, ghosts.length).map((b, i) => (
        <View key={`g${i}`} style={[styles.abs, boxFor(b)]} pointerEvents="none">
          <GhostFigure figure={ghosts[i]} width={boxFor(b).width} height={boxFor(b).height} open={open} />
        </View>
      ))}
      {shown.map((d, i) => {
        const r = boxFor(layout.real[i]);
        return (
          <View key={d.id} style={[styles.abs, r]} pointerEvents="none">
            <ConstellationFigure
              figure={d.figure}
              lit={d.lit}
              kinds={d.kinds}
              width={r.width}
              height={r.height}
              padding={Math.round(Math.min(r.width, r.height) * 0.14)}
              testID={`paywall-sky-dream-${i}`}
            />
          </View>
        );
      })}
      {/* Captions on one baseline under the plate, like an atlas legend. */}
      <View style={[styles.legend, { left: gutter, right: gutter, top: height }]} pointerEvents="none">
        {shown.map((d) => (
          <T key={d.id} variant="caption" tone="muted" numeric numberOfLines={1} style={styles.legendItem}>
            {d.caption}
          </T>
        ))}
        <View style={styles.spacer} />
        <T variant="caption" tone="faint" italic numberOfLines={1}>
          {open ? "Room for the next" : shown.length ? "Your next dream" : "Your first dream"}
        </T>
      </View>
    </View>
  );
}

export interface GhostFigureProps {
  figure: Figure;
  width: number;
  height: number;
  /** Lit gold anchor (Plus on) instead of an engraved outline. */
  open?: boolean;
}

/** A constellation not yet begun: course lines only. */
export function GhostFigure({ figure, width, height, open = false }: GhostFigureProps) {
  const glowId = useSvgId("vela-ghost-glow");
  const pad = Math.round(Math.min(width, height) * 0.14);
  const pts = useMemo(() => fitFigure(figure, width, height, pad), [figure, width, height, pad]);
  const unit = Math.max(2.4, Math.min(3.4, Math.min(width, height) / 40));
  const anchor = pts[0];
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.gold500} stopOpacity={0.36} />
          <Stop offset="1" stopColor={colors.gold500} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <G opacity={open ? 1 : 0.9}>
        {figure.edges.map(([a, b]) => (
          <Line
            key={`${a}-${b}`}
            x1={pts[a].x}
            y1={pts[a].y}
            x2={pts[b].x}
            y2={pts[b].y}
            stroke={colors.ink48}
            strokeWidth={1}
            strokeDasharray="3 4"
            strokeLinecap="round"
          />
        ))}
        {pts.slice(1).map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={unit * 0.85} stroke={colors.ink64} strokeWidth={1} fill={colors.sky900} />
        ))}
      </G>
      {open ? (
        <>
          <Circle cx={anchor.x} cy={anchor.y} r={unit * 4.5} fill={`url(#${glowId})`} />
          <Path d={sparklePath(anchor.x, anchor.y, unit * 2.3, 0.2)} fill={colors.gold300} />
        </>
      ) : (
        <Path d={sparklePath(anchor.x, anchor.y, unit * 2.3, 0.2)} stroke={colors.gold300} strokeOpacity={0.7} strokeWidth={1} strokeLinejoin="round" fill={colors.sky900} />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  bleed: { position: "relative", marginBottom: space.lg },
  abs: { position: "absolute" },
  legend: { position: "absolute", height: CAPTION_H, flexDirection: "row", alignItems: "center", gap: space.base },
  legendItem: { flexShrink: 1 },
  spacer: { flex: 1 },
});
