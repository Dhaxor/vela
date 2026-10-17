// Scenes on the Rituals tab: the newest few as a strip you can swipe, ending
// in an 'Add a scene' frame; empty, an engraved window and the invitation.
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Plus } from "@/components/glyphs/icons";
import { Press, SecondaryButton, T, VellumCard, useGutter } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import type { Proof } from "@/contexts/arc.types";
import { colors, radius, space } from "@/constants/theme";
import type { SceneCard } from "@/lib/store/scenes";
import { SceneTile } from "./SceneTile";
import { SectionHead } from "./SectionHead";

export interface ScenesStripProps {
  cards: readonly SceneCard[];
  proofFor: (proofId: string | null) => Proof | null;
  onOpenAll: () => void;
  onOpenCard: (id: string) => void;
  onAdd: () => void;
}

const TILE = 128;
const SHOWN = 6;

export function ScenesStrip({ cards, proofFor, onOpenAll, onOpenCard, onAdd }: ScenesStripProps) {
  const gutter = useGutter();
  return (
    <View style={styles.block}>
      <SectionHead
        title="Scenes"
        note={cards.length > 0 ? String(cards.length) : undefined}
        action={cards.length > 0 ? { label: "See all", onPress: onOpenAll, testID: "rituals-scenes", accessibilityLabel: "Open all Scenes" } : undefined}
      />
      {cards.length === 0 ? (
        <VellumCard testID="rituals-scenes-empty">
          <View style={styles.empty}>
            <Vignette name="window" width={96} />
            <View style={styles.emptyText}>
              <T variant="body" tone="primary">
                Pictures of the life ahead
              </T>
              <T variant="caption" tone="muted">
                Pin a photo or write a scene. Photos from your proofs join on their own.
              </T>
            </View>
          </View>
          <SecondaryButton label="Open Scenes" onPress={onOpenAll} testID="rituals-scenes-open" style={styles.emptyCta} />
        </VellumCard>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter }}
          contentContainerStyle={[styles.strip, { paddingHorizontal: gutter }]}
        >
          {cards.slice(0, SHOWN).map((c) => (
            <SceneTile key={c.id} card={c} width={TILE} proof={c.kind === "photo" ? proofFor(c.proofId) : null} onPress={() => onOpenCard(c.id)} testID={`rituals-scene-${c.id}`} />
          ))}
          <Press onPress={onAdd} testID="rituals-scene-add" accessibilityLabel="Add a scene" pressScale={0.98} style={[styles.add, { width: TILE, height: TILE * 1.25 }]}>
            <View style={styles.addDisc}>
              <Plus color={colors.gold300} size={20} strokeWidth={1.75} />
            </View>
            <T variant="caption" tone="secondary" center>
              Add a scene
            </T>
          </Press>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  strip: { gap: space.md, alignItems: "flex-start" },
  add: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.goldLine,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  addDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.goldLine,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { flexDirection: "row", alignItems: "center", gap: space.base },
  emptyText: { flex: 1, gap: space.xs },
  emptyCta: { marginTop: space.base },
});
