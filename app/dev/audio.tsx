// Dev-only audio lab (/dev/audio): every bed, a narrated sample chapter with
// the live sentence highlight, the ranked voice list, speed and the sleep
// timer, plus a log of the callbacks the reader relies on. It exercises the
// real lib/audio hooks, so it doubles as the on-device check for background
// narration and bed ducking. Release builds redirect.
import React, { useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { Square } from "@/components/glyphs/icons";
import {
  ChipGroup,
  Dock,
  GhostButton,
  Header,
  IconButton,
  Press,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Segmented,
  T,
  VellumCard,
} from "@/components/ui";
import { daypartAt, paragraphsForDaypart, type Chapter, type Paragraph } from "@/contexts/arc.types";
import {
  DEFAULT_RATE,
  NARRATION_RATES,
  SOUNDSCAPES,
  VOICE_DOWNLOAD_HINT,
  formatDuration,
  playStarBirthChime,
  suggestsVoiceDownload,
  useNarration,
  useSoundscape,
  voiceDisplayName,
  voiceSubtitle,
  type BedId,
  type NarrationRate,
  type NarrationSentence,
  type SleepTimer,
} from "@/lib/audio";
import { now } from "@/lib/clock";
import { colors, radius, space } from "@/constants/theme";

export default function AudioLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

const NAME = "Maya";

function para(key: string, beat: Paragraph["beat"], text: string): Paragraph {
  const at = text.indexOf(NAME);
  return { key, fragmentId: `dev-${key}`, beat, text, spans: at < 0 ? [] : [{ kind: "name", start: at, end: at + NAME.length }] };
}

/** An original sample chapter: quotes, an ellipsis and the name, so segmentation and substitution show. */
const SAMPLE: Chapter = {
  id: "dev-audio",
  dreamId: "dev",
  season: 1,
  number: 2,
  stage: 2,
  title: "The Night Before",
  revision: 1,
  writtenAt: "2026-10-15T20:00:00.000Z",
  source: "engine",
  wovenProofId: null,
  opening: {
    morning: para("p0", "opening", "Morning comes in through the blinds, Maya. The kettle ticks as it warms, and the day has not asked anything of you yet."),
    evening: para("p0", "opening", "The house is quiet now, Maya. A lamp is on in the next room, and the day has finally set itself down."),
  },
  body: [
    para("p1", "weave", "You remember the afternoon you sent your portfolio to two studios. Nobody saw it, and it still counted."),
    para("p2", "living", "In this version of the evening, the studio keys hang on a hook by the door. You set your coat beside them… then you stand there a moment longer than you need to. “This is mine,” you say, to no one."),
  ],
  closing: {
    morning: para("p3", "closing", "Carry this into the day. One small step is waiting, and it is already yours."),
    evening: para("p3", "closing", "Rest. Tomorrow will ask one small thing of you, and you already know what it is."),
  },
  wordCount: { morning: 96, evening: 98 },
  engineVersion: 2,
};

type SleepChoice = "off" | "10" | "20" | "30" | "end";
const SLEEP: Record<SleepChoice, SleepTimer> = {
  off: { kind: "off" },
  "10": { kind: "minutes", minutes: 10 },
  "20": { kind: "minutes", minutes: 20 },
  "30": { kind: "minutes", minutes: 30 },
  end: { kind: "end-of-chapter" },
};
const SLEEP_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "10", label: "10 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "end", label: "End of chapter" },
] as const;
const RATE_OPTIONS = NARRATION_RATES.map((r) => ({ value: r.toFixed(1), label: `${r.toFixed(1)}×`, accessibilityLabel: `Speed ${r}` }));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <T variant="eyebrow">{title}</T>
      {children}
    </View>
  );
}

