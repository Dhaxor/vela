// Settings — deliberately small. Restore/paywall arrive in P4; this exists so
// the gear always leads somewhere real.
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import Constants from "expo-constants";
import { useUser } from "@/contexts/UserContext";
import { FOCUS_AREAS } from "@/lib/focus";
import { colors, space, radius, type } from "@/constants/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUser();

  const toggleFocus = (id: (typeof FOCUS_AREAS)[number]["id"]) => {
    if (!profile) return;
    const has = profile.focusAreas.includes(id);
    const next = has
      ? profile.focusAreas.filter((x) => x !== id)
      : [...profile.focusAreas, id];
    if (next.length === 0) return; // always keep at least one anchor
    void updateProfile({ focusAreas: next });
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="settings-back"
        >
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={s.back} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.section}>Focus areas</Text>
        <View style={s.chips}>
          {FOCUS_AREAS.map((f) => {
            const on = profile?.focusAreas.includes(f.id) ?? false;
            return (
              <TouchableOpacity
                key={f.id}
                style={[s.chip, on && s.chipOn]}
                onPress={() => toggleFocus(f.id)}
                testID={`settings-focus-${f.id}`}
              >
                <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.section}>About</Text>
        <View style={s.card}>
          <Text style={s.aboutLine}>
            Vela {Constants.expoConfig?.version ?? ""}
          </Text>
          <Text style={s.aboutBody}>
            Everything you write and manifest stays on this device. No account,
            no tracking, no servers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.base,
    paddingVertical: space.sm,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...type.title,
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  content: { padding: space.lg, paddingBottom: space.xxl },
  section: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: space.md,
    marginTop: space.lg,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    paddingVertical: space.sm,
    paddingHorizontal: space.base,
  },
  chipOn: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
  chipText: { ...type.caption, color: colors.textSecondary },
  chipTextOn: { color: colors.accent, fontWeight: "600" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
  },
  aboutLine: { ...type.body, fontWeight: "600", color: colors.text },
  aboutBody: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
});
