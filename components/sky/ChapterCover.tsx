// A chapter's cover: a generative plate seeded by dream + season. Horizon tint
// for the focus area, a small seeded starfield, engraved line-work, that
// season's figure with its stars lit, the area sign and the chapter numeral.
// No photos and no AI images: every cover is the user's own sky.
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import type { ProofKind } from "@/contexts/arc.types";
import type { FocusId } from "@/lib/focus";
import { figureFor } from "@/lib/sky/figures";
import { hashString, makeStarfield } from "@/lib/sky/starfield";
import { colors, horizonTint, space } from "@/constants/theme";
import { AreaSign } from "@/components/glyphs/AreaSign";
import { ChapterNumeral } from "@/components/glyphs/ChapterNumeral";
import { ConstellationFigure } from "./ConstellationFigure";
import { STAR_TONES } from "./SkyBackdrop";
import { useSvgId } from "./svgId";

export interface ChapterCoverProps {
  dreamId: string;
  season: number;
  focus: FocusId;
  /** Chapter number (1..7), shown as a Roman numeral. */
  chapter: number;
  /** Stars lit in this season when the chapter was written. */
  lit: number;
  kinds?: readonly (ProofKind | null | undefined)[];
  width: number;
  height: number;
  /** Hide the numeral when the plate prints it elsewhere. */
  showNumeral?: boolean;
  testID?: string;
}

export function ChapterCover({ dreamId, season, focus, chapter, lit, kinds, width, height, showNumeral = true, testID }: ChapterCoverProps) {
  const skyId = useSvgId("vela-cover-sky");
  const glowId = useSvgId("vela-cover-glow");
  const seed = hashString(`${dreamId}#${season}`);
  const figure = useMemo(() => figureFor(dreamId, season), [dreamId, season]);
  const stars = useMemo(() => makeStarfield(seed, 42), [seed]);
  const tint = horizonTint[focus];
  const figureH = height * (showNumeral ? 0.6 : 0.78);
  const poleX = width * (0.2 + (seed % 60) / 100);

  return (
    <View style={[styles.frame, { width, height }]} testID={testID} accessibilityRole="image" accessibilityLabel={`Chapter ${chapter} cover, ${lit} of 7 stars`}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.sky800} />
            <Stop offset="1" stopColor={colors.sky950} />
          </LinearGradient>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity={1} />
            <Stop offset="0.6" stopColor={tint} stopOpacity={0.45} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${skyId})`} />
        <Ellipse cx={width / 2} cy={height * 1.05} rx={width * 0.95} ry={height * 0.5} fill={`url(#${glowId})`} />
        <Circle cx={poleX} cy={-height * 0.9} r={height * 1.45} stroke={colors.chartLine} strokeWidth={1} fill="none" />
        <Circle cx={poleX} cy={-height * 0.9} r={height * 1.75} stroke={colors.chartLine} strokeWidth={1} fill="none" />
        <Line x1={poleX} y1={-height * 0.9} x2={width * 0.12} y2={height} stroke={colors.chartLine} strokeWidth={1} />
        <Line x1={poleX} y1={-height * 0.9} x2={width * 0.88} y2={height} stroke={colors.chartLine} strokeWidth={1} />
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r * 0.8} fill={STAR_TONES[s.tone]} opacity={s.opacity * 0.7} />
        ))}
      </Svg>

      <View style={[styles.figure, { height: figureH }]}>
        <ConstellationFigure figure={figure} lit={lit} kinds={kinds} width={width} height={figureH} padding={Math.round(width * 0.14)} />
      </View>

      <View style={styles.sign}>
        <AreaSign focus={focus} size={18} color={colors.ink64} strokeWidth={1.4} />
      </View>

      {showNumeral ? (
        <View style={styles.numeral}>
          <ChapterNumeral value={chapter} variant="display" ruled />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", backgroundColor: colors.sky900 },
  figure: { position: "absolute", left: 0, right: 0, top: space.sm },
  sign: { position: "absolute", top: space.md, left: space.md },
  numeral: { position: "absolute", left: 0, right: 0, bottom: space.base, alignItems: "center" },
});
