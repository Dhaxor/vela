// The expo-notifications seam (N2, N3, N5, N6). Everything native sits behind
// NotificationScheduler, so rebuild() is tested with an in-memory fake. The
// native modules are required lazily inside functions (CONTRACTS §0.7), and on
// web every call is a safe no-op: there is no scheduler at all.

import { now as clockNow } from "@/lib/clock";
import type { NotificationLibrary } from "@/lib/story/content/types";
import { localDateKey } from "@/lib/progress";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { requestRebuild } from "./bus";
import { planQueue } from "./schedule";
import {
  emptyTemplateHistory,
  ID_PREFIX,
  type NotificationSnapshot,
  type PendingTemplate,
  type PermissionState,
  type PlannedNotification,
  type RebuildResult,
  type TemplateHistory,
} from "./types";

/** A notification already pending in the OS. */
export interface ScheduledRef {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly url: string | null;
  /** Repeating trigger: only the 1.0 daily reminders ever used one. */
  readonly repeats: boolean;
}

export interface NotificationScheduler {
  permission(): Promise<PermissionState>;
  /** Shows the OS prompt when undetermined. */
  request(): Promise<PermissionState>;
  pending(): Promise<readonly ScheduledRef[]>;
  cancel(id: string): Promise<void>;
  schedule(notification: PlannedNotification): Promise<void>;
}

export interface RebuildDeps {
  /** null where notifications do not exist (web). */
  readonly scheduler: NotificationScheduler | null;
  loadHistory(): Promise<TemplateHistory>;
  saveHistory(history: TemplateHistory): Promise<void>;
  now(): Date;
  /** Copy override for tests; defaults to lib/content/notifications. */
  readonly library?: NotificationLibrary;
}

/* =========================================================================
 * Pure helpers
 * ========================================================================= */

const REPEATING_TYPES = new Set(["daily", "weekly", "monthly", "yearly"]);

/** True for a trigger that repeats (the 1.0 DAILY reminders), as either platform reports it. */
export function isRepeatingTrigger(trigger: unknown): boolean {
  if (typeof trigger !== "object" || trigger === null) return false;
  const t = trigger as { type?: unknown; repeats?: unknown };
  return t.repeats === true || (typeof t.type === "string" && REPEATING_TYPES.has(t.type));
}

/** expo-notifications permission response → PermissionState. Provisional and ephemeral iOS grants deliver, so they count. */
export function permissionFromResponse(response: unknown): PermissionState {
  if (typeof response !== "object" || response === null) return "unavailable";
  const r = response as { granted?: unknown; status?: unknown; ios?: { status?: unknown } };
  if (r.granted === true) return "granted";
  if (r.ios?.status === 2 || r.ios?.status === 3 || r.ios?.status === 4) return "granted";
  if (r.status === "denied") return "denied";
  return "undetermined";
}

function isPendingTemplate(value: unknown): value is PendingTemplate {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.slot === "string" &&
    typeof p.templateId === "string" &&
    typeof p.fireAt === "string" &&
    (p.spell === undefined || typeof p.spell === "string")
  );
}

/** Lenient parse of the stored rotation memory (object or JSON string). */
export function parseTemplateHistory(raw: unknown): TemplateHistory {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return emptyTemplateHistory();
    }
  }
  if (typeof value !== "object" || value === null) return emptyTemplateHistory();
  const v = value as { used?: unknown; pending?: unknown; quietSpell?: unknown };
  const used: Record<string, string[]> = {};
  if (typeof v.used === "object" && v.used !== null) {
    for (const [slot, ids] of Object.entries(v.used as Record<string, unknown>)) {
      if (Array.isArray(ids)) used[slot] = ids.filter((id): id is string => typeof id === "string");
    }
  }
  return {
    version: 1,
    used,
    pending: Array.isArray(v.pending) ? v.pending.filter(isPendingTemplate) : [],
    quietSpell: typeof v.quietSpell === "string" ? v.quietSpell : null,
  };
}

