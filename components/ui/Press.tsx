// The one pressable surface: a spring press to .97 (damping 18, stiffness
// 160), or a plain opacity dip under Reduce Motion. Every button and tappable
// card is built on it, so touch feels the same everywhere.
import React from "react";
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { motion } from "@/constants/theme";
import { pressSpring, useMotion } from "./motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressProps extends Omit<PressableProps, "style" | "children"> {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Scale on press. Defaults to the system .97. */
  pressScale?: number;
}

export function Press({ style, children, pressScale = motion.press.scale, onPressIn, onPressOut, disabled, ...rest }: PressProps) {
  const policy = useMotion();
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() =>
    policy.reduced
      ? { opacity: 1 - pressed.value * 0.25 }
      : { transform: [{ scale: 1 - pressed.value * (1 - pressScale) }] }
  );

  const handleIn = (e: GestureResponderEvent) => {
    pressed.value = policy.reduced ? withTiming(1, { duration: motion.tap }) : withSpring(1, pressSpring);
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    pressed.value = policy.reduced ? withTiming(0, { duration: motion.tap }) : withSpring(0, pressSpring);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
