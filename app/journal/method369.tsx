// The 369 method: one intention, written 3× in the morning, 6× at midday,
// 9× in the evening. The structure is enforced — that IS the method — and
// the current block is suggested from the clock, never policed.
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
import { safeBack } from "@/lib/nav";
import * as Haptics from "expo-haptics";
import { X, Sunrise, Sun, MoonStar, Check } from "lucide-react-native";
import { useJournal } from "@/contexts/JournalContext";
import { useRitual } from "@/contexts/RitualContext";
import { progress369, SLOT_CAPS, Slot369, slotForHour } from "@/lib/journal";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

const SLOTS: { id: Slot369; label: string; Icon: typeof Sunrise }[] = [
  { id: "morning", label: "Morning", Icon: Sunrise },
  { id: "afternoon", label: "Midday", Icon: Sun },
  { id: "evening", label: "Evening", Icon: MoonStar },
];

export default function Method369Screen() {
  const router = useRouter();
  const { sheetToday, phrase369, setPhrase369, addRep } = useJournal();
  const { markDone } = useRitual();
  const [phraseDraft, setPhraseDraft] = useState(phrase369);
  const [slot, setSlot] = useState<Slot369>(slotForHour(new Date().getHours()));
  const [line, setLine] = useState("");

  // ---- setup state: no phrase chosen yet ----
  if (!sheetToday) {
    return (
      <SafeAreaView style={s.screen}>
        <Header router={router} />
        <View style={s.setup}>
          <Text style={s.setupTitle}>Choose your line</Text>
          <Text style={s.setupBody}>
            One sentence, present tense, as if it's already true. You'll write
            it 3 times in the morning, 6 at midday, 9 in the evening.
          </Text>
          <TextInput
            style={s.phraseInput}
            placeholder="e.g. I am paid well for work I love"
            placeholderTextColor={colors.textFaint}
            value={phraseDraft}
            onChangeText={setPhraseDraft}
            maxLength={80}
            testID="phrase-input"
          />
          <TouchableOpacity
            style={[s.cta, phraseDraft.trim().length < 3 && s.ctaDisabled]}
            disabled={phraseDraft.trim().length < 3}
            onPress={() => void setPhrase369(phraseDraft)}
            testID="phrase-set"
          >
            <Text
              style={[s.ctaText, phraseDraft.trim().length < 3 && s.ctaTextDisabled]}
            >
              Begin the practice
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const p = progress369(sheetToday);
  const slotFull = sheetToday[slot].length >= SLOT_CAPS[slot];

  const write = async () => {
    const ok = await addRep(slot, line.trim() || sheetToday.phrase);
    if (ok) {
      void Haptics.selectionAsync();
      setLine("");
      await markDone("script");
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Header router={router} />
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.phrase}>“{sheetToday.phrase}”</Text>
          <Text style={s.progressLine} testID="progress-369">
            {p.done} of {p.total} written today
          </Text>

          <View style={s.slotRow}>
            {SLOTS.map(({ id, label, Icon }) => {
              const on = slot === id;
              const st = p.bySlot[id];
              return (
                <TouchableOpacity
                  key={id}
                  style={[s.slotChip, on && s.slotChipOn]}
                  onPress={() => setSlot(id)}
                  testID={`slot-${id}`}
                >
                  <Icon color={on ? colors.accent : colors.textMuted} size={16} />
                  <Text style={[s.slotLabel, on && s.slotLabelOn]}>
                    {label} {st.done}/{st.cap}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {p.complete ? (
            <View style={s.completeCard} testID="complete-369">
              <Check color={colors.success} size={20} />
              <Text style={s.completeText}>
                All 18, written. The line is doing its quiet work now — see you
                tomorrow.
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={s.lineInput}
                placeholder={sheetToday.phrase}
                placeholderTextColor={colors.textFaint}
                value={line}
                onChangeText={setLine}
                onSubmitEditing={() => void write()}
                returnKeyType="done"
                testID="rep-input"
              />
              <TouchableOpacity
                style={[s.cta, slotFull && s.ctaDisabled]}
                disabled={slotFull}
                onPress={() => void write()}
                testID="rep-write"
              >
                <Text style={[s.ctaText, slotFull && s.ctaTextDisabled]}>
                  {slotFull
                    ? "This block is complete"
                    : `Write it (${sheetToday[slot].length + 1} of ${SLOT_CAPS[slot]})`}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {sheetToday[slot].length > 0 && (
            <View style={s.written}>
              {sheetToday[slot].map((t, i) => (
                <Text key={i} style={s.writtenLine}>
                  {i + 1}. {t}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View style={s.header}>
      <Text style={s.headerTitle}>3 · 6 · 9</Text>
      <TouchableOpacity
        onPress={() => safeBack(router)}
        style={s.close}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="m369-close"
      >
        <X color={colors.textMuted} size={22} />
      </TouchableOpacity>
    </View>
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
  headerTitle: { ...type.title, color: colors.text, letterSpacing: 2 },
  close: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  setup: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.xl },
  setupTitle: { fontFamily: serif, fontSize: 28, lineHeight: 36, color: colors.text },
  setupBody: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: space.md,
    marginBottom: space.xl,
  },
  phraseInput: {
    ...type.title,
    fontFamily: serif,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.lg,
  },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  phrase: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 34,
    color: colors.text,
    marginTop: space.base,
  },
  progressLine: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  slotRow: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  slotChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    minHeight: 44,
  },
  slotChipOn: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  slotLabel: { ...type.caption, color: colors.textSecondary },
  slotLabelOn: { color: colors.accent, fontWeight: "600" },
  lineInput: {
    fontFamily: serif,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.md,
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
  completeCard: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: space.base,
  },
  completeText: { ...type.body, color: colors.success, flex: 1 },
  written: { marginTop: space.lg },
  writtenLine: {
    fontFamily: serif,
    fontSize: 15,
    lineHeight: 26,
    color: colors.textMuted,
  },
});
