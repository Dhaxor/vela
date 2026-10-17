// STAR BIRTH (ELEVATE §2.7, the signature moment). The proof card condenses
// into a starlight point, arcs over 900ms to its place in the figure, the
// line from the previous star draws itself, the landing gets a success haptic
// (and the chime, only if audio is already on), then the caption rises in:
// 'Proof 4 · charted'. At the 7th star the closing lines draw and the figure
// is whole.
//
// - Reduce Motion: no flight. The finished sky crossfades in.
// - Still mode: the finished state, at once.
// The caller holds the persistence gate (holdForCeremony) and releases it in
// onComplete.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type LayoutRectangle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import type { ProofKind } from "@/contexts/arc.types";
import { fitFigure, type Figure } from "@/lib/sky";
import { ConstellationFigure, useSvgId } from "@/components/sky";
import { ProofStarShape, PROOF_TINT } from "@/components/glyphs";
import { drift, haptics, useGutter, useMotion } from "@/components/ui";
import { colors, motion, space } from "@/constants/theme";

/** Timeline, ms from the start of the ceremony. */
export const STAR_BIRTH_TIMING = {
  condense: 520,
  flightStart: 460,
  flight: motion.reveal,
  landing: 460 + motion.reveal,
  revealDelay: 240,
  reveal: 640,
  done: 460 + motion.reveal + 1100,
} as const;

const FLIGHT_EASING = Easing.bezier(0.42, 0, 0.18, 1);
const POINT = 56;
const RING = 96;
const NEWEST = 34;

export interface StarBirthProps {
  figure: Figure;
  /** The new star, 1..7. */
  starIndex: number;
  /** kinds[i] is the kind of star i + 1 (the new star included). */
  kinds: readonly (ProofKind | null | undefined)[];
  kind: ProofKind;
  /** The proof card: it condenses into the star, then stays as the receipt. */
  receipt: React.ReactNode;
  /** Rises in after the landing ('Proof 4 · charted', the line under it). */
  caption: React.ReactNode;
  /** Rises in with the caption, under the receipt (share, the Plus nudge). */
  footer?: React.ReactNode;
  /** Play the flight. False (an older proof, a reload) shows the finished sky. */
  play: boolean;
  /** The 7th star: the figure closes, and a faint starlight glow settles behind it. */
  closing?: boolean;
  /** Figure box height; the figure bleeds to the screen edges. */
  figureHeight: number;
  /** Fired at the landing (once). */
  onLanded?: () => void;
  /** Fired when the ceremony has finished (once). */
  onComplete?: () => void;
  testID?: string;
}

interface Geometry {
  start: { x: number; y: number };
  end: { x: number; y: number };
  control: { x: number; y: number };
  receipt: LayoutRectangle;
}

/** The arc the point flies: a quadratic curve bowing away from the chord. */
export function flightControl(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const side = end.x < start.x ? 1 : -1;
  const bow = len * 0.32;
  return { x: (start.x + end.x) / 2 + (-dy / len) * bow * side, y: (start.y + end.y) / 2 + (dx / len) * bow * side };
}

/** Point on the flight curve at progress p (lagging by `lag` for the trail). */
function bezierAt(p: number, lag: number, sx: number, sy: number, cx: number, cy: number, ex: number, ey: number) {
  "worklet";
  const q = Math.max(0, Math.min(1, p - lag));
  const u = 1 - q;
  return { x: u * u * sx + 2 * u * q * cx + q * q * ex, y: u * u * sy + 2 * u * q * cy + q * q * ey };
}

