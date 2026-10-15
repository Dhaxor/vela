// A dream's constellation: the gold anchor (the dream), the season's lit
// stars (shape and tint by kind of proof), lit lines between them and the
// dashed course still to sail.
//
// - drawLatest: the line(s) the newest star added draw themselves in 900ms,
//   via strokeDashoffset on native and segment opacity on web (where animated
//   SVG props are unreliable). Reduce Motion and still mode show the end state.
// - onStarPress: invisible 44pt Pressables over the anchor and each lit star,
//   each with its own accessibilityLabel, so VoiceOver can visit every star.
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import type { ProofKind } from "@/contexts/arc.types";
import { VELA_SAIL, edgesLitAt, isPointLit, litEdges, unlitEdges, type Figure, type FigureEdge } from "@/lib/sky/figures";
import { distance, fitFigure, hitBoxes, splitSegment, type Pt } from "@/lib/sky/layout";
import { sparklePath } from "@/lib/sky/shapes";
import { colors, motion } from "@/constants/theme";
import { ProofStarShape } from "@/components/glyphs/StarProof";
import { drift, useMotion } from "@/components/ui/motion";
import { useSvgId } from "./svgId";

export interface ConstellationFigureProps {
  /** Defaults to the Vela sail. */
  figure?: Figure;
  /** Lit stars, 0..7. The anchor is always lit. */
  lit: number;
  /** kinds[i] is the proof kind of star i + 1; unknown kinds draw a plain point. */
  kinds?: readonly (ProofKind | null | undefined)[];
  width: number;
  height: number;
  padding?: number;
  /** 'hero' for full figures, 'inset' for plate thumbnails (no glow, finer lines). */
  variant?: "hero" | "inset";
  /** Draw the newest star's line(s) in. */
  drawLatest?: boolean;
  /** Makes the anchor (0) and lit stars (1..7) tappable. */
  onStarPress?: (index: number) => void;
  /** Spoken label for star i (0 = anchor). */
  starLabel?: (index: number) => string;
  /** Summary label when the stars aren't individually tappable. */
  accessibilityLabel?: string;
  testID?: string;
}

const LIT_LINE = "rgba(246, 242, 255, 0.55)";
const COURSE_LINE = "rgba(214, 206, 255, 0.2)";
const SEGMENTS = 12;

function defaultLabel(index: number, lit: number): string {
  return index === 0 ? "Your dream, the anchor star" : `Star ${index} of 7${index <= lit ? "" : ", not yet lit"}`;
}

