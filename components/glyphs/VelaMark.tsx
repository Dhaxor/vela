// The app icon as line-art: mainsail, jib, hull and the four-point mast star.
import React from "react";
import Svg, { Line, Path } from "react-native-svg";
import { colors } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";
import { LINE, type GlyphProps } from "./types";

export interface VelaMarkProps extends GlyphProps {
  /** The mast star. Gold by default: the dream at the top of the mast. */
  starColor?: string;
}

export function VelaMark({ size = 48, color = colors.ink100, starColor = colors.gold300, strokeWidth = 1.5, testID }: VelaMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" testID={testID}>
      <Path d={sparklePath(24, 7.5, 5.5, 0.16)} fill={starColor} />
      <Line x1={24} y1={14.5} x2={24} y2={33} stroke={color} strokeWidth={strokeWidth} {...LINE} />
      <Path d="M22 15.5 L10 33 H22 Z" stroke={color} strokeWidth={strokeWidth} {...LINE} />
      <Path d="M26 18.5 L36 33 H26 Z" stroke={color} strokeWidth={strokeWidth} {...LINE} />
      <Path d="M7.5 36.5 L24 34.5 L40.5 36.5 Q37 43.5 24 43.5 Q11 43.5 7.5 36.5 Z" stroke={color} strokeWidth={strokeWidth} {...LINE} />
    </Svg>
  );
}
