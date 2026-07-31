// Gratitude: three stems, three lines, done. The lightest page in the app.
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { useJournal } from "@/contexts/JournalContext";
import { useRitual } from "@/contexts/RitualContext";
import { dailyGratitudeStems } from "@/lib/journal";
import { dateKey } from "@/lib/streak";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

export default function GratitudeScreen() {
  const router = useRouter();
  const { addEntry } = useJournal();
  const { markDone } = useRitual();
  const stems = useMemo(() => dailyGratitudeStems(dateKey(new Date())), []);
  const [lines, setLines] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);

  const filled = lines.filter((l) => l.trim().length > 0).length;

  const save = async () => {
    if (filled === 0 || busy) return;
    setBusy(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const text = stems
      .map((stem, i) => (lines[i].trim() ? `${stem.text} ${lines[i].trim()}` : null))
      .filter(Boolean)
      .join("\n");
    await addEntry("gratitude", stems.map((x) => x.text).join(" | "), text);
    await markDone("script");
    router.back();
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <Text style={s.headerTitle}>Three good things</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.close}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="gratitude-close"
          >
            <X color={colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {stems.map((stem, i) => (
            <View key={stem.id} style={s.block}>
              <Text style={s.stem}>{stem.text}</Text>
              <TextInput
                style={s.input}
                placeholder="…"
                placeholderTextColor={colors.textFaint}
                value={lines[i]}
                onChangeText={(t) =>
                  setLines((prev) => prev.map((x, j) => (j === i ? t : x)))
                }
                multiline
                testID={`gratitude-${i}`}
              />
            </View>
          ))}
        </ScrollView>

        <View style={s.dock}>
          <TouchableOpacity
            style={[s.cta, filled === 0 && s.ctaDisabled]}
            onPress={() => void save()}
            disabled={filled === 0 || busy}
            activeOpacity={0.85}
            testID="gratitude-save"
          >
            <Text style={[s.ctaText, filled === 0 && s.ctaTextDisabled]}>
              {filled === 0 ? "Write one line to save" : `Keep these ${filled}`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: space.lg,
    paddingRight: space.base,
    paddingVertical: space.sm,
  },
  headerTitle: { ...type.title, color: colors.text },
  close: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  block: { marginTop: space.lg },
  stem: {
    fontFamily: serif,
    fontSize: 18,
    lineHeight: 26,
    color: colors.accent,
    marginBottom: space.sm,
  },
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    minHeight: 56,
    textAlignVertical: "top",
  },
  dock: { paddingHorizontal: space.lg, paddingBottom: space.base, paddingTop: space.sm },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    alignItems: "center",
    ...accentGlow,
  },
  ctaDisabled: { backgroundColor: colors.card, shadowOpacity: 0, elevation: 0 },
  ctaText: { ...type.body, fontWeight: "600", color: colors.onAccent },
  ctaTextDisabled: { color: colors.textFaint },
});