export function StarBirth({
  figure,
  starIndex,
  kinds,
  kind,
  receipt,
  caption,
  footer,
  play,
  closing = false,
  figureHeight,
  onLanded,
  onComplete,
  testID = "star-birth",
}: StarBirthProps) {
  const policy = useMotion();
  const gutter = useGutter();
  const win = useWindowDimensions();
  const fly = play && policy.transitions;
  const [landed, setLanded] = useState(!fly);
  const [done, setDone] = useState(!fly);
  const [figureBox, setFigureBox] = useState<LayoutRectangle | null>(null);
  const [receiptBox, setReceiptBox] = useState<LayoutRectangle | null>(null);
  const [geom, setGeom] = useState<Geometry | null>(null);
  const callbacks = useRef({ onLanded, onComplete });
  callbacks.current = { onLanded, onComplete };
  const fired = useRef({ landed: false, complete: false });

  const figureW = win.width;
  const pad = Math.max(space.xl, Math.round(figureW * 0.09));

  // The newest star keeps a faint ring, so 'Proof 4 · charted' points somewhere.
  const newest = fitFigure(figure, figureW, figureHeight, pad)[Math.max(1, Math.min(7, starIndex))] ?? { x: 0, y: 0 };

  const condense = useSharedValue(0);
  const flight = useSharedValue(0);
  const land = useSharedValue(0);
  const ring = useSharedValue(0);
  const reveal = useSharedValue(fly ? 0 : policy.still ? 1 : 0);

  const fireLanded = () => {
    if (fired.current.landed) return;
    fired.current.landed = true;
    haptics.success();
    callbacks.current.onLanded?.();
  };
  const fireComplete = () => {
    if (fired.current.complete) return;
    fired.current.complete = true;
    callbacks.current.onComplete?.();
  };

  // No flight: the finished sky (crossfade under Reduce Motion, at once in still mode).
  useEffect(() => {
    if (fly) return;
    // A fresh birth under Reduce Motion or still mode still lands (haptic, chime); a reopened one doesn't.
    if (play) fireLanded();
    if (policy.still) {
      reveal.value = 1;
      fireComplete();
      return;
    }
    reveal.value = withTiming(1, { duration: motion.enter, easing: drift });
    const t = setTimeout(fireComplete, motion.enter);
    return () => clearTimeout(t);
    // Runs once per mount: the ceremony is a one-shot.
  }, []);

  // Safety: if the two ends are never measured, never leave an empty sky; show the finished state.
  const measured = useRef(false);
  measured.current = !!geom;
  useEffect(() => {
    if (!fly) return;
    const t = setTimeout(() => {
      if (measured.current) return;
      setLanded(true);
      setDone(true);
      reveal.value = withTiming(1, { duration: motion.enter, easing: drift });
      fireLanded();
      fireComplete();
    }, 900);
    return () => clearTimeout(t);
  }, [fly]);

  // Once both ends of the flight are measured, fix the geometry.
  useEffect(() => {
    if (!fly || geom || !figureBox || !receiptBox) return;
    const pts = fitFigure(figure, figureW, figureHeight, pad);
    const target = pts[Math.max(1, Math.min(pts.length - 1, starIndex))];
    const start = { x: receiptBox.x + receiptBox.width / 2, y: receiptBox.y + receiptBox.height / 2 };
    // The figure is centred in its (full-bleed) box.
    const end = { x: figureBox.x + (figureBox.width - figureW) / 2 + target.x, y: figureBox.y + (figureBox.height - figureHeight) / 2 + target.y };
    setGeom({ start, end, control: flightControl(start, end), receipt: receiptBox });
  }, [fly, geom, figureBox, receiptBox, figure, figureW, figureHeight, pad, starIndex]);

  // The timeline.
  useEffect(() => {
    if (!fly || !geom) return;
    const T = STAR_BIRTH_TIMING;
    condense.value = withTiming(1, { duration: T.condense, easing: drift });
    // The flight eases in and out (drift would front-load it and the arc would barely read).
    flight.value = withDelay(T.flightStart, withTiming(1, { duration: T.flight, easing: FLIGHT_EASING }));
    // Overshoot is allowed here and nowhere else: the point swells past its size, then settles into the star.
    land.value = withDelay(T.landing, withSequence(withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }), withTiming(2, { duration: 420, easing: drift })));
    ring.value = withDelay(T.landing, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    reveal.value = withDelay(T.landing + T.revealDelay, withTiming(1, { duration: T.reveal, easing: drift }));
    const a = setTimeout(() => {
      setLanded(true);
      fireLanded();
    }, T.landing);
    const b = setTimeout(() => {
      setDone(true);
      fireComplete();
    }, T.done);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // geom is set once; shared values are stable.
  }, [fly, geom]);

  const s = geom?.start ?? { x: 0, y: 0 };
  const c = geom?.control ?? { x: 0, y: 0 };
  const e = geom?.end ?? { x: 0, y: 0 };

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * space.sm }],
  }));
  const receiptStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const condenseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(condense.value, [0, 0.55, 1], [1, 0.85, 0], "clamp"),
    transform: [
      { scaleX: interpolate(condense.value, [0, 1], [1, 0.04], "clamp") },
      { scaleY: interpolate(condense.value, [0, 1], [1, 0.12], "clamp") },
    ],
  }));
  const pointStyle = useAnimatedStyle(() => {
    const at = bezierAt(flight.value, 0, s.x, s.y, c.x, c.y, e.x, e.y);
    const appear = interpolate(condense.value, [0.35, 0.85], [0, 1], "clamp");
    const l = land.value;
    const swell = l <= 1 ? 1 + 0.7 * l : 1.7 - 0.7 * (l - 1);
    const fade = l <= 1 ? 1 : 2 - l;
    const grow = interpolate(condense.value, [0.35, 1], [0.3, 1], "clamp");
    return {
      opacity: appear * fade,
      transform: [{ translateX: at.x - POINT / 2 }, { translateY: at.y - POINT / 2 }, { scale: swell * grow }],
    };
  }, [s.x, s.y, c.x, c.y, e.x, e.y]);
  const trailA = useAnimatedStyle(() => {
    const at = bezierAt(flight.value, 0.07, s.x, s.y, c.x, c.y, e.x, e.y);
    return {
      opacity: 0.5 * interpolate(flight.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0], "clamp"),
      transform: [{ translateX: at.x - POINT / 2 }, { translateY: at.y - POINT / 2 }, { scale: 0.62 }],
    };
  }, [s.x, s.y, c.x, c.y, e.x, e.y]);
  const trailB = useAnimatedStyle(() => {
    const at = bezierAt(flight.value, 0.14, s.x, s.y, c.x, c.y, e.x, e.y);
    return {
      opacity: 0.25 * interpolate(flight.value, [0, 0.2, 0.85, 1], [0, 1, 1, 0], "clamp"),
      transform: [{ translateX: at.x - POINT / 2 }, { translateY: at.y - POINT / 2 }, { scale: 0.44 }],
    };
  }, [s.x, s.y, c.x, c.y, e.x, e.y]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.12, 1], [0, 0.9, 0], "clamp"),
    transform: [{ translateX: e.x - RING / 2 }, { translateY: e.y - RING / 2 }, { scale: interpolate(ring.value, [0, 1], [0.25, 1.9]) }],
  }), [e.x, e.y]);

  return (
    <View testID={testID}>
      <View
        style={[styles.figure, { marginHorizontal: -gutter, height: figureHeight }]}
        onLayout={(ev) => setFigureBox(ev.nativeEvent.layout)}
      >
        <View style={{ width: figureW, height: figureHeight }}>
          {closing && landed ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, receiptStyle]}>
              <WholeGlow width={figureW} height={figureHeight} />
            </Animated.View>
          ) : null}
          {landed ? (
            <Animated.View pointerEvents="none" style={[styles.newest, { left: newest.x - NEWEST / 2, top: newest.y - NEWEST / 2 }, receiptStyle]}>
              <View style={[styles.newestRing, { borderColor: PROOF_TINT[kind] }]} />
            </Animated.View>
          ) : null}
          <ConstellationFigure
            figure={figure}
            lit={landed ? starIndex : starIndex - 1}
            kinds={kinds}
            width={figureW}
            height={figureHeight}
            padding={pad}
            drawLatest={landed && fly}
            accessibilityLabel={`Your constellation, ${starIndex} of 7 stars lit. The newest is your ${kind === "learned" ? "lesson" : "proof"}.`}
            testID={`${testID}-figure`}
          />
        </View>
      </View>

      <Animated.View style={[styles.caption, revealStyle]}>{caption}</Animated.View>

      <Animated.View style={[styles.receipt, receiptStyle]} onLayout={(ev) => setReceiptBox(ev.nativeEvent.layout)}>
        {receipt}
      </Animated.View>

      {footer ? <Animated.View style={revealStyle}>{footer}</Animated.View> : null}

      {fly && geom && !done ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`${testID}-flight`}>
          <Animated.View
            style={[
              styles.ghost,
              { left: geom.receipt.x, top: geom.receipt.y, width: geom.receipt.width, height: geom.receipt.height },
              condenseStyle,
            ]}
          >
            {receipt}
          </Animated.View>
          <Animated.View style={[styles.point, trailB]}>
            <StarPoint kind={kind} />
          </Animated.View>
          <Animated.View style={[styles.point, trailA]}>
            <StarPoint kind={kind} />
          </Animated.View>
          <Animated.View style={[styles.ring, { borderColor: PROOF_TINT[kind] }, ringStyle]} />
          <Animated.View style={[styles.point, pointStyle]}>
            <StarPoint kind={kind} />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

