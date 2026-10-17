// Reader glyphs: the player's controls drawn as engraved line-art in the same
// hand as components/glyphs (round ends, stroke ~1.6), so the dock reads as a
// page of the atlas rather than a stock media player.
import React from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { colors } from "@/constants/theme";
import { sparklePath } from "@/lib/sky";

interface GlyphProps {
  size?: number;
  color?: string;
}

const LINE = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

/** Play: a softened triangle, optically centred. */
export function PlayGlyph({ size = 24, color = colors.onGold }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.2 5.6c0-1 1.1-1.6 1.9-1.1l9 5.9c.8.5.8 1.7 0 2.2l-9 5.9c-.8.5-1.9-.1-1.9-1.1V5.6z" fill={color} />
    </Svg>
  );
}

/** Pause: two rounded bars. */
export function PauseGlyph({ size = 24, color = colors.onGold }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6.5} y={5} width={3.6} height={14} rx={1.4} fill={color} />
      <Rect x={13.9} y={5} width={3.6} height={14} rx={1.4} fill={color} />
    </Svg>
  );
}

/** Soundscape: three swells over a horizon. */
export function BedGlyph({ size = 22, color = colors.ink80 }: GlyphProps) {
  const s = { stroke: color, strokeWidth: 1.6, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 8.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" {...s} />
      <Path d="M3 13c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" {...s} />
      <Path d="M3 17.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" {...s} opacity={0.6} />
    </Svg>
  );
}

/** Sleep timer: an hourglass with a little sand left. */
export function SleepGlyph({ size = 22, color = colors.ink80 }: GlyphProps) {
  const s = { stroke: color, strokeWidth: 1.6, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 3.5h11M6.5 20.5h11" {...s} />
      <Path d="M7.5 3.5c0 4.4 4.5 5.6 4.5 8.5s-4.5 4.1-4.5 8.5M16.5 3.5c0 4.4-4.5 5.6-4.5 8.5s4.5 4.1 4.5 8.5" {...s} />
      <Path d="M9.6 18.6c1.2-1.3 3.6-1.3 4.8 0" {...s} />
    </Svg>
  );
}

/** Voice: a short line of speech, five bars. */
export function VoiceGlyph({ size = 22, color = colors.ink80 }: GlyphProps) {
  const s = { stroke: color, strokeWidth: 1.7, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={4} y1={10.5} x2={4} y2={13.5} {...s} />
      <Line x1={8} y1={7} x2={8} y2={17} {...s} />
      <Line x1={12} y1={4} x2={12} y2={20} {...s} />
      <Line x1={16} y1={8} x2={16} y2={16} {...s} />
      <Line x1={20} y1={10.5} x2={20} y2={13.5} {...s} />
    </Svg>
  );
}

/** Rewrite: a quill nib drawing a fresh line. */
export function QuillGlyph({ size = 22, color = colors.ink80 }: GlyphProps) {
  const s = { stroke: color, strokeWidth: 1.6, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19.5 3.5C13 4.5 8.5 9 6.8 15.2l2 2C15 15.5 19.5 11 20.5 4.5z" {...s} />
      <Path d="M6.8 15.2 4 20" {...s} />
      <Path d="M11 13l4.5-4.5" {...s} opacity={0.6} />
      <Path d="M4 20.5h7" {...s} opacity={0.6} />
    </Svg>
  );
}

/** Padlock for Plus beds. */
export function LockGlyph({ size = 16, color = colors.gold300 }: GlyphProps) {
  const s = { stroke: color, strokeWidth: 1.6, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...s} />
      <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...s} />
      <Circle cx={12} cy={15.5} r={1.2} fill={color} />
    </Svg>
  );
}

/** Silence: the swell, struck through. */
export function SilenceGlyph({ size = 22, color = colors.ink80 }: GlyphProps) {
  const s = { stroke: color, strokeWidth: 1.6, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 13c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" {...s} opacity={0.6} />
      <Line x1={5} y1={19} x2={19} y2={5} {...s} />
    </Svg>
  );
}

/** End-of-chapter ornament: three stars on an engraved rule. */
export function EndOrnament({ width = 120, color = colors.gold300 }: { width?: number; color?: string }) {
  const h = 16;
  const mid = width / 2;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Line x1={0} y1={h / 2} x2={mid - 22} y2={h / 2} stroke={colors.goldEngrave} strokeWidth={1} />
      <Line x1={mid + 22} y1={h / 2} x2={width} y2={h / 2} stroke={colors.goldEngrave} strokeWidth={1} />
      <Path d={sparklePath(mid - 12, h / 2, 3, 0.25)} fill={color} opacity={0.6} />
      <Path d={sparklePath(mid, h / 2, 5, 0.22)} fill={color} />
      <Path d={sparklePath(mid + 12, h / 2, 3, 0.25)} fill={color} opacity={0.6} />
    </Svg>
  );
}
