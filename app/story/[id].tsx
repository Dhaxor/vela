// The reader — and the peak moment. On first reveal the story materializes
// paragraph by paragraph under a slow stagger; every later visit renders
// instantly. Listen is unlimited, forever. That sentence is the product.
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Play, Square, RefreshCw } from "lucide-react-native";
import { useStories } from "@/contexts/StoryContext";
import { useRitual } from "@/contexts/RitualContext";
import { focusById } from "@/lib/focus";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

export default function StoryReaderScreen() {
  const router = useRouter();
  const { id, reveal } = useLocalSearchParams<{ id: string; reveal?: string }>();
  const { stories, intents, regenerate } = useStories();
  const { markDone } = useRitual();
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);

  const story = stories.find((s) => s.id === id);

  // Opening a story is the practice — the streak asks for presence, not chores.
  useEffect(() => {
    if (story) void markDone("story");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);
  const intent = useMemo(
    () => intents.find((i) => i.id === story?.intentId),
    [intents, story?.intentId]
  );
  const area = intent ? focusById(intent.focus) : undefined;
  const animate = reveal === "1";

  // Never let narration outlive the screen.
  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  if (!story) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.missing}>
          <Text style={s.missingText}>This story has drifted off.</Text>
          <TouchableOpacity onPress={() => router.back()} testID="story-back-missing">
            <Text style={s.missingLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const listen = () => {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(story.paragraphs.map((p) => p.text).join("\n\n"), {
      rate: 0.88,
      pitch: 0.98,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const again = async () => {
    if (busy || !intent) return;
    setBusy(true);
    void Speech.stop();
    setSpeaking(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = await regenerate(intent.id);
    setBusy(false);
    if (next) {
      router.replace({ pathname: "/story/[id]", params: { id: next.id, reveal: "1" } });
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="story-back"
        >
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        {area && <Text style={s.focusTag}>{area.label}</Text>}
        <TouchableOpacity
          onPress={() => void again()}
          style={s.iconBtn}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="story-again"
        >
          <RefreshCw color={busy ? colors.textFaint : colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.Text
          entering={animate ? FadeInDown.duration(700) : undefined}
          style={s.title}
        >
          {story.title}
        </Animated.Text>

        {story.paragraphs.map((p, i) => (
          <Animated.Text
            key={`${story.id}-${p.fragmentId}`}
            entering={
              animate ? FadeInDown.delay(500 + i * 650).duration(900) : undefined
            }
            style={s.paragraph}
          >
            {p.text}
          </Animated.Text>
        ))}

        <Animated.Text
          entering={
            animate
              ? FadeInDown.delay(500 + story.paragraphs.length * 650).duration(900)
              : undefined
          }
          style={s.ending}
        >
          You showed up today. That's how it's built.
        </Animated.Text>
      </ScrollView>

      <View style={s.dock}>
        <TouchableOpacity
          style={[s.listen, speaking && s.listenActive]}
          onPress={listen}
          activeOpacity={0.85}
          testID="story-listen"
        >
          {speaking ? (
            <Square color={colors.onAccent} size={18} fill={colors.onAccent} />
          ) : (
            <Play color={colors.onAccent} size={18} fill={colors.onAccent} />
          )}
          <Text style={s.listenText}>{speaking ? "Stop" : "Listen"}</Text>
        </TouchableOpacity>
        <Text style={s.unlimited}>Unlimited listens. Always.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.base,
    paddingVertical: space.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  focusTag: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.base,
    paddingBottom: 140,
  },
  title: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
    marginBottom: space.lg,
  },
  paragraph: {
    fontFamily: serif,
    fontSize: 19,
    lineHeight: 32,
    color: colors.textSecondary,
    marginBottom: space.lg,
  },
  ending: {
    ...type.caption,
    color: colors.accent,
    letterSpacing: 0.6,
    marginTop: space.sm,
  },
  dock: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
    alignItems: "center",
  },
  listen: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    paddingHorizontal: space.xl,
    ...accentGlow,
  },
  listenActive: { backgroundColor: colors.accentPressed },
  listenText: { ...type.body, fontWeight: "600", color: colors.onAccent },
  unlimited: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: space.sm,
  },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  missingText: { ...type.body, color: colors.textSecondary },
  missingLink: { ...type.body, color: colors.accent, fontWeight: "600" },
});
