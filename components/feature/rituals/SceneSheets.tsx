// The Scenes sheets: a new scene (photo or written), and an existing one to
// caption, attach to a dream, or remove. 'Attach to a dream' is a single
// choice among the dreams that are not released, or none.
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { ImagePlus, PenLine } from "@/components/glyphs/icons";
import { ChipGroup, DangerButton, GhostButton, PrimaryButton, SecondaryButton, Sheet, T, TextField } from "@/components/ui";
import { StarProof } from "@/components/glyphs";
import type { Dream, Proof } from "@/contexts/arc.types";
import { colors, radius, space } from "@/constants/theme";
import { GOAL_TEXT_MAX, SCENE_CAPTION_MAX, type SceneCard } from "@/lib/store/scenes";
import { dreamName } from "@/lib/rituals";
import { dayParts } from "./dates";

const NONE = "none";
/** Counters appear only once a caption nears its limit (keeps the short-phone sheet calm). */
const NEAR_LIMIT = 0.75;

function AttachChips({ dreams, value, onChange }: { dreams: readonly Dream[]; value: string | null; onChange: (id: string | null) => void }) {
  if (dreams.length === 0) return null;
  const options = [...dreams.map((d) => ({ value: d.id, label: dreamName(d) })), { value: NONE, label: "No dream" }];
  return (
    <View style={styles.attach}>
      <T variant="eyebrow">Attach to a dream</T>
      <ChipGroup
        options={options}
        value={value ?? NONE}
        onChange={(v) => onChange(v === NONE ? null : v)}
        testIDPrefix="scene-attach-"
        accessibilityLabel="Attach to a dream"
      />
    </View>
  );
}

/* ------------------------------------------------------------- new */

export type Composer = { kind: "choose" } | { kind: "photo"; uri: string } | { kind: "goal" };

export interface NewSceneSheetProps {
  composer: Composer | null;
  dreams: readonly Dream[];
  defaultDreamId: string | null;
  onClose: () => void;
  onPickPhoto: () => void;
  onWrite: () => void;
  onSavePhoto: (uri: string, caption: string, dreamId: string | null) => Promise<void>;
  onSaveGoal: (text: string, dreamId: string | null) => Promise<void>;
}

/** The preview shrinks on short phones so the caption and the dream chips stay in view. */
function usePreviewHeight(): number {
  const { height } = useWindowDimensions();
  return Math.round(Math.max(120, Math.min(220, height * 0.2)));
}

export function NewSceneSheet({ composer, dreams, defaultDreamId, onClose, onPickPhoto, onWrite, onSavePhoto, onSaveGoal }: NewSceneSheetProps) {
  const previewH = usePreviewHeight();
  const [text, setText] = useState("");
  const [dreamId, setDreamId] = useState<string | null>(defaultDreamId);
  const [busy, setBusy] = useState(false);
  const kind = composer?.kind ?? null;

  useEffect(() => {
    if (kind === "photo" || kind === "goal") {
      setText("");
      setDreamId(defaultDreamId);
      setBusy(false);
    }
  }, [kind, defaultDreamId]);

  if (composer?.kind === "choose") {
    return (
      <Sheet visible onClose={onClose} title="A new scene" subtitle="A picture of the life ahead, or a few words of it." testID="scene-choose">
        <View style={styles.choose}>
          <PrimaryButton label="Choose a photo" icon={<ImagePlus color={colors.onGold} size={20} strokeWidth={1.75} />} onPress={onPickPhoto} testID="scene-choose-photo" />
          <SecondaryButton label="Write a scene" icon={<PenLine color={colors.gold300} size={20} strokeWidth={1.75} />} onPress={onWrite} testID="scene-choose-goal" />
        </View>
      </Sheet>
    );
  }

  const photo = composer?.kind === "photo" ? composer.uri : null;
  const goal = composer?.kind === "goal";
  const ready = goal ? text.trim().length >= 2 : true;

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    if (photo) await onSavePhoto(photo, text, dreamId);
    else await onSaveGoal(text, dreamId);
    setBusy(false);
  };

  return (
    <Sheet
      visible={!!photo || goal}
      onClose={onClose}
      title={goal ? "Write a scene" : "Pin this photo"}
      subtitle={goal ? "Write it as already true." : undefined}
      scroll
      testID="scene-new"
      footer={
        <>
          <PrimaryButton label="Pin it" onPress={() => void save()} disabled={!ready} loading={busy} testID={goal ? "goal-save" : "scene-new-save"} />
          <GhostButton label="Not now" onPress={onClose} testID="scene-new-cancel" tone="muted" />
        </>
      }
    >
      {photo ? <Image source={{ uri: photo }} style={[styles.preview, { height: previewH }]} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
      {goal ? (
        <TextField
          voice="words"
          value={text}
          onChangeText={setText}
          placeholder="Our kitchen full of friends on a Sunday…"
          maxLength={GOAL_TEXT_MAX}
          showCount
          multiline
          autoFocus
          accessibilityLabel="The scene, in your words"
          testID="goal-input"
        />
      ) : (
        <TextField
          label="Caption"
          value={text}
          onChangeText={setText}
          placeholder="What this picture is about"
          maxLength={SCENE_CAPTION_MAX}
          showCount={text.length >= NEAR_LIMIT * SCENE_CAPTION_MAX}
          testID="scene-new-caption"
        />
      )}
      <AttachChips dreams={dreams} value={dreamId} onChange={setDreamId} />
    </Sheet>
  );
}

