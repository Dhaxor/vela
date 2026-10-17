import React from "react";
import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabIcon, type TabIconName } from "@/components/glyphs";
import { colors, space, typeScale } from "@/constants/theme";

// Today | Arc | Rituals (ELEVATE §0 Tabs). Each tab has one role in the loop:
// Today runs it, Arc keeps it (the Memory Book), Rituals feeds it. The sky
// is a stack route (/sky/[intentId]) and Settings opens from Today's gear.

const icon =
  (name: TabIconName) =>
  ({ focused }: { focused: boolean }) => <TabIcon name={name} focused={focused} color={focused ? colors.ink100 : colors.ink48} size={24} />;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.sky950 },
        tabBarStyle: [styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom + space.xxs }],
        tabBarActiveTintColor: colors.ink100,
        tabBarInactiveTintColor: colors.ink48,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("today"), tabBarButtonTestID: "tab-today", tabBarAccessibilityLabel: "Today" }} />
      <Tabs.Screen name="arc" options={{ title: "Arc", tabBarIcon: icon("arc"), tabBarButtonTestID: "tab-arc", tabBarAccessibilityLabel: "Arc, your Memory Book" }} />
      <Tabs.Screen name="rituals" options={{ title: "Rituals", tabBarIcon: icon("rituals"), tabBarButtonTestID: "tab-rituals", tabBarAccessibilityLabel: "Rituals" }} />
    </Tabs>
  );
}

/** Item padding (5 + 5) + icon (24) + label (18) + bar padding (4 + 2); the home-indicator inset is added on top. */
const BAR_HEIGHT = 60;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.chrome,
    borderColor: colors.hairline,
    borderTopWidth: 1,
    paddingTop: space.xs,
    elevation: 0,
  },
  // Tab labels are system chrome: the caption step of the scale, Instrument Sans.
  label: { ...typeScale.caption, letterSpacing: 0.2 },
});
