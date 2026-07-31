// Onboarding — a six-beat arc, each beat one decision or one feeling:
//
//   welcome → what you're calling in → how the wanting feels → your name
//   → when we meet → the practice → (straight into the first story)
//
// The Stella playbook's good parts, kept: an emotional frame before any
// questions, light investment-building, momentum into the first value
// moment. Its bad part — the paywall slam at the end — is deliberately
// absent; the ask comes later, softly, after the first story has landed.
import React, { useState } from "react";
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
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Heart,
  Gem,
  Briefcase,
  HeartPulse,
  Flame,
  Leaf,
  Sunrise,
  MoonStar,
  Stars,
  Sparkles,
  ScrollText,
  Quote,
  PenLine,
} from "lucide-react-native";
import { FOCUS_AREAS, FocusId } from "@/lib/focus";
import { RitualTime, useUser } from "@/contexts/UserContext";
import {
  colors,
  space,
  radius,
  type,
  serif,
  accentGlow,
} from "@/constants/theme";

const FOCUS_ICONS: Record<FocusId, React.ComponentType<{ color?: string; size?: number }>> = {
  love: Heart,
  abundance: Gem,
  career: Briefcase,
  health: HeartPulse,
  confidence: Flame,
  peace: Leaf,
};

const MOODS = [
  { id: "hopeful", label: "Hopeful", body: "Something good feels close." },
  { id: "stuck", label: "A little stuck", body: "Same place, too long." },
  { id: "tired", label: "Tired of waiting", body: "Ready for it to be real." },
  { id: "certain", label: "Quietly certain", body: "It's coming. You know." },
] as const;

const RITUALS: { id: RitualTime; label: string; body: string; Icon: typeof Sunrise }[] = [
  { id: "morning", label: "Morning", body: "Set the day before it sets you.", Icon: Sunrise },
  { id: "evening", label: "Evening", body: "Drift off inside the life you're building.", Icon: MoonStar },
  { id: "both", label: "Both", body: "Bookend the day with intention.", Icon: Stars },
];

const PRACTICE = [
  { Icon: ScrollText, tint: colors.accent, title: "Step into a story", body: "A day inside your achieved life, written from your own words." },
  { Icon: Quote, tint: colors.aurora, title: "Carry one line", body: "A daily affirmation for the areas you chose." },
  { Icon: PenLine, tint: colors.success, title: "Write it as done", body: "Scripting, the 369 method, and gratitude." },
] as const;

const TOTAL_STEPS = 6;

