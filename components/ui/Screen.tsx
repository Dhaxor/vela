// Every screen starts here. <Screen> owns its own sky (per-screen backdrop,
// ELEVATE §0/§8), the safe area, the gutter and the scroll container, and it
// reserves room for a fixed <Dock> so the last line never hides behind it.
//
// The keyboard: on iOS the KeyboardAvoidingView makes room by padding its own
// bottom, and an absolutely placed child ignores its parent's padding. So the
// dock sits in a plain flex box with the body (the box the padding shrinks)
// and rises with it, and it drops its home-indicator inset while the keyboard
// is up. The screen's one CTA stays in reach above the keyboard.
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import type { FocusId } from "@/lib/focus";
import { gutterFor } from "@/lib/sky/layout";
import { colors, space } from "@/constants/theme";
import { SkyBackdrop, type SkyVariant } from "@/components/sky/SkyBackdrop";

const GutterCtx = createContext<number>(24);
const KeyboardCtx = createContext<boolean>(false);

/** The current screen's side gutter (24, or 16 below 380pt). Use it to bleed full-width. */
export function useGutter(): number {
  return useContext(GutterCtx);
}

/** True while the software keyboard is up over this screen (iOS). The Dock sits on it then, with no home-indicator inset. */
export function useKeyboardUp(): boolean {
  return useContext(KeyboardCtx);
}

/** iOS: is the keyboard showing (it announces itself before it moves, so the dock moves with it)? */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const show = Keyboard.addListener("keyboardWillShow", () => setShown(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

export interface ScreenProps {
  children?: React.ReactNode;
  /** calm (default) · reveal (Weave, Star Birth) · reader (dimmer sky) · still (frozen). */
  variant?: SkyVariant;
  /** Horizon tint override; defaults to the active dream's focus. */
  focus?: FocusId | null;
  /** Wrap content in a ScrollView. Default true. */
  scroll?: boolean;
  /** Safe-area edges. Default ['top'] (tabs and docks handle the bottom). */
  edges?: readonly Edge[];
  /** Apply the side gutter. Default true. */
  padded?: boolean;
  /** Fixed above the content (e.g. <Header>). */
  header?: React.ReactNode;
  /** Fixed at the bottom (e.g. <Dock>); content scrolls under its scrim. */
  dock?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Passed to the ScrollView (refs, onScroll, refreshControl …). */
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "children"> & { ref?: React.Ref<ScrollView> };
  testID?: string;
}

export function Screen({
  children,
  variant = "calm",
  focus,
  scroll = true,
  edges = ["top"],
  padded = true,
  header,
  dock,
  contentStyle,
  scrollProps,
  testID,
}: ScreenProps) {
  const focused = useIsFocused();
  const keyboardUp = useKeyboardShown();
  const win = useWindowDimensions();
  const gutter = gutterFor(win.width);
  const [dockHeight, setDockHeight] = useState(0);
  // The sky is sized to the screen itself (shorter than the window inside tabs),
  // so the horizon glow sits on the screen's own bottom edge.
  const [size, setSize] = useState({ width: win.width, height: win.height });
  const pad = padded ? { paddingHorizontal: gutter } : null;
  const bottom = { paddingBottom: (dock ? dockHeight : 0) + space.xxl };

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      contentContainerStyle={[styles.scrollContent, pad, bottom, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, pad, dock ? { paddingBottom: dockHeight } : null, contentStyle]}>{children}</View>
  );

  return (
    <GutterCtx.Provider value={gutter}>
      <KeyboardCtx.Provider value={keyboardUp}>
        <View
          style={styles.root}
          testID={testID}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            // A screen hidden under a pushed route measures 0x0 on web; keep the last real size.
            if (width < 1 || height < 1) return;
            if (Math.round(width) !== Math.round(size.width) || Math.round(height) !== Math.round(size.height)) setSize({ width, height });
          }}
        >
          <SkyBackdrop variant={variant} focus={focus} active={focused} width={size.width} height={size.height} />
          <SafeAreaView edges={edges} style={styles.flex}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              {header}
              {/* Body and dock share this box: the keyboard padding shrinks it, so the dock rides above the keyboard. */}
              <View style={styles.flex}>
                {body}
                {dock ? (
                  <View style={styles.dock} onLayout={(e) => setDockHeight(Math.round(e.nativeEvent.layout.height))}>
                    {dock}
                  </View>
                ) : null}
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </KeyboardCtx.Provider>
    </GutterCtx.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky950, overflow: "hidden" },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
