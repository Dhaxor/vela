// The reader's sheets: soundscape, voice & speed, sleep timer, the '…' menu,
// and the one notification ask at bridge commitment. Each is a plain <Sheet>
// with selectable vellum rows (selected = raised surface, gold border, check).
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GhostButton, PrimaryButton, Segmented, Sheet, T, VellumCard } from "@/components/ui";
import type { TextSize } from "@/contexts/user.types";
import {
  NARRATION_RATES,
  VOICE_DOWNLOAD_HINT,
  suggestsVoiceDownload,
  voiceDisplayName,
  voiceSubtitle,
  type BedId,
  type NarrationRate,
  type RankedVoice,
  type Soundscape,
} from "@/lib/audio";
import { colors, space } from "@/constants/theme";
import { SLEEP_CHOICES, rateLabel, type SleepChoice } from "./cues";
import { BedGlyph, LockGlyph, QuillGlyph, SilenceGlyph } from "./glyphs";

/* ------------------------------------------------------------------ */

export interface SoundscapeSheetProps {
  visible: boolean;
  onClose: () => void;
  beds: readonly Soundscape[];
  bedId: BedId;
  bedOn: boolean;
  isLocked: (id: BedId) => boolean;
  onPick: (id: BedId) => void;
  onSilence: () => void;
}

