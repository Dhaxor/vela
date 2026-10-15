// NARRATION + SOUNDSCAPE API. FROZEN CONTRACT.
//
// Steward/owner: A5 (lib/audio/**, scripts/gen_soundscapes.py, assets/audio/**).
// Consumers: S3 reader (Phase 2), A1 root layout (session), S7 settings.
// Changes are additive only and are logged in docs/CONTRACTS.md §Changelog.
//
// Binding rules (docs/CONTRACTS.md §9, from the spec's critique):
// R1 ONE native queue. play() hands the whole remaining chapter to expo-speech
//    as per-sentence utterances in one go (Speech.speak queues natively). No JS
//    timers between sentences or paragraphs: punctuation provides the pauses.
// R2 Highlighting is driven ONLY by each utterance's onStart/onDone. Never by
//    onBoundary, never by timers (both are unreliable on iOS 26 and Chrome).
// R3 Voices are ranked by IDENTIFIER substring (premium > enhanced > compact),
//    because expo-speech reports iOS Premium voices as quality 'Default'. Show
//    the real voice name. Download help is plain text (VOICE_DOWNLOAD_HINT);
//    never an App-Prefs: URL.
// R4 The name pronunciation is substituted into TTS text only (via 'name' spans),
//    never into the displayed text.
// R5 Audio session: 'doNotMix' + background while a chapter session plays;
//    configured only through setAudioSession() (lib/audio/session.ts, tested).
// R6 The bed ducks under speech and fades out with the sleep timer. Beds play
//    only inside the reader. No lock-screen Now Playing in 1.1.

import type { Chapter } from "@/contexts/arc.types";
import type { Daypart } from "@/lib/story/content/types";

/* =========================================================================
 * Soundscape beds
 * ========================================================================= */

export type BedId = "night" | "rain" | "hearth" | "dawn";
export const BED_IDS: readonly BedId[] = ["night", "rain", "hearth", "dawn"];

export interface BedInfo {
  readonly id: BedId;
  readonly label: string;
  /** Plus-only bed. Free: 'night'. */
  readonly plus: boolean;
  /** File name under assets/audio/ produced by scripts/gen_soundscapes.py (AAC .m4a, 90–120 s, sample-exact loop). */
  readonly file: string;
}

/**
 * Catalogue metadata only. The require() asset map lives in
 * lib/audio/soundscapes.ts (A5) and is added once the files exist, so a missing
 * asset can never break the Metro bundle.
 */
export const BEDS: Readonly<Record<BedId, BedInfo>> = {
  night: { id: "night", label: "Night", plus: false, file: "night.m4a" },
  rain: { id: "rain", label: "Rain on Glass", plus: true, file: "rain-on-glass.m4a" },
  hearth: { id: "hearth", label: "Hearth", plus: true, file: "hearth.m4a" },
  dawn: { id: "dawn", label: "Dawn", plus: true, file: "dawn.m4a" },
};

export const FREE_BEDS: readonly BedId[] = ["night"];
export const DEFAULT_BED: BedId = "night";

/** Bed volume levels (0..1). */
export const BED_LEVELS = { full: 1, gap: 0.6, underSpeech: 0.35 } as const;
/** Fade timings (ms). */
export const BED_FADES = { start: 1500, duck: 250, sleepTimer: 30_000, stop: 800 } as const;

export type SoundscapeStatus = "idle" | "loading" | "playing" | "fading" | "stopped" | "locked" | "unavailable";

export interface SoundscapeOptions {
  /** Plus gate result from PlusContext.canUseBed. When true, start() resolves without playing and status is 'locked'. */
  readonly locked?: boolean;
  /** Base volume, default BED_LEVELS.full. */
  readonly volume?: number;
}

export interface SoundscapeController {
  readonly bedId: BedId | null;
  readonly status: SoundscapeStatus;
  /** Loads (if needed) and fades in, looping. Never throws. */
  start(): Promise<void>;
  /** Fades out (BED_FADES.stop) and releases the player. Never throws. */
  stop(): Promise<void>;
  /** true → BED_LEVELS.underSpeech; false → BED_LEVELS.gap. Narration calls it per utterance. */
  duck(ducked: boolean): void;
  /** Fade to silence over ms (default BED_FADES.sleepTimer), then stop. */
  fadeOut(ms?: number): Promise<void>;
}

/** Hook signature: bedId null = no bed. Switching bedId crossfades. Unmount stops. */
export type UseSoundscape = (bedId: BedId | null, opts?: SoundscapeOptions) => SoundscapeController;

/* =========================================================================
 * Voices
 * ========================================================================= */

export type VoiceQuality = "premium" | "enhanced" | "compact" | "default";

export interface RankedVoice {
  readonly identifier: string;
  /** Real voice name as reported ('Ava'). Shown in the Voice sheet. */
  readonly name: string;
  /** BCP-47 ('en-US'). */
  readonly language: string;
  /** From the identifier substring, not from expo-speech's quality field (R3). */
  readonly quality: VoiceQuality;
  /** Higher is better; sort descending. */
  readonly score: number;
}

/** Minimal shape of expo-speech's Voice, so ranking stays pure and bun-testable. */
export interface VoiceLike {
  readonly identifier: string;
  readonly name: string;
  readonly language: string;
  readonly quality?: string;
}

/** Pure (lib/audio/voices.ts): English voices first (preferred language prefix), then quality, then name. */
export type RankVoices = (voices: readonly VoiceLike[], preferredLanguage?: string) => RankedVoice[];

export const VOICE_DOWNLOAD_HINT =
  "For a richer voice, open Settings, then Accessibility, then Spoken Content, then Voices, and download an Enhanced or Premium English voice.";