export function ConstellationFigure({
  figure = VELA_SAIL,
  lit,
  kinds,
  width,
  height,
  padding = 24,
  variant = "hero",
  drawLatest = false,
  onStarPress,
  starLabel,
  accessibilityLabel,
  testID,
}: ConstellationFigureProps) {
  const policy = useMotion();
  const glowId = useSvgId("vela-star-glow");
  const goldId = useSvgId("vela-anchor-glow");
  const inset = variant === "inset";
  const unit = inset ? 1.3 : Math.max(2.6, Math.min(5, Math.min(width, height) / 52));
  const points = useMemo(() => fitFigure(figure, width, height, padding), [figure, width, height, padding]);
  const animate = drawLatest && lit > 0 && policy.transitions;
  const fresh = animate ? edgesLitAt(figure, lit) : [];
  const steady = litEdges(figure, lit).filter((e) => !fresh.includes(e));
  const course = unlitEdges(figure, lit);
  const lineW = inset ? 0.75 : 1.25;

  return (
    <View
      style={{ width, height }}
      testID={testID}
      accessible={!onStarPress}
      accessibilityRole={onStarPress ? undefined : "image"}
      accessibilityLabel={onStarPress ? undefined : accessibilityLabel ?? `Constellation, ${lit} of 7 stars lit`}
    >
      <Svg width={width} height={height}>
        {!inset && (
          <Defs>
            <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.did} stopOpacity={0.42} />
              <Stop offset="1" stopColor={colors.did} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={goldId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.gold500} stopOpacity={0.4} />
              <Stop offset="1" stopColor={colors.gold500} stopOpacity={0} />
            </RadialGradient>
          </Defs>
        )}

        {course.map((e) => (
          <Edge key={`c${e[0]}-${e[1]}`} edge={e} points={points} stroke={COURSE_LINE} width={lineW} dashed />
        ))}
        {steady.map((e) => (
          <Edge key={`l${e[0]}-${e[1]}`} edge={e} points={points} stroke={LIT_LINE} width={lineW} />
        ))}
        {fresh.map((e) => (
          <DrawnEdge key={`d${lit}-${e[0]}-${e[1]}`} a={points[e[0]]} b={points[e[1]]} stroke={LIT_LINE} width={lineW} />
        ))}

        {points.map((pt, i) => {
          if (i === 0) {
            return (
              <G key="anchor">
                {!inset && <Circle cx={pt.x} cy={pt.y} r={unit * 5} fill={`url(#${goldId})`} />}
                <Path d={sparklePath(pt.x, pt.y, unit * 2.4, 0.2)} fill={colors.gold300} />
              </G>
            );
          }
          if (!isPointLit(i, lit)) {
            return <Circle key={i} cx={pt.x} cy={pt.y} r={unit * 0.9} stroke={colors.ink48} strokeWidth={inset ? 0.75 : 1} fill={colors.sky900} />;
          }
          const kind = kinds?.[i - 1];
          return (
            <G key={i}>
              {!inset && <Circle cx={pt.x} cy={pt.y} r={unit * 4} fill={`url(#${glowId})`} />}
              {kind ? (
                <ProofStarShape kind={kind} cx={pt.x} cy={pt.y} r={unit * 1.9} />
              ) : (
                <Circle cx={pt.x} cy={pt.y} r={unit * 1.1} fill={colors.ink100} />
              )}
            </G>
          );
        })}
      </Svg>

      {onStarPress ? (
        <StarTargets
          points={points}
          lit={lit}
          width={width}
          height={height}
          onStarPress={onStarPress}
          label={(i) => starLabel?.(i) ?? defaultLabel(i, lit)}
          testID={testID}
        />
      ) : null}
    </View>
  );
}

function Edge({ edge, points, stroke, width, dashed = false }: { edge: FigureEdge; points: Pt[]; stroke: string; width: number; dashed?: boolean }) {
  const a = points[edge[0]];
  const b = points[edge[1]];
  return (
    <Line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={dashed ? [2, 5] : undefined}
    />
  );
}

interface DrawnEdgeProps {
  a: Pt;
  b: Pt;
  stroke: string;
  width: number;
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

/** Native: a dash the length of the line slides into place. */
function NativeDrawnEdge({ a, b, stroke, width }: DrawnEdgeProps) {
  const len = distance(a, b);
  const p: SharedValue<number> = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: motion.reveal, easing: drift });
  }, [p]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  return (
    <AnimatedLine
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={[len, len]}
      animatedProps={animatedProps}
    />
  );
}

/** Web: the line is cut into segments that fade in, in order, over 900ms. */
function WebDrawnEdge({ a, b, stroke, width }: DrawnEdgeProps) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / motion.reveal);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const segments = useMemo(() => splitSegment(a, b, SEGMENTS), [a, b]);
  return (
    <G>
      {segments.map((s, i) => (
        <Line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={stroke}
          strokeWidth={width}
          strokeLinecap="round"
          opacity={Math.max(0, Math.min(1, t * SEGMENTS - i))}
        />
      ))}
    </G>
  );
}

const DrawnEdge = Platform.OS === "web" ? WebDrawnEdge : NativeDrawnEdge;

interface StarTargetsProps {
  points: Pt[];
  lit: number;
  width: number;
  height: number;
  onStarPress: (index: number) => void;
  label: (index: number) => string;
  testID?: string;
}

function StarTargets({ points, lit, width, height, onStarPress, label, testID }: StarTargetsProps) {
  const boxes = hitBoxes(points, width, height);
  return (
    <>
      {boxes.map((box, i) =>
        isPointLit(i, lit) ? (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={label(i)}
            testID={testID ? `${testID}-star-${i}` : undefined}
            onPress={() => onStarPress(i)}
            style={[styles.target, { left: box.left, top: box.top, width: box.size, height: box.size }]}
          />
        ) : null
      )}
    </>
  );
}

const styles = StyleSheet.create({
  target: { position: "absolute", borderRadius: 22 },
});
