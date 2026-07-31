// The vision board: photos and written goals in a two-column masonry-ish
// grid. Free tier holds three cards; the fourth asks for Plus.
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LayoutGrid, ImagePlus, PenLine, X } from "lucide-react-native";
import { useBoard } from "@/contexts/BoardContext";
import { usePlus } from "@/contexts/PlusContext";
import { canAddBoardCard } from "@/lib/purchase";
import {
  colors,
  space,
  radius,
  type,
  serif,
  cardShadow,
  accentGlow,
} from "@/constants/theme";

export default function BoardScreen() {
  const router = useRouter();
  const { cards, addPhoto, addGoal, removeCard } = useBoard();
  const { isPlus } = usePlus();
  const [goalDraft, setGoalDraft] = useState("");
  const [writing, setWriting] = useState(false);

  const gate = (): boolean => {
    if (canAddBoardCard(cards.length, isPlus)) return true;
    router.push("/paywall");
    return false;
  };

  const pickPhoto = async () => {
    if (!gate()) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Picker = require("expo-image-picker") as typeof import("expo-image-picker");
      const res = await Picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addPhoto(res.assets[0].uri, "");
    } catch {
      Alert.alert(
        "Photos unavailable",
        "Vela couldn't open your photo library on this device."
      );
    }
  };

  const saveGoal = async () => {
    if (goalDraft.trim().length < 2) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addGoal(goalDraft);
    setGoalDraft("");
    setWriting(false);
  };

  const confirmRemove = (id: string) => {
    Alert.alert("Remove this card?", "It leaves the board, not your life.", [
      { text: "Keep", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void removeCard(id) },
    ]);
  };

  const left = cards.filter((_, i) => i % 2 === 0);
  const right = cards.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Text style={s.h1}>Board</Text>
          <View style={s.actions}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => {
                if (gate()) setWriting(true);
              }}
              testID="board-add-goal"
            >
              <PenLine color={colors.accent} size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.actionPrimary]}
              onPress={() => void pickPhoto()}
              testID="board-add-photo"
            >
              <ImagePlus color={colors.onAccent} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {writing && (
          <View style={s.goalComposer}>
            <TextInput
              style={s.goalInput}
              placeholder="Write the goal as already true…"
              placeholderTextColor={colors.textFaint}
              value={goalDraft}
              onChangeText={setGoalDraft}
              maxLength={120}
              multiline
              autoFocus
              testID="goal-input"
            />
            <View style={s.goalActions}>
              <TouchableOpacity onPress={() => setWriting(false)} style={s.goalCancel}>
                <Text style={s.goalCancelText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void saveGoal()}
                style={[s.goalSave, goalDraft.trim().length < 2 && s.goalSaveDisabled]}
                disabled={goalDraft.trim().length < 2}
                testID="goal-save"
              >
                <Text style={s.goalSaveText}>Pin it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {cards.length === 0 && !writing ? (
          <View style={s.empty}>
            <View style={s.halo}>
              <LayoutGrid color={colors.success} size={26} />
            </View>
            <Text style={s.emptyTitle}>A wall for the life ahead</Text>
            <Text style={s.emptyBody}>
              Pin photos and written goals — proof in advance. Three cards are
              free; Plus opens the whole wall.
            </Text>
            <TouchableOpacity
              style={s.cta}
              onPress={() => void pickPhoto()}
              activeOpacity={0.85}
              testID="board-first-photo"
            >
              <Text style={s.ctaText}>Pin your first photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.grid}>
            {[left, right].map((col, ci) => (
              <View key={ci} style={s.col}>
                {col.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={s.card}
                    activeOpacity={0.9}
                    onLongPress={() => confirmRemove(card.id)}
                    testID={`board-card-${card.id}`}
                  >
                    {card.kind === "photo" ? (
                      <>
                        <Image source={{ uri: card.uri }} style={s.photo} />
                        {card.caption ? (
                          <Text style={s.caption}>{card.caption}</Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={s.goalText}>“{card.text}”</Text>
                    )}
                    <TouchableOpacity
                      style={s.remove}
                      onPress={() => confirmRemove(card.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      testID={`remove-${card.id}`}
                    >
                      <X color={colors.textFaint} size={14} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
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
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.lg,
  },
  h1: { ...type.display, color: colors.text },
  actions: { flexDirection: "row", gap: space.sm },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: { backgroundColor: colors.accent, ...accentGlow },
  goalComposer: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.lg,
  },
  goalInput: {
    fontFamily: serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    minHeight: 56,
    textAlignVertical: "top",
  },
  goalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: space.base,
    marginTop: space.md,
  },
  goalCancel: { paddingVertical: space.sm, paddingHorizontal: space.md },
  goalCancelText: { ...type.caption, color: colors.textMuted },
  goalSave: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  goalSaveDisabled: { backgroundColor: colors.cardPressed },
  goalSaveText: { ...type.caption, fontWeight: "600", color: colors.onAccent },
  grid: { flexDirection: "row", gap: space.md },
  col: { flex: 1, gap: space.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
    ...cardShadow,
  },
  photo: { width: "100%", aspectRatio: 0.9 },
  caption: { ...type.caption, color: colors.textSecondary, padding: space.md },
  goalText: {
    fontFamily: serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    padding: space.base,
    paddingRight: space.xl,
  },
  remove: {
    position: "absolute",
    top: space.sm,
    right: space.sm,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: "rgba(11, 10, 24, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  halo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(127, 200, 169, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  emptyTitle: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 34,
    color: colors.text,
    textAlign: "center",
  },
  emptyBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: space.md,
    marginBottom: space.xl,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    paddingHorizontal: space.xl,
    ...accentGlow,
  },
  ctaText: { ...type.body, fontWeight: "600", color: colors.onAccent },
});
