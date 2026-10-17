// 'Share this star': the proof-star card in a sheet. The preview is the card
// itself; the user's sentence is OFF by default (the dream never appears).
// iOS captures a full-size offscreen copy and opens the share sheet; the web
// downloads a 1080×1920 PNG, or shows the card with a note when it can't.
// Exported for S2 (StarDetailSheet) as well as the evidence screen.
import React, { useRef, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import type { DreamId, ProofId } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { buildShareCard, type ShareCardModel } from "@/lib/share/cardModel";
import { figureFor } from "@/lib/sky/figures";
import type { FocusId } from "@/lib/focus";
import { GhostButton, PrimaryButton, Sheet, Switch, T, useToast } from "@/components/ui";
import { useSky } from "@/components/sky";
import { space } from "@/constants/theme";
import { ShareStarCard } from "./ShareStarCard";
import { SHARE_ACTION_LABEL, shareCardImage } from "./shareCapture";

/** The card model for one saved proof, or null when it can't be found. */
export function useShareCardModel(
  dreamId: DreamId,
  proofId: ProofId | null,
  includeSentence: boolean
): { model: ShareCardModel; focus: FocusId } | null {
  const arc = useArc();
  const { seed } = useSky();
  const proof = proofId ? arc.proof(proofId) : undefined;
  const dream = arc.dream(dreamId);
  const seasonProofs = proof ? arc.proofs(dreamId, proof.season) : [];
  if (!proof || !dream) return null;
  const named = dream.constellations.find((c) => c.season === proof.season)?.name ?? null;
  const model = buildShareCard({
    figure: figureFor(dream.id, proof.season),
    lit: seasonProofs.length,
    kinds: seasonProofs.map((p) => p.kind),
    starIndex: proof.starIndex,
    kind: proof.kind,
    dateKey: proof.dateKey,
    sentence: proof.text,
    includeSentence,
    season: proof.season,
    constellationName: named,
    seed,
  });
  return { model, focus: dream.focus };
}

export interface ShareCardSheetProps {
  visible: boolean;
  onClose: () => void;
  dreamId: DreamId;
  proofId: ProofId | null;
  /** Controls are `${testID}-share`, `-sentence`, `-close`. */
  testID?: string;
}

const NATIVE_W = 360;
const NATIVE_H = 640;

export function ShareCardSheet({ visible, onClose, dreamId, proofId, testID = "share-card" }: ShareCardSheetProps) {
  const toast = useToast();
  const win = useWindowDimensions();
  const [includeSentence, setIncludeSentence] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const nativeRef = useRef<View | null>(null);
  // Build the card only once the sheet has been opened (it stays built while it closes).
  const [opened, setOpened] = useState(visible);
  if (visible && !opened) setOpened(true);
  const card = useShareCardModel(dreamId, opened ? proofId : null, includeSentence);
  const domId = `${testID}-preview`;
  // The preview takes what the sheet can spare (88% of the window minus title,
  // toggle and buttons), so the privacy switch stays in view on an iPhone SE.
  const previewH = Math.round(Math.max(180, Math.min(420, win.height * 0.88 - 382)));
  const previewW = Math.round((previewH * 9) / 16);

  const share = async () => {
    if (!card || busy) return;
    setBusy(true);
    const outcome = await shareCardImage({ nativeRef, domId }, card.model.fileName);
    setBusy(false);
    if (outcome === "downloaded") toast.show({ message: "Your star is saved to your downloads.", tone: "proof" });
    if (outcome === "unavailable") setFallback(true);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Share this star"
      testID={testID}
      scroll
      footer={
        <>
          <PrimaryButton label={SHARE_ACTION_LABEL} onPress={() => void share()} loading={busy} disabled={!card} testID={`${testID}-share`} />
          <GhostButton label="Done" onPress={onClose} testID={`${testID}-close`} />
        </>
      }
    >
      {card ? (
        <View style={styles.body}>
          <View nativeID={domId} style={[styles.preview, { width: previewW, height: previewH }]}>
            <ShareStarCard model={card.model} width={previewW} focus={card.focus} testID={`${testID}-card`} />
          </View>
          {fallback ? (
            <T variant="caption" tone="muted" center testID={`${testID}-note`}>
              {Platform.OS === "web"
                ? "This browser couldn't save the image. Long-press or right-click the card to save it, or take a screenshot."
                : "Sharing isn't available right now. A screenshot keeps the card just as well."}
            </T>
          ) : null}
          <View style={styles.toggle}>
            <View style={styles.flex}>
              <T variant="body" tone="primary">
                Include my sentence
              </T>
              <T variant="caption" tone="muted">
                Your dream itself is never on the card.
              </T>
            </View>
            <Switch
              value={includeSentence}
              onValueChange={setIncludeSentence}
              accessibilityLabel="Include my sentence on the card"
              testID={`${testID}-sentence`}
            />
          </View>
          {Platform.OS !== "web" ? (
            // Full-size twin for the capture (3× = 1080×1920), kept off screen.
            <View pointerEvents="none" style={styles.offscreen}>
              <View ref={nativeRef} collapsable={false} style={{ width: NATIVE_W, height: NATIVE_H }}>
                <ShareStarCard model={card.model} width={NATIVE_W} focus={card.focus} />
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <T variant="body" tone="muted" testID={`${testID}-missing`}>
          This star couldn't be found. It may have been part of a backup you replaced.
        </T>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingTop: space.sm },
  preview: { alignSelf: "center", borderRadius: space.base, overflow: "hidden", boxShadow: "0px 12px 32px rgba(5, 4, 13, 0.6)" },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.base },
  flex: { flex: 1, gap: space.xxs },
  offscreen: { position: "absolute", left: -10000, top: 0 },
});
