// Engraved vignettes for empty states: a sail on the horizon, a rising arc, a
// window onto the night, an open door. Line-art in starlight with one gold
// star, so an empty screen still feels like a page of the atlas.
import React from "react";
import Svg, { Circle, G, Line, Path } from "react-native-svg";
import { colors } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";
import { LINE } from "./types";

export type VignetteName = "sail" | "horizon" | "window" | "door";

export interface VignetteProps {
  name: VignetteName;
  /** Width in points; height follows the 4:3 plate. */
  width?: number;
  color?: string;
  accent?: string;
  testID?: string;
}

const DUST: readonly [number, number, number][] = [
  [18, 22, 1.1], [136, 26, 1.3], [118, 12, 0.9], [36, 48, 0.8], [146, 58, 0.9], [8, 64, 0.7], [128, 70, 0.7],
];

function Art({ name, line, faint, accent }: { name: VignetteName; line: string; faint: string; accent: string }) {
  const s = { stroke: line, strokeWidth: 1.2, ...LINE };
  const f = { stroke: faint, strokeWidth: 1, ...LINE };
  switch (name) {
    case "sail":
      return (
        <G>
          <Path d="M8 92 H152" {...s} />
          <Path d="M30 99 H62 M74 99 H130" {...f} strokeDasharray="3 4" />
          <Path d="M50 106 H110" {...f} strokeDasharray="2 5" />
          <Path d="M52 86 L80 84 L108 86 Q102 96 80 96 Q58 96 52 86 Z" {...s} />
          <Line x1={80} y1={30} x2={80} y2={84} {...s} />
          <Path d="M78 34 L56 82 H78 Z" {...s} />
          <Path d="M83 42 L102 82 H83 Z" {...s} />
          <Path d="M74 44 L62 72 M74 56 L66 74 M70 70 L69 78" {...f} />
          <Path d={sparklePath(80, 17, 6.5, 0.18)} fill={accent} />
        </G>
      );
    case "horizon":
      return (
        <G>
          <Path d="M8 90 H152" {...s} />
          <Path d="M46 90 A34 34 0 0 1 114 90" {...s} />
          <Path d="M26 90 A54 54 0 0 1 134 90" {...f} strokeDasharray="2 5" />
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI + ((i + 1) * Math.PI) / 10;
            return (
              <Line key={i} x1={80 + 40 * Math.cos(a)} y1={90 + 40 * Math.sin(a)} x2={80 + 47 * Math.cos(a)} y2={90 + 47 * Math.sin(a)} {...f} />
            );
          })}
          <Path d="M58 98 H102 M68 105 H92" {...f} />
          <Path d={sparklePath(80, 22, 6.5, 0.18)} fill={accent} />
        </G>
      );
    case "window":
      return (
        <G>
          <Path d="M52 100 V54 A28 28 0 0 1 108 54 V100 Z" {...s} />
          <Path d="M58 100 V56 A22 22 0 0 1 102 56 V100" {...f} />
          <Line x1={80} y1={34} x2={80} y2={100} {...s} />
          <Line x1={52} y1={66} x2={108} y2={66} {...s} />
          <Path d="M42 100 H118 M46 106 H114" {...s} />
          <Circle cx={66} cy={50} r={1.2} fill={line} />
          <Circle cx={70} cy={84} r={1} fill={line} />
          <Circle cx={97} cy={88} r={1.1} fill={line} />
          <Path d={sparklePath(94, 48, 5.5, 0.18)} fill={accent} />
        </G>
      );
    case "door":
      return (
        <G>
          <Path d="M14 100 H146" {...s} />
          <Path d="M58 100 V22 H102 V100" {...s} />
          <Path d="M58 22 L72 30 V94 L58 100" {...s} />
          <Circle cx={68} cy={62} r={1.4} fill={line} />
          <Path d="M72 100 L60 114 M80 100 L76 114 M88 100 L92 114 M96 100 L108 114 M102 100 L122 114" {...f} />
          <Path d={sparklePath(88, 48, 6, 0.18)} fill={accent} />
          <Circle cx={92} cy={74} r={1} fill={line} />
        </G>
      );
  }
}

export function Vignette({ name, width = 160, color = colors.ink48, accent = colors.gold300, testID }: VignetteProps) {
  return (
    <Svg width={width} height={(width * 3) / 4} viewBox="0 0 160 120" testID={testID}>
      {DUST.map(([x, y, r]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={color} />
      ))}
      <Art name={name} line={color} faint={colors.hairline} accent={accent} />
    </Svg>
  );
}