export function SoundscapeSheet({ visible, onClose, beds, bedId, bedOn, isLocked, onPick, onSilence }: SoundscapeSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Soundscape"
      subtitle="Original sound under the voice. It dips while a sentence is spoken."
      scroll
      testID="story-bed-sheet"
    >
      <View style={styles.list}>
        {beds.map((b) => {
          const locked = isLocked(b.id);
          const on = bedOn && bedId === b.id && !locked;
          return (
            <VellumCard
              key={b.id}
              selected={on}
              onPress={() => onPick(b.id)}
              padding="compact"
              testID={`story-bed-${b.id}`}
              accessibilityLabel={`${b.label}${locked ? ", Vela Plus" : ""}. ${b.blurb}`}
              accessibilityHint={locked ? "Opens Vela Plus" : undefined}
            >
              <View style={styles.row}>
                <BedGlyph size={20} color={on ? colors.gold300 : colors.ink64} />
                <View style={styles.flex}>
                  <View style={styles.titleRow}>
                    <T variant="body" strong tone={locked ? "secondary" : "primary"}>
                      {b.label}
                    </T>
                    {locked ? (
                      <View style={styles.plus}>
                        <LockGlyph size={12} />
                        <T variant="caption" strong tone="gold">
                          Plus
                        </T>
                      </View>
                    ) : null}
                  </View>
                  <T variant="caption" tone="muted">
                    {b.blurb}
                  </T>
                </View>
              </View>
            </VellumCard>
          );
        })}
        <VellumCard
          selected={!bedOn}
          onPress={onSilence}
          padding="compact"
          testID="story-bed-off"
          accessibilityLabel="Silence. Just the voice."
        >
          <View style={styles.row}>
            <SilenceGlyph size={20} color={!bedOn ? colors.gold300 : colors.ink64} />
            <View style={styles.flex}>
              <T variant="body" strong tone="primary">
                Silence
              </T>
              <T variant="caption" tone="muted">
                Just the voice.
              </T>
            </View>
          </View>
        </VellumCard>
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

export interface VoiceSheetProps {
  visible: boolean;
  onClose: () => void;
  voices: readonly RankedVoice[];
  selectedId: string | null;
  onPickVoice: (identifier: string) => void;
  rate: NarrationRate;
  onRate: (rate: NarrationRate) => void;
}

const RATE_OPTIONS = NARRATION_RATES.map((r) => ({
  value: r.toFixed(1),
  label: rateLabel(r),
  accessibilityLabel: `Speed ${r.toFixed(1)}`,
}));

/** How many ranked voices to offer: the best few, not the device's whole catalogue. */
const VOICE_LIMIT = 6;

export function VoiceSheet({ visible, onClose, voices, selectedId, onPickVoice, rate, onRate }: VoiceSheetProps) {
  const shown = voices.slice(0, VOICE_LIMIT);
  const hint =
    Platform.OS === "ios"
      ? VOICE_DOWNLOAD_HINT
      : Platform.OS === "web"
        ? "Voices come from this browser. Changes start with the next sentence."
        : null;
  const nudge = Platform.OS === "ios" && suggestsVoiceDownload(voices);
  return (
    <Sheet visible={visible} onClose={onClose} title="Voice & speed" scroll testID="story-voice-sheet">
      <View style={styles.section}>
        <T variant="eyebrow">Speed</T>
        <Segmented
          options={RATE_OPTIONS}
          value={rate.toFixed(1)}
          onChange={(v) => onRate(Number(v) as NarrationRate)}
          testID="story-rate"
          accessibilityLabel="Speed"
        />
      </View>
      <View style={styles.section}>
        <T variant="eyebrow">Voice</T>
        {shown.length === 0 ? (
          <T variant="body" tone="muted" testID="story-voice-empty">
            This device reads with its default voice.
          </T>
        ) : (
          <View style={styles.list}>
            {shown.map((v, i) => {
              const on = selectedId === v.identifier;
              return (
                <VellumCard
                  key={v.identifier}
                  selected={on}
                  onPress={() => onPickVoice(v.identifier)}
                  padding="compact"
                  testID={`story-voice-${i}`}
                  accessibilityLabel={`${voiceDisplayName(v)}, ${voiceSubtitle(v)}`}
                >
                  <T variant="body" strong tone="primary">
                    {voiceDisplayName(v)}
                  </T>
                  <T variant="caption" tone="muted">
                    {i === 0 ? `${voiceSubtitle(v)} · Best on this device` : voiceSubtitle(v)}
                  </T>
                </VellumCard>
              );
            })}
          </View>
        )}
        {hint ? (
          <T variant="caption" tone={nudge ? "secondary" : "muted"} style={styles.hint} testID="story-voice-hint">
            {hint}
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

export interface SleepSheetProps {
  visible: boolean;
  onClose: () => void;
  choice: SleepChoice;
  /** '18:20 left', or null when no minutes timer runs. */
  remaining: string | null;
  onPick: (choice: SleepChoice) => void;
}

export function SleepSheet({ visible, onClose, choice, remaining, onPick }: SleepSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Sleep timer"
      subtitle={remaining ? `The voice stops in ${remaining}. The soundscape fades with it.` : "The voice stops when it runs out, and the soundscape fades softly."}
      scroll
      testID="story-sleep-sheet"
    >
      <View style={styles.list}>
        {SLEEP_CHOICES.map((c) => (
          <VellumCard
            key={c.id}
            selected={choice === c.id}
            onPress={() => onPick(c.id)}
            padding="compact"
            testID={`story-sleep-${c.id}`}
            accessibilityLabel={`Sleep timer: ${c.label}`}
          >
            <T variant="body" tone={choice === c.id ? "primary" : "secondary"} strong={choice === c.id}>
              {c.label}
            </T>
          </VellumCard>
        ))}
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

export interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
  textSize: TextSize;
  onTextSize: (size: TextSize) => void;
  canRewrite: boolean;
  numeral: string;
  onRewrite: () => void;
}

const SIZE_OPTIONS = [
  { value: "S", label: "Small", accessibilityLabel: "Text size small" },
  { value: "M", label: "Medium", accessibilityLabel: "Text size medium" },
  { value: "L", label: "Large", accessibilityLabel: "Text size large" },
] as const;

export function MoreSheet({ visible, onClose, textSize, onTextSize, canRewrite, numeral, onRewrite }: MoreSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={`Chapter ${numeral}`} testID="story-more-sheet">
      <View style={styles.section}>
        <T variant="eyebrow">Text size</T>
        <Segmented options={SIZE_OPTIONS} value={textSize} onChange={onTextSize} testID="story-text-size" accessibilityLabel="Text size" />
        <T variant="reading" size={textSize} tone="muted" style={styles.sample}>
          The street is quiet, and the key turns.
        </T>
      </View>
      {canRewrite ? (
        <View style={styles.section}>
          <VellumCard
            onPress={onRewrite}
            padding="compact"
            testID="story-again"
            accessibilityLabel="Rewrite this chapter"
            accessibilityHint="Asks before writing new scenes"
          >
            <View style={styles.row}>
              <QuillGlyph size={20} color={colors.gold300} />
              <View style={styles.flex}>
                <T variant="body" strong tone="primary">
                  Rewrite this chapter
                </T>
                <T variant="caption" tone="muted">
                  New scenes. The same number, your woven proof and your bridge stay.
                </T>
              </View>
            </View>
          </VellumCard>
        </View>
      ) : (
        <T variant="caption" tone="faint" style={styles.section}>
          Earlier chapters are kept exactly as they were written.
        </T>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

export interface RemindSheetProps {
  visible: boolean;
  /** '9:00 AM' */
  time: string;
  bridgeText: string;
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}

export function RemindSheet({ visible, time, bridgeText, busy, onYes, onNo }: RemindSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onNo}
      title={`Remind you at ${time}?`}
      subtitle="One quiet notification, so the step doesn’t slip away."
      testID="story-remind-sheet"
      footer={
        <>
          <PrimaryButton label={`Remind me at ${time}`} onPress={onYes} loading={busy} testID="story-remind-yes" />
          <GhostButton label="Not now" tone="muted" onPress={onNo} testID="story-remind-no" />
        </>
      }
    >
      <VellumCard tone="bridge" padding="compact">
        <T variant="reading" italic tone="primary">
          {bridgeText}
        </T>
      </VellumCard>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  section: { gap: space.md, marginBottom: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingRight: space.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1, gap: space.xxs },
  plus: { flexDirection: "row", alignItems: "center", gap: space.xs },
  hint: { marginTop: space.sm },
  sample: { marginTop: space.xs },
});
