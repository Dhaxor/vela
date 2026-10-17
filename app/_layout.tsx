import React, { useEffect } from "react";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_400Regular_Italic } from "@expo-google-fonts/newsreader/400Regular_Italic";
import { InstrumentSans_400Regular } from "@expo-google-fonts/instrument-sans/400Regular";
import { InstrumentSans_600SemiBold } from "@expo-google-fonts/instrument-sans/600SemiBold";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { PlusProvider } from "@/contexts/PlusContext";
import { RitualProvider, useProgress } from "@/contexts/RitualContext";
import { ArcProvider, useArc } from "@/contexts/ArcContext";
import { JournalProvider, useJournal } from "@/contexts/JournalContext";
import { ScenesProvider, useScenes } from "@/contexts/ScenesContext";
import { useLoopEffects } from "@/lib/loopEffects";
import { configureNotificationHandler, useNotificationRouting } from "@/lib/notifications";
import { setAudioSession } from "@/lib/audio";
import { skySeed } from "@/lib/sky/starfield";
import { SkyProvider } from "@/components/sky";
import { UIProvider } from "@/components/ui";
import { StorageErrorScreen, launchPhase } from "@/components/feature/startup";
import { colors, fonts } from "@/constants/theme";

// Hold the native splash until the fonts and every store have answered: a
// flash of Times, or of the wrong route, is worse than a beat of night sky.
// A store that could not be read comes down to StorageErrorScreen instead.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Keys are the family names <T> and TextField use (constants/theme fonts). */
const FONT_FILES = {
  [fonts.serif]: Newsreader_400Regular,
  [fonts.serifItalic]: Newsreader_400Regular_Italic,
  [fonts.sans]: InstrumentSans_400Regular,
  [fonts.sansSemiBold]: InstrumentSans_600SemiBold,
};

/** Navigator chrome in Night Atlas colours (tab bar border, card, scene background). */
const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold300,
    background: colors.sky950,
    card: colors.chrome,
    text: colors.ink100,
    border: colors.hairline,
    notification: colors.gold500,
  },
};

/** Side effects that need every store loaded: notification queue, asks session. */
function LoopEffects() {
  useLoopEffects();
  return null;
}

function RootNavigator() {
  const user = useUser();
  const arc = useArc();
  const progress = useProgress();
  const journal = useJournal();
  const scenes = useScenes();
  // A store whose launch read failed keeps retrying and stays not ready; the
  // root then shows a calm screen instead of holding the splash forever.
  const phase = launchPhase([user, arc, progress, journal, scenes]);
  const ready = phase === "ready";
  const profile = user.profile;

  // Cold-start notification taps route only once every store is ready and the tabs exist.
  useNotificationRouting(ready && !!profile);

  useEffect(() => {
    if (phase !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [phase]);

  if (phase === "storage-error") {
    return (
      <SkyProvider seed={skySeed(profile?.createdAt, profile?.name)} focus={profile?.focusAreas[0] ?? null}>
        <StorageErrorScreen />
      </SkyProvider>
    );
  }
  if (!ready) return null;

  return (
    <SkyProvider
      seed={skySeed(profile?.createdAt, profile?.name)}
      focus={arc.activeDream?.focus ?? arc.dreams[0]?.focus ?? profile?.focusAreas[0] ?? null}
      dawn={profile?.ritual === "morning"}
    >
      <LoopEffects />
      <ThemeProvider value={NAV_THEME}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.sky950 },
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
      </ThemeProvider>
    </SkyProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);

  useEffect(() => {
    configureNotificationHandler();
    void setAudioSession("idle").catch(() => {});
  }, []);

  // Render nothing (the splash stays up) until the type is real.
  if (!fontsLoaded && !fontError) return null;

  return (
    <UserProvider>
      <PlusProvider>
        <RitualProvider>
          <ArcProvider>
            <JournalProvider>
              <ScenesProvider>
                <UIProvider>
                  <StatusBar style="light" />
                  <RootNavigator />
                </UIProvider>
              </ScenesProvider>
            </JournalProvider>
          </ArcProvider>
        </RitualProvider>
      </PlusProvider>
    </UserProvider>
  );
}
