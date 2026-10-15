// Audio barrel — the ONLY import path for narration and soundscapes
// ("@/lib/audio"). Contract: lib/audio/types.ts.
//
// STUB — A5 replaces these no-op implementations with the real modules:
//   lib/audio/narration.ts   (pure: segmentChapter, queue state)   + tests
//   lib/audio/voices.ts      (pure: rankVoices)                    + tests
//   lib/audio/session.ts     (setAudioSession over expo-audio)     + tests
//   lib/audio/soundscapes.ts (asset map, useSoundscape over expo-audio)
//   lib/audio/useNarration.ts (expo-speech queue, onStart/onDone highlight)
// and re-exports them from here with the SAME names and signatures.
// Every stub is safe to call: nothing plays, nothing throws.

export * from "./types";

import type {
  NarrationController,
  RankVoices,
  SegmentChapter,
  SetAudioSession,
  SoundscapeController,
  UseNarration,
  UseSoundscape,
} from "./types";
import { DEFAULT_RATE } from "./types";

/** False once A5 lands the real implementation. Tests and the kitchen sink can check it. */
export const AUDIO_IS_STUB: boolean = true;

const noop = (): void => {};
const resolved = (): Promise<void> => Promise.resolve();

const IDLE_NARRATION: NarrationController = Object.freeze({
  status: "unavailable",
  sentences: [],
  current: null,
  progress: 0,
  estimatedTotalMs: 0,
  estimatedElapsedMs: 0,
  sleepRemainingMs: null,
  rate: DEFAULT_RATE,
  voice: null,
  voices: [],
  play: noop,
  pause: noop,
  resume: noop,
  stop: noop,
  seekToParagraph: noop,
  setRate: noop,
  setVoice: noop,
  setSleepTimer: noop,
});

const IDLE_SOUNDSCAPE: SoundscapeController = Object.freeze({
  bedId: null,
  status: "unavailable",
  start: resolved,
  stop: resolved,
  duck: noop,
  fadeOut: resolved,
});

/** STUB (A5). */
export const useNarration: UseNarration = () => IDLE_NARRATION;

/** STUB (A5). */
export const useSoundscape: UseSoundscape = () => IDLE_SOUNDSCAPE;

/** STUB (A5). */
export const segmentChapter: SegmentChapter = () => [];

/** STUB (A5). */
export const rankVoices: RankVoices = () => [];

/** STUB (A5). */
export const setAudioSession: SetAudioSession = resolved;
