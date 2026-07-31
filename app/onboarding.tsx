// Three quiet steps: what you're calling in, what to call you, when we meet.
// Non-intimidating by design (health/wellness convention) — chips over forms,
// one decision per screen, CTA always in the thumb zone.
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
} from "lucide-react-native";
import { FOCUS_AREAS, FocusId } from "@/lib/focus";
import { RitualTime, useUser } from "@/contexts/UserContext";
import {
  colors,
  space,
  radius,
  type,
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

const RITUALS: { id: RitualTime; label: string; body: string; Icon: typeof Sunrise }[] = [
  { id: "morning", label: "Morning", body: "Set the day before it sets you.", Icon: Sunrise },
  { id: "evening", label: "Evening", body: "Drift off inside the life you're building.", Icon: MoonStar },
  { id: "both", label: "Both", body: "Bookend the day with intention.", Icon: Stars },
];

export default function OnboardingScreen() {
  const { saveProfile } = useUser();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<FocusId[]>([]);
  const [name, setName] = useState("");
  const [ritual, setRitual] = useState<RitualTime | null>(null);

  const canContinue =
    step === 0 ? selected.length > 0 : step === 1 ? name.trim().length > 0 : ritual !== null;

  const toggle = (id: FocusId) => {
    void Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const next = async () => {
    if (!canContinue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    await saveProfile({
      name: name.trim(),
      focusAreas: selected,
      ritual: ritual ?? "both",
    });
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* progress: three quiet embers */}
        <View style={s.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.dot, i <= step && s.dotActive]} />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <>
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
            </>
          )}

          {step === 1 && (
            <>
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
                onSubmitEditing={next}
                testID="name-input"
              />
            </>
          )}

          {step === 2 && (
            <>
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
            </>
          )}
        </ScrollView>

        <View style={s.dock}>
          <TouchableOpacity
            style={[s.cta, !canContinue && s.ctaDisabled]}
            onPress={() => void next()}
            disabled={!canContinue}
            activeOpacity={0.85}
            testID={step === 2 ? "onboarding-done" : "onboarding-next"}
          >
            <Text style={[s.ctaText, !canContinue && s.ctaTextDisabled]}>
              {step === 2 ? "Begin" : "Continue"}
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
  },
  h1: {
    ...type.display,
    color: colors.text,
  },
  lead: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: space.md,
    marginBottom: space.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  chip: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
  },
  chipOn: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
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
  chipLabel: {
    ...type.body,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipLabelOn: { color: colors.text },
  chipBody: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: space.xs,
  },
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
  ctaDisabled: {
    backgroundColor: colors.card,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    ...type.body,
    fontWeight: "600",
    color: colors.onAccent,
  },
  ctaTextDisabled: { color: colors.textFaint },
});
