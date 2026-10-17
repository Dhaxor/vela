// THE WEAVE (ELEVATE §2.7): about 2.4s of honest anticipation before a new
// chapter. The user's words rise in gold, scatter into the stars of the
// dream's figure, the lit lines connect, the course still to sail fades in
// dashed, and the chapter numeral resolves with its title.
//
// One clock drives everything: a shared value runs 0 → TOTAL ms and every
// element interpolates its own window from it (opacity and transforms only,
// so it renders the same on iOS and react-native-web).
// - full: the whole sequence.
// - crossfade (Reduce Motion): the end state fades in, nothing travels.
// - still (screenshots): the end state, no clock at all.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { ProofKind } from "@/contexts/arc.types";
import { distance, edgeStep, fitFigure, isPointLit, litEdges, sparklePath, unlitEdges, type Figure, type Pt } from "@/lib/sky";
import { ChapterNumeral, ProofStarShape } from "@/components/glyphs";
import { useSvgId } from "@/components/sky";
import { T } from "@/components/ui";
import { wordPieces } from "../logic";
import { colors, motion, space } from "@/constants/theme";

export type WeaveMode = "full" | "crossfade" | "still";

/** Timeline, in ms. */
export const WEAVE_TIMING = {
  wordsIn: 0,
  wordsInSpan: 520,
  wordInDur: 380,
  travel: 760,
  travelSpan: 360,
  travelDur: 600,
  starPop: 220,
  edges: 1380,
  edgeStagger: 70,
  edgeDur: 300,
  course: 1560,
  courseDur: 420,
  title: 1720,
  titleDur: 480,
  caption: 1920,
  total: 2400,
} as const;


export interface WeaveStageProps {
  words: string;
  figure: Figure;
  lit: number;
  kinds: readonly (ProofKind | null | undefined)[];
  numeral: number;
  title: string;
  stageName: string;
  caption: string;
  mode: WeaveMode;
  /** The stage's own size (the Screen body). */
  width: number;
  height: number;
  gutter: number;
  /** Starts the clock (full mode) once true. */
  running: boolean;
  /** Fires when the numeral resolves (the chapter-reveal haptic). */
  onReveal?: () => void;
  testID?: string;
}

interface Geometry {
  fig: { left: number; top: number; width: number; height: number };
  points: Pt[];
  unit: number;
  textTop: number;
}

/** Height of the resolved text block (numeral, title, stage, two caption lines). */
const TEXT_BLOCK = 196;

function geometryFor(figure: Figure, width: number, height: number, gutter: number): Geometry {
  const figWidth = Math.min(width - gutter * 2, 380);
  const figHeight = Math.round(Math.min(Math.max(height * 0.3, 180), 280));
  // The figure and the chapter sit as one group, a little above the optical centre.
  const group = figHeight + space.xl + TEXT_BLOCK;
  const top = Math.round(Math.max(space.lg, (height - group) / 2 - height * 0.05));
  const left = Math.round((width - figWidth) / 2);
  const points = fitFigure(figure, figWidth, figHeight, 28);
  const unit = Math.max(2.6, Math.min(5, Math.min(figWidth, figHeight) / 52));
  return {
    fig: { left, top, width: figWidth, height: figHeight },
    points,
    unit,
    textTop: top + figHeight + space.xl,
  };
}

const ease = (p: number) => {
  "worklet";
  return 1 - Math.pow(1 - p, 3);
};

const LIT_LINE = colors.ink64;

