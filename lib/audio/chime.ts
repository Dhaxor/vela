// The Star Birth chime (S4): one second, fire and forget. It mixes with
// whatever is playing (the idle session never interrupts the user's audio)
// and releases its player when done. Never throws.

import { starBirthChimeAsset } from "./soundscapes";

/** Long enough for the 1 s chime to finish even if 'didJustFinish' never arrives. */
const RELEASE_AFTER_MS = 3000;

export function playStarBirthChime(volume = 1): void {
  try {
    const { createAudioPlayer } = require("expo-audio") as typeof import("expo-audio");
    const player = createAudioPlayer(starBirthChimeAsset());
    player.volume = Math.min(1, Math.max(0, volume));
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      subscription.remove();
      clearTimeout(timeout);
      player.remove();
    };
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) release();
    });
    const timeout = setTimeout(release, RELEASE_AFTER_MS);
    player.play();
  } catch {
    // no audio on this platform: the ceremony is visual first
  }
}