function toPending(n: PlannedNotification, plan: readonly PendingTemplate[]): PendingTemplate {
  return plan.find((p) => p.id === n.id) ?? { id: n.id, slot: n.slot, templateId: n.templateId, fireAt: n.fireAt };
}

/* =========================================================================
 * rebuild
 * ========================================================================= */

const FAILED: RebuildResult = { permission: "unavailable", scheduled: 0, cancelled: 0, skipped: "unavailable", planned: [] };

/**
 * Cancel our stale identifiers and schedule the plan (N2, N3). Notifications
 * already pending with identical copy are kept, so an unchanged plan costs no
 * native writes. The 1.0 repeating reminders are cancelled once the v2 queue
 * owns reminders (the user has a weaving dream, or turned reminders off), so
 * nobody updating from 1.0 keeps a daily 'the streak stays lit'.
 */
export async function rebuildWith(snapshot: NotificationSnapshot, deps: RebuildDeps): Promise<RebuildResult> {
  try {
    const now = deps.now();
    let history = emptyTemplateHistory();
    try {
      history = await deps.loadHistory();
    } catch {
      // unreadable history only costs rotation memory
    }
    const plan = planQueue(snapshot, now, history, deps.library);
    const scheduler = deps.scheduler;
    if (!scheduler) return { ...FAILED, planned: plan.planned };

    const permission = await scheduler.permission();
    const skipped: RebuildResult["skipped"] = !snapshot.enabled
      ? "disabled"
      : permission !== "granted"
        ? "no-permission"
        : plan.planned.length === 0 && snapshot.pausedUntil !== null && localDateKey(now) <= snapshot.pausedUntil
          ? "paused"
          : undefined;
    const target = skipped ? [] : plan.planned;

    const existing = await scheduler.pending();
    const wanted = new Map(target.map((n) => [n.id, n]));
    const ours = existing.filter((n) => n.id.startsWith(ID_PREFIX));
    const kept = new Set(
      ours
        .filter((n) => {
          const w = wanted.get(n.id);
          return w !== undefined && w.title === n.title && w.body === n.body && w.url === n.url;
        })
        .map((n) => n.id)
    );
    const v2OwnsReminders = !snapshot.enabled || snapshot.dreams.length > 0;
    const toCancel = [
      ...ours.filter((n) => !kept.has(n.id)),
      ...(v2OwnsReminders ? existing.filter((n) => !n.id.startsWith(ID_PREFIX) && n.repeats) : []),
    ];

    let cancelled = 0;
    for (const n of toCancel) {
      try {
        await scheduler.cancel(n.id);
        cancelled += 1;
      } catch {
        // already gone
      }
    }
    let scheduled = 0;
    const live: PlannedNotification[] = [];
    for (const n of target) {
      if (kept.has(n.id)) {
        live.push(n);
        continue;
      }
      try {
        await scheduler.schedule(n);
        scheduled += 1;
        live.push(n);
      } catch {
        // one bad trigger never blocks the rest
      }
    }

    const pending = live.map((n) => toPending(n, plan.history.pending ?? []));
    try {
      await deps.saveHistory({ ...plan.history, pending });
    } catch {
      // rotation memory is best effort
    }
    return { permission, scheduled, cancelled, kept: kept.size, planned: plan.planned, ...(skipped ? { skipped } : {}) };
  } catch {
    return FAILED;
  }
}

/* =========================================================================
 * Native seam
 * ========================================================================= */

type ExpoNotifications = typeof import("expo-notifications");

function isWeb(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("react-native") as typeof import("react-native")).Platform.OS === "web";
  } catch {
    return true;
  }
}

/** expo-notifications, or null on web and anywhere it cannot load. */
export function expoNotifications(): ExpoNotifications | null {
  if (isWeb()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as ExpoNotifications;
  } catch {
    return null;
  }
}

