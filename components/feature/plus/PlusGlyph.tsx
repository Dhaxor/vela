// Line-art marks for what Plus adds, drawn in the atlas style of the glyph set
// (1.5 stroke, round caps, a single filled star where a dream is meant):
// - dreams: two anchors joined by a chart line (more than one dream at a time)
// - beds:   three sound swells over the horizon (soundscapes)
// - areas:  six points on a ring (every affirmation area)
// - scenes: a pinned frame holding a star (unlimited Scenes)
// Also the small sparkle bullet the 'Free forever' panel uses.
import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { sparklePath } from "@/lib/sky";
import { colors } from "@/constants/theme";
import type { BenefitId } from "./copy";

const LINE = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

export interface PlusGlyphProps {
  id: BenefitId;
  size?: number;
  color?: string;
  accent?: string;
}

export function PlusGlyph({ id, size = 24, color = colors.ink80, accent = colors.gold300 }: PlusGlyphProps) {
  const stroke = { stroke: color, strokeWidth: 1.5, ...LINE };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {id === "dreams" ? (
        <>
          <Path d="M7 15.5 L17 8.5" {...stroke} strokeDasharray="1.5 3" />
          <Path d={sparklePath(6.5, 16, 4.6, 0.22)} fill={accent} />
          <Path d={sparklePath(17.5, 8, 4.6, 0.22)} stroke={color} strokeWidth={1.25} strokeLinejoin="round" fill="none" />
        </>
      ) : null}
      {id === "beds" ? (
        <>
          <Path d="M3 19 H21" {...stroke} />
          <Path d="M6 15.5 C8 12.5 10 12.5 12 15.5 C14 18.5 16 18.5 18 15.5" {...stroke} />
          <Path d="M7.5 10.5 C9 8.5 10.5 8.5 12 10.5 C13.5 12.5 15 12.5 16.5 10.5" {...stroke} opacity={0.7} />
          <Path d="M9.5 5.8 C10.4 4.8 11.2 4.8 12 5.8 C12.8 6.8 13.6 6.8 14.5 5.8" {...stroke} opacity={0.45} />
        </>
      ) : null}
      {id === "areas" ? (
        <>
          <Circle cx={12} cy={12} r={7} {...stroke} strokeDasharray="1.5 3" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (Math.PI / 3) * i - Math.PI / 2;
            return <Circle key={i} cx={12 + 7 * Math.cos(a)} cy={12 + 7 * Math.sin(a)} r={1.7} fill={i === 0 ? accent : color} />;
          })}
        </>
      ) : null}
      {id === "scenes" ? (
        <>
          <Rect x={4} y={5.5} width={16} height={14} rx={2.5} {...stroke} />
          <Path d="M12 2.5 V5.5" {...stroke} />
          <Path d="M4.5 16.5 L9 12.5 L12.5 15.5 L15 13.5 L19.5 17" {...stroke} opacity={0.7} />
          <Path d={sparklePath(15.5, 9.5, 2.6, 0.24)} fill={accent} />
        </>
      ) : null}
    </Svg>
  );
}

/** The 'Free forever' bullet: a small starlight sparkle. */
export function FreeStar({ size = 12, color = colors.did }: { size?: number; color?: string }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size}>
      <Path d={sparklePath(c, c, c, 0.24)} fill={color} />
    </Svg>
  );
}
