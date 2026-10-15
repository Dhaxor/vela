// Tab icons. Today = a star over the horizon, Arc = an open book, Rituals = a
// quill, Sky = a constellation, Scenes = a framed scene. The focused tab fills
// its star; unfocused icons are line only.
import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { colors } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";
import { LINE, type GlyphProps } from "./types";

export type TabIconName = "today" | "arc" | "rituals" | "sky" | "scenes";
/** 1.0 tab names, kept until Phase 2 switches the IA. */
export type LegacyTabIconName = "stories" | "journal" | "board";

const LEGACY: Record<LegacyTabIconName, TabIconName> = { stories: "arc", journal: "rituals", board: "scenes" };

export interface TabIconProps extends GlyphProps {
  name: TabIconName | LegacyTabIconName;
  focused?: boolean;
}

function Icon({ name, color, w, focused }: { name: TabIconName; color: string; w: number; focused: boolean }) {
  const stroke = { stroke: color, strokeWidth: w, ...LINE };
  const star = (cx: number, cy: number, r: number) =>
    focused ? <Path d={sparklePath(cx, cy, r, 0.2)} fill={color} /> : <Path d={sparklePath(cx, cy, r, 0.2)} {...stroke} strokeWidth={w * 0.85} />;
  switch (name) {
    case "today":
      return (
        <G>
          <Path d="M2.5 17.5 H21.5" {...stroke} />
          <Path d="M7 21 H17" {...stroke} strokeWidth={w * 0.8} />
          {star(12, 9, 5.5)}
          <Circle cx={4.8} cy={10.5} r={0.9} fill={color} />
          <Circle cx={19.4} cy={6.5} r={0.9} fill={color} />
        </G>
      );
    case "arc":
      return (
        <G>
          <Path d="M12 6.5 C9.4 4.9 6.4 4.6 3 5.4 V18.8 C6.4 18 9.4 18.3 12 20 C14.6 18.3 17.6 18 21 18.8 V5.4 C17.6 4.6 14.6 4.9 12 6.5 Z" {...stroke} />
          <Path d="M12 6.5 V20" {...stroke} />
          {focused && <Path d={sparklePath(16.6, 10.6, 2.6, 0.2)} fill={color} />}
        </G>
      );
    case "rituals":
      return (
        <G>
          <Path d="M19.5 3.5 C12.5 5 8.2 10.4 7.2 17.2" {...stroke} />
          <Path d="M19.5 3.5 C19 10 14.6 15.2 7.2 17.2" {...stroke} />
          <Path d="M7.2 17.2 L4.5 20.5" {...stroke} />
          {focused && <Path d="M19.5 3.5 C12.5 5 8.2 10.4 7.2 17.2 C14.6 15.2 19 10 19.5 3.5 Z" fill={color} opacity={0.35} />}
        </G>
      );
    case "sky":
      return (
        <G>
          <Path d="M4.5 18 L9 10.5 L15 13 L19.5 5.5" {...stroke} />
          <Circle cx={4.5} cy={18} r={1.6} fill={color} />
          <Circle cx={9} cy={10.5} r={1.6} fill={color} />
          <Circle cx={15} cy={13} r={1.6} fill={color} />
          {star(19.5, 5.5, 3)}
        </G>
      );
    case "scenes":
      return (
        <G>
          <Rect x={3.5} y={4.5} width={17} height={15} rx={2.5} {...stroke} />
          <Path d="M3.5 15.5 L9 11.5 L13 14.5 L16 12.5 L20.5 15.5" {...stroke} />
          {star(15.5, 8.6, 2.2)}
        </G>
      );
  }
}

export function TabIcon({ name, focused = false, size = 24, color = colors.ink100, strokeWidth = 1.6, testID }: TabIconProps) {
  const resolved: TabIconName = name in LEGACY ? LEGACY[name as LegacyTabIconName] : (name as TabIconName);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Icon name={resolved} color={color} w={strokeWidth} focused={focused} />
    </Svg>
  );
}