/* =========================================================================
 * Narration
 * ========================================================================= */

export type NarrationRate = 0.8 | 0.9 | 1.0;
export const NARRATION_RATES: readonly NarrationRate[] = [0.8, 0.9, 1.0];
export const DEFAULT_RATE: NarrationRate = 0.9;

export type SleepTimer =
  | { readonly kind: "off" }
  | { readonly kind: "minutes"; readonly minutes: 10 | 20 | 30 }
  | { readonly kind: "end-of-chapter" };

/** Fraction of sentences that counts as 'heard' (→ ArcValue.markHeard). */
export const HEARD_THRESHOLD = 0.6;

/** One utterance. Offsets index into the displayed Paragraph.text of the chosen daypart. */
export interface NarrationSentence {
  /** 0-based across the whole chapter (the queue position). */
  readonly index: number;
  /** Index into paragraphsForDaypart(chapter, daypart). */
  readonly paragraphIndex: number;
  /** 0-based within its paragraph. */
  readonly sentenceInParagraph: number;
  /** UTF-16 [start, end) in the paragraph's text. The reader dims everything else to 55%. */
  readonly start: number;
  readonly end: number;
  /** Displayed text of the sentence. */
  readonly text: string;
  /** What is actually spoken: pronunciation substituted into 'name' spans (R4). */
  readonly ttsText: string;
  readonly wordCount: number;
}

/** Pure (lib/audio/narration.ts): segment the chosen daypart's paragraphs into sentences. */
export type SegmentChapter = (
  chapter: Chapter,
  daypart: Daypart,
  opts?: { readonly name?: string; readonly pronunciation?: string | null }
) => NarrationSentence[];

export type NarrationStatus = "idle" | "playing" | "paused" | "finished" | "unavailable";

export interface NarrationOptions {
  readonly daypart: Daypart;
  readonly name?: string;
  readonly pronunciation?: string | null;
  readonly rate: NarrationRate;
  /** RankedVoice.identifier; null = best ranked voice. */
  readonly voiceId: string | null;
  readonly sleepTimer?: SleepTimer;
  /** Fired once when HEARD_THRESHOLD of sentences have finished. Reader calls arc.markHeard. */
  readonly onHeard?: () => void;
  /** Fired when the last utterance finishes (not on stop()). */
  readonly onFinished?: () => void;
  /** Fired when the sleep timer ends playback; the reader fades the bed with it. */
  readonly onSleepTimerEnd?: () => void;
  /**
   * Additive (A5): true on each utterance's onStart, false on its onDone and on
   * pause/stop. Pass the bed's duck: `onSpeakingChange: bed.duck` (R6). The
   * bed holds 'underSpeech' through the short gaps between sentences.
   */
  readonly onSpeakingChange?: (speaking: boolean) => void;
}

export interface NarrationController {
  readonly status: NarrationStatus;
  /** The segmented queue for the current chapter + daypart. */
  readonly sentences: readonly NarrationSentence[];
  /** Sentence being spoken (set on its onStart), or null. */
  readonly current: NarrationSentence | null;
  /** 0..1 by finished sentences (drives the horizon progress line). */
  readonly progress: number;
  /** Word-count estimate at the current rate, for 'Listening · 2:41'. */
  readonly estimatedTotalMs: number;
  readonly estimatedElapsedMs: number;
  /** Remaining sleep time, or null when the timer is off / end-of-chapter. */
  readonly sleepRemainingMs: number | null;
  readonly rate: NarrationRate;
  readonly voice: RankedVoice | null;
  /** Ranked voices for the Voice sheet ([] until loaded or on platforms without voices). */
  readonly voices: readonly RankedVoice[];
  /** Enqueue every sentence from `fromIndex` (default: current or 0) in ONE go (R1). */
  play(fromIndex?: number): void;
  /** Stops the native queue and remembers the position. */
  pause(): void;
  /** Re-enqueues from the remembered sentence. */
  resume(): void;
  /** Stops and resets to the start. Never fires onFinished. */
  stop(): void;
  /** Jump to the first sentence of a paragraph (tap-to-listen-from-here). */
  seekToParagraph(paragraphIndex: number): void;
  /** Takes effect from the next sentence (re-enqueues the remainder). */
  setRate(rate: NarrationRate): void;
  setVoice(identifier: string | null): void;
  setSleepTimer(timer: SleepTimer): void;
}

/** Hook signature. chapter null = idle controller. Changing chapter or daypart stops and re-segments. */
export type UseNarration = (chapter: Chapter | null, opts: NarrationOptions) => NarrationController;

/* =========================================================================
 * Audio session (lib/audio/session.ts, tested)
 * ========================================================================= */

export type AudioSessionMode = "idle" | "chapter";

/** Mirrors the subset of expo-audio's AudioMode we set. */
export interface AudioSessionConfig {
  readonly playsInSilentMode: boolean;
  readonly shouldPlayInBackground: boolean;
  readonly interruptionMode: "mixWithOthers" | "doNotMix" | "duckOthers";
  readonly allowsRecording: false;
}

export const AUDIO_SESSION: Readonly<Record<AudioSessionMode, AudioSessionConfig>> = {
  /** App open, nothing of ours playing: never interrupt the user's own audio. */
  idle: { playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "mixWithOthers", allowsRecording: false },
  /** A chapter session (narration and/or bed) is playing: a focused listen. */
  chapter: { playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix", allowsRecording: false },
};

/** Applies AUDIO_SESSION[mode] via expo-audio setAudioModeAsync. Idempotent, never throws. A1 calls 'idle' at startup; the reader switches to 'chapter'. */
export type SetAudioSession = (mode: AudioSessionMode) => Promise<void>;
