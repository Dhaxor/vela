// Six original signs, one per focus area, drawn as atlas line-art:
// Love a binary pair · Abundance a cluster · Career an ascending line ·
// Health a pulse under an arc · Confidence a spire · Peace a gentle arc.
import React from "react";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import type { FocusId } from "@/lib/focus";
import { colors } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";
import { LINE, type GlyphProps } from "./types";

export interface AreaSignProps extends GlyphProps {
  focus: FocusId;
}

function Sign({ focus, color, w }: { focus: FocusId; color: string; w: number }) {
  const stroke = { stroke: color, strokeWidth: w, ...LINE };
  switch (focus) {
    case "love":
      return (
        <G>
          <Ellipse cx={12} cy={12} rx={8.5} ry={4} transform="rotate(-24 12 12)" {...stroke} />
          <Circle cx={19.8} cy={8.6} r={2.3} fill={color} />
          <Circle cx={4.2} cy={15.4} r={2.3} fill={color} />
        </G>
      );
    case "abundance":
      return (
        <G>
          <Path d={sparklePath(12, 6.5, 3.6, 0.22)} fill={color} />
          <Circle cx={6.6} cy={11.4} r={1.6} fill={color} />
          <Circle cx={17.4} cy={11.8} r={1.9} fill={color} />
          <Circle cx={10.4} cy={16.2} r={2.1} fill={color} />
          <Circle cx={16} cy={18.2} r={1.3} fill={color} />
          <Circle cx={5.8} cy={18.4} r={1} fill={color} />
        </G>
      );
    case "career":
      return (
        <G>
          <Path d="M3.5 19.5 L8.5 15 L12.5 16.5 L17 10.5" {...stroke} />
          <Circle cx={8.5} cy={15} r={1.4} fill={color} />
          <Circle cx={12.5} cy={16.5} r={1.4} fill={color} />
          <Path d={sparklePath(18.8, 7.8, 3.6, 0.22)} fill={color} />
        </G>
      );
    case "health":
      return (
        <G>
          <Path d="M3.5 18.5 A8.5 8.5 0 0 1 20.5 18.5" {...stroke} />
          <Path d="M7 15.5 H9.6 L11 12.5 L13 17.5 L14.4 14.5 H17" {...stroke} />
        </G>
      );
    case "confidence":
      return (
        <G>
          <Path d="M12 6.5 L15.5 20 H8.5 Z" {...stroke} />
          <Path d="M5 20 H19" {...stroke} />
          <Path d={sparklePath(12, 3.2, 2.6, 0.22)} fill={color} />
        </G>
      );
    case "peace":
      return (
        <G>
          <Path d="M3.5 15.5 Q12 6.5 20.5 15.5" {...stroke} />
          <Path d="M3.5 19 H20.5" {...stroke} />
          <Circle cx={12} cy={7.2} r={1.5} fill={color} />
        </G>
      );
  }
}

export function AreaSign({ focus, size = 24, color = colors.ink80, strokeWidth = 1.5, testID }: AreaSignProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Sign focus={focus} color={color} w={strokeWidth} />
    </Svg>
  );
}