/* ------------------------------------------------------------- detail */

export interface SceneSheetProps {
  card: SceneCard | null;
  proof: Proof | null;
  dreams: readonly Dream[];
  onClose: () => void;
  onSave: (id: string, caption: string, dreamId: string | null) => Promise<void>;
  onRemove: (id: string) => void;
}

export function SceneSheet({ card, proof, dreams, onClose, onSave, onRemove }: SceneSheetProps) {
  const previewH = usePreviewHeight();
  const [text, setText] = useState("");
  const [dreamId, setDreamId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const id = card?.id ?? null;

  useEffect(() => {
    if (!card) return;
    setText(card.kind === "photo" ? card.caption : card.text);
    setDreamId(card.dreamId);
    setBusy(false);
    setRemoving(false);
    // Reset only when a different card opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    if (!card || busy) return;
    setBusy(true);
    await onSave(card.id, text, dreamId);
    setBusy(false);
  };

  return (
    <Sheet
      visible={!!card}
      onClose={onClose}
      scroll
      testID="scene-detail"
      footer={
        card ? (
          removing ? (
            // Confirmed in place: a second modal over this one is not reliable on iOS.
            <>
              <T variant="body" tone="secondary" center>
                {proof ? "Remove this photo from Scenes? The proof and its star stay." : "Remove this scene? It leaves Scenes, not your life."}
              </T>
              <DangerButton label="Remove" onPress={() => onRemove(card.id)} testID="scene-remove-confirm" />
              <GhostButton label="Keep it" onPress={() => setRemoving(false)} tone="muted" testID="scene-remove-cancel" />
            </>
          ) : (
            <>
              <PrimaryButton label="Done" onPress={() => void save()} loading={busy} testID="scene-save" />
              <GhostButton label="Remove from Scenes" onPress={() => setRemoving(true)} tone="danger" testID={`remove-${card.id}`} />
            </>
          )
        ) : null
      }
    >
      {card?.kind === "photo" ? (
        <View>
          <Image source={{ uri: card.uri }} style={[styles.preview, { height: previewH }]} resizeMode="cover" accessibilityIgnoresInvertColors />
          {proof ? (
            <View style={styles.proof} testID="scene-proof">
              <StarProof kind={proof.kind} size={16} />
              <T variant="caption" tone="muted" style={styles.flex}>
                {`From your proof of ${dayParts(proof.dateKey).long}`}
              </T>
            </View>
          ) : null}
        </View>
      ) : null}
      {card ? (
        card.kind === "photo" ? (
          <TextField
            label="Caption"
            value={text}
            onChangeText={setText}
            placeholder="What this picture is about"
            maxLength={SCENE_CAPTION_MAX}
            showCount={text.length >= NEAR_LIMIT * SCENE_CAPTION_MAX}
            testID="scene-caption"
          />
        ) : (
          <TextField
            label="Your scene"
            voice="words"
            value={text}
            onChangeText={setText}
            maxLength={GOAL_TEXT_MAX}
            showCount
            multiline
            testID="scene-caption"
          />
        )
      ) : null}
      <AttachChips dreams={dreams} value={dreamId} onChange={setDreamId} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  choose: { gap: space.md, marginTop: space.sm },
  preview: { width: "100%", borderRadius: radius.md, marginBottom: space.base, backgroundColor: colors.vellum },
  proof: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: -space.sm, marginBottom: space.base },
  attach: { gap: space.sm, marginTop: space.lg },
  flex: { flex: 1 },
});
