// ROLLING NOTIFICATION QUEUE ("@/lib/notifications"). docs/CONTRACTS.md §11.
//
// OWNER: A6. Exported names and signatures are frozen; additive changes only.
// Layout: types.ts (contract types and constants), schedule.ts (pure
// planQueue), templates.ts (token filling and rotation), snapshot.ts (pure
// snapshot builder for useLoopEffects), routing.ts (deep links),
// runtime.ts (the expo-notifications seam), useNotificationRouting.ts (the
// root layout's tap router), bus.ts (rebuild requests).
//
// Rules (binding):
// N1 One-off notifications only (no DAILY triggers), planned for the next
//    HORIZON_DAYS, at most MAX_PENDING pending (iOS caps at 64).
// N2 rebuild() is the ONLY scheduler in the app. It runs from useLoopEffects
//    (debounced, on foreground and after state changes). Screens never schedule.
// N3 Exact cancellation: rebuild cancels exactly the identifiers it owns
//    (prefix ID_PREFIX) and schedules the new plan. No phantom reminders.
// N4 Copy comes from lib/content/notifications.ts (A4), rotated without
//    replacement per slot. With lockScreenPrivate, only NEUTRAL templates
//    (no PERSONAL_TOKENS). No guilt or loss framing.
// N5 Nothing is scheduled when reminders are off, while paused, or without
//    OS permission. Web: in-app equivalents only; every call no-ops.
// N6 Permission is asked at bridge commitment ('Remind me at 9am to do
//    this?'), after the asks arbiter (lib/asks) grants the 'notifications'
//    ask. Never in onboarding. Settings may also ask.
// N7 Every notification carries data.url (vela://story/<chapterId>,
//    vela://evidence/<dreamId> or vela:// for Today). Cold-start taps are
//    routed by the root layout (A1) with useNotificationRouting(ready), only
//    after every store is ready.
//
// Root layout (A1), once:
//   configureNotificationHandler();          // module scope or a mount effect
//   useLoopEffects();                        // lib/loopEffects
//   useNotificationRouting(allStoresReady && !!profile);

export {
  emptyTemplateHistory,
  ID_PREFIX,
  NOTIFICATION_LIMITS,
  type NotificationDreamState,
  type NotificationSnapshot,
  type PendingTemplate,
  type PermissionState,
  type PlannedNotification,
  type RebuildResult,
  type TemplateHistory,
} from "./types";
export { notificationId, planQueue, settleHistory } from "./schedule";
export {
  APP_HOME_URL,
  hrefForNotificationData,
  hrefForResponse,
  urlForChapter,
  urlForEvidence,
} from "./routing";
export {
  buildNotificationSnapshot,
  snapshotKey,
  type ArcReader,
  type SnapshotInput,
  type SnapshotProfile,
} from "./snapshot";
export {
  configureNotificationHandler,
  getPermission,
  legacyReminderChoice,
  parseTemplateHistory,
  rebuild,
  requestPermissionAtCommitment,
  type NotificationScheduler,
  type RebuildDeps,
  type ScheduledRef,
} from "./runtime";
export { onRebuildRequest, requestRebuild } from "./bus";
export { useNotificationRouting } from "./useNotificationRouting";

/** False once A6 lands the real implementation. */
export const NOTIFICATIONS_IS_STUB: boolean = false;