export function nativeScheduler(): NotificationScheduler | null {
  const N = expoNotifications();
  if (!N) return null;
  return {
    permission: async () => permissionFromResponse(await N.getPermissionsAsync()),
    request: async () =>
      permissionFromResponse(
        await N.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })
      ),
    pending: async () =>
      (await N.getAllScheduledNotificationsAsync()).map((r) => {
        const url = (r.content.data as { url?: unknown } | null)?.url;
        return {
          id: r.identifier,
          title: r.content.title ?? "",
          body: r.content.body ?? "",
          url: typeof url === "string" ? url : null,
          repeats: isRepeatingTrigger(r.trigger),
        };
      }),
    cancel: (id) => N.cancelScheduledNotificationAsync(id),
    schedule: async (n) => {
      await N.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          data: { url: n.url, slot: n.slot, dreamId: n.dreamId, templateId: n.templateId },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(n.fireAt) },
      });
    },
  };
}

function nativeDeps(): RebuildDeps {
  return {
    scheduler: nativeScheduler(),
    loadHistory: async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = (require("@react-native-async-storage/async-storage") as typeof import("@react-native-async-storage/async-storage")).default;
      return parseTemplateHistory(await AsyncStorage.getItem(STORAGE_KEYS.notifications));
    },
    saveHistory: async (history) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = (require("@react-native-async-storage/async-storage") as typeof import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(history));
    },
    now: clockNow,
  };
}

let queue: Promise<unknown> = Promise.resolve();

/** Cancel our pending identifiers and schedule planQueue(snapshot) (N2, N3). Serialized; never throws. */
export function rebuild(snapshot: NotificationSnapshot, deps?: RebuildDeps): Promise<RebuildResult> {
  const run = queue.then(() => rebuildWith(snapshot, deps ?? nativeDeps())).catch(() => FAILED);
  queue = run;
  return run;
}

/**
 * The reminder choice a 1.0 user left behind, for the one-time v1 → v2
 * profile migration (A2): true = 1.0 daily reminders are pending; false =
 * permission was granted (only 1.0 Settings ever asked) but nothing is
 * pending, so the user turned reminders off; null = no 1.0 choice (never
 * enabled, or no notifications here). Must run before the first rebuild,
 * which supersedes those dailies. Never throws.
 */
export async function legacyReminderChoice(
  scheduler: NotificationScheduler | null = nativeScheduler()
): Promise<boolean | null> {
  try {
    if (!scheduler || (await scheduler.permission()) !== "granted") return null;
    const pending = await scheduler.pending();
    return pending.some((n) => !n.id.startsWith(ID_PREFIX) && n.repeats);
  } catch {
    return null;
  }
}

/** Current OS permission without prompting. */
export async function getPermission(scheduler: NotificationScheduler | null = nativeScheduler()): Promise<PermissionState> {
  try {
    return scheduler ? await scheduler.permission() : "unavailable";
  } catch {
    return "unavailable";
  }
}

/**
 * Show the OS prompt if undetermined (N6). The caller has already shown the
 * in-app 'Remind me at 9am to do this?' sheet, gated by lib/asks claimAsk.
 * A grant rebuilds the queue at once, so the reminder just promised exists.
 * Returns the resulting state; never throws.
 */
export async function requestPermissionAtCommitment(
  scheduler: NotificationScheduler | null = nativeScheduler()
): Promise<PermissionState> {
  try {
    if (!scheduler) return "unavailable";
    const current = await scheduler.permission();
    const result = current === "undetermined" ? await scheduler.request() : current;
    if (result === "granted") requestRebuild();
    return result;
  } catch {
    return "unavailable";
  }
}

/**
 * Install setNotificationHandler (foreground presentation). A1 calls it once in
 * the root layout. In the app, only the if-then cue shows a banner: it is the
 * moment the user planned. Ritual cues go quietly to Notification Center.
 */
export function configureNotificationHandler(): void {
  const N = expoNotifications();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async (notification) => {
        const slot = (notification.request.content.data as { slot?: unknown } | null)?.slot;
        return { shouldShowBanner: slot === "ifthen", shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
      },
    });
  } catch {
    // no handler: the OS default (silent in the foreground) still applies
  }
}
