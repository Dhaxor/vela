import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabIcon, type TabIconName } from "@/components/glyphs";
import { T, TAB_BAR_PARTS, TAB_LABEL_MAX_SCALE, tabBarHeight } from "@/components/ui";
import { colors } from "@/constants/theme";

// Today | Arc | Rituals (ELEVATE §0 Tabs). Each tab has one role in the loop:
// Today runs it, Arc keeps it (the Memory Book), Rituals feeds it. The sky
// is a stack route (/sky/[intentId]) and Settings opens from Today's gear.

const icon =
  (name: TabIconName) =>
  ({ focused }: { focused: boolean }) => <TabIcon name={name} focused={focused} color={focused ? colors.ink100 : colors.ink48} size={24} />;

/**
 * Tab labels are system chrome: the caption step, Instrument Sans, through <T>.
 * They grow with Dynamic Type up to TAB_LABEL_MAX_SCALE; the bar grows with
 * them (tabBarHeight), so a label never clips.
 */
const label = ({ focused, children }: { focused: boolean; children: string }) => (
  <T variant="caption" tone={focused ? "primary" : "faint"} center numberOfLines={1} maxFontSizeMultiplier={TAB_LABEL_MAX_SCALE} style={styles.label}>
    {children}
  </T>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // The bar's own height sits above the home indicator; the inset is added on top and padded out.
  const barStyle = { height: tabBarHeight(fontScale) + insets.bottom, paddingBottom: insets.bottom + TAB_BAR_PARTS.paddingBottom };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.sky950 },
        tabBarStyle: [styles.bar, barStyle],
        tabBarActiveTintColor: colors.ink100,
        tabBarInactiveTintColor: colors.ink48,
        tabBarLabel: label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("today"), tabBarButtonTestID: "tab-today", tabBarAccessibilityLabel: "Today" }} />
      <Tabs.Screen name="arc" options={{ title: "Arc", tabBarIcon: icon("arc"), tabBarButtonTestID: "tab-arc", tabBarAccessibilityLabel: "Arc, your Memory Book" }} />
      <Tabs.Screen name="rituals" options={{ title: "Rituals", tabBarIcon: icon("rituals"), tabBarButtonTestID: "tab-rituals", tabBarAccessibilityLabel: "Rituals" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.chrome,
    borderColor: colors.hairline,
    borderTopWidth: TAB_BAR_PARTS.border,
    paddingTop: TAB_BAR_PARTS.paddingTop,
    elevation: 0,
  },
  label: { letterSpacing: 0.2 },
});
