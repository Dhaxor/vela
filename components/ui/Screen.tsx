// Every screen starts here. <Screen> owns its own sky (per-screen backdrop,
// ELEVATE §0/§8), the safe area, the gutter and the scroll container, and it
// reserves room for a fixed <Dock> so the last line never hides behind it.
import React, { createContext, useContext, useState } from "react";
import {
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

/** The current screen's side gutter (24, or 16 below 380pt). Use it to bleed full-width. */
export function useGutter(): number {
  return useContext(GutterCtx);
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
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "children">;
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
      <View
        style={styles.root}
        testID={testID}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (Math.round(width) !== Math.round(size.width) || Math.round(height) !== Math.round(size.height)) setSize({ width, height });
        }}
      >
        <SkyBackdrop variant={variant} focus={focus} active={focused} width={size.width} height={size.height} />
        <SafeAreaView edges={edges} style={styles.flex}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {header}
            {body}
            {dock ? (
              <View style={styles.dock} onLayout={(e) => setDockHeight(Math.round(e.nativeEvent.layout.height))}>
                {dock}
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </GutterCtx.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky950, overflow: "hidden" },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
