// Story intake: focus → desire (their words) → feeling. Three light steps,
// then the engine renders instantly — no spinner theater, no server.
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
import { Redirect, useRouter } from "expo-router";
import { safeBack } from "@/lib/nav";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { FOCUS_AREAS, FocusId } from "@/lib/focus";
import { useUser } from "@/contexts/UserContext";
import { useStories } from "@/contexts/StoryContext";
import { usePlus } from "@/contexts/PlusContext";
import { canCreateIntent } from "@/lib/purchase";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

const FEELINGS = ["grateful", "peaceful", "alive", "proud", "free", "loved"] as const;

export default function NewStoryScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const { createIntent, intents } = useStories();
  const { isPlus } = usePlus();

  const preferred = profile?.focusAreas ?? [];
  // The user's chosen areas come first — personalization by user stage.
  const ordered = useMemo(
    () =>
      [...FOCUS_AREAS].sort(
        (a, b) => Number(preferred.includes(b.id)) - Number(preferred.includes(a.id))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.focusAreas?.join(",")]
  );

  const [focus, setFocus] = useState<FocusId | null>(preferred[0] ?? null);
  const [desire, setDesire] = useState("");
  const [feeling, setFeeling] = useState<(typeof FEELINGS)[number] | null>(null);
  const [busy, setBusy] = useState(false);

  const canWeave = focus !== null && desire.trim().length >= 3 && feeling !== null;

  // The free tier holds one living intent; every door to a second one leads
  // through the paywall — which says out loud what stays free.
  if (!canCreateIntent(intents.length, isPlus)) {
    return <Redirect href="/paywall" />;
  }

  const weave = async () => {
    if (!canWeave || busy) return;
    setBusy(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const story = await createIntent({
      focus: focus!,
      desire: desire.trim(),
      feeling: feeling!,
    });
    router.replace({ pathname: "/story/[id]", params: { id: story.id, reveal: "1" } });
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => safeBack(router)}
            style={s.close}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="new-story-close"
          >
            <X color={colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.h1}>Manifest a story</Text>

          <Text style={s.label}>Where does it live?</Text>
          <View style={s.chips}>
            {ordered.map((f) => {
              const on = focus === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setFocus(f.id);
                  }}
                  testID={`intake-focus-${f.id}`}
                >
                  <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>What are you calling in? Your words.</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. a home that feels like rest"
            placeholderTextColor={colors.textFaint}
            value={desire}
            onChangeText={setDesire}
            maxLength={120}
            multiline
            testID="intake-desire"
          />

          <Text style={s.label}>And when it's yours, you feel…</Text>
          <View style={s.chips}>
            {FEELINGS.map((fe) => {
              const on = feeling === fe;
              return (
                <TouchableOpacity
                  key={fe}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setFeeling(fe);
                  }}
                  testID={`intake-feeling-${fe}`}
                >
                  <Text style={[s.chipText, on && s.chipTextOn]}>{fe}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.dock}>
          <TouchableOpacity
            style={[s.cta, !canWeave && s.ctaDisabled]}
            disabled={!canWeave || busy}
            onPress={() => void weave()}
            activeOpacity={0.85}
            testID="intake-weave"
          >
            <Text style={[s.ctaText, !canWeave && s.ctaTextDisabled]}>
              Step inside
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
    justifyContent: "flex-end",
    paddingHorizontal: space.base,
    paddingTop: space.sm,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.huge,
  },
  h1: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
    marginBottom: space.lg,
  },
  label: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: space.lg,
    marginBottom: space.md,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    paddingVertical: space.sm,
    paddingHorizontal: space.base,
    minHeight: 44,
    justifyContent: "center",
  },
  chipOn: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
  chipText: { ...type.body, color: colors.textSecondary },
  chipTextOn: { color: colors.accent, fontWeight: "600" },
  input: {
    ...type.title,
    fontFamily: serif,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: space.base,
    paddingTop: space.base,
    paddingBottom: space.base,
    minHeight: 96,
    textAlignVertical: "top",
  },
  dock: {
    paddingHorizontal: space.lg,
    paddingBottom: space.base,
    paddingTop: space.sm,
  },
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
