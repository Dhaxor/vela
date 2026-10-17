// The proof-star share card, drawn in pure SVG from lib/share's model so it
// renders identically on iOS and on the web (where it is also rasterized
// straight from this markup). A plate cut from a star atlas: the user's
// seeded night, engraved line-work, the season's figure with the shared star
// haloed, the kind and the day, and a small Vela mark. No desire, ever; the
// user's sentence only when they switch it on.
import React from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import type { FocusId } from "@/lib/focus";
import { CARD_HEIGHT, CARD_TYPE, CARD_WIDTH, type ShareCardModel } from "@/lib/share/cardModel";
import { sparklePath } from "@/lib/sky/shapes";
import { ProofStarShape } from "@/components/glyphs";
import { useSvgId } from "@/components/sky";
import { colors, fonts, horizonTint, palette } from "@/constants/theme";

export interface ShareStarCardProps {
  model: ShareCardModel;
  /** Rendered width in points; the height follows the 9:16 card. */
  width: number;
  /** Horizon tint (the dream's focus). */
  focus?: FocusId | null;
  testID?: string;
}

const FRAME = 44;
const TICK = 44;

/** The app icon's sail and mast star (glyphs/VelaMark) at (x, y) in a size×size box. */
export function markPaths(x: number, y: number, size: number): { star: string; strokes: string[] } {
  const k = size / 48;
  const X = (n: number) => Math.round((x + n * k) * 10) / 10;
  const Y = (n: number) => Math.round((y + n * k) * 10) / 10;
  return {
    star: sparklePath(X(24), Y(7.5), 5.5 * k, 0.16),
    strokes: [
      `M${X(24)} ${Y(14.5)} L${X(24)} ${Y(33)}`,
      `M${X(22)} ${Y(15.5)} L${X(10)} ${Y(33)} L${X(22)} ${Y(33)} Z`,
      `M${X(26)} ${Y(18.5)} L${X(36)} ${Y(33)} L${X(26)} ${Y(33)} Z`,
      `M${X(7.5)} ${Y(36.5)} L${X(24)} ${Y(34.5)} L${X(40.5)} ${Y(36.5)} Q${X(37)} ${Y(43.5)} ${X(24)} ${Y(43.5)} Q${X(11)} ${Y(43.5)} ${X(7.5)} ${Y(36.5)} Z`,
    ],
  };
}

