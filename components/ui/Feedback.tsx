// App-wide feedback, mounted once in the root layout:
// - useToast(): a short starlight note at the top of the screen (saved,
//   copied, a gentle error). Announced to screen readers.
// - useConfirm(): `await confirm({...})` resolves true/false from a
//   ConfirmSheet. Together they replace every Alert.alert.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, motion, radius, space } from "@/constants/theme";
import { gutterFor } from "@/lib/sky/layout";
import { sparklePath } from "@/lib/sky/shapes";
import { GhostButton } from "./Buttons";
import { ConfirmSheet, type ConfirmSpec } from "./ConfirmSheet";
import { T } from "./T";
import { drift, useMotion } from "./motion";

export type ToastTone = "info" | "proof" | "error";

export interface ToastSpec {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onPress: () => void };
  /** ms on screen; default 2800 (4500 with an action). */
  duration?: number;
}

export interface ToastApi {
  show: (spec: ToastSpec | string) => void;
  hide: () => void;
}

export type Confirm = (spec: ConfirmSpec) => Promise<boolean>;

const ToastCtx = createContext<ToastApi | null>(null);
const ConfirmCtx = createContext<Confirm | null>(null);

export function useToast(): ToastApi {
  const v = useContext(ToastCtx);
  if (!v) throw new Error("useToast must be used inside UIProvider");
  return v;
}

export function useConfirm(): Confirm {
  const v = useContext(ConfirmCtx);
  if (!v) throw new Error("useConfirm must be used inside UIProvider");
  return v;
}

interface LiveToast extends ToastSpec {
  id: number;
}

interface PendingConfirm {
  spec: ConfirmSpec;
  resolve: (ok: boolean) => void;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<LiveToast | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const seq = useRef(0);

  const toastApi = useMemo<ToastApi>(
    () => ({
      show: (spec) => {
        const s = typeof spec === "string" ? { message: spec } : spec;
        seq.current += 1;
        setToast({ ...s, id: seq.current });
        AccessibilityInfo.announceForAccessibility(s.message);
      },
      hide: () => setToast(null),
    }),
    []
  );

  const confirm = useCallback<Confirm>(
    (spec) =>
      new Promise<boolean>((resolve) => {
        setPending((prev) => {
          prev?.resolve(false);
          return { spec, resolve };
        });
        setConfirmVisible(true);
      }),
    []
  );

  const dismissToast = useCallback((id: number) => setToast((t) => (t?.id === id ? null : t)), []);

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setConfirmVisible(false);
  };

  return (
    <ToastCtx.Provider value={toastApi}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <ToastHost toast={toast} onDone={dismissToast} />
        {pending ? (
          <ConfirmSheet {...pending.spec} visible={confirmVisible} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
        ) : null}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
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
  const p = useSharedValue(0);

  useEffect(() => {
    if (!toast) {
      p.value = withTiming(0, { duration: motion.state });
      const t = setTimeout(() => setShown(null), motion.state);
      return () => clearTimeout(t);
    }
    setShown(toast);
    p.value = policy.still ? 1 : withTiming(1, { duration: motion.enter, easing: drift });
    const duration = toast.duration ?? (toast.action ? 4500 : 2800);
    const t = setTimeout(() => onDone(toast.id), duration);
    return () => clearTimeout(t);
  }, [toast, policy.still, onDone, p]);

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
