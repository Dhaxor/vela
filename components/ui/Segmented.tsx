// Segmented control for small exclusive choices (speed, text size, ritual
// time). The thumb slides between equal segments.
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, motion, radius, space } from "@/constants/theme";
import { T } from "./T";
import { drift, useMotion } from "./motion";
import { haptics } from "./haptics";

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Spoken label when the visible one is terse ('0.9×' → 'Speed 0.9'). */
  accessibilityLabel?: string;
}

export interface SegmentedProps<V extends string> {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Segment testIDs are `${testID}-${value}`. */
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const PAD = 4;

export function Segmented<V extends string>({ options, value, onChange, testID, accessibilityLabel, style }: SegmentedProps<V>) {
  const policy = useMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = options.length ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(index * segment);

  useEffect(() => {
    const target = index * segment;
    x.value = policy.transitions ? withTiming(target, { duration: motion.state, easing: drift }) : target;
  }, [index, segment, policy.transitions, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[styles.track, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {width > 0 ? <Animated.View style={[styles.thumb, { width: segment }, thumb]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={testID ? `${testID}-${o.value}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            accessibilityState={{ checked: on }}
            onPress={() => {
              if (on) return;
              haptics.select();
              onChange(o.value);
            }}
            style={styles.segment}
          >
            <T variant="caption" strong tone={on ? "primary" : "muted"} numeric numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 44,
    flexDirection: "row",
    padding: PAD,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  thumb: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.sky600,
    borderWidth: 1,
    borderColor: colors.goldLine,
    pointerEvents: "none",
  },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xs },
});
