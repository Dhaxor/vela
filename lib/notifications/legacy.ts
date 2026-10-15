// LEGACY 1.0 ritual reminders (moved from lib/notifications.ts so the new
// lib/notifications/ folder can own the "@/lib/notifications" path; the
// evening copy lost its streak framing, ELEVATE P8).
// Re-exported unchanged from ./index.ts so the 1.0 app/settings.tsx keeps
// working. A6 deletes this file once no 1.0 screen imports
// remindersFor/applyReminders/clearReminders. Its
// cancelAllScheduledNotificationsAsync() also wipes the v2 rolling queue, so
// both calls end with requestRebuild(): the v2 rebuild always runs after them,
// and once the user has a weaving dream it supersedes these DAILY reminders.
//
// Ritual reminders. The pure part — which hours a ritual choice means, and
// the copy each one carries — is tested; the scheduling seam is a thin
// wrapper over expo-notifications that no-ops off-iOS.

import type { RitualTime } from "@/contexts/user.types";
import { requestRebuild } from "./bus";

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
    body: "One listen and one quiet line before you rest.",
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
  } finally {
    requestRebuild();
  }
}

export async function clearReminders(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing scheduled anywhere notifications don't exist
  } finally {
    requestRebuild();
  }
}
