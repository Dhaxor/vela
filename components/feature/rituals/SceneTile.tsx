// One Scene: a photo (or a written scene in the person's own gold italic)
// with its caption, a star badge when it came from a proof, and the dream it
// is attached to. Used by the Rituals strip and the /scenes grid.
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Press, T } from "@/components/ui";
import { AreaSign, StarProof } from "@/components/glyphs";
import type { Proof } from "@/contexts/arc.types";
import { colors, radius, space } from "@/constants/theme";
import type { FocusId } from "@/lib/focus";
import type { SceneCard } from "@/lib/store/scenes";

export interface SceneTileProps {
  card: SceneCard;
  width: number;
  /** The proof a photo came from (proof photos join Scenes on their own). */
  proof?: Proof | null;
  /** Attached dream, for the footer line. */
  dream?: { name: string; focus: FocusId } | null;
  /** Show the caption + footer under the frame (grid) or just a short caption (strip). */
  detail?: boolean;
  onPress: () => void;
  testID: string;
}

const RATIO = 1.25;

export function SceneTile({ card, width, proof, dream, detail = false, onPress, testID }: SceneTileProps) {
  const height = Math.round(width * RATIO);
  const caption = card.kind === "photo" ? card.caption : "";
  const label = card.kind === "photo" ? caption || (proof ? `Proof photo: ${proof.text}` : "A scene") : `Written scene: ${card.text}`;
  return (
    <Press onPress={onPress} testID={testID} accessibilityLabel={label} accessibilityHint="Opens the scene" pressScale={0.98} style={{ width }}>
      <View style={[styles.frame, { height }]}>
        {card.kind === "photo" ? (
          <Image source={{ uri: card.uri }} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.goal}>
            <T variant={detail ? "reading" : "caption"} italic tone="gold" numberOfLines={detail ? 7 : 6}>
              {`“${card.text.replace(/^["“”]+|["“”]+$/gu, "")}”`}
            </T>
          </View>
        )}
        {proof ? (
          <View style={styles.badge}>
            <StarProof kind={proof.kind} size={14} />
          </View>
        ) : null}
      </View>
      {caption ? (
        <T variant="caption" tone="secondary" numberOfLines={2} style={styles.caption}>
          {caption}
        </T>
      ) : null}
      {detail && (proof || dream) ? (
        <View style={styles.meta}>
          {dream ? <AreaSign focus={dream.focus} size={14} color={colors.ink48} /> : null}
          <T variant="caption" tone="faint" numberOfLines={1} style={styles.metaText}>
            {proof ? "From your proof" : dream?.name}
          </T>
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  photo: { width: "100%", height: "100%" },
  goal: { flex: 1, padding: space.base, justifyContent: "center", backgroundColor: colors.vellumRaised },
  badge: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.scrim,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: { marginTop: space.sm },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.xs },
  metaText: { flex: 1 },
});
