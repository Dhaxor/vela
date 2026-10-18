// Bottom sheet that behaves the same on iOS and react-native-web: a Modal with
// a sky scrim, a panel that rises from the bottom edge (a plain fade under
// Reduce Motion), a grabber, an optional title and pinned footer actions.
//
// One root sheet at a time (./presentation): iOS refuses to present a Modal
// while another is up or still leaving, and never retries. So a root sheet
// waits for its turn before it mounts its Modal, and gives the turn back once
// iOS reports the Modal gone (onDismiss). Sheets inside a sheet are nested
// presentations and show at once. The open sheet also hosts the toast.
//
// The keyboard (iOS): the panel rises with it and is never taller than the
// room left above it, so its title and fields stay on screen; a scrolling
// sheet keeps the focused field in view (useKeyboardReveal). A sheet with a
// text field should pass `scroll`, so its body can give way on a small phone;
// with little room left (an SE-sized phone) the subtitle steps aside while
// the user types, so the field and its action keep the space.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
import { IOS_DISMISS_FALLBACK_MS, presenter } from "./presentation";
import { ToastLayer } from "./ToastHost";
import { useKeyboardHeight, useKeyboardReveal } from "./useKeyboardReveal";

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
/** Below this much room above the keyboard (pt), a sheet goes compact while typing. */
const COMPACT_ROOM = 480;

/** True inside a sheet's content: a sheet there is a nested presentation. */
const InSheetCtx = createContext(false);
let sheetSeq = 0;

export function Sheet({ visible, onClose, title, subtitle, children, footer, dismissible = true, scroll = false, testID }: SheetProps) {
  const policy = useMotion();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const gutter = gutterFor(win.width);
  const nested = useContext(InSheetCtx);
  const id = useRef<string | null>(null);
  id.current ??= `sheet-${++sheetSeq}`;
  const [mounted, setMounted] = useState(false);
  const [panelH, setPanelH] = useState(win.height * 0.5);
  const p = useSharedValue(0);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const keyboard = useKeyboardHeight();
  /** This root sheet holds the presenter's turn (from the grant until its Modal is gone). */
  const granted = useRef(false);

  useEffect(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    let cancel: (() => void) | null = null;
    if (visible) {
      const enter = () => {
        granted.current = !nested;
        setMounted(true);
        p.value = policy.still ? 1 : withTiming(1, { duration: motion.enter, easing: drift });
      };
      if (nested) enter();
      else cancel = presenter.request(id.current as string, enter);
    } else {
      p.value = policy.still ? 0 : withTiming(0, { duration: EXIT_MS, easing: drift });
      exitTimer.current = setTimeout(() => setMounted(false), policy.still ? 0 : EXIT_MS);
    }
    return () => {
      cancel?.();
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [visible, policy.still, p, nested]);

  // Give the turn back once the Modal is off screen: iOS reports it (onDismiss,
  // with a fallback should that never come); elsewhere unmounting is enough.
  const giveBack = () => {
    if (!granted.current) return;
    granted.current = false;
    presenter.release(id.current as string);
  };
  useEffect(() => {
    if (mounted || !granted.current) return;
    if (Platform.OS !== "ios") {
      giveBack();
      return;
    }
    const fallback = setTimeout(giveBack, IOS_DISMISS_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [mounted]);
  // Toasts draw in the sheet that is open on top.
  const layered = mounted && visible;
  useEffect(() => {
    const me = id.current as string;
    if (!layered) return;
    presenter.layerIn(me);
    return () => presenter.layerOut(me);
  }, [layered]);
  // Unmounting frees the turn (or drops a request still waiting for one).
  useEffect(
    () => () => {
      const me = id.current as string;
      granted.current = false;
      presenter.layerOut(me);
      presenter.release(me);
    },
    []
  );

  // The open sheet owns the keyboard: its field stays in view, and the screen under it stays put.
  useKeyboardReveal({ scrollRef, active: mounted && visible });

  // With the keyboard up the panel fits between it and the status bar, and drops the home-indicator inset.
  const typing = keyboard > 0;
  const room = win.height - keyboard - insets.top - space.base;
  const maxHeight = typing ? Math.min(win.height * 0.88, room) : win.height * 0.88;
  const padBottom = (typing ? 0 : insets.bottom) + space.lg;
  // Little room (an SE-sized phone with the keyboard up): the field and its action come first, so the
  // subtitle (read before typing) steps aside and the spacing tightens.
  const compact = typing && room < COMPACT_ROOM;

  const slide = policy.transitions;
  const scrim = useAnimatedStyle(() => ({ opacity: p.value }));
  const panel = useAnimatedStyle(() =>
    slide ? { transform: [{ translateY: (1 - p.value) * panelH }] } : { opacity: p.value }
  );

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      testID={testID ? `${testID}-scroll` : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissible ? onClose : () => {}}
      onDismiss={Platform.OS === "ios" ? giveBack : undefined}
    >
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
            { maxHeight, paddingHorizontal: gutter, paddingBottom: padBottom },
            panel,
          ]}
        >
          <View style={[styles.grabber, compact && styles.grabberCompact]} />
          {title ? (
            <T variant="title" accessibilityRole="header" style={styles.title}>
              {title}
            </T>
          ) : null}
          {subtitle && !compact ? (
            <T variant="body" tone="muted" style={styles.subtitle}>
              {subtitle}
            </T>
          ) : null}
          <InSheetCtx.Provider value>
            {body}
            {footer ? <View style={[styles.footer, compact && styles.footerCompact]}>{footer}</View> : null}
          </InSheetCtx.Provider>
        </Animated.View>
        <ToastLayer layer={id.current} />
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
  footerCompact: { gap: space.sm, marginTop: space.base },
  grabberCompact: { marginBottom: space.md },
});
