// Haptic vocabulary (ELEVATE §2.6): selection on picks, light on a step, soft
// on a chapter reveal, success on a proof. No-ops on web and when unavailable.
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

function fire(run: () => Promise<void>): void {
  if (Platform.OS === "web") return;
  run().catch(() => {});
}

export const haptics = {
  select: () => fire(() => Haptics.selectionAsync()),
  step: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  reveal: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
