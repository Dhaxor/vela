// The listening dock: the horizon progress line, one line of status, and the
// player row: soundscape and speed on the left, the gold play disc in the
// thumb's reach, sleep timer and voice on the right. Each side control shows
// its current value under its glyph, so nothing hides behind a guess.
// `quiet` turns the play disc from filled gold to an engraved outline when the
// bridge is on screen, so each viewport keeps ONE filled call to action.
// The reader's dock is taller than a button bar, so it uses the Dock's dense
// scrim: story text fades out above the progress line and never shows through
// the status line or the controls.
import React from "react";
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Dock, Press, T, haptics, useGutter, type TTone } from "@/components/ui";
import { accentGlow, colors, radius, space } from "@/constants/theme";
import { DOCK_DISC, dockControlWidth } from "./dockLayout";
import { PauseGlyph, PlayGlyph } from "./glyphs";

export type PlayState = "play" | "pause" | "resume" | "again";

export interface DockControlSpec {
  glyph: React.ReactNode;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
  /** Lit when the control is doing something (a timer running, a bed on). */
  active?: boolean;
}

export interface ReaderDockProps {
  progress: number;
  status: string;
  play: PlayState;
  quiet: boolean;
  disabled: boolean;
  onPlay: () => void;
  left: readonly [DockControlSpec, DockControlSpec];
  right: readonly [DockControlSpec, DockControlSpec];
  onLayout?: (e: LayoutChangeEvent) => void;
}

const PLAY_LABEL: Record<PlayState, string> = {
  play: "Listen",
  pause: "Pause",
  resume: "Resume",
  again: "Listen again",
};

const DISC = DOCK_DISC;

function DockControl({ glyph, label, accessibilityLabel, onPress, testID, active, width }: DockControlSpec & { width: number }) {
  const tone: TTone = active ? "primary" : "muted";
  return (
    <Press
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityLabel={accessibilityLabel}
      pressScale={0.94}
      hitSlop={4}
      style={[styles.control, { width }]}
      testID={testID}
    >
      {glyph}
      <T variant="caption" tone={tone} numeric numberOfLines={1} style={{ maxWidth: width }}>
        {label}
      </T>
    </Press>
  );
}

export function ReaderDock({ progress, status, play, quiet, disabled, onPlay, left, right, onLayout }: ReaderDockProps) {
  const playing = play === "pause";
  // 320pt (Display Zoom on an iPhone SE/8) leaves 288pt inside the gutters: the controls narrow to fit.
  const gutter = useGutter();
  const control = dockControlWidth(useWindowDimensions().width - 2 * gutter, space.xs);
  const glyphColor = quiet || disabled ? colors.gold300 : colors.onGold;
  return (
    <View onLayout={onLayout}>
      <Dock progress={progress} dense testID="story-dock">
        <T variant="caption" tone="muted" center numeric numberOfLines={1} testID="story-listen-status">
          {status}
        </T>
        <View style={styles.row}>
          <View style={styles.side}>
            <DockControl {...left[0]} width={control} />
            <DockControl {...left[1]} width={control} />
          </View>
          <Press
            onPress={() => {
              haptics.step();
              onPlay();
            }}
            disabled={disabled}
            accessibilityLabel={PLAY_LABEL[play]}
            accessibilityState={{ disabled }}
            pressScale={0.94}
            style={[styles.disc, quiet || disabled ? styles.discQuiet : styles.discFilled]}
            testID="story-listen"
          >
            {playing ? <PauseGlyph size={26} color={glyphColor} /> : <PlayGlyph size={26} color={glyphColor} />}
          </Press>
          <View style={styles.side}>
            <DockControl {...right[0]} width={control} />
            <DockControl {...right[1]} width={control} />
          </View>
        </View>
      </Dock>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  side: { flexDirection: "row", alignItems: "center", gap: space.xs },
  control: { minHeight: 52, alignItems: "center", justifyContent: "center", gap: space.xs, borderRadius: radius.sm },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  // The gold glow, plus the 1px inner top light as an inset shadow so it follows the disc's curve.
  discFilled: { backgroundColor: colors.gold500, boxShadow: `${accentGlow.boxShadow}, inset 0px 1px 0px ${colors.buttonHighlight}` },
  discQuiet: { backgroundColor: colors.vellum, borderWidth: 1, borderColor: colors.goldLine },
});