export function WeaveStage({
  words,
  figure,
  lit,
  kinds,
  numeral,
  title,
  stageName,
  caption,
  mode,
  width,
  height,
  gutter,
  running,
  onReveal,
  testID,
}: WeaveStageProps) {
  const geo = useMemo(() => geometryFor(figure, width, height, gutter), [figure, width, height, gutter]);
  const pieces = useMemo(() => wordPieces(words), [words]);
  const full = mode === "full";
  const t = useSharedValue<number>(full ? 0 : WEAVE_TIMING.total);
  const fade = useSharedValue<number>(mode === "crossfade" ? 0 : 1);

  // Word centres, measured inside the words block (stage coordinates once offset).
  const [wordsBox, setWordsBox] = useState<{ x: number; y: number } | null>(null);
  const centres = useRef<(Pt | null)[]>([]);
  const [measured, setMeasured] = useState(0);
  const [grace, setGrace] = useState(false);
  const measuredAll = (measured >= pieces.length && wordsBox !== null) || grace;
  const started = useRef(false);
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;

  useEffect(() => {
    if (mode === "crossfade") fade.value = withTiming(1, { duration: motion.enter });
  }, [mode, fade]);

  // Start once every word has a measured position (or after a short grace period).
  useEffect(() => {
    if (!full || !running) return;
    const timer = setTimeout(() => setGrace(true), 400);
    return () => clearTimeout(timer);
  }, [full, running]);

  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!full || !running || !measuredAll || started.current) return;
    started.current = true;
    t.value = 0;
    t.value = withTiming(WEAVE_TIMING.total, {
      duration: WEAVE_TIMING.total,
      easing: Easing.linear,
    });
    revealTimer.current = setTimeout(() => revealRef.current?.(), WEAVE_TIMING.title);
  }, [full, running, measuredAll, t]);
  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  // Word i travels to point i mod n; each star lights when its first word lands.
  const n = geo.points.length;
  const inStep = pieces.length > 1 ? WEAVE_TIMING.wordsInSpan / (pieces.length - 1) : 0;
  const travelStep = pieces.length > 1 ? WEAVE_TIMING.travelSpan / (pieces.length - 1) : 0;
  const arrivals = geo.points.map((_, k) => {
    const first = pieces.findIndex((_, i) => i % n === k);
    return first >= 0
      ? WEAVE_TIMING.travel + first * travelStep + WEAVE_TIMING.travelDur * 0.85
      : WEAVE_TIMING.travel + WEAVE_TIMING.travelDur + k * 40;
  });

  const lines = litEdges(figure, lit)
    .slice()
    .sort((a, b) => edgeStep(a) - edgeStep(b));
  const course = unlitEdges(figure, lit);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const courseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [WEAVE_TIMING.course, WEAVE_TIMING.course + WEAVE_TIMING.courseDur], [0, 1], Extrapolation.CLAMP),
  }));
  const titleStyle = useAnimatedStyle(() => {
    const p = interpolate(t.value, [WEAVE_TIMING.title, WEAVE_TIMING.title + WEAVE_TIMING.titleDur], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p,
      transform: [{ translateY: (1 - ease(p)) * 10 }, { scale: 0.96 + 0.04 * ease(p) }],
    };
  });
  const captionStyle = useAnimatedStyle(() => {
    const p = interpolate(t.value, [WEAVE_TIMING.caption, WEAVE_TIMING.caption + WEAVE_TIMING.titleDur], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - ease(p)) * 8 }] };
  });

  const onWordsLayout = (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    setWordsBox({ x, y });
  };

  return (
    <Animated.View style={[styles.fill, rootStyle]} testID={testID}>
      {/* The figure: course (dashed), lit lines (drawn), stars (lit as words land). */}
      <View style={[styles.abs, geo.fig]} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, courseStyle]}>
          <Svg width={geo.fig.width} height={geo.fig.height}>
            {course.map(([a, b]) => (
              <Line
                key={`c${a}-${b}`}
                x1={geo.points[a].x}
                y1={geo.points[a].y}
                x2={geo.points[b].x}
                y2={geo.points[b].y}
                stroke={colors.ink48}
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeLinecap="round"
                strokeDasharray={[2, 5]}
              />
            ))}
          </Svg>
        </Animated.View>
        {lines.map(([a, b], j) => (
          <WeaveEdge key={`l${a}-${b}`} a={geo.points[a]} b={geo.points[b]} t={t} start={WEAVE_TIMING.edges + j * WEAVE_TIMING.edgeStagger} />
        ))}
        {geo.points.map((pt, k) => (
          <WeaveStar
            key={k}
            pt={pt}
            unit={geo.unit}
            kind={k === 0 ? "anchor" : isPointLit(k, lit) ? (kinds[k - 1] ?? "plain") : "course"}
            t={t}
            at={arrivals[k]}
          />
        ))}
      </View>

      {/* The user's words: rise, then scatter into the figure. */}
      {full ? (
        <View style={[styles.abs, styles.words, { top: geo.textTop, left: gutter, right: gutter }]} onLayout={onWordsLayout} pointerEvents="none">
          {pieces.map((piece, i) => {
            const first = i === 0;
            const last = i === pieces.length - 1;
            const target = geo.points[i % n];
            return (
              <WeaveWord
                key={`${i}-${piece}`}
                text={`${first ? "“" : ""}${piece}${last ? "”" : ""}`}
                t={t}
                inAt={WEAVE_TIMING.wordsIn + i * inStep}
                travelAt={WEAVE_TIMING.travel + i * travelStep}
                target={{
                  x: geo.fig.left + target.x,
                  y: geo.fig.top + target.y,
                }}
                box={wordsBox}
                onCentre={(c) => {
                  if (!centres.current[i]) setMeasured((m) => m + 1);
                  centres.current[i] = c;
                }}
              />
            );
          })}
        </View>
      ) : null}

      {/* The chapter resolves where the words were. */}
      <View style={[styles.abs, styles.text, { top: geo.textTop, left: gutter, right: gutter }]} pointerEvents="none">
        <Animated.View style={[styles.center, titleStyle]}>
          <ChapterNumeral value={numeral} ruled />
          <T variant="title" center style={styles.title} accessibilityRole="header">
            {title}
          </T>
          <T variant="eyebrow" center style={styles.stage}>
            {stageName}
          </T>
        </Animated.View>
        <Animated.View style={captionStyle}>
          <T center style={styles.caption}>
            {caption}
          </T>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------- pieces */

interface WeaveWordProps {
  text: string;
  t: SharedValue<number>;
  inAt: number;
  travelAt: number;
  /** Destination star, stage coordinates. */
  target: Pt;
  /** The words block's offset in the stage, once laid out. */
  box: { x: number; y: number } | null;
  onCentre: (c: Pt) => void;
}

