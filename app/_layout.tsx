import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { StoryProvider } from "@/contexts/StoryContext";
import { RitualProvider } from "@/contexts/RitualContext";
import { colors } from "@/constants/theme";

function RootNavigator() {
  const { ready, profile } = useUser();

  // Until storage answers, hold on the splash — a flash of the wrong route
  // is worse than 100ms of night sky.
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
      }}
    >
      <Stack.Protected guard={!!profile}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <StoryProvider>
        <RitualProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </RitualProvider>
      </StoryProvider>
    </UserProvider>
  );
}
