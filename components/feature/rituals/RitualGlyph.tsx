// The three practice signs and the seal, drawn as atlas line-art like the
// glyph set (components/glyphs): starlight strokes with ONE gold star.
// script = a quill over a ruled line · 369 = rows of three, six and nine ·
// gratitude = three small stars on a gentle arc · seal = the wax seal that
// closes a page ('Sealed. Vela will remember this page.').
import React from "react";
import Svg, { Circle, G, Path } from "react-native-svg";
import { colors } from "@/constants/theme";
import { sparklePath } from "@/lib/sky";

export type RitualGlyphName = "script" | "369" | "gratitude" | "seal" | "page";

export interface RitualGlyphProps {
  name: RitualGlyphName;
  size?: number;
  /** Line colour (default ink80). */
  color?: string;
  /** The one gold accent (default gold300). */
  accent?: string;
  /** 369 only: how many of the 18 dots are lit. */
  lit?: number;
  testID?: string;
}

const LINE = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

/** 12 bumps around a circle: the edge of a wax seal. */
function sealPath(cx: number, cy: number, r: number, bumps = 12, depth = 0.09): string {
  const steps = bumps * 8;
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const rr = r * (1 - depth / 2 + (depth / 2) * Math.cos(a * bumps));
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

/** Rows of 3, 6 and 9 dots (y = 6, 12, 18), centred in a 24 box. */
const ROWS: readonly (readonly [number, number])[] = [
  [3, 6.5],
  [6, 12],
  [9, 17.5],
];

function Art({ name, line, accent, lit }: { name: RitualGlyphName; line: string; accent: string; lit: number }) {
  const s = { stroke: line, strokeWidth: 1.4, ...LINE };
  switch (name) {
    case "script":
      return (
        <G>
          <Path d="M19.5 3.2 C13.6 4.4 9 9.2 7.4 16.4 L10.2 14.6 C14.6 13.2 17.8 9 19.5 3.2 Z" {...s} />
          <Path d="M7.4 16.4 L4.4 19.8" {...s} />
          <Path d="M11.6 11.6 L16.4 6.6" {...s} strokeWidth={1} />
          <Path d="M12 20.4 H20.5" {...s} strokeWidth={1} />
          <Path d={sparklePath(4.6, 5.4, 2.6, 0.2)} fill={accent} />
        </G>
      );
    case "369": {
      let n = 0;
      return (
        <G>
          {ROWS.map(([count, y]) => {
            const gap = count === 9 ? 2.3 : 2.6;
            const x0 = 12 - ((count - 1) * gap) / 2;
            return Array.from({ length: count }, (_, i) => {
              n += 1;
              const on = n <= lit;
              return <Circle key={`${y}-${i}`} cx={x0 + i * gap} cy={y} r={on ? 0.95 : 0.8} fill={on ? accent : line} opacity={on ? 1 : 0.75} />;
            });
          })}
        </G>
      );
    }
    case "gratitude":
      return (
        <G>
          <Path d="M2.8 19.6 Q12 12.6 21.2 19.6" {...s} strokeWidth={1} />
          <Path d={sparklePath(5.6, 13.4, 2.5, 0.2)} fill={line} />
          <Path d={sparklePath(12, 7.2, 3.6, 0.2)} fill={accent} />
          <Path d={sparklePath(18.4, 13.4, 2.5, 0.2)} fill={line} />
        </G>
      );
    case "page":
      return (
        <G>
          <Path d="M6 3.5 H15 L19 7.5 V20.5 H6 Z" {...s} />
          <Path d="M15 3.5 V7.5 H19" {...s} strokeWidth={1} />
          <Path d="M9 11.5 H16 M9 14.5 H16 M9 17.5 H13" {...s} strokeWidth={1} />
        </G>
      );
    case "seal":
      return (
        <G>
          <Path d={sealPath(12, 12, 10.4)} stroke={accent} strokeWidth={1.1} fill={colors.goldEngrave} />
          <Circle cx={12} cy={12} r={7.2} stroke={accent} strokeWidth={0.7} fill="none" opacity={0.7} />
          <Path d={sparklePath(12, 12, 4.8, 0.2)} fill={accent} />
        </G>
      );
  }
}

export function RitualGlyph({ name, size = 28, color = colors.ink80, accent = colors.gold300, lit = 0, testID }: RitualGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Art name={name} line={color} accent={accent} lit={lit} />
    </Svg>
  );
}
