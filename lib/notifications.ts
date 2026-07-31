// Ritual reminders. The pure part — which hours a ritual choice means, and
// the copy each one carries — is tested; the scheduling seam is a thin
// wrapper over expo-notifications that no-ops off-iOS.

import type { RitualTime } from "@/contexts/UserContext";

export interface ReminderSpec {
  hour: number;
  minute: number;
  title: string;
  body: string;
}

/** Morning lands before the day starts; evening before wind-down. */
export function remindersFor(ritual: RitualTime): ReminderSpec[] {
  const morning: ReminderSpec = {
    hour: 8,
    minute: 0,
    title: "Your morning ritual is waiting",
    body: "Three quiet minutes inside the life you're calling in.",
  };
  const evening: ReminderSpec = {
    hour: 21,
    minute: 0,
    title: "Close the day inside your story",
    body: "One listen, one line, and the streak stays lit.",
  };
  if (ritual === "morning") return [morning];
  if (ritual === "evening") return [evening];
  return [morning, evening];
}

/**
 * Replace all scheduled ritual reminders with the given specs.
 * Returns true when scheduling actually happened (permission granted).
 */
export async function applyReminders(specs: ReminderSpec[]): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const s of specs) {
      await Notifications.scheduleNotificationAsync({
        content: { title: s.title, body: s.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: s.hour,
          minute: s.minute,
        },
      });
    }
    return true;
  } catch {
    return false; // web / simulator without permission — reminders just stay off
  }
}

export async function clearReminders(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing scheduled anywhere notifications don't exist
  }
}
