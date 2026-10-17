// Listening > Voice. The ranked voices (premium > enhanced > compact, ranked
// by identifier in lib/audio), each by its real name. The download hint is
// plain text and shows only on iOS when the best voice is compact (no
// App-Prefs URL: ELEVATE §8).
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { VOICE_DOWNLOAD_HINT, suggestsVoiceDownload, voiceDisplayName, voiceSubtitle, type RankedVoice } from "@/lib/audio";
import { GhostButton, Sheet, T, VellumCard } from "@/components/ui";
import { space } from "@/constants/theme";

/** The best few voices, not the device's whole catalogue. */
const VOICE_LIMIT = 6;

export interface VoiceSheetProps {
  visible: boolean;
  voices: readonly RankedVoice[];
  /** The voice in use (the saved one, or the best ranked). */
  selectedId: string | null;
  onPick: (identifier: string) => void;
  onClose: () => void;
}

export function VoiceSheet({ visible, voices, selectedId, onPick, onClose }: VoiceSheetProps) {
  // Chapters are written in English: offer English voices when there are any.
  const english = voices.filter((v) => v.language.toLowerCase().startsWith("en"));
  const shown = (english.length > 0 ? english : voices).slice(0, VOICE_LIMIT);
  const nudge = Platform.OS === "ios" && suggestsVoiceDownload(voices);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Voice"
      subtitle={Platform.OS === "web" ? "Voices come from this browser." : "Voices installed on this iPhone. The best one is first."}
      scroll
      testID="settings-voice-sheet"
      footer={<GhostButton label="Done" tone="muted" onPress={onClose} testID="settings-voice-done" />}
    >
      {shown.length === 0 ? (
        <T variant="body" tone="muted" testID="settings-voice-empty">
          This device reads with its default voice.
        </T>
      ) : (
        <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Voices">
          {shown.map((v, i) => (
            <VellumCard
              key={v.identifier}
              padding="compact"
              selected={v.identifier === selectedId}
              onPress={() => onPick(v.identifier)}
              testID={`settings-voice-${i}`}
              accessibilityLabel={`${voiceDisplayName(v)}, ${voiceSubtitle(v)}`}
            >
              <T variant="body" strong tone="primary">
                {voiceDisplayName(v)}
              </T>
              <T variant="caption" tone="muted">
                {i === 0 ? `${voiceSubtitle(v)} · Best on this device` : voiceSubtitle(v)}
              </T>
            </VellumCard>
          ))}
        </View>
      )}
      {nudge ? (
        <T variant="caption" tone="secondary" style={styles.hint} testID="settings-voice-hint">
          {VOICE_DOWNLOAD_HINT}
        </T>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  hint: { marginTop: space.base },
});
