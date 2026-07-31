// The affirmation library — browse by area, share any line. Chosen areas are
// free; the rest ask for Plus (tap shows why, not a wall).
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Share2, Lock } from "lucide-react-native";
import { FOCUS_AREAS, FocusId } from "@/lib/focus";
import { affirmationsFor } from "@/lib/affirmations";
import { useUser } from "@/contexts/UserContext";
import { usePlus } from "@/contexts/PlusContext";
import { colors, space, radius, type, serif } from "@/constants/theme";

export default function AffirmationLibraryScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const { isPlus } = usePlus();
  const chosen = profile?.focusAreas ?? [];
  const [area, setArea] = useState<FocusId>(chosen[0] ?? "love");

  const unlocked = isPlus || chosen.includes(area);
  const pool = useMemo(() => affirmationsFor(area), [area]);

  const shareLine = async (text: string) => {
    void Haptics.selectionAsync();
    try {
      await Share.share({ message: `${text}\n\n— via Vela` });
    } catch {
      // user backed out of the sheet; nothing to do
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="library-back"
        >
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Affirmations</Text>
        <View style={s.back} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabs}
        contentContainerStyle={s.tabsContent}
      >
        {FOCUS_AREAS.map((f) => {
          const on = area === f.id;
          const free = isPlus || chosen.includes(f.id);
          return (
            <TouchableOpacity
              key={f.id}
              style={[s.tab, on && s.tabOn]}
              onPress={() => setArea(f.id)}
              testID={`library-${f.id}`}
            >
              {!free && <Lock size={11} color={colors.textFaint} />}
              <Text style={[s.tabText, on && s.tabTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {unlocked ? (
        <ScrollView
          style={s.listScroll}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          {pool.map((a) => (
            <View key={a.id} style={s.card}>
              <Text style={s.line}>{a.text}</Text>
              <TouchableOpacity
                style={s.share}
                onPress={() => void shareLine(a.text)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID={`share-${a.id}`}
              >
                <Share2 color={colors.textMuted} size={16} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={s.locked}>
          <Lock color={colors.accent} size={22} />
          <Text style={s.lockedTitle}>This pack comes with Plus</Text>
          <Text style={s.lockedBody}>
            Your chosen areas are free. Plus opens all six packs — 120 lines.
          </Text>
          <TouchableOpacity
            style={s.cta}
            onPress={() => router.push("/paywall")}
            testID="library-unlock"
          >
            <Text style={s.ctaText}>See Vela Plus</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.base,
    paddingVertical: space.sm,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...type.title, color: colors.text, flex: 1, textAlign: "center" },
  // The tab strip must own a fixed height and the list must own flex: 1 —
  // without both, react-native-web lets the list size itself over the strip
  // and paint on top of it while scrolling.
  tabs: { flexGrow: 0, height: 56 },
  tabsContent: {
    paddingHorizontal: space.lg,
    gap: space.sm,
    alignItems: "center",
  },
  listScroll: { flex: 1 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    paddingVertical: space.sm,
    paddingHorizontal: space.base,
    minHeight: 40,
  },
  tabOn: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  tabText: { ...type.caption, color: colors.textSecondary },
  tabTextOn: { color: colors.accent, fontWeight: "600" },
  list: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
    gap: space.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
  },
  line: {
    fontFamily: serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    flex: 1,
  },
  share: { width: 32, alignItems: "center" },
  locked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  lockedTitle: { fontFamily: serif, fontSize: 22, color: colors.text },
  lockedBody: { ...type.body, color: colors.textSecondary, textAlign: "center" },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
  },
  ctaText: { ...type.body, fontWeight: "600", color: colors.onAccent },
});
