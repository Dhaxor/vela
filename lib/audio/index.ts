// Audio barrel: the ONLY import path for narration and soundscapes
// ("@/lib/audio"). Contract: lib/audio/types.ts.
//
// Safe to import anywhere, bun tests included: nothing here loads expo-speech,
// expo-audio, react-native or an .m4a until a hook or player actually runs.

export * from "./types";

export {
  estimateRangeMs,
  firstSentenceOfParagraph,
  formatDuration,
  segmentChapter,
  splitSentences,
} from "./narration";
export { pickVoice, rankVoices, suggestsVoiceDownload, voiceDisplayName, voiceSubtitle } from "./voices";
export { claimChapterSession, isAudioActive, setAudioSession } from "./session";
export {
  SOUNDSCAPES,
  SUGGESTED_BEDS,
  isBedLocked,
  resolveBed,
  suggestedBed,
  type Soundscape,
} from "./soundscapes";
export { useNarration } from "./useNarration";
export { useSoundscape } from "./useSoundscape";
export { playStarBirthChime } from "./chime";

/** False: the real implementation has landed. */
export const AUDIO_IS_STUB: boolean = false;