function WeaveWord({ text, t, inAt, travelAt, target, box, onCentre }: WeaveWordProps) {
  const [centre, setCentre] = useState<Pt | null>(null);
  const dx = box && centre ? target.x - (box.x + centre.x) : 0;
  const dy = box && centre ? target.y - (box.y + centre.y) : -120;
  const style = useAnimatedStyle(() => {
    const appear = interpolate(t.value, [inAt, inAt + WEAVE_TIMING.wordInDur], [0, 1], Extrapolation.CLAMP);
    const p = ease(interpolate(t.value, [travelAt, travelAt + WEAVE_TIMING.travelDur], [0, 1], Extrapolation.CLAMP));
    const gone = interpolate(p, [0.55, 0.95], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: appear * gone,
      transform: [{ translateX: dx * p }, { translateY: (1 - ease(appear)) * 14 + dy * p }, { scale: 1 - 0.7 * p }],
    };
  });
  return (
    <Animated.View
      style={style}
      onLayout={(e) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        const c = { x: x + width / 2, y: y + height / 2 };
        setCentre(c);
        onCentre(c);
      }}
    >
      <T variant="title" italic tone="gold">
        {text}
      </T>
    </Animated.View>
  );
}

function WeaveEdge({ a, b, t, start }: { a: Pt; b: Pt; t: SharedValue<number>; start: number }) {
  const len = distance(a, b);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const style = useAnimatedStyle(() => {
    const p = ease(interpolate(t.value, [start, start + WEAVE_TIMING.edgeDur], [0, 1], Extrapolation.CLAMP));
    return {
      opacity: p > 0 ? 1 : 0,
      transform: [{ rotate: `${angle}rad` }, { scaleX: Math.max(0.001, p) }],
    };
  });
  return <Animated.View style={[styles.edge, { left: a.x, top: a.y - 0.75, width: len }, style]} />;
}

type StarKind = ProofKind | "anchor" | "plain" | "course";

function WeaveStar({ pt, unit, kind, t, at }: { pt: Pt; unit: number; kind: StarKind; t: SharedValue<number>; at: number }) {
  const glowId = useSvgId("weave-star-glow");
  const r = kind === "anchor" ? unit * 5 : unit * 4;
  const size = Math.ceil(r * 2);
  const c = size / 2;
  const style = useAnimatedStyle(() => {
    const p = interpolate(t.value, [at - WEAVE_TIMING.starPop, at + 60], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ scale: 0.5 + 0.5 * ease(p) }] };
  });
  // Every landing word flashes as starlight first, then settles into what the
  // point really is (a lit proof star, or a hollow point on the course ahead).
  const sparkId = useSvgId("weave-spark");
  const spark = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [at - WEAVE_TIMING.starPop, at + 40, at + 520], [0, 1, 0], Extrapolation.CLAMP),
  }));
  const glow = kind === "anchor" ? colors.gold500 : colors.did;
  const box = { left: pt.x - c, top: pt.y - c, width: size, height: size };
  return (
    <>
      <Animated.View style={[styles.abs, box, style]}>
        <Svg width={size} height={size}>
          {kind !== "course" ? (
            <>
              <Defs>
                <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={glow} stopOpacity={0.42} />
                  <Stop offset="1" stopColor={glow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={c} cy={c} r={r} fill={`url(#${glowId})`} />
            </>
          ) : null}
          {kind === "anchor" ? <Path d={sparklePath(c, c, unit * 2.4, 0.2)} fill={colors.gold300} /> : null}
          {kind === "plain" ? <Circle cx={c} cy={c} r={unit * 1.1} fill={colors.ink100} /> : null}
          {kind === "course" ? <Circle cx={c} cy={c} r={unit * 0.9} stroke={colors.ink48} strokeWidth={1} fill={colors.sky900} /> : null}
          {kind === "did" || kind === "moved" || kind === "learned" ? <ProofStarShape kind={kind} cx={c} cy={c} r={unit * 1.9} /> : null}
        </Svg>
      </Animated.View>
      {kind !== "anchor" ? (
        <Animated.View style={[styles.abs, box, spark]}>
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id={sparkId} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={colors.did} stopOpacity={0.55} />
                <Stop offset="1" stopColor={colors.did} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={c} cy={c} r={r} fill={`url(#${sparkId})`} />
            <Path d={sparklePath(c, c, unit * 1.6, 0.2)} fill={colors.did} />
          </Svg>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  abs: { position: "absolute" },
  words: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: space.sm,
    rowGap: space.xs,
  },
  text: { alignItems: "center" },
  center: { alignItems: "center", alignSelf: "stretch" },
  title: { marginTop: space.md },
  stage: { marginTop: space.sm },
  caption: { marginTop: space.lg, maxWidth: 320 },
  edge: {
    position: "absolute",
    height: 1.5,
    backgroundColor: LIT_LINE,
    transformOrigin: "left center",
  },
});
