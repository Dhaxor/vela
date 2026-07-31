// Future-self scripting: the day's prompt, a serif page, and nothing else.
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { useJournal } from "@/contexts/JournalContext";
import { useRitual } from "@/contexts/RitualContext";
import { dailyPrompt } from "@/lib/journal";
import { dateKey } from "@/lib/streak";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

export default function ScriptScreen() {
  const router = useRouter();
  const { addEntry } = useJournal();
  const { markDone } = useRitual();
  const prompt = useMemo(() => dailyPrompt(dateKey(new Date())), []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addEntry("script", prompt.text, text);
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
          <Text style={s.headerTitle}>Script it as done</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.close}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="script-close"
          >
            <X color={colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.prompt}>{prompt.text}</Text>
          <TextInput
            style={s.input}
            placeholder="Begin anywhere. Present tense helps."
            placeholderTextColor={colors.textFaint}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            testID="script-input"
          />
        </ScrollView>

        <View style={s.dock}>
          <TouchableOpacity
            style={[s.cta, text.trim().length < 3 && s.ctaDisabled]}
            onPress={() => void save()}
            disabled={text.trim().length < 3 || busy}
            activeOpacity={0.85}
            testID="script-save"
          >
            <Text
              style={[s.ctaText, text.trim().length < 3 && s.ctaTextDisabled]}
            >
              Seal the page
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
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl, flexGrow: 1 },
  prompt: {
    fontFamily: serif,
    fontSize: 20,
    lineHeight: 30,
    color: colors.accent,
    marginTop: space.base,
    marginBottom: space.lg,
  },
  input: {
    fontFamily: serif,
    fontSize: 18,
    lineHeight: 30,
    color: colors.text,
    flexGrow: 1,
    minHeight: 220,
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
