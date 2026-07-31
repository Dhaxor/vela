// Stories — list of living intents and their current rendering. The empty
// state is a doorway, not a dead end.
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
import { Alert } from "react-native";
import { Sparkles, Plus, ChevronRight } from "lucide-react-native";
import { useStories } from "@/contexts/StoryContext";
import { focusById } from "@/lib/focus";
import {
  colors,
  space,
  radius,
  type,
  serif,
  accentGlow,
  cardShadow,
} from "@/constants/theme";

export default function StoriesScreen() {
  const router = useRouter();
  const { intents, storyForIntent, removeIntent } = useStories();

  const confirmRelease = (intentId: string, desire: string) => {
    Alert.alert("Release this story?", `“${desire}” and its renderings will be gone.`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Release",
        style: "destructive",
        onPress: () => void removeIntent(intentId),
      },
    ]);
  };

  if (intents.length === 0) {
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <View style={s.empty}>
          <View style={s.halo}>
            <Sparkles color={colors.accent} size={28} />
          </View>
          <Text style={s.emptyTitle}>Your first story is waiting</Text>
          <Text style={s.emptyBody}>
            Tell Vela one thing you're calling in, and step into a story where
            it's already yours. Unlimited listens — always.
          </Text>
          <TouchableOpacity
            style={s.cta}
            activeOpacity={0.85}
            onPress={() => router.push("/story/new")}
            testID="new-story"
          >
            <Text style={s.ctaText}>Manifest a story</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Text style={s.h1}>Stories</Text>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => router.push("/story/new")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="new-story"
          >
            <Plus color={colors.onAccent} size={20} />
          </TouchableOpacity>
        </View>

        {intents.map((intent) => {
          const story = storyForIntent(intent.id);
          const area = focusById(intent.focus);
          if (!story) return null;
          return (
            <TouchableOpacity
              key={intent.id}
              style={s.card}
              activeOpacity={0.9}
              onPress={() =>
                router.push({ pathname: "/story/[id]", params: { id: story.id } })
              }
              onLongPress={() => confirmRelease(intent.id, intent.desire)}
              testID={`story-card-${intent.id}`}
            >
              <Text style={s.cardTag}>{area?.label ?? ""}</Text>
              <Text style={s.cardTitle}>{story.title}</Text>
              <Text style={s.cardDesire} numberOfLines={1}>
                “{intent.desire}”
              </Text>
              <View style={s.cardCtaRow}>
                <Text style={s.cardCta}>Step back in</Text>
                <ChevronRight color={colors.accent} size={16} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.base,
    paddingBottom: space.xxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.lg,
  },
  h1: { ...type.display, color: colors.text },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...accentGlow,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    marginBottom: space.md,
    ...cardShadow,
  },
  cardTag: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: space.sm,
  },
  cardTitle: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  cardDesire: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  cardCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.base,
  },
  cardCta: { ...type.body, fontWeight: "600", color: colors.accent },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  halo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  emptyTitle: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 34,
    color: colors.text,
    textAlign: "center",
  },
  emptyBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: space.md,
    marginBottom: space.xl,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    paddingHorizontal: space.xl,
    ...accentGlow,
  },
  ctaText: { ...type.body, fontWeight: "600", color: colors.onAccent },
});