export function ShareStarCard({ model, width, focus, testID }: ShareStarCardProps) {
  const bg = useSvgId("card-bg");
  const horizon = useSvgId("card-horizon");
  const halo = useSvgId("card-halo");
  const anchorGlow = useSvgId("card-anchor");
  const starGlow = useSvgId("card-star");
  const height = (width * CARD_HEIGHT) / CARD_WIDTH;
  const cx = model.centerX;
  const mark = markPaths(model.mark.x, model.mark.y, model.mark.size);
  const tint = horizonTint[focus ?? "none"];
  const ticks = [
    `M${FRAME} ${FRAME + TICK} L${FRAME} ${FRAME} L${FRAME + TICK} ${FRAME}`,
    `M${CARD_WIDTH - FRAME - TICK} ${FRAME} L${CARD_WIDTH - FRAME} ${FRAME} L${CARD_WIDTH - FRAME} ${FRAME + TICK}`,
    `M${FRAME} ${CARD_HEIGHT - FRAME - TICK} L${FRAME} ${CARD_HEIGHT - FRAME} L${FRAME + TICK} ${CARD_HEIGHT - FRAME}`,
    `M${CARD_WIDTH - FRAME - TICK} ${CARD_HEIGHT - FRAME} L${CARD_WIDTH - FRAME} ${CARD_HEIGHT - FRAME} L${CARD_WIDTH - FRAME} ${CARD_HEIGHT - FRAME - TICK}`,
  ];

  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={model.accessibilityLabel} style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}>
        <Defs>
          <LinearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.sky800} />
            <Stop offset="0.55" stopColor={palette.sky900} />
            <Stop offset="1" stopColor={palette.sky950} />
          </LinearGradient>
          <RadialGradient id={horizon} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity={0.95} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={halo} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.did} stopOpacity={0.62} />
            <Stop offset="0.4" stopColor={palette.did} stopOpacity={0.2} />
            <Stop offset="1" stopColor={palette.did} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={anchorGlow} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.gold500} stopOpacity={0.3} />
            <Stop offset="1" stopColor={palette.gold500} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={starGlow} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.did} stopOpacity={0.36} />
            <Stop offset="1" stopColor={palette.did} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* The night: gradient, the dream's horizon, chart line-work, the user's own stars. */}
        <Rect x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT} fill={`url(#${bg})`} />
        <Ellipse cx={CARD_WIDTH / 2} cy={CARD_HEIGHT} rx={CARD_WIDTH * 0.9} ry={CARD_HEIGHT * 0.36} fill={`url(#${horizon})`} />
        <G opacity={0.9}>
          {model.chart.radii.map((r) => (
            <Circle key={`r${r}`} cx={model.chart.pole.x} cy={model.chart.pole.y} r={r} stroke={colors.chartLine} strokeWidth={2} fill="none" />
          ))}
          {model.chart.meridians.map((m, i) => (
            <Line key={`m${i}`} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke={colors.chartLine} strokeWidth={2} />
          ))}
        </G>
        {model.backdrop.map((s, i) => (
          <Circle key={`b${i}`} cx={s.x} cy={s.y} r={s.r} fill={palette.white} opacity={s.opacity * 0.8} />
        ))}

        {/* The plate: a hairline frame with gold corner ticks. */}
        <Rect x={FRAME} y={FRAME} width={CARD_WIDTH - FRAME * 2} height={CARD_HEIGHT - FRAME * 2} rx={8} stroke={colors.goldEngrave} strokeWidth={2} fill="none" />
        {ticks.map((d) => (
          <Path key={d} d={d} stroke={palette.gold300} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
        ))}

        <SvgText x={cx} y={model.eyebrow.y} textAnchor="middle" fontFamily={fonts.sansSemiBold} fontSize={CARD_TYPE.eyebrow.size} letterSpacing={CARD_TYPE.eyebrow.tracking} fill={colors.ink64}>
          {model.eyebrow.text}
        </SvgText>
        <SvgText x={cx} y={model.title.y} textAnchor="middle" fontFamily={fonts.serif} fontSize={CARD_TYPE.title.size} fill={colors.ink100}>
          {model.title.text}
        </SvgText>

        {/* The figure: the course still to sail (dashed), lit lines, the gold anchor, the stars. */}
        {model.lines.map((l, i) => (
          <Line
            key={`l${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={l.lit ? colors.ink56 : colors.ink48}
            strokeOpacity={l.lit ? 1 : 0.42}
            strokeWidth={l.lit ? 3 : 2.5}
            strokeLinecap="round"
            strokeDasharray={l.lit ? undefined : [4, 14]}
          />
        ))}
        <Circle cx={model.focus.x} cy={model.focus.y} r={model.focus.haloR} fill={`url(#${halo})`} />
        <Circle cx={model.focus.x} cy={model.focus.y} r={56} stroke={palette.did} strokeOpacity={0.55} strokeWidth={2} fill="none" />
        <Circle cx={model.anchor.x} cy={model.anchor.y} r={model.anchor.r * 2.1} fill={`url(#${anchorGlow})`} />
        <Path d={sparklePath(model.anchor.x, model.anchor.y, model.anchor.r, 0.2)} fill={palette.gold300} />
        {model.stars.map((s) =>
          s.lit ? (
            <G key={`s${s.index}`}>
              {!s.highlighted ? <Circle cx={s.x} cy={s.y} r={s.r * 2.4} fill={`url(#${starGlow})`} /> : null}
              {s.kind ? <ProofStarShape kind={s.kind} cx={s.x} cy={s.y} r={s.r} /> : <Circle cx={s.x} cy={s.y} r={s.r * 0.6} fill={colors.ink100} />}
            </G>
          ) : (
            <Circle key={`s${s.index}`} cx={s.x} cy={s.y} r={s.r} stroke={colors.ink48} strokeWidth={2} fill={palette.sky900} />
          )
        )}

        {/* What it was, and when. */}
        <ProofStarShape kind={model.glyph.kind} cx={model.glyph.x} cy={model.glyph.y} r={model.glyph.r} />
        <SvgText x={cx} y={model.date.y} textAnchor="middle" fontFamily={fonts.serif} fontSize={CARD_TYPE.date.size} fill={colors.ink100}>
          {model.date.text}
        </SvgText>
        <SvgText x={cx} y={model.sky.y} textAnchor="middle" fontFamily={fonts.sans} fontSize={CARD_TYPE.meta.size} fill={colors.ink64}>
          {model.sky.text}
        </SvgText>
        {model.sentence.map((line) => (
          <SvgText key={`t${line.y}`} x={cx} y={line.y} textAnchor="middle" fontFamily={fonts.serifItalic} fontSize={CARD_TYPE.sentence.size} fill={palette.gold300}>
            {line.text}
          </SvgText>
        ))}

        {/* The mark. */}
        <Path d={mark.star} fill={palette.gold300} />
        {mark.strokes.map((d) => (
          <Path key={d} d={d} stroke={colors.ink80} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
        <SvgText x={cx} y={model.mark.word.y} textAnchor="middle" fontFamily={fonts.sansSemiBold} fontSize={CARD_TYPE.mark.size} letterSpacing={CARD_TYPE.mark.tracking} fill={colors.ink80}>
          {model.mark.word.text}
        </SvgText>
      </Svg>
    </View>
  );
}
