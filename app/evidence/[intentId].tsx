import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Check, Footprints, Lightbulb, Sparkles } from "lucide-react-native";
import { useStories } from "@/contexts/StoryContext";
import {
  proofConstellation,
  proofEnding,
  type EvidenceKind,
} from "@/lib/futureMemory";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

const KINDS: Array<{
  id: EvidenceKind;
  label: string;
  Icon: typeof Check;
  prompt: string;
}> = [
  { id: "did", label: "I did it", Icon: Check, prompt: "What became real?" },
  { id: "moved", label: "I moved", Icon: Footprints, prompt: "What moved one step closer?" },
  { id: "learned", label: "I learned", Icon: Lightbulb, prompt: "What did reality teach you?" },
];

export default function EvidenceScreen() {
  const router = useRouter();
  const { intentId } = useLocalSearchParams<{ intentId: string }>();
  const { actionForIntent, actions, saveEvidence } = useStories();
  const action = actionForIntent(intentId);
  const [kind, setKind] = useState<EvidenceKind>("did");
  const [note, setNote] = useState("");
  const [ending, setEnding] = useState<string | null>(null);
  const points = useMemo(
    () => proofConstellation(actions.filter((item) => item.intentId === intentId)),
    [actions, intentId]
  );

  const save = async () => {
    if (!note.trim() || ending) return;
    const result = await saveEvidence({ intentId, kind, evidence: note });
    if (!result) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEnding(proofEnding(kind));
  };

  if (!action) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Your next proof begins with a chapter.</Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")} testID="evidence-empty-home">
            <Text style={s.link}>Return to Today</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <TouchableOpacity
            style={s.iconButton}
            onPress={() => router.back()}
            testID="evidence-back"
          >
            <ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={s.headerLabel}>PROOF, NOT PRESSURE</Text>
          <View style={s.iconSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.eyebrow}>TODAY'S BRIDGE</Text>
          <Text style={s.title}>Make the future observable.</Text>
          <View style={s.actionCard}>
            <Sparkles color={colors.accent} size={20} />
            <Text style={s.actionText}>{action.text}</Text>
          </View>

          {ending ? (
            <Animated.View entering={ZoomIn.duration(500)} style={s.success} testID="evidence-success">
              <View style={s.successOrb}>
                <Check color={colors.onAccent} size={24} strokeWidth={3} />
              </View>
              <Text style={s.successTitle}>A point of proof</Text>
              <Text style={s.successBody}>{ending}</Text>
              <View style={s.constellation}>
                {Array.from({ length: 7 }, (_, index) => {
                  const lit = index < Math.min(7, points.length + 1);
                  return <View key={index} style={[s.star, lit && s.starLit]} />;
                })}
              </View>
              <TouchableOpacity
                style={s.primary}
                onPress={() => router.replace("/(tabs)")}
                testID="evidence-finish"
              >
                <Text style={s.primaryText}>Carry it forward</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(450)}>
              <Text style={s.label}>What kind of proof appeared?</Text>
              <View style={s.kindRow}>
                {KINDS.map(({ id, label, Icon }) => {
                  const selected = id === kind;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[s.kind, selected && s.kindSelected]}
                      onPress={() => setKind(id)}
                      testID={`evidence-kind-${id}`}
                    >
                      <Icon color={selected ? colors.accent : colors.textMuted} size={18} />
                      <Text style={[s.kindText, selected && s.kindTextSelected]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.label}>{KINDS.find((item) => item.id === kind)?.prompt}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="One honest sentence is enough."
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={240}
                style={s.input}
                testID="evidence-note"
              />
            </Animated.View>
          )}
        </ScrollView>

        {!ending && (
          <View style={s.dock}>
            <TouchableOpacity
              style={[s.primary, !note.trim() && s.primaryDisabled]}
              disabled={!note.trim()}
              onPress={() => void save()}
              testID="evidence-save"
            >
              <Text style={[s.primaryText, !note.trim() && s.primaryTextDisabled]}>
                Add to my future memory
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: space.base,
    paddingVertical: space.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacer: { width: 44, height: 44 },
  headerLabel: { ...type.caption, color: colors.textMuted, letterSpacing: 1.2 },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 140 },
  eyebrow: { ...type.caption, color: colors.accent, letterSpacing: 1.4 },
  title: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: space.lg,
  },
  actionText: { ...type.body, color: colors.text, flex: 1 },
  label: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: space.xl,
    marginBottom: space.md,
  },
  kindRow: { flexDirection: "row", gap: space.sm },
  kind: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    padding: space.sm,
  },
  kindSelected: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  kindText: { ...type.caption, color: colors.textMuted, textAlign: "center" },
  kindTextSelected: { color: colors.accent, fontWeight: "600" },
  input: {
    ...type.body,
    minHeight: 128,
    color: colors.text,
    textAlignVertical: "top",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
  },
  dock: { paddingHorizontal: space.lg, paddingBottom: space.base, paddingTop: space.sm },
  primary: {
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    ...accentGlow,
  },
  primaryDisabled: { backgroundColor: colors.card, shadowOpacity: 0, elevation: 0 },
  primaryText: { ...type.body, color: colors.onAccent, fontWeight: "600" },
  primaryTextDisabled: { color: colors.textFaint },
  success: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: space.lg,
    marginTop: space.xl,
  },
  successOrb: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.base,
  },
  successTitle: { fontFamily: serif, fontSize: 24, lineHeight: 30, color: colors.text },
  successBody: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: space.sm },
  constellation: { flexDirection: "row", gap: space.md, marginVertical: space.xl },
  star: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.hairline },
  starLit: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  emptyTitle: { fontFamily: serif, fontSize: 24, lineHeight: 32, color: colors.text, textAlign: "center" },
  link: { ...type.body, color: colors.accent, marginTop: space.lg, fontWeight: "600" },
});
