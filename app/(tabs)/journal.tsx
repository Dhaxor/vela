// Journal hub: the three practices as doors, past pages below.
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
import { PenLine, Repeat2, Heart, ChevronRight } from "lucide-react-native";
import { useJournal } from "@/contexts/JournalContext";
import { progress369 } from "@/lib/journal";
import { colors, space, radius, type, serif, cardShadow } from "@/constants/theme";

function niceDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function JournalScreen() {
  const router = useRouter();
  const { entries, sheetToday, phrase369 } = useJournal();
  const p369 = sheetToday ? progress369(sheetToday) : null;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Journal</Text>

        <TouchableOpacity
          style={s.door}
          activeOpacity={0.9}
          onPress={() => router.push("/journal/script")}
          testID="door-script"
        >
          <View style={s.doorIcon}>
            <PenLine color={colors.accent} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.doorTitle}>Script the day</Text>
            <Text style={s.doorBody}>Write it as already done.</Text>
          </View>
          <ChevronRight color={colors.textFaint} size={18} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.door}
          activeOpacity={0.9}
          onPress={() => router.push("/journal/method369")}
          testID="door-369"
        >
          <View style={s.doorIcon}>
            <Repeat2 color={colors.aurora} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.doorTitle}>3 · 6 · 9</Text>
            <Text style={s.doorBody}>
              {p369
                ? `“${phrase369}” — ${p369.done}/${p369.total} today`
                : "One line, eighteen times a day."}
            </Text>
          </View>
          <ChevronRight color={colors.textFaint} size={18} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.door}
          activeOpacity={0.9}
          onPress={() => router.push("/journal/gratitude")}
          testID="door-gratitude"
        >
          <View style={s.doorIcon}>
            <Heart color={colors.success} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.doorTitle}>Three good things</Text>
            <Text style={s.doorBody}>Gratitude, briefly.</Text>
          </View>
          <ChevronRight color={colors.textFaint} size={18} />
        </TouchableOpacity>

        {entries.length > 0 && (
          <>
            <Text style={s.section}>Past pages</Text>
            {entries.slice(0, 30).map((e) => (
              <View key={e.id} style={s.entry}>
                <Text style={s.entryMeta}>
                  {niceDate(e.dateKey)} ·{" "}
                  {e.kind === "script" ? "Script" : "Gratitude"}
                </Text>
                <Text style={s.entryText} numberOfLines={3}>
                  {e.text}
                </Text>
              </View>
            ))}
          </>
        )}
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
  h1: { ...type.display, color: colors.text, marginBottom: space.lg },
  door: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.md,
    ...cardShadow,
  },
  doorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  doorTitle: { ...type.body, fontWeight: "600", color: colors.text },
  doorBody: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  section: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: space.lg,
    marginBottom: space.md,
  },
  entry: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.sm,
  },
  entryMeta: { ...type.caption, color: colors.textFaint, marginBottom: space.xs },
  entryText: {
    fontFamily: serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});
