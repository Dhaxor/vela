// ROLLING NOTIFICATION QUEUE — contract + stub ("@/lib/notifications").
//
// OWNER: A6 (lib/notifications/**: implements planQueue in a pure, tested
// lib/notifications/schedule.ts, template filling in templates.ts, and the
// expo-notifications seam here). Exported names and signatures are frozen;
// additive changes only (docs/CONTRACTS.md §11).
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
// N7 Every notification carries data.url (vela://story/<chapterId> or
//    vela://evidence/<dreamId>). Cold-start taps are routed by the root layout
//    (A1) via useLastNotificationResponse + hrefForNotificationData(), only
//    after every store is ready.

import type {
  Bridge,
  ChapterId,
  ChapterMeta,
  DateKey,
  Dream,
  DreamId,
  IsoTime,
  LoopState,
  Proof,
  SeasonProgress,
} from "@/contexts/arc.types";
import type { RitualTime, RitualTimes } from "@/contexts/user.types";
import type { NotificationSlot } from "@/lib/story/content/types";

// 1.0 API, unchanged, until the last 1.0 screen stops using it.
export { applyReminders, clearReminders, remindersFor, type ReminderSpec } from "./legacy";

/** False once A6 lands the real implementation. */
export const NOTIFICATIONS_IS_STUB: boolean = true;

export const NOTIFICATION_LIMITS = {
  horizonDays: 10,
  maxPending: 40,
  /** Debounce for useLoopEffects-triggered rebuilds. */
  rebuildDebounceMs: 750,
  /** 'quiet-return' fires only after this many quiet days, at most once per quiet spell. */
  quietReturnAfterDays: 3,
} as const;

/** Every identifier we schedule starts with this, so rebuild cancels exactly ours (N3). */
export const ID_PREFIX = "vela-q-";

export type PermissionState = "granted" | "denied" | "undetermined" | "unavailable";

/** One dream's loop situation, straight from ArcValue selectors (no re-mapping). */
export interface NotificationDreamState {
  readonly dream: Dream;
  readonly loop: LoopState;
  readonly latestChapter: ChapterMeta | null;
  readonly openBridge: Bridge | null;
  readonly latestProof: Proof | null;
  readonly season: SeasonProgress | null;
}

/** Everything planQueue needs. Built by useLoopEffects from useUser/useArc/useProgress. */
export interface NotificationSnapshot {
  /** ProfileV2.remindersEnabled. */
  readonly enabled: boolean;
  readonly lockScreenPrivate: boolean;
  /** ProgressState.pausedUntil. */
  readonly pausedUntil: DateKey | null;
  readonly name: string;
  readonly ritual: RitualTime;
  readonly ritualTimes: RitualTimes;
  /** Weaving dreams only (ArcValue.weavingDreamIds), focused dream first. */
  readonly dreams: readonly NotificationDreamState[];
  readonly nightsShownUp: number;
  /** Local day of the last loop act; drives 'quiet-return'. */
  readonly lastActDateKey: DateKey | null;
}

export interface PlannedNotification {
  /** Deterministic: `${ID_PREFIX}${slot}-${dreamId|'all'}-${fireAt}`. */
  readonly id: string;
  readonly slot: NotificationSlot;
  readonly fireAt: IsoTime;
  readonly title: string;
  readonly body: string;
  /** vela://story/<chapterId> | vela://evidence/<dreamId> | vela:// (Today). */
  readonly url: string;
  readonly dreamId: DreamId | null;
  readonly templateId: string;
}

/** Per-slot rotation memory (persisted by A6 under STORAGE_KEYS.notifications). */
export interface TemplateHistory {
  readonly version: 1;
  readonly used: Readonly<Partial<Record<NotificationSlot, readonly string[]>>>;
}

export interface RebuildResult {
  readonly permission: PermissionState;
  readonly scheduled: number;
  readonly cancelled: number;
  /** Why nothing was scheduled, if so. */
  readonly skipped?: "disabled" | "paused" | "no-permission" | "unavailable" | "stub";
  /** The plan that was (or would have been) scheduled, for the dev diagnostics screen. */
  readonly planned: readonly PlannedNotification[];
}

/* =========================================================================
 * Implemented (trivial, shared)
 * ========================================================================= */

export function urlForChapter(chapterId: ChapterId): string {
  return `vela://story/${encodeURIComponent(chapterId)}`;
}

export function urlForEvidence(dreamId: DreamId): string {
  return `vela://evidence/${encodeURIComponent(dreamId)}`;
}

/* =========================================================================
 * STUBS — A6 implements (signatures frozen)
 * ========================================================================= */

/** Pure (N1, N4, N5). Returns the plan sorted by fireAt plus the updated rotation history. STUB: empty plan. */
export function planQueue(
  _snapshot: NotificationSnapshot,
  _now: Date,
  history: TemplateHistory
): { readonly planned: readonly PlannedNotification[]; readonly history: TemplateHistory } {
  return { planned: [], history };
}

/** Cancel our pending identifiers and schedule planQueue(snapshot) (N2, N3). Never throws. STUB: schedules nothing. */
export async function rebuild(_snapshot: NotificationSnapshot): Promise<RebuildResult> {
  return { permission: "unavailable", scheduled: 0, cancelled: 0, skipped: "stub", planned: [] };
}

/** Current OS permission without prompting. STUB: 'unavailable'. */
export async function getPermission(): Promise<PermissionState> {
  return "unavailable";
}

/**
 * Show the OS prompt if undetermined (N6). The caller has already shown the
 * in-app 'Remind me at 9am to do this?' sheet, gated by lib/asks claimAsk.
 * Returns the resulting state; never throws. STUB: 'unavailable'.
 */
export async function requestPermissionAtCommitment(): Promise<PermissionState> {
  return "unavailable";
}

/** Install setNotificationHandler (foreground presentation). A1 calls once in the root layout. STUB: no-op. */
export function configureNotificationHandler(): void {}

/** Pure: notification `data` payload → router href ('/story/<id>', '/evidence/<id>', '/'), or null. STUB: null. */
export function hrefForNotificationData(_data: unknown): string | null {
  return null;
}
