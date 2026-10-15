// The night sky behind a screen. <Screen> mounts one per screen (never one
// global transparent layer: native-stack fades and iOS modals would break it).
//
// L0  vertical gradient sky800 → sky950, plus the horizon glow tinted by the
//     active dream's focus (and a dawn hint for morning-ritual users)
// L1  140 seeded stars, one memoized Svg
// L2  engraved chart line-work: declination arcs, meridians, an edge scale
// L3  two nebula glows (violet, teal) drifting ±16px over 24s
// +   ≤10 twinkling stars
// Motion runs only while `active` (the screen is focused) and never under
// Reduce Motion or still mode: then the sky is fully static.
import React, { memo, useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, Ellipse, Line, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { FocusId } from "@/lib/focus";
import { mulberry32 } from "@/lib/story/rng";
import {
  makeStarfield,
  pickTwinkles,
  twinkleTimings,
  type SkyStar,
  type StarTone,
  type TwinkleTiming,
} from "@/lib/sky/starfield";
import { chartGeometry } from "@/lib/sky/layout";
import { colors, horizonTint, motion } from "@/constants/theme";
import { useMotion } from "@/components/ui/motion";
import { useSky } from "./SkyContext";
import { useSvgId } from "./svgId";

export type SkyVariant = "calm" | "reveal" | "reader" | "still";

export interface SkyBackdropProps {
  variant?: SkyVariant;
  /** Horizon tint. Omit to use the active dream's focus; null for the neutral horizon. */
  focus?: FocusId | null;
  /** Override the user's seed (dev sink, previews). */
  seed?: number;
  /** Override the morning dawn hint. */
  dawn?: boolean;
  /** Motion may run (the owning screen is focused). Default true. */
  active?: boolean;
  /** Defaults to the window size. */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const STAR_TONES: Record<StarTone, string> = {
  warm: colors.did,
  cool: colors.moved,
  pale: colors.learned,
};

interface Field {
  readonly stars: readonly SkyStar[];
  readonly twinkles: readonly number[];
  readonly timings: readonly TwinkleTiming[];
}

/** Module-level memo: one starfield per seed for the app's lifetime. */
const fields = new Map<number, Field>();

function fieldFor(seed: number): Field {
  let field = fields.get(seed);
  if (!field) {
    const stars = makeStarfield(seed);
    const twinkles = pickTwinkles(stars);
    field = { stars, twinkles, timings: twinkleTimings(seed, twinkles.length) };
    fields.set(seed, field);
  }
  return field;
}

/** Line-work alpha per variant: 6% calm, 12% for reveals (Weave, Star Birth). */
const CHART_ALPHA: Record<SkyVariant, number> = { calm: 0.06, reveal: 0.12, reader: 0.05, still: 0.06 };
/** The reader dims the field so story text stays legible on open sky. */
const STAR_ALPHA: Record<SkyVariant, number> = { calm: 1, reveal: 1, reader: 0.5, still: 1 };

export function SkyBackdrop({
  variant = "calm",
  focus,
  seed,
  dawn,
  active = true,
  width,
  height,
  style,
}: SkyBackdropProps) {
  const sky = useSky();
  const win = useWindowDimensions();
  const policy = useMotion();
  const w = Math.round(width ?? win.width);
  const h = Math.round(height ?? win.height);
  const s = seed ?? sky.seed;
  const tint = horizonTint[(focus === undefined ? sky.focus : focus) ?? "none"];
  const morning = dawn ?? sky.dawn;
  const run = active && policy.ambient && variant !== "still";
  const field = fieldFor(s);

  return (
    <View style={[styles.fill, { width: w, height: h }, style]}>
      <LinearGradient colors={[colors.sky800, colors.sky900, colors.sky950]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <StaticSky
        seed={s}
        width={w}
        height={h}
        tint={tint}
        dawn={morning}
        chartAlpha={CHART_ALPHA[variant]}
        starAlpha={STAR_ALPHA[variant]}
        field={field}
      />
      {variant !== "reader" && <Nebulae seed={s} width={w} height={h} run={run} />}
      {field.twinkles.map((index, i) => (
        <Twinkle
          key={index}
          star={field.stars[index]}
          timing={field.timings[i]}
          width={w}
          height={h}
          alpha={STAR_ALPHA[variant]}
          run={run}
        />
      ))}
    </View>
  );
}

interface StaticSkyProps {
  seed: number;
  width: number;
  height: number;
  tint: string;
  dawn: boolean;
  chartAlpha: number;
  starAlpha: number;
  field: Field;
}

/** Everything that never moves, in one Svg. Re-renders only when its inputs change. */
const StaticSky = memo(function StaticSky({ seed, width, height, tint, dawn, chartAlpha, starAlpha, field }: StaticSkyProps) {
  const horizonId = useSvgId("vela-hz");
  const dawnId = useSvgId("vela-dawn");
  const chart = useMemo(() => chartGeometry(width, height, seed), [width, height, seed]);
  const skip = useMemo(() => new Set(field.twinkles), [field]);
  const line = `rgba(214, 206, 255, ${chartAlpha})`;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={horizonId} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={tint} stopOpacity={0.95} />
          <Stop offset="0.55" stopColor={tint} stopOpacity={0.42} />
          <Stop offset="1" stopColor={tint} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={dawnId} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.dawn} stopOpacity={0.1} />
          <Stop offset="1" stopColor={colors.dawn} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Ellipse cx={width / 2} cy={height * 1.02} rx={width * 1.05} ry={height * 0.36} fill={`url(#${horizonId})`} />
      {dawn && <Ellipse cx={width / 2} cy={height * 1.04} rx={width * 0.8} ry={height * 0.2} fill={`url(#${dawnId})`} />}

      {chart.radii.map((r) => (
        <Circle key={r} cx={chart.pole.x} cy={chart.pole.y} r={r} stroke={line} strokeWidth={1} fill="none" />
      ))}
      {chart.meridians.map((m, i) => (
        <Line key={i} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke={line} strokeWidth={1} />
      ))}
      {chart.ticks.map((t, i) => (
        <Line key={`t${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={line} strokeWidth={1} />
      ))}

      {field.stars.map((star, i) =>
        skip.has(i) ? null : (
          <Circle
            key={i}
            cx={star.x * width}
            cy={star.y * height}
            r={star.r}
            fill={STAR_TONES[star.tone]}
            opacity={star.opacity * starAlpha}
          />
        )
      )}
    </Svg>
  );
});

interface NebulaeProps {
  seed: number;
  width: number;
  height: number;
  run: boolean;
}

function Nebulae({ seed, width, height, run }: NebulaeProps) {
  const spots = useMemo(() => {
    const rng = mulberry32(seed ^ 0x27d4eb2f);
    return [
      { color: colors.nebulaViolet, alpha: 0.1, cx: width * (0.08 + rng() * 0.2), cy: height * (0.1 + rng() * 0.14), r: width * 0.78, dx: 1, dy: 0.6 },
      { color: colors.nebulaTeal, alpha: 0.08, cx: width * (0.78 + rng() * 0.18), cy: height * (0.42 + rng() * 0.16), r: width * 0.66, dx: -0.7, dy: 1 },
    ];
  }, [seed, width, height]);
  return (
    <>
      {spots.map((spot, i) => (
        <Nebula key={i} {...spot} run={run} />
      ))}
    </>
  );
}

interface NebulaProps {
  color: string;
  alpha: number;
  cx: number;
  cy: number;
  r: number;
  dx: number;
  dy: number;
  run: boolean;
}

const HALF_DRIFT = motion.nebulaPeriodMs / 2;

function Nebula({ color, alpha, cx, cy, r, dx, dy, run }: NebulaProps) {
  const id = useSvgId("vela-neb");
  const t = useSharedValue(0.5);

  useEffect(() => {
    if (!run) {
      cancelAnimation(t);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    // From wherever it rests, glide to one end, then swing ±16px forever.
    t.value = withSequence(
      withTiming(1, { duration: HALF_DRIFT * (1 - t.value), easing: ease }),
      withRepeat(
        withSequence(withTiming(0, { duration: HALF_DRIFT, easing: ease }), withTiming(1, { duration: HALF_DRIFT, easing: ease })),
        -1
      )
    );
    return () => cancelAnimation(t);
  }, [run, t]);

  const drift = useAnimatedStyle(() => {
    const k = (t.value - 0.5) * 2 * motion.nebulaDriftPx;
    return { transform: [{ translateX: k * dx }, { translateY: k * dy }] };
  });

  const size = r * 2;
  return (
    <Animated.View style={[styles.abs, { left: cx - r, top: cy - r, width: size, height: size }, drift]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={alpha} />
            <Stop offset="0.5" stopColor={color} stopOpacity={alpha * 0.4} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

interface TwinkleProps {
  star: SkyStar;
  timing: TwinkleTiming;
  width: number;
  height: number;
  alpha: number;
  run: boolean;
}

const Twinkle = memo(function Twinkle({ star, timing, width, height, alpha, run }: TwinkleProps) {
  const base = star.opacity * alpha;
  const o = useSharedValue(base);

  useEffect(() => {
    if (!run) {
      cancelAnimation(o);
      o.value = base;
      return;
    }
    const half = timing.periodMs / 2;
    const ease = Easing.inOut(Easing.sin);
    o.value = withDelay(
      timing.delayMs,
      withRepeat(
        withSequence(
          withTiming(motion.twinkle.low * alpha, { duration: half, easing: ease }),
          withTiming(motion.twinkle.high * alpha, { duration: half, easing: ease })
        ),
        -1
      )
    );
    return () => cancelAnimation(o);
  }, [run, base, alpha, timing, o]);

  const fade = useAnimatedStyle(() => ({ opacity: o.value }));
  const size = star.r * 2 + 1;
  const tone = STAR_TONES[star.tone];
  return (
    <Animated.View
      style={[
        styles.abs,
        {
          left: star.x * width - size / 2,
          top: star.y * height - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone,
          boxShadow: `0px 0px 3px ${tone}`,
        },
        fade,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, top: 0, overflow: "hidden", backgroundColor: colors.sky950, pointerEvents: "none" },
  abs: { position: "absolute", pointerEvents: "none" },
});
