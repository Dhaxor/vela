// The save moment every practice page ends on: a gold seal presses into the
// sky, 'Sealed.' and 'Vela will remember this page.', then back to Rituals.
// Peak-end: the page closes with a felt ending instead of a toast. Still mode
// renders the end state and never leaves on its own (screenshots); Reduce
// Motion turns the press into a plain fade.
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Dock, PrimaryButton, Screen, T, drift, haptics, useMotion } from "@/components/ui";
import { useSvgId } from "@/components/sky";
import { colors, motion, space } from "@/constants/theme";
import { RitualGlyph } from "./RitualGlyph";

export interface SealedMomentProps {
  /** One quiet line under the promise ('Script · Wednesday 21 October'). */
  meta?: string;
  /** The headline; defaults to 'Sealed.' */
  title?: string;
  /** Defaults to 'Vela will remember this page.' */
  message?: string;
  /** Leave the moment (back to Rituals). Called by the button, and on its own after a beat. */
  onDone: () => void;
  /** Auto-return after this many ms (0 = stay). Default 2800. Ignored in still mode. */
  autoReturnMs?: number;
  doneLabel?: string;
  testID?: string;
}

const SEAL = 96;

export function SealedMoment({
  meta,
  title = "Sealed.",
  message = "Vela will remember this page.",
  onDone,
  autoReturnMs = 2800,
  doneLabel = "Back to Rituals",
  testID = "sealed-moment",
}: SealedMomentProps) {
  const policy = useMotion();
  const glowId = useSvgId("sealGlow");
  const press = useSharedValue(policy.still ? 1 : 0);
  const halo = useSharedValue(policy.still ? 1 : 0);
  const words = useSharedValue(policy.still ? 1 : 0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    haptics.success();
    if (policy.still) return;
    const ms = motion.reveal;
    press.value = withTiming(1, { duration: policy.transitions ? ms : motion.state, easing: drift });
    halo.value = withTiming(1, { duration: policy.transitions ? ms * 1.4 : motion.state, easing: drift });
    words.value = withDelay(policy.transitions ? ms * 0.55 : 0, withTiming(1, { duration: motion.enter, easing: drift }));
    if (autoReturnMs <= 0) return;
    const t = setTimeout(() => done.current(), autoReturnMs);
    return () => clearTimeout(t);
    // Run once, on mount: the moment plays a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moving = policy.transitions;
  const sealStyle = useAnimatedStyle(() =>
    moving ? { opacity: press.value, transform: [{ scale: 1.35 - 0.35 * press.value }] } : { opacity: press.value }
  );
  const haloStyle = useAnimatedStyle(() =>
    moving ? { opacity: halo.value, transform: [{ scale: 0.6 + 0.4 * halo.value }] } : { opacity: halo.value }
  );
  const wordsStyle = useAnimatedStyle(() =>
    moving ? { opacity: words.value, transform: [{ translateY: 6 * (1 - words.value) }] } : { opacity: words.value }
  );

  return (
    <Screen
      variant="reveal"
      scroll={false}
      testID={testID}
      dock={
        <Dock>
          <PrimaryButton label={doneLabel} onPress={onDone} testID="sealed-done" />
        </Dock>
      }
    >
      <View style={styles.center} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${title} ${message}`}>
        <View style={styles.sealBox}>
          <Animated.View style={[styles.halo, haloStyle]}>
            <Svg width={HALO} height={HALO}>
              <Defs>
                <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={colors.gold500} stopOpacity={0.34} />
                  <Stop offset="0.55" stopColor={colors.gold500} stopOpacity={0.1} />
                  <Stop offset="1" stopColor={colors.gold500} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={HALO / 2} cy={HALO / 2} r={HALO / 2} fill={`url(#${glowId})`} />
              <Circle cx={HALO / 2} cy={HALO / 2} r={SEAL * 0.72} stroke={colors.goldLine} strokeWidth={1} fill="none" />
            </Svg>
          </Animated.View>
          <Animated.View style={sealStyle}>
            <RitualGlyph name="seal" size={SEAL} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.words, wordsStyle]}>
          <T variant="display" center>
            {title}
          </T>
          <T variant="body" center tone="secondary">
            {message}
          </T>
          {meta ? (
            <T variant="caption" center tone="muted" style={styles.meta}>
              {meta}
            </T>
          ) : null}
        </Animated.View>
      </View>
    </Screen>
  );
}

const HALO = SEAL * 2;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl, paddingBottom: space.xxl },
  sealBox: { width: HALO, height: HALO, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: HALO, height: HALO, pointerEvents: "none" },
  words: { alignItems: "center", gap: space.sm, paddingHorizontal: space.lg },
  meta: { marginTop: space.sm },
});
