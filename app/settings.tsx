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
import { safeBack } from "@/lib/nav";
import { Alert } from "react-native";
import { ChevronLeft, Sparkles, RotateCcw } from "lucide-react-native";
import Constants from "expo-constants";
import { useUser } from "@/contexts/UserContext";
import { usePlus } from "@/contexts/PlusContext";
import { FOCUS_AREAS } from "@/lib/focus";
import { colors, space, radius, type } from "@/constants/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUser();
  const { isPlus, restore } = usePlus();

  const runRestore = async () => {
    const result = await restore();
    if (result === "purchased") {
      Alert.alert("Welcome back", "Vela Plus is restored on this device.");
    } else if (result === "unavailable") {
      Alert.alert(
        "Not available yet",
        "Restore becomes available with the App Store release."
      );
    } else {
      Alert.alert(
        "Nothing to restore",
        "No previous Vela Plus purchase was found for this Apple Account."
      );
    }
  };

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
          onPress={() => safeBack(router)}
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

        <Text style={s.section}>Reminders</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.plusRow}
            onPress={() =>
              void (async () => {
                const { remindersFor, applyReminders } = await import(
                  "@/lib/notifications"
                );
                const ok = await applyReminders(
                  remindersFor(profile?.ritual ?? "both")
                );
                Alert.alert(
                  ok ? "Reminders set" : "Reminders unavailable",
                  ok
                    ? "Vela will nudge you gently at your ritual time."
                    : "Notifications are off for Vela in system settings, or unavailable here."
                );
              })()
            }
            testID="settings-reminders-on"
          >
            <Text style={s.plusText}>Remind me at my ritual time</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.plusRow, s.plusRowBorder]}
            onPress={() =>
              void (async () => {
                const { clearReminders } = await import("@/lib/notifications");
                await clearReminders();
                Alert.alert("Reminders off", "No more nudges until you ask.");
              })()
            }
            testID="settings-reminders-off"
          >
            <Text style={s.restoreText}>Turn reminders off</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.section}>Vela Plus</Text>
        <View style={s.card}>
          {isPlus ? (
            <View style={s.plusRow}>
              <Sparkles size={18} color={colors.accent} />
              <Text style={s.plusText}>Plus is active on this device.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={s.plusRow}
              onPress={() => router.push("/paywall")}
              testID="settings-upgrade"
            >
              <Sparkles size={18} color={colors.accent} />
              <Text style={s.plusText}>Unlock Vela Plus</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.plusRow, s.plusRowBorder]}
            onPress={() => void runRestore()}
            testID="settings-restore"
          >
            <RotateCcw size={18} color={colors.textMuted} />
            <Text style={s.restoreText}>Restore purchases</Text>
          </TouchableOpacity>
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
  plusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    minHeight: 44,
  },
  plusRowBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  plusText: { ...type.body, fontWeight: "600", color: colors.text },
  restoreText: { ...type.body, color: colors.textSecondary },
  aboutLine: { ...type.body, fontWeight: "600", color: colors.text },
  aboutBody: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
});
