// The bridge: a heading arrow rising over a horizon line (replaces the 1.0
// fitness "footprints").
import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/constants/theme";
import { LINE, type GlyphProps } from "./types";

export function BridgeGlyph({ size = 24, color = colors.violet400, strokeWidth = 1.6, testID }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Path d="M3 19 H21" stroke={color} strokeWidth={strokeWidth} {...LINE} />
      <Path d="M6.5 19 V17.5 M17.5 19 V17.5" stroke={color} strokeWidth={strokeWidth * 0.8} {...LINE} />
      <Path d="M7 15 L17 5" stroke={color} strokeWidth={strokeWidth} {...LINE} />
      <Path d="M11 4.5 H17.5 V11" stroke={color} strokeWidth={strokeWidth} {...LINE} />
    </Svg>
  );
}
