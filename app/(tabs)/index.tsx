// Today — the ritual home. Greets by name and time, then offers the day's
// practice as cards. P1/P2 wire the story and affirmation content; this
// screen owns the rhythm.
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
import { Settings, ScrollText, Quote, PenLine, ChevronRight } from "lucide-react-native";
import { useUser } from "@/contexts/UserContext";
import { focusById } from "@/lib/focus";
import { colors, space, radius, type, serif, cardShadow } from "@/constants/theme";

function daypart(d: Date): "morning" | "afternoon" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export default function TodayScreen() {
  const { profile } = useUser();
  const router = useRouter();
  const part = daypart(new Date());
  const name = profile?.name ?? "";
  const focusLabels = (profile?.focusAreas ?? [])
    .map((id) => focusById(id)?.label)
    .filter(Boolean)
    .join(" · ");

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Good {part}, {name}.</Text>
            {focusLabels.length > 0 && (
              <Text style={s.focusLine}>{focusLabels}</Text>
            )}
          </View>
          <TouchableOpacity
            style={s.gear}
            onPress={() => router.push("/settings")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="open-settings"
          >
            <Settings color={colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        {/* The evening/morning line the day hangs from. */}
        <Text style={s.ritualTitle}>
          {part === "evening" ? "Tonight's ritual" : "Today's ritual"}
        </Text>

        <TouchableOpacity
          style={s.heroCard}
          activeOpacity={0.9}
          onPress={() => router.push("/story/new")}
          testID="ritual-story"
        >
          <View style={s.cardIcon}>
            <ScrollText color={colors.accent} size={20} />
          </View>
          <Text style={s.heroTitle}>Step into your story</Text>
          <Text style={s.heroBody}>
            Three quiet minutes inside the life you're calling in.
          </Text>
          <View style={s.heroCtaRow}>
            <Text style={s.heroCta}>Begin</Text>
            <ChevronRight color={colors.accent} size={16} />
          </View>
        </TouchableOpacity>

        <View style={s.row}>
          <TouchableOpacity
            style={s.smallCard}
            activeOpacity={0.9}
            onPress={() => router.push("/stories")}
            testID="ritual-affirmation"
          >
            <View style={s.cardIcon}>
              <Quote color={colors.aurora} size={18} />
            </View>
            <Text style={s.smallTitle}>Affirmation</Text>
            <Text style={s.smallBody}>One line to carry.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.smallCard}
            activeOpacity={0.9}
            onPress={() => router.push("/journal")}
            testID="ritual-script"
          >
            <View style={s.cardIcon}>
              <PenLine color={colors.success} size={18} />
            </View>
            <Text style={s.smallTitle}>Script</Text>
            <Text style={s.smallBody}>Write it as done.</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: space.xl,
  },
  greeting: { ...type.display, color: colors.text },
  focusLine: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: space.sm,
    letterSpacing: 0.4,
  },
  gear: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ritualTitle: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: space.md,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    marginBottom: space.md,
    ...cardShadow,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.base,
  },
  heroTitle: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
  },
  heroBody: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  heroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.base,
  },
  heroCta: { ...type.body, fontWeight: "600", color: colors.accent },
  row: { flexDirection: "row", gap: space.md },
  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
  },
  smallTitle: { ...type.body, fontWeight: "600", color: colors.text },
  smallBody: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
});
