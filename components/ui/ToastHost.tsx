// The toast itself: a short starlight note at the top of the screen.
//
// UIProvider owns the toast state; this file draws it. It is drawn in exactly
// one place: inside the top-most open <Sheet> when one is up, otherwise at the
// root. On iOS a sheet is a presented Modal above the root view, so a toast
// drawn at the root would sit underneath it, unseen (an error raised by the
// sheet's own action would just vanish).
import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, motion, radius, space } from "@/constants/theme";
import { gutterFor } from "@/lib/sky/layout";
import { sparklePath } from "@/lib/sky/shapes";
import { GhostButton } from "./Buttons";
import { T } from "./T";
import { drift, useMotion } from "./motion";
import { presenter } from "./presentation";

export type ToastTone = "info" | "proof" | "error";

export interface ToastSpec {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onPress: () => void };
  /** ms on screen; default 2800 (4500 with an action). */
  duration?: number;
}

export interface LiveToast extends ToastSpec {
  id: number;
}

/** How long a toast stays up. UIProvider times it, so a sheet opening or closing (the toast moving layer) never restarts it. */
export const toastDuration = (t: ToastSpec): number => t.duration ?? (t.action ? 4500 : 2800);

interface ToastState {
  readonly toast: LiveToast | null;
  readonly onDone: (id: number) => void;
}

export const ToastStateCtx = createContext<ToastState>({ toast: null, onDone: () => {} });

/** The id of the sheet on top, or null. Re-renders when sheets open and close. */
export function useTopSheet(): string | null {
  return useSyncExternalStore(presenter.subscribe, presenter.top, presenter.top);
}

/**
 * Draws the live toast when this layer is the top one: `layer` is a sheet id
 * (inside that sheet's Modal) or null (the root, when no sheet is up).
 */
export function ToastLayer({ layer }: { layer: string | null }) {
  const top = useTopSheet();
  const { toast, onDone } = useContext(ToastStateCtx);
  if (top !== layer) return null;
  return <ToastHost toast={toast} onDone={onDone} />;
}

function ToastMark({ tone }: { tone: ToastTone }) {
  if (tone === "error") {
    return (
      <Svg width={16} height={16}>
        <Circle cx={8} cy={8} r={4} fill={colors.danger} />
      </Svg>
    );
  }
  return (
    <Svg width={16} height={16}>
      <Path d={sparklePath(8, 8, 7, 0.2)} fill={tone === "proof" ? colors.did : colors.ink100} />
    </Svg>
  );
}

function ToastHost({ toast, onDone }: { toast: LiveToast | null; onDone: (id: number) => void }) {
  const policy = useMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [shown, setShown] = useState<LiveToast | null>(toast);
  // A host that mounts with a live toast took it over from another layer: it is already on screen.
  const p = useSharedValue(toast ? 1 : 0);

  // Only the entrance and exit live here; UIProvider times the toast (toastDuration).
  useEffect(() => {
    if (!toast) {
      p.value = withTiming(0, { duration: motion.state });
      const t = setTimeout(() => setShown(null), motion.state);
      return () => clearTimeout(t);
    }
    setShown(toast);
    p.value = policy.still ? 1 : withTiming(1, { duration: motion.enter, easing: drift });
  }, [toast, policy.still, p]);

  const rise = policy.transitions;
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: rise ? [{ translateY: (1 - p.value) * -12 }] : [],
  }));

  if (!shown) return null;
  return (
    <View style={[styles.host, { top: insets.top + space.sm, paddingHorizontal: gutterFor(width) }]}>
      <Animated.View
        style={[styles.toast, style]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID="toast"
      >
        <ToastMark tone={shown.tone ?? "info"} />
        <T variant="body" tone="primary" style={styles.message}>
          {shown.message}
        </T>
        {shown.action ? (
          <GhostButton
            label={shown.action.label}
            onPress={() => {
              shown.action?.onPress();
              onDone(shown.id);
            }}
            testID="toast-action"
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, alignItems: "center", pointerEvents: "box-none" },
  toast: {
    maxWidth: 520,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingLeft: space.base,
    paddingRight: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.sky700,
    boxShadow: "0px 8px 24px rgba(5, 4, 13, 0.7)",
  },
  message: { flexShrink: 1 },
});
