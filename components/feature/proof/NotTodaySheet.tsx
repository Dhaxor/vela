// NOT TODAY (ELEVATE §0.6, §3): the bridge didn't happen, and that is part of
// the story too. One honest line becomes a LEARNED star, the next chapter is
// woven from it and the next bridge gets smaller, so the loop never dead-ends.
//
// Exported for Today [B] (S2) and the reader (S3):
//
//   <NotTodaySheet visible={open} onClose={() => setOpen(false)} dreamId={id} />
//
// By default a save hands over to the Star Birth on /evidence/<id>?born=<proof>
// (the same ceremony a crossed bridge gets). Pass `onSaved` to take over.
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LIMITS, isArcError, type DreamId, type SaveProofResult } from "@/contexts/arc.types";
import { holdForCeremony, useArc } from "@/contexts/ArcContext";
import { Chip, GhostButton, PrimaryButton, Sheet, T, TextField, useToast } from "@/components/ui";
import { space } from "@/constants/theme";
import { starBirthHref } from "./routes";

/** Tap-in starts for the lesson (selection over typing; each stays editable). */
export const NOT_TODAY_STARTERS: readonly string[] = [
  "The day ran out before I did.",
  "It felt bigger than 15 minutes.",
  "Something else needed me first.",
  "I wasn't ready, and now I know why.",
];

export interface NotTodaySheetProps {
  visible: boolean;
  onClose: () => void;
  dreamId: DreamId;
  /** Called after the learned proof is saved. When given, the default hand-off to the Star Birth is skipped. */
  onSaved?: (result: SaveProofResult) => void;
  /** Controls are `${testID}-note`, `-starter-<i>`, `-save`, `-cancel`. */
  testID?: string;
}

/** The starters, with the tier the bridge actually had ('15 minutes' only when it was a 15-minute bridge). */
export function notTodayStarters(tier: string | null | undefined): string[] {
  return NOT_TODAY_STARTERS.map((s) => (s.includes("15 minutes") && tier !== "15min" ? "It felt bigger than I planned." : s));
}

export function NotTodaySheet({ visible, onClose, dreamId, onSaved, testID = "not-today" }: NotTodaySheetProps) {
  const arc = useArc();
  const router = useRouter();
  const toast = useToast();
  const bridge = arc.openBridge(dreamId);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  const save = async () => {
    const lesson = text.trim();
    if (!lesson || saving) return;
    setSaving(true);
    // Hold storage writes across the hand-off: the Star Birth screen takes its own hold as it mounts.
    const release = holdForCeremony();
    let handOff = false;
    try {
      const result = await arc.saveProofAndWeave({ dreamId, kind: "learned", text: lesson, origin: "not-today" });
      onClose();
      if (onSaved) onSaved(result);
      else {
        handOff = true;
        router.push(starBirthHref(dreamId, result.proof.id));
      }
    } catch (e) {
      const code = isArcError(e) ? e.code : null;
      toast.show({
        message:
          code === "no-open-bridge"
            ? "There's no open bridge to set down. Choose one at the end of your chapter."
            : code === "season-complete"
              ? "This season is already complete."
              : "That didn't save. Try once more.",
        tone: "error",
      });
    } finally {
      setSaving(false);
      if (handOff) setTimeout(release, 800);
      else release();
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Not today is still a step."
      subtitle="One honest line becomes a learned star, and tomorrow's bridge gets smaller."
      testID={testID}
      scroll
      footer={
        <>
          <PrimaryButton
            label="Keep it as a learned star"
            onPress={() => void save()}
            disabled={!text.trim()}
            loading={saving}
            testID={`${testID}-save`}
          />
          <GhostButton label="Close" onPress={onClose} testID={`${testID}-cancel`} />
        </>
      }
    >
      {bridge ? (
        <View style={styles.bridge}>
          <T variant="eyebrow" tone="violet">
            Today's bridge
          </T>
          <T variant="body" tone="secondary" numberOfLines={3}>
            {bridge.text}
          </T>
        </View>
      ) : null}
      <View style={styles.starters} accessibilityLabel="Ways to start">
        {notTodayStarters(bridge?.tier).map((s, i) => (
          <Chip key={s} label={s} selected={text.trim() === s} onPress={() => setText(s)} testID={`${testID}-starter-${i}`} />
        ))}
      </View>
      <TextField
        voice="words"
        multiline
        value={text}
        onChangeText={setText}
        placeholder="What got in the way, or what you noticed."
        maxLength={LIMITS.proofText}
        accessibilityLabel="What today taught you"
        testID={`${testID}-note`}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bridge: { gap: space.xs, marginBottom: space.lg },
  starters: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.base },
});