export default function OnboardingScreen() {
  const router = useRouter();
  const { saveProfile } = useUser();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<FocusId[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ritual, setRitual] = useState<RitualTime | null>(null);

  const canContinue =
    step === 1
      ? selected.length > 0
      : step === 2
        ? mood !== null
        : step === 3
          ? name.trim().length > 0
          : step === 4
            ? ritual !== null
            : true;

  const toggle = (id: FocusId) => {
    void Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const next = async () => {
    if (!canContinue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    await saveProfile({
      name: name.trim(),
      focusAreas: selected,
      ritual: ritual ?? "both",
      ...(mood ? { mood } : {}),
    });
    // Momentum: the first thing after onboarding is the first story.
    router.replace("/story/new");
  };

  const ctaLabel =
    step === 0 ? "Begin" : step === TOTAL_STEPS - 1 ? "Write my first story" : "Continue";

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[s.dot, i <= step && s.dotActive]} />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <Animated.View entering={FadeIn.duration(600)} style={s.welcome}>
              <View style={s.welcomeHalo}>
                <Sparkles color={colors.accent} size={30} />
              </View>
              <Text style={s.brand}>Vela</Text>
              <Text style={s.welcomeLine}>
                The life you keep imagining{"\n"}is a place. Let's visit it daily
                {"\n"}until you live there.
              </Text>
              <Text style={s.welcomeSub}>
                Two quiet minutes a day. No account. Nothing leaves your phone.
              </Text>
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={s.h1}>What are you{"\n"}calling in?</Text>
              <Text style={s.lead}>Choose everything that pulls at you.</Text>
              <View style={s.grid}>
                {FOCUS_AREAS.map((f) => {
                  const Icon = FOCUS_ICONS[f.id];
                  const on = selected.includes(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[s.chip, on && s.chipOn]}
                      onPress={() => toggle(f.id)}
                      activeOpacity={0.85}
                      testID={`focus-${f.id}`}
                    >
                      <View style={[s.chipIcon, on && s.chipIconOn]}>
                        <Icon color={on ? colors.accent : colors.textMuted} size={20} />
                      </View>
                      <Text style={[s.chipLabel, on && s.chipLabelOn]}>{f.label}</Text>
                      <Text style={s.chipBody} numberOfLines={2}>
                        {f.invitation}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={s.h1}>And how does the{"\n"}wanting feel, today?</Text>
              <Text style={s.lead}>
                There's no wrong answer. The stories meet you where you are.
              </Text>
              {MOODS.map((m) => {
                const on = mood === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.ritualRow, on && s.chipOn]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setMood(m.id);
                    }}
                    testID={`mood-${m.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.chipLabel, on && s.chipLabelOn]}>{m.label}</Text>
                      <Text style={s.chipBody}>{m.body}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={s.h1}>What should the{"\n"}stories call you?</Text>
              <Text style={s.lead}>
                Your name is woven into every story you manifest.
              </Text>
              <TextInput
                style={s.input}
                placeholder="Your first name"
                placeholderTextColor={colors.textFaint}
                value={name}
                onChangeText={setName}
                maxLength={40}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => void next()}
                testID="name-input"
              />
            </Animated.View>
          )}

          {step === 4 && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={s.h1}>When do we{"\n"}meet?</Text>
              <Text style={s.lead}>A ritual works because it has a time.</Text>
              {RITUALS.map(({ id, label, body, Icon }) => {
                const on = ritual === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[s.ritualRow, on && s.chipOn]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setRitual(id);
                    }}
                    activeOpacity={0.85}
                    testID={`ritual-${id}`}
                  >
                    <View style={[s.chipIcon, on && s.chipIconOn]}>
                      <Icon color={on ? colors.accent : colors.textMuted} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.chipLabel, on && s.chipLabelOn]}>{label}</Text>
                      <Text style={s.chipBody}>{body}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          )}

          {step === 5 && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={s.h1}>Your practice,{"\n"}{name.trim() || "friend"}.</Text>
              <Text style={s.lead}>Small, daily, and yours. Here's the shape of it.</Text>
              {PRACTICE.map(({ Icon, tint, title, body }, i) => (
                <Animated.View
                  key={title}
                  entering={FadeInDown.delay(200 + i * 180).duration(500)}
                  style={s.practiceRow}
                >
                  <View style={s.chipIcon}>
                    <Icon color={tint} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.chipLabel}>{title}</Text>
                    <Text style={s.chipBody}>{body}</Text>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </ScrollView>

        <View style={s.dock}>
          <TouchableOpacity
            style={[s.cta, !canContinue && s.ctaDisabled]}
            onPress={() => void next()}
            disabled={!canContinue}
            activeOpacity={0.85}
            testID={step === TOTAL_STEPS - 1 ? "onboarding-done" : "onboarding-next"}
          >
            <Text style={[s.ctaText, !canContinue && s.ctaTextDisabled]}>
              {ctaLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
    paddingTop: space.base,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
  dotActive: { backgroundColor: colors.accent },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.huge,
    flexGrow: 1,
  },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.base },
  welcomeHalo: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    ...accentGlow,
  },
  brand: {
    fontFamily: serif,
    fontSize: 44,
    color: colors.text,
    letterSpacing: 2,
    marginTop: space.sm,
  },
  welcomeLine: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 34,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: space.sm,
  },
  welcomeSub: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: space.md,
  },
  h1: { ...type.display, color: colors.text },
  lead: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: space.md,
    marginBottom: space.xl,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  chip: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
  },
  chipOn: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  chipIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  chipIconOn: { backgroundColor: "rgba(233, 180, 76, 0.16)" },
  chipLabel: { ...type.body, fontWeight: "600", color: colors.textSecondary },
  chipLabelOn: { color: colors.text },
  chipBody: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
  input: {
    ...type.title,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: space.lg,
    paddingVertical: space.base,
  },
  ritualRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.md,
  },
  practiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.md,
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