/** Behind a closed figure: one soft starlight glow, the season made whole. */
export function WholeGlow({ width, height }: { width: number; height: number }) {
  const id = useSvgId("whole-glow");
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.did} stopOpacity={0.11} />
          <Stop offset="0.6" stopColor={colors.did} stopOpacity={0.035} />
          <Stop offset="1" stopColor={colors.did} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width * 0.48} ry={height * 0.5} fill={`url(#${id})`} />
    </Svg>
  );
}

/** The travelling light: a warm glow around the kind's star shape. */
function StarPoint({ kind }: { kind: ProofKind }) {
  const glow = useSvgId("birth-glow");
  const tint = PROOF_TINT[kind];
  return (
    <Svg width={POINT} height={POINT}>
      <Defs>
        <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={tint} stopOpacity={0.9} />
          <Stop offset="0.35" stopColor={tint} stopOpacity={0.35} />
          <Stop offset="1" stopColor={tint} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={POINT / 2} cy={POINT / 2} r={POINT / 2} fill={`url(#${glow})`} />
      <ProofStarShape kind={kind} cx={POINT / 2} cy={POINT / 2} r={9} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  figure: { alignItems: "center", justifyContent: "center" },
  newest: { position: "absolute", width: NEWEST, height: NEWEST, zIndex: 1 },
  newestRing: { flex: 1, borderRadius: NEWEST / 2, borderWidth: 1, opacity: 0.55 },
  caption: { alignItems: "center", gap: space.sm, marginTop: space.base },
  receipt: { marginTop: space.lg },
  ghost: { position: "absolute" },
  point: { position: "absolute", left: 0, top: 0, width: POINT, height: POINT },
  ring: { position: "absolute", left: 0, top: 0, width: RING, height: RING, borderRadius: RING / 2, borderWidth: 1.5 },
});