/** Paragraph text with the spoken sentence lit and the rest dimmed, as the reader does it. */
function Spoken({ paragraph, current, active }: { paragraph: Paragraph; current: NarrationSentence | null; active: boolean }) {
  if (!current) return <T variant="reading" tone={active ? "faint" : "primary"}>{paragraph.text}</T>;
  return (
    <T variant="reading" tone="faint">
      {paragraph.text.slice(0, current.start)}
      <T variant="reading" tone="primary">
        {paragraph.text.slice(current.start, current.end)}
      </T>
      {paragraph.text.slice(current.end)}
    </T>
  );
}

function Lab() {
  const daypart = daypartAt(now());
  const [bedId, setBedId] = useState<BedId>("night");
  const [rate, setRate] = useState<NarrationRate>(DEFAULT_RATE);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [sleep, setSleep] = useState<SleepChoice>("off");
  const [pronounce, setPronounce] = useState(true);
  const [events, setEvents] = useState<string[]>([]);
  const [utterances, setUtterances] = useState(0);
  const log = useCallback((line: string) => setEvents((list) => [line, ...list].slice(0, 6)), []);

  const bed = useSoundscape(bedId);
  const narration = useNarration(SAMPLE, {
    daypart,
    name: NAME,
    pronunciation: pronounce ? "Mah-yah" : null,
    rate,
    voiceId,
    sleepTimer: SLEEP[sleep],
    onHeard: () => log("onHeard · 60% heard"),
    onFinished: () => log("onFinished"),
    onSleepTimerEnd: () => {
      log("sleep timer ended · bed fading");
      void bed.fadeOut();
    },
    onSpeakingChange: (speaking) => {
      bed.duck(speaking);
      if (speaking) setUtterances((n) => n + 1);
    },
  });

  const paragraphs = useMemo(() => paragraphsForDaypart(SAMPLE, daypart), [daypart]);
  const { status, current, sentences } = narration;
  const active = status === "playing";
  const bedAudible = bed.status === "playing" || bed.status === "loading";
  const listenLabel = status === "playing" ? "Pause" : status === "paused" ? "Resume" : status === "finished" ? "Listen again" : "Listen";
  const onListen = () => (status === "playing" ? narration.pause() : status === "paused" ? narration.resume() : narration.play());

  return (
    <Screen
      variant="reader"
      testID="audio-lab"
      header={<Header title="Audio lab" testID="audio-header" />}
      dock={
        <Dock progress={narration.progress} testID="audio-dock">
          <View style={styles.dockRow}>
            <PrimaryButton
              label={listenLabel}
              onPress={onListen}
              disabled={status === "unavailable"}
              testID="audio-play"
              style={styles.flex}
            />
            <IconButton accessibilityLabel="Stop narration" onPress={narration.stop} testID="audio-stop" variant="vellum">
              <Square color={colors.ink80} size={18} strokeWidth={1.75} />
            </IconButton>
          </View>
        </Dock>
      }
    >
      <Section title="Narration">
        <T variant="caption" numeric testID="audio-narration-status">
          {`${status} · sentence ${current ? current.index + 1 : "–"} of ${sentences.length} · ${formatDuration(narration.estimatedElapsedMs)} / ${formatDuration(narration.estimatedTotalMs)} · ${daypart}`}
        </T>
        {paragraphs.map((paragraph, i) => (
          <Press
            key={paragraph.key}
            onPress={() => narration.seekToParagraph(i)}
            accessibilityLabel={`Listen from paragraph ${i + 1}`}
            testID={`audio-paragraph-${i}`}
          >
            <Spoken paragraph={paragraph} current={current?.paragraphIndex === i ? current : null} active={active} />
          </Press>
        ))}
        <T variant="caption" tone="faint" testID="audio-tts-text">
          {current ? `Spoken as: ${current.ttsText}` : "Tap a paragraph to listen from there."}
        </T>
        <SecondaryButton
          label={pronounce ? "Name: say “Mah-yah”" : "Name: say it as written"}
          onPress={() => setPronounce((p) => !p)}
          testID="audio-pronounce"
        />
      </Section>

      <Section title="Speed">
        <Segmented
          options={RATE_OPTIONS}
          value={rate.toFixed(1)}
          onChange={(v) => setRate(Number(v) as NarrationRate)}
          testID="audio-rate"
          accessibilityLabel="Speed"
        />
      </Section>

      <Section title="Sleep timer">
        <ChipGroup options={SLEEP_OPTIONS} value={sleep} onChange={setSleep} testIDPrefix="audio-sleep-" accessibilityLabel="Sleep timer" />
        <T variant="caption" numeric testID="audio-sleep-remaining">
          {narration.sleepRemainingMs === null ? (sleep === "end" ? "Ends with the chapter" : "No timer") : `${formatDuration(narration.sleepRemainingMs)} left`}
        </T>
      </Section>

      <Section title="Soundscape">
        <T variant="caption" testID="audio-bed-status">{`${bed.bedId ?? "none"} · ${bed.status}`}</T>
        {SOUNDSCAPES.map((s) => (
          <VellumCard
            key={s.id}
            selected={s.id === bedId}
            onPress={() => setBedId(s.id)}
            padding="compact"
            testID={`audio-bed-${s.id}`}
            accessibilityLabel={`${s.label}${s.plus ? ", Plus" : ""}`}
          >
            <View style={styles.between}>
              <T variant="body" strong tone="primary">
                {s.label}
              </T>
              {s.plus && s.id !== bedId ? <T variant="eyebrow" tone="gold">Plus</T> : null}
            </View>
            <T variant="caption">{s.blurb}</T>
          </VellumCard>
        ))}
        <View style={styles.row}>
          <SecondaryButton
            label={bedAudible ? "Stop bed" : "Start bed"}
            onPress={() => void (bedAudible ? bed.stop() : bed.start())}
            testID="audio-bed-toggle"
            style={styles.flex}
          />
          <GhostButton label="Fade out 3 s" onPress={() => void bed.fadeOut(3000)} testID="audio-bed-fade" />
        </View>
        <GhostButton label="Play the Star Birth chime" onPress={() => playStarBirthChime()} testID="audio-chime" />
      </Section>

      <Section title={`Voice · ${narration.voices.length} found`}>
        <T variant="caption" testID="audio-voice-current">
          {narration.voice ? `${voiceDisplayName(narration.voice)} · ${voiceSubtitle(narration.voice)}` : "System default voice"}
        </T>
        {narration.voices.slice(0, 8).map((v, i) => (
          <VellumCard
            key={v.identifier}
            selected={narration.voice?.identifier === v.identifier}
            onPress={() => setVoiceId(v.identifier)}
            padding="compact"
            testID={`audio-voice-${i}`}
            accessibilityLabel={`${voiceDisplayName(v)}, ${voiceSubtitle(v)}`}
          >
            <T variant="body" tone="primary">
              {voiceDisplayName(v)}
            </T>
            <T variant="caption">{voiceSubtitle(v)}</T>
          </VellumCard>
        ))}
        {Platform.OS === "ios" && suggestsVoiceDownload(narration.voices) ? (
          <T variant="caption" tone="muted">
            {VOICE_DOWNLOAD_HINT}
          </T>
        ) : null}
      </Section>

      <Section title="Callbacks">
        <T variant="caption" numeric testID="audio-utterances">{`${utterances} utterances started (each ducks the bed)`}</T>
        <View style={styles.log} testID="audio-events">
          {events.length === 0 ? (
            <T variant="caption" tone="faint">Nothing yet. Press Listen.</T>
          ) : (
            events.map((line, i) => (
              <T key={`${i}-${line}`} variant="caption" tone={i === 0 ? "secondary" : "faint"}>
                {line}
              </T>
            ))
          )}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.base, marginBottom: space.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  dockRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  flex: { flex: 1 },
  log: { gap: space.xs, padding: space.base, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline },
});
