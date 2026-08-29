import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowRight, Check, Flame, Footprints, PenLine, Quote, ScrollText, Settings, Sparkles } from "lucide-react-native";
import { useUser } from "@/contexts/UserContext";
import { useRitual } from "@/contexts/RitualContext";
import { useStories } from "@/contexts/StoryContext";
import { focusById } from "@/lib/focus";
import { proofConstellation } from "@/lib/futureMemory";
import { colors, space, radius, type, serif, cardShadow, accentGlow } from "@/constants/theme";

function daypart(d: Date): "morning" | "afternoon" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export default function TodayScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const { streak } = useRitual();
  const { intents, actions, storyForIntent, actionForIntent, regenerate } = useStories();
  const [weaving, setWeaving] = useState(false);
  const intent = intents[0];
  const story = intent ? storyForIntent(intent.id) : undefined;
  const action = intent ? actionForIntent(intent.id) : undefined;
  const proof = useMemo(
    () => proofConstellation(intent ? actions.filter((item) => item.intentId === intent.id) : []),
    [actions, intent]
  );
  const area = intent ? focusById(intent.focus) : undefined;
  const completed = actions.filter((item) => item.intentId === intent?.id && item.state === "completed").length;
  const weaveNext = async () => {
    if (!intent || weaving) return;
    setWeaving(true);
    const next = await regenerate(intent.id);
    setWeaving(false);
    if (next) router.push({ pathname: "/story/[id]", params: { id: next.id, reveal: "1" } });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.headerCopy}>
            <Text style={s.greeting}>Good {daypart(new Date())}, {profile?.name ?? "friend"}.</Text>
            <Text style={s.focusLine}>
              {intent ? `${area?.label ?? "Your future"} · chapter ${intent.chapter ?? 1}` : "FUTURE MEMORY STUDIO"}
            </Text>
          </View>
          <TouchableOpacity style={s.gear} onPress={() => router.push("/settings")} testID="open-settings">
            <Settings color={colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        {streak > 0 && (
          <View style={s.streakChip} testID="streak-chip">
            <Flame color={colors.accent} size={16} />
            <Text style={s.streakText}>{streak} {streak === 1 ? "day" : "days"} of showing up</Text>
          </View>
        )}

        <Animated.View entering={FadeInDown.duration(500)}>
          <TouchableOpacity
            style={s.memoryCard}
            activeOpacity={0.9}
            onPress={() => story
              ? router.push({ pathname: "/story/[id]", params: { id: story.id } })
              : router.push("/story/new")}
            testID="future-memory-card"
          >
            <View style={s.memoryHalo}><ScrollText color={colors.accent} size={22} /></View>
            <Text style={s.eyebrow}>{story ? "TODAY'S FUTURE MEMORY" : "BEGIN YOUR FIRST ARC"}</Text>
            <Text style={s.memoryTitle}>{story?.title ?? "A future you can step into—and act on."}</Text>
            <Text style={s.memoryBody} numberOfLines={2}>
              {intent ? `“${intent.desire}”` : "Vela turns one desired future into an evolving chapter, a grounded action, and proof you can see."}
            </Text>
            <View style={s.memoryCta}>
              <Text style={s.memoryCtaText}>{story ? "Enter chapter" : "Create my arc"}</Text>
              <ArrowRight color={colors.accent} size={18} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {intent && action && action.state !== "completed" && (
          <Animated.View entering={FadeInDown.delay(180).duration(500)} style={s.bridgeCard}>
            <View style={s.bridgeTop}>
              <View style={s.bridgeIcon}><Footprints color={colors.aurora} size={20} /></View>
              <Text style={s.bridgeLabel}>BRIDGE TO REALITY</Text>
            </View>
            <Text style={s.bridgeText}>{action.text}</Text>
            <TouchableOpacity
              style={s.proofButton}
              onPress={() => router.push({ pathname: "/evidence/[intentId]" as never, params: { intentId: intent.id } })}
              testID="record-proof"
            >
              <Sparkles color={colors.onAccent} size={18} />
              <Text style={s.proofButtonText}>Record what became real</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {intent && action?.state === "completed" && (
          <Animated.View entering={FadeInDown.delay(180).duration(500)} style={s.foldedCard}>
            <View style={s.foldedIcon}><Check color={colors.success} size={20} /></View>
            <View style={s.foldedCopy}>
              <Text style={s.foldedTitle}>Proof folded into your arc</Text>
              <Text style={s.foldedBody}>The next chapter will begin from what actually happened.</Text>
            </View>
            <TouchableOpacity
              style={s.weaveButton}
              disabled={weaving}
              onPress={() => void weaveNext()}
              testID="weave-next-chapter"
            >
              <Text style={s.weaveButtonText}>{weaving ? "Weaving…" : `Weave chapter ${(intent.chapter ?? 1) + 1}`}</Text>
              <ArrowRight color={colors.onAccent} size={18} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={s.proofSection}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Proof constellation</Text>
              <Text style={s.sectionBody}>{completed ? `${completed} moments have shaped your arc.` : "Your first proof will light this path."}</Text>
            </View>
            {completed > 0 && <Check color={colors.success} size={20} />}
          </View>
          <View style={s.constellation} testID="proof-constellation">
            {Array.from({ length: 7 }, (_, index) => {
              const lit = index < proof.length;
              const strong = lit && (proof[index]?.count ?? 0) > 1;
              return <View key={index} style={[s.starTrack, lit && s.starLit, strong && s.starStrong]} />;
            })}
          </View>
          <Text style={s.constellationCaption}>Seven days · imagination becoming evidence</Text>
        </View>

        <Text style={s.supportLabel}>SUPPORTING RITUALS</Text>
        <View style={s.supportRow}>
          <TouchableOpacity style={s.supportCard} onPress={() => router.push("/affirmation")} testID="ritual-affirmation">
            <Quote color={colors.aurora} size={18} />
            <Text style={s.supportTitle}>Carry a line</Text>
            <Text style={s.supportBody}>An affirmation for your focus.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.supportCard} onPress={() => router.push("/journal")} testID="ritual-script">
            <PenLine color={colors.success} size={18} />
            <Text style={s.supportTitle}>Reflect</Text>
            <Text style={s.supportBody}>Script, notice, give thanks.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingTop: space.base, paddingBottom: space.xxl },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.lg },
  headerCopy: { flex: 1, paddingRight: space.base },
  greeting: { ...type.display, color: colors.text },
  focusLine: { ...type.caption, color: colors.textMuted, marginTop: space.sm, letterSpacing: 1.1 },
  gear: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  streakChip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: space.sm, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.base, marginBottom: space.base },
  streakText: { ...type.caption, color: colors.accent, fontWeight: "600" },
  memoryCard: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentBorder, padding: space.lg, marginBottom: space.md, ...cardShadow },
  memoryHalo: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: space.lg },
  eyebrow: { ...type.caption, color: colors.accent, letterSpacing: 1.2, marginBottom: space.sm },
  memoryTitle: { fontFamily: serif, fontSize: 26, lineHeight: 34, color: colors.text },
  memoryBody: { ...type.body, color: colors.textSecondary, marginTop: space.sm },
  memoryCta: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.lg },
  memoryCtaText: { ...type.body, color: colors.accent, fontWeight: "600" },
  bridgeCard: { backgroundColor: colors.auroraSoft, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.auroraBorder, padding: space.lg, marginBottom: space.lg },
  bridgeTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  bridgeIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  bridgeLabel: { ...type.caption, color: colors.aurora, letterSpacing: 1.2 },
  bridgeText: { ...type.body, color: colors.text, marginTop: space.base },
  proofButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.pill, marginTop: space.lg, ...accentGlow },
  proofButtonText: { ...type.body, color: colors.onAccent, fontWeight: "600" },
  foldedCard: { backgroundColor: colors.successSoft, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: space.lg, marginBottom: space.lg },
  foldedIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  foldedCopy: { marginTop: space.md },
  foldedTitle: { ...type.title, color: colors.text },
  foldedBody: { ...type.body, color: colors.textSecondary, marginTop: space.xs },
  weaveButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.pill, marginTop: space.lg, ...accentGlow },
  weaveButtonText: { ...type.body, color: colors.onAccent, fontWeight: "600" },
  proofSection: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: space.lg, marginBottom: space.xl },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  sectionTitle: { ...type.title, color: colors.text },
  sectionBody: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
  constellation: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.lg },
  starTrack: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.hairline },
  starLit: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent },
  starStrong: { width: 18, height: 18, borderRadius: 9, borderWidth: 4, borderColor: colors.accentSoft },
  constellationCaption: { ...type.caption, color: colors.textFaint, marginTop: space.md },
  supportLabel: { ...type.caption, color: colors.textMuted, letterSpacing: 1.2, marginBottom: space.md },
  supportRow: { flexDirection: "row", gap: space.md },
  supportCard: { flex: 1, minHeight: 136, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: space.base },
  supportTitle: { ...type.body, color: colors.text, fontWeight: "600", marginTop: space.base },
  supportBody: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
});
