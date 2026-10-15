import React from "react";
import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabIcon, type LegacyTabIconName, type TabIconName } from "@/components/glyphs";
import { colors, space, typeScale } from "@/constants/theme";

// Phase 1 keeps the four 1.0 tabs so the existing screens and e2e keep
// working; Phase 2 switches to Today | Arc | Rituals. arc and rituals exist
// now as hidden routes (href: null) so their screens can be built in place.

const icon =
  (name: TabIconName | LegacyTabIconName) =>
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
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("today"), tabBarButtonTestID: "tab-today" }} />
      <Tabs.Screen name="stories" options={{ title: "Stories", tabBarIcon: icon("stories"), tabBarButtonTestID: "tab-stories" }} />
      <Tabs.Screen name="journal" options={{ title: "Journal", tabBarIcon: icon("journal"), tabBarButtonTestID: "tab-journal" }} />
      <Tabs.Screen name="board" options={{ title: "Board", tabBarIcon: icon("board"), tabBarButtonTestID: "tab-board" }} />
      <Tabs.Screen name="arc" options={{ title: "Arc", href: null, tabBarIcon: icon("arc") }} />
      <Tabs.Screen name="rituals" options={{ title: "Rituals", href: null, tabBarIcon: icon("rituals") }} />
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
