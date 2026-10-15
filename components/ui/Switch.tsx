// On/off switch in the selected-state grammar: on = raised track, gold300
// border and thumb; off = quiet vellum. accessibilityLabel is required.
import React, { useEffect } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, motion } from "@/constants/theme";
import { drift, useMotion } from "./motion";
import { haptics } from "./haptics";

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const W = 52;
const H = 32;
const THUMB = 24;
const TRAVEL = W - THUMB - 8;

export function Switch({ value, onValueChange, accessibilityLabel, disabled, testID, style }: SwitchProps) {
  const policy = useMotion();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    const target = value ? 1 : 0;
    on.value = policy.transitions ? withTiming(target, { duration: motion.state, easing: drift }) : target;
  }, [value, policy.transitions, on]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.sky700, colors.sky600]),
    borderColor: interpolateColor(on.value, [0, 1], [colors.hairline, colors.gold300]),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * TRAVEL }],
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.ink64, colors.gold300]),
  }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptics.select();
        onValueChange(!value);
      }}
      style={[disabled && styles.inert, style]}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, borderWidth: 1.5, justifyContent: "center", paddingHorizontal: 2.5 },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
  inert: { opacity: 0.4 },
});
