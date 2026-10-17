// First Light progress: six stars that connect into the Vela sail. Each step
// lights the next star of the real sail figure and draws its line from the
// one before; the seventh star and the closing line stay on the dashed course,
// because the Weave lights them when Chapter I is written.
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { VELA_SAIL, edgeStep, fitFigure, sparklePath, type FigureEdge, type Pt } from "@/lib/sky";
import { useSvgId } from "@/components/sky";
import { drift, useMotion } from "@/components/ui";
import { colors, motion } from "@/constants/theme";

export interface SailProgressProps {
  /** 0-based step; step s has s + 1 stars lit. */
  step: number;
  total?: number;
  width?: number;
  height?: number;
  testID?: string;
}

const LIT_LINE = colors.ink64;
const COURSE_LINE = colors.hairline;

export function SailProgress({ step, total = 6, width = 132, height = 48, testID }: SailProgressProps) {
  const policy = useMotion();
  const glowId = useSvgId("sail-progress-glow");
  const points = useMemo(() => fitFigure(VELA_SAIL, width, height, 6), [width, height]);
  const lit = Math.max(1, Math.min(total, step + 1));

  // The newest star and its line fade in over the steady figure.
  const fresh = useSharedValue(1);
  useEffect(() => {
    if (!policy.transitions) {
      fresh.value = 1;
      return;
    }
    fresh.value = 0;
    fresh.value = withTiming(1, { duration: motion.enter, easing: drift });
  }, [lit, policy.transitions, fresh]);
  const freshStyle = useAnimatedStyle(() => ({ opacity: fresh.value }));

  const edges = VELA_SAIL.edges;
  const steady = edges.filter((e) => edgeStep(e) < lit);
  const newest = edges.filter((e) => edgeStep(e) === lit);
  const course = edges.filter((e) => edgeStep(e) > lit);

  return (
    <View
      style={{ width, height }}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${lit} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: lit }}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {course.map((e) => (
          <EdgeLine key={`c${e[0]}-${e[1]}`} edge={e} points={points} stroke={COURSE_LINE} dashed />
        ))}
        {steady.map((e) => (
          <EdgeLine key={`s${e[0]}-${e[1]}`} edge={e} points={points} stroke={LIT_LINE} />
        ))}
        {points.map((pt, i) => {
          if (i === 0) return <Path key="anchor" d={sparklePath(pt.x, pt.y, 4.2, 0.2)} fill={colors.gold300} />;
          if (i < lit) return <Path key={i} d={sparklePath(pt.x, pt.y, 3, 0.2)} fill={colors.did} />;
          if (i === lit) return null;
          return <Circle key={i} cx={pt.x} cy={pt.y} r={1.6} stroke={colors.ink48} strokeWidth={1} fill={colors.sky900} />;
        })}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, freshStyle]} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.did} stopOpacity={0.5} />
              <Stop offset="1" stopColor={colors.did} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {newest.map((e) => (
            <EdgeLine key={`n${e[0]}-${e[1]}`} edge={e} points={points} stroke={LIT_LINE} />
          ))}
          <G>
            <Circle cx={points[lit].x} cy={points[lit].y} r={9} fill={`url(#${glowId})`} />
            <Path d={sparklePath(points[lit].x, points[lit].y, 4.4, 0.2)} fill={colors.ink100} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

function EdgeLine({ edge, points, stroke, dashed = false }: { edge: FigureEdge; points: Pt[]; stroke: string; dashed?: boolean }) {
  const a = points[edge[0]];
  const b = points[edge[1]];
  return (
    <Line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={stroke}
      strokeWidth={1}
      strokeLinecap="round"
      strokeDasharray={dashed ? [1.5, 3.5] : undefined}
    />
  );
}
