// Audio session (R5): the only place the audio mode is set.
//
// The effective mode is 'chapter' while anything holds a chapter claim
// (useNarration while it speaks, useSoundscape while a bed plays), otherwise
// whatever setAudioSession() last asked for. So narration keeps running
// with the screen locked and the mute switch on, and the bed fading out after
// narration ends is not cut off by a premature switch back to 'idle'.
//
// 'chapter' = doNotMix (a focused listen pauses the user's podcast) +
// background playback + plays in silent mode. 'idle' = mixWithOthers, never
// interrupting the user's own audio.

import { AUDIO_SESSION, type AudioSessionConfig, type AudioSessionMode, type SetAudioSession } from "./types";

export type ApplyAudioMode = (config: AudioSessionConfig) => Promise<void>;

export interface AudioSession {
  /** Sets the base mode (A1: 'idle' at startup). Resolves once applied. Never rejects. */
  set(mode: AudioSessionMode): Promise<void>;
  /** Holds 'chapter' until the returned release() is called (idempotent). */
  claim(): () => void;
  /** Mode the platform last accepted, null before the first success. */
  applied(): AudioSessionMode | null;
  /** True while any claim is held (narration speaking or a bed playing). */
  active(): boolean;
  /** Resolves when every requested change has been attempted. */
  settled(): Promise<void>;
}

/** Serialises mode changes, skips no-ops and survives a failing platform call (it retries on the next change). */
export function createAudioSession(apply: ApplyAudioMode): AudioSession {
  let base: AudioSessionMode = "idle";
  let claims = 0;
  let applied: AudioSessionMode | null = null;
  let chain: Promise<void> = Promise.resolve();

  const sync = (): Promise<void> => {
    chain = chain.then(async () => {
      const want: AudioSessionMode = claims > 0 ? "chapter" : base;
      if (want === applied) return;
      try {
        await apply(AUDIO_SESSION[want]);
        applied = want;
      } catch {
        applied = null; // unknown platform state: re-apply next time
      }
    });
    return chain;
  };

  return {
    set(mode) {
      base = mode;
      return sync();
    },
    claim() {
      claims += 1;
      void sync();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        claims -= 1;
        void sync();
      };
    },
    applied: () => applied,
    active: () => claims > 0,
    settled: () => chain,
  };
}

const session = createAudioSession(async (config) => {
  const { setAudioModeAsync } = require("expo-audio") as typeof import("expo-audio");
  await setAudioModeAsync({ ...config });
});

/** Contract SetAudioSession: applies AUDIO_SESSION[mode] via expo-audio. Idempotent, never throws. */
export const setAudioSession: SetAudioSession = (mode) => session.set(mode);

/** Hold the chapter session while our audio plays. Call the returned function to release. */
export const claimChapterSession = (): (() => void) => session.claim();

/** True while Vela's own audio plays (a chapter session is claimed). The Star Birth chime only joins audio already on. */
export const isAudioActive = (): boolean => session.active();
