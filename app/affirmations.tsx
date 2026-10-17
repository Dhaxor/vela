// The line library. 'Yours' leads: identity lines born from the kinds of
// proof the person has actually logged, for their dream's area. Behind it,
// the 1.0 library (120 lines, deliberately not grown, Guideline 4.3): the
// person's own areas are free, every area comes with Plus.
import React, { useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Lock, Share2 } from "lucide-react-native";
import { Chip, Header, IconButton, PrimaryButton, Screen, T, haptics, useGutter, useToast } from "@/components/ui";
import { StarProof, Vignette } from "@/components/glyphs";
import { BORN_FROM } from "@/components/feature/rituals/YourLineBlock";
import { earnedLines } from "@/lib/rituals";
import { useRitualToday } from "@/components/feature/rituals/useRitualToday";
import { usePlus } from "@/contexts/PlusContext";
import { colors, space } from "@/constants/theme";
import { affirmationsFor } from "@/lib/affirmations";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";

type Tab = "yours" | FocusId;

export default function AffirmationLibraryScreen() {
  const router = useRouter();
  const toast = useToast();
  const gutter = useGutter();
  const plus = usePlus();
  const today = useRitualToday();
  const groups = useMemo(() => (today.focus ? earnedLines(today.proofs, today.focus) : []), [today.focus, today.proofs]);
  const [tab, setTab] = useState<Tab>(() => (groups.length > 0 ? "yours" : today.focus ?? "love"));

  const unlocked = tab === "yours" || plus.canUseArea(tab);
  const pool = useMemo(() => (tab === "yours" ? [] : affirmationsFor(tab)), [tab]);

  const shareLine = async (text: string) => {
    haptics.select();
    try {
      await Share.share({ message: `${text}\n\nvia Vela` });
    } catch {
      toast.show({ message: "Sharing isn’t available here.", tone: "error" });
    }
  };

  const row = (id: string, text: string, i: number) => (
    <View key={id} style={[styles.row, i > 0 && styles.divider]}>
      <T variant="reading" style={styles.line}>
        {text}
      </T>
      <IconButton accessibilityLabel="Share this line" onPress={() => void shareLine(text)} testID={`share-${id}`}>
        <Share2 color={colors.ink48} size={18} strokeWidth={1.75} />
      </IconButton>
    </View>
  );

  return (
    <Screen testID="library-screen" header={<Header title="Line library" testID="library" />}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabs, { marginHorizontal: -gutter }]}
        contentContainerStyle={[styles.tabsContent, { paddingHorizontal: gutter }]}
      >
        <Chip label="Yours" selected={tab === "yours"} onPress={() => setTab("yours")} role="radio" testID="library-yours" />
        {FOCUS_AREAS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            selected={tab === f.id}
            onPress={() => setTab(f.id)}
            role="radio"
            icon={plus.canUseArea(f.id) ? undefined : <Lock color={colors.ink48} size={14} strokeWidth={1.75} />}
            testID={`library-${f.id}`}
          />
        ))}
      </ScrollView>

      {tab === "yours" ? (
        groups.length > 0 ? (
          <View style={styles.list} testID="library-yours-list">
            <T variant="body" tone="muted">
              Lines that are true because of what you did. A new kind of proof opens a new set.
            </T>
            {groups.map((g) => (
              <View key={g.kind} style={styles.group}>
                <View style={styles.groupHead}>
                  <StarProof kind={g.kind} size={16} />
                  <T variant="eyebrow">{BORN_FROM[g.kind]}</T>
                </View>
                <View>{g.lines.map((l, i) => row(l.id, l.text, i))}</View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty} testID="library-yours-empty">
            <Vignette name="sail" width={160} />
            <T variant="title" center>
              Your lines begin with a proof
            </T>
            <T variant="body" tone="muted" center>
              Cross today’s bridge and log what happened. The lines that become true for you gather here.
            </T>
          </View>
        )
      ) : unlocked ? (
        <View style={styles.list} testID={`library-list-${tab}`}>
          <View>{pool.map((a, i) => row(a.id, a.text, i))}</View>
        </View>
      ) : (
        <View style={styles.empty} testID="library-locked">
          <Vignette name="window" width={160} />
          <T variant="title" center>
            This area comes with Plus
          </T>
          <T variant="body" tone="muted" center>
            Your own areas are always free. Plus opens all six, 120 lines in all.
          </T>
          <PrimaryButton label="See Vela Plus" onPress={() => router.push({ pathname: "/paywall", params: { from: "area" } })} testID="library-unlock" style={styles.unlock} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexGrow: 0, marginTop: space.sm },
  tabsContent: { gap: space.sm, paddingVertical: space.xs },
  list: { gap: space.lg, marginTop: space.lg },
  group: { gap: space.sm },
  groupHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  line: { flex: 1 },
  empty: { alignItems: "center", gap: space.md, marginTop: space.xxl, paddingHorizontal: space.sm },
  unlock: { marginTop: space.base },
});
