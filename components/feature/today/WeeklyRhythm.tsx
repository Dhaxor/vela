// The week as seven small stars: nights you showed up are lit, past quiet
// nights are hollow REST stars (never a miss), today glows (lit once you've
// shown up), the days ahead are faint points. Weekday initials sit under
// each star. Compact by design: it shares a row with the nights chip, so the
// loop card's CTA stays above the fold on a 375×667 phone.
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { WeeklyRhythm as Rhythm, WeekDayState } from "@/lib/progress";
import { T } from "@/components/ui";
import { colors, space } from "@/constants/theme";
import { sparklePath } from "@/lib/sky/shapes";

const INITIALS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const STAR = 14;

export function rhythmCaption(week: Rhythm): string {
  if (week.met) return `${week.shownUp} of ${week.target} nights · rhythm kept`;
  return `${week.shownUp} of ${week.target} nights this week`;
}

function Day({ state, today }: { state: WeekDayState; today: boolean }) {
  const c = STAR / 2;
  return (
    <Svg width={STAR} height={STAR}>
      {state === "shown-up" ? (
        <>
          {today ? <Circle cx={c} cy={c} r={c} fill={colors.starGlow} opacity={0.6} /> : null}
          <Path d={sparklePath(c, c, 6, 0.2)} fill={colors.did} />
        </>
      ) : null}
      {state === "today-open" ? (
        <>
          <Circle cx={c} cy={c} r={c} fill={colors.starGlow} opacity={0.35} />
          <Circle cx={c} cy={c} r={3.5} stroke={colors.ink100} strokeWidth={1.25} fill="none" />
        </>
      ) : null}
      {state === "rest" || state === "paused" ? <Circle cx={c} cy={c} r={3} stroke={colors.ink48} strokeWidth={1.1} fill="none" /> : null}
      {state === "future" ? <Circle cx={c} cy={c} r={1.4} fill={colors.ink48} /> : null}
    </Svg>
  );
}

export interface WeeklyRhythmProps {
  week: Rhythm;
  paused?: boolean;
  /** Today's local date key, to mark today's initial. */
  todayKey: string;
  testID?: string;
}

export function WeeklyRhythm({ week, paused = false, todayKey, testID = "today-rhythm" }: WeeklyRhythmProps) {
  const shown = week.days.filter((d) => d.state === "shown-up").map((d) => DAY_NAMES[d.index]);
  const label = `${rhythmCaption(week)}${shown.length ? `: ${shown.join(", ")}` : ""}${paused ? ". Your sky is paused" : ""}`;
  return (
    <View testID={testID} style={styles.row} accessible accessibilityRole="summary" accessibilityLabel={label}>
      {week.days.map((d) => {
        const today = d.dateKey === todayKey;
        return (
          <View key={d.dateKey} style={styles.cell}>
            <Day state={d.state} today={today} />
            <T variant="caption" tone={today ? "primary" : "faint"} strong={today} center style={styles.letter}>
              {INITIALS[d.index]}
            </T>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs },
  cell: { width: 16, alignItems: "center" },
  // Initials tuck under the star so the strip is no taller than the chip.
  letter: { marginTop: -space.xxs, lineHeight: 16 },
});
