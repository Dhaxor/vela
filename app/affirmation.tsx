// The day's affirmation — one line, full screen, serif, no clutter. Marking
// it carried is the smallest possible ritual and counts toward the streak.
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { X, Check, Quote } from "lucide-react-native";
import { useUser } from "@/contexts/UserContext";
import { useRitual } from "@/contexts/RitualContext";
import { dailyAffirmation } from "@/lib/affirmations";
import { dateKey } from "@/lib/streak";
import { focusById } from "@/lib/focus";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

export default function AffirmationScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const { markDone, doneToday } = useRitual();
  const [carried, setCarried] = useState(doneToday.includes("affirmation"));

  const affirmation = useMemo(
    () => dailyAffirmation(dateKey(new Date()), profile?.focusAreas ?? []),
    [profile?.focusAreas]
  );
  const area = focusById(affirmation.focus);

  const carry = async () => {
    if (carried) {
      router.back();
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCarried(true);
    await markDone("affirmation");
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.close}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="affirmation-close"
        >
          <X color={colors.textMuted} size={22} />
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        <View style={s.halo}>
          <Quote color={colors.accent} size={24} />
        </View>
        <Text style={s.tag}>{area?.label ?? ""} · today</Text>
        <Text style={s.line} testID="affirmation-text">
          {affirmation.text}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/affirmations")}
          style={s.browse}
          testID="affirmation-browse"
        >
          <Text style={s.browseText}>Browse the whole library</Text>
        </TouchableOpacity>
      </View>

      <View style={s.dock}>
        <TouchableOpacity
          style={[s.cta, carried && s.ctaDone]}
          onPress={() => void carry()}
          activeOpacity={0.85}
          testID="affirmation-carry"
        >
          {carried && <Check color={colors.success} size={18} />}
          <Text style={[s.ctaText, carried && s.ctaTextDone]}>
            {carried ? "Carried. See you tomorrow." : "I'll carry this today"}
          </Text>
        </TouchableOpacity>
      </View>
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
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  halo: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  tag: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: space.base,
  },
  line: {
    fontFamily: serif,
    fontSize: 28,
    lineHeight: 40,
    color: colors.text,
    textAlign: "center",
  },
  browse: { marginTop: space.lg, minHeight: 44, justifyContent: "center" },
  browseText: { ...type.caption, color: colors.aurora },
  dock: {
    paddingHorizontal: space.lg,
    paddingBottom: space.base,
  },
  cta: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    ...accentGlow,
  },
  ctaDone: {
    backgroundColor: colors.successSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: { ...type.body, fontWeight: "600", color: colors.onAccent },
  ctaTextDone: { color: colors.success },
});
