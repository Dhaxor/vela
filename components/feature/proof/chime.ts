// The Star Birth chime plays only when Vela's audio is already on (ELEVATE
// §2.7): a narration or a soundscape is playing, e.g. a 'Not today' logged
// from the reader with the bed running. It never starts sound in a silent app.
import { Platform } from "react-native";
import { isAudioActive, playStarBirthChime } from "@/lib/audio";

export function audioIsActive(): boolean {
  try {
    if (isAudioActive()) return true;
    // Web: the reader's narration speaks through the Web Speech API.
    if (Platform.OS === "web" && typeof window !== "undefined") return window.speechSynthesis?.speaking === true;
  } catch {
    // fall through: silent
  }
  return false;
}

/** Soft chime at the landing, only if audio is already active. Never throws. */
export function chimeIfAudioActive(): void {
  if (audioIsActive()) playStarBirthChime(0.7);
}
