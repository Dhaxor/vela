// FIRST LIGHT: the Vela mark draws itself (ELEVATE §2.7). Mast, mainsail,
// jib and hull are inked in over 1.6s, then the gold mast star lights with a
// soft glow. The same paths as the VelaMark glyph, so the end state matches
// it exactly. Driven by one requestAnimationFrame clock (strokeDashoffset as a
// plain prop), which renders identically on iOS and react-native-web; Reduce
// Motion and still mode show the finished mark.
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from "react-native-svg";
import { sparklePath } from "@/lib/sky";
import { useSvgId } from "@/components/sky";
import { useMotion } from "@/components/ui";
import { colors } from "@/constants/theme";

export interface DrawnVelaMarkProps {
  size?: number;
  /** Total draw time in ms. */
  duration?: number;
  /** Wait before drawing (lets the sky fade in first). */
  delay?: number;
  testID?: string;
}

/** Stroke lengths in the 48-unit viewBox (measured from the glyph's geometry). */
const LEN = { mast: 18.5, main: 50.8, jib: 42.2, hull: 70 } as const;

/** Each stroke's [start, end] as fractions of the whole draw. */
const WINDOWS = {
  mast: [0, 0.28],
  main: [0.14, 0.62],
  jib: [0.3, 0.72],
  hull: [0.46, 0.9],
  star: [0.78, 1],
} as const;

function local(t: number, [a, b]: readonly [number, number]): number {
  const p = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return 1 - Math.pow(1 - p, 3);
}

export function DrawnVelaMark({ size = 96, duration = 1600, delay = 300, testID }: DrawnVelaMarkProps) {
  const policy = useMotion();
  const glowId = useSvgId("first-light-glow");
  const animate = policy.transitions;
  const [t, setT] = useState(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) {
      setT(1);
      return;
    }
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      start = Date.now();
      const tick = () => {
        const p = Math.min(1, (Date.now() - start) / duration);
        setT(p);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [animate, duration, delay]);

  const dash = (len: number, p: number) => ({ strokeDasharray: [len, len], strokeDashoffset: len * (1 - p) });
  const stroke = { stroke: colors.ink100, strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  const star = local(t, WINDOWS.star);

  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel="Vela">
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.gold500} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.gold500} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={24} cy={7.5} r={9 * star} fill={`url(#${glowId})`} opacity={star} />
        <Path d={sparklePath(24, 7.5, 5.5 * (0.6 + 0.4 * star), 0.16)} fill={colors.gold300} opacity={star} />
        <Line x1={24} y1={14.5} x2={24} y2={33} {...stroke} {...dash(LEN.mast, local(t, WINDOWS.mast))} />
        <Path d="M22 15.5 L10 33 H22 Z" {...stroke} {...dash(LEN.main, local(t, WINDOWS.main))} />
        <Path d="M26 18.5 L36 33 H26 Z" {...stroke} {...dash(LEN.jib, local(t, WINDOWS.jib))} />
        <Path
          d="M7.5 36.5 L24 34.5 L40.5 36.5 Q37 43.5 24 43.5 Q11 43.5 7.5 36.5 Z"
          {...stroke}
          {...dash(LEN.hull, local(t, WINDOWS.hull))}
        />
      </Svg>
    </View>
  );
}
