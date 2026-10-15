// Rolling-queue contract types and constants. Re-exported unchanged from
// "@/lib/notifications" (index.ts); they live in this leaf so the pure modules
// (schedule, templates, snapshot) and the native seam never import each other
// in a cycle. Frozen names; additive changes only (docs/CONTRACTS.md §11).

import type {
  Bridge,
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

export const NOTIFICATION_LIMITS = {
  horizonDays: 10,
  maxPending: 40,
  /** Debounce for useLoopEffects-triggered rebuilds. */
  rebuildDebounceMs: 750,
  /** 'quiet-return' fires only after this many quiet days, at most once per quiet spell. */
  quietReturnAfterDays: 3,
  /** A ritual cue this close to a more specific notification (if-then, saved chapter, ledger, quiet return) is dropped. */
  collisionWindowMs: 60 * 60 * 1000,
  /** Filled copy limits (types.ts NotificationTemplate). A template that overflows with the user's words is skipped. */
  maxTitleChars: 40,
  maxBodyChars: 120,
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
  /** Every proof of this dream, all seasons ({proofs.count}). Falls back to season.stars. */
  readonly proofCount?: number;
  /** The shaper's {desire.np} for this dream. Templates using it are skipped while absent. */
  readonly desireNp?: string | null;
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
  /** dateKey of every proof across all dreams: gates the Sunday ledger (≥ 2 in the week). */
  readonly proofDateKeys?: readonly DateKey[];
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

/** A notification of the current plan, remembered until it fires (then its template counts as used). */
export interface PendingTemplate {
  readonly id: string;
  readonly slot: NotificationSlot;
  readonly templateId: string;
  readonly fireAt: IsoTime;
  /** 'quiet-return' only: the quiet spell it belongs to (its first quiet day's predecessor). */
  readonly spell?: DateKey;
}

/** Per-slot rotation memory (persisted by A6 under STORAGE_KEYS.notifications). */
export interface TemplateHistory {
  readonly version: 1;
  /** Templates DELIVERED in the current rotation cycle, oldest first. */
  readonly used: Readonly<Partial<Record<NotificationSlot, readonly string[]>>>;
  /** The scheduled plan; entries move into `used` once their fireAt has passed. */
  readonly pending?: readonly PendingTemplate[];
  /** The quiet spell whose 'quiet-return' was already delivered (at most once per spell). */
  readonly quietSpell?: DateKey | null;
}

export interface RebuildResult {
  readonly permission: PermissionState;
  /** Newly scheduled by this rebuild. */
  readonly scheduled: number;
  /** Our identifiers (and superseded 1.0 repeating reminders) cancelled by this rebuild. */
  readonly cancelled: number;
  /** Why nothing was scheduled, if so. */
  readonly skipped?: "disabled" | "paused" | "no-permission" | "unavailable" | "stub";
  /** The plan that was (or would have been) scheduled, for the dev diagnostics screen. */
  readonly planned: readonly PlannedNotification[];
  /** Already pending with identical copy, left untouched. */
  readonly kept?: number;
}

export function emptyTemplateHistory(): TemplateHistory {
  return { version: 1, used: {}, pending: [], quietSpell: null };
}
