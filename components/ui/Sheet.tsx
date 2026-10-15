// Bottom sheet that behaves the same on iOS and react-native-web: a Modal with
// a sky scrim, a panel that rises from the bottom edge (a plain fade under
// Reduce Motion), a grabber, an optional title and pinned footer actions.
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, motion, radius, space } from "@/constants/theme";
import { gutterFor } from "@/lib/sky/layout";
import { T } from "./T";
import { drift, useMotion } from "./motion";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** One quiet line under the title. */
  subtitle?: string;
  children?: React.ReactNode;
  /** Actions pinned under the content (buttons). */
  footer?: React.ReactNode;
  /** Tap on the scrim / back gesture closes the sheet. Default true. */
  dismissible?: boolean;
  /** Scroll the content when it is taller than the panel. */
  scroll?: boolean;
  testID?: string;
}

const EXIT_MS = motion.state;

export function Sheet({ visible, onClose, title, subtitle, children, footer, dismissible = true, scroll = false, testID }: SheetProps) {
  const policy = useMotion();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const gutter = gutterFor(win.width);
  const [mounted, setMounted] = useState(visible);
  const [panelH, setPanelH] = useState(win.height * 0.5);
  const p = useSharedValue(0);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (visible) {
      setMounted(true);
      p.value = policy.still ? 1 : withTiming(1, { duration: motion.enter, easing: drift });
    } else {
      p.value = policy.still ? 0 : withTiming(0, { duration: EXIT_MS, easing: drift });
      exitTimer.current = setTimeout(() => setMounted(false), policy.still ? 0 : EXIT_MS);
    }
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [visible, policy.still, p]);

  const slide = policy.transitions;
  const scrim = useAnimatedStyle(() => ({ opacity: p.value }));
  const panel = useAnimatedStyle(() =>
    slide ? { transform: [{ translateY: (1 - p.value) * panelH }] } : { opacity: p.value }
  );

  const body = scroll ? (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <Modal transparent visible={mounted} animationType="none" statusBarTranslucent onRequestClose={dismissible ? onClose : () => {}}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissible ? onClose : undefined}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID={testID ? `${testID}-scrim` : undefined}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          testID={testID}
          onLayout={(e) => setPanelH(e.nativeEvent.layout.height)}
          style={[
            styles.panel,
            { maxHeight: win.height * 0.88, paddingHorizontal: gutter, paddingBottom: insets.bottom + space.lg },
            panel,
          ]}
        >
          <View style={styles.grabber} />
          {title ? (
            <T variant="title" accessibilityRole="header" style={styles.title}>
              {title}
            </T>
          ) : null}
          {subtitle ? (
            <T variant="body" tone="muted" style={styles.subtitle}>
              {subtitle}
            </T>
          ) : null}
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: colors.scrim },
  panel: {
    backgroundColor: colors.sky800,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.hairline,
    paddingTop: space.sm,
    boxShadow: "0px -8px 32px rgba(5, 4, 13, 0.6)",
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink48,
    marginBottom: space.lg,
  },
  title: { marginBottom: space.sm },
  subtitle: { marginBottom: space.base },
  scroll: { flexGrow: 0 },
  footer: { gap: space.md, marginTop: space.lg },
});
