// ONE ASK PER SESSION — the arbiter for every interruption we initiate
// (docs/CONTRACTS.md §12).
//
// OWNER: A6 (with lib/asks.test.ts; also owns lib/reviewPrompt.ts). Exported
// names and signatures are frozen; additive changes only.
//
// Rules (binding):
// K1 At most ONE ask per session. A session starts at cold start, or when the
//    app returns to the foreground after ≥ ASK_RULES.sessionGapMs away.
// K2 When several asks are eligible at the same moment, priority wins:
//    notifications > plus-nudge > review.
// K3 The CALLER decides business eligibility (e.g. 'this is the 2nd proof',
//    'the user just committed a bridge with a time', 'not Plus', 'not
//    Chapter I') and passes candidates. The arbiter applies session, cooldown
//    and settled rules only.
// K4 'settled' asks never return: notifications once the OS answered
//    (granted or denied), review once requested, plus-nudge after maxEver.
// K5 Pure core (pickAsk/noteAsked/settleAsk) + a thin persisted runtime
//    (claimAsk/settle). The ledger is device-local, never backed up.
//
// Where each ask is offered (callers, Phase 2):
//   notifications — S3 BridgeChooser/IfThenBuilder on commit with a time:
//                   `if (await claimAsk(['notifications'])) show 'Remind me at
//                   9am to do this?'`, then requestPermissionAtCommitment()
//                   and settle('notifications') once the OS answered.
//   plus-nudge    — S4 after the 2nd proof's Star Birth (never in Chapter I).
//   review        — S4 after the 2nd proof and after Named Sky, through
//                   lib/reviewPrompt (once ever, 4-hour return gap).

import type { IsoTime } from "@/contexts/arc.types";
import { now as clockNow } from "@/lib/clock";
import { STORAGE_KEYS } from "@/lib/storageKeys";

/** False once A6 lands the real implementation. */
export const ASKS_IS_STUB: boolean = false;

export type AskKind = "notifications" | "plus-nudge" | "review";

/** Highest priority first (K2). */
export const ASK_PRIORITY: readonly AskKind[] = ["notifications", "plus-nudge", "review"];

export const ASK_RULES = {
  /** Background time that starts a new session (K1). */
  sessionGapMs: 30 * 60 * 1000,
  notifications: { maxEver: 2, cooldownDays: 3 },
  "plus-nudge": { maxEver: 3, cooldownDays: 7 },
  review: { maxEver: 1, cooldownDays: 0 },
} as const;

export interface AskHistory {
  readonly count: number;
  readonly lastAt: IsoTime | null;
  /** K4: never ask again. */
  readonly settled: boolean;
}

/** Persisted under STORAGE_KEYS.asks. */
export interface AskLedger {
  readonly version: 1;
  readonly history: Readonly<Record<AskKind, AskHistory>>;
}

/** In memory only. */
export interface AskSession {
  readonly id: string;
  readonly startedAt: IsoTime;
  /** The ask already shown this session, if any (K1). */
  readonly asked: AskKind | null;
}

export function emptyAskLedger(): AskLedger {
  const fresh: AskHistory = { count: 0, lastAt: null, settled: false };
  return { version: 1, history: { notifications: fresh, "plus-nudge": fresh, review: fresh } };
}

/* =========================================================================
 * Pure core
 * ========================================================================= */

const DAY_MS = 24 * 60 * 60 * 1000;

export function newAskSession(now: Date): AskSession {
  return { id: `s-${now.getTime().toString(36)}`, startedAt: now.toISOString(), asked: null };
}

function eligible(kind: AskKind, h: AskHistory, now: Date): boolean {
  const rule = ASK_RULES[kind];
  if (h.settled || h.count >= rule.maxEver) return false;
  if (h.lastAt === null) return true;
  const last = Date.parse(h.lastAt);
  // A clock set back before the last ask never counts as time passed.
  return Number.isFinite(last) && now.getTime() - last >= rule.cooldownDays * DAY_MS && now.getTime() >= last;
}

/** Pure. The single ask to show now from `candidates`, or null (K1, K2, K4, cooldowns). */
export function pickAsk(
  ledger: AskLedger,
  session: AskSession,
  candidates: readonly AskKind[],
  now: Date
): AskKind | null {
  if (session.asked !== null) return null;
  for (const kind of ASK_PRIORITY) {
    if (candidates.includes(kind) && eligible(kind, ledger.history[kind], now)) return kind;
  }
  return null;
}

/** Pure. Record that `kind` was shown. Reaching maxEver settles it (K4). */
export function noteAsked(
  ledger: AskLedger,
  session: AskSession,
  kind: AskKind,
  now: Date
): { readonly ledger: AskLedger; readonly session: AskSession } {
  const h = ledger.history[kind];
  const count = h.count + 1;
  return {
    ledger: {
      ...ledger,
      history: {
        ...ledger.history,
        [kind]: { count, lastAt: now.toISOString(), settled: h.settled || count >= ASK_RULES[kind].maxEver },
      },
    },
    session: { ...session, asked: kind },
  };
}

/** Pure. Mark `kind` settled (K4). */
export function settleAsk(ledger: AskLedger, kind: AskKind): AskLedger {
  if (ledger.history[kind].settled) return ledger;
  return { ...ledger, history: { ...ledger.history, [kind]: { ...ledger.history[kind], settled: true } } };
}

/** Pure. A return to the foreground after ≥ sessionGapMs away starts a new session (K1). */
export function sessionAfterReturn(session: AskSession, backgroundAt: number | null, now: Date): AskSession {
  if (backgroundAt === null || now.getTime() - backgroundAt < ASK_RULES.sessionGapMs) return session;
  return newAskSession(now);
}

function parseHistory(raw: unknown): AskHistory {
  const fresh = emptyAskLedger().history.notifications;
  if (typeof raw !== "object" || raw === null) return fresh;
  const h = raw as Record<string, unknown>;
  return {
    count: typeof h.count === "number" && Number.isFinite(h.count) && h.count > 0 ? Math.floor(h.count) : 0,
    lastAt: typeof h.lastAt === "string" && Number.isFinite(Date.parse(h.lastAt)) ? h.lastAt : null,
    settled: h.settled === true,
  };
}

/** Lenient parse of the stored ledger (object or JSON string). */
export function parseAskLedger(raw: unknown): AskLedger {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return emptyAskLedger();
    }
  }
  const history = (typeof value === "object" && value !== null ? (value as { history?: unknown }).history : null) as
    | Record<string, unknown>
    | null
    | undefined;
  if (typeof history !== "object" || history === null) return emptyAskLedger();
  return {
    version: 1,
    history: {
      notifications: parseHistory(history.notifications),
      "plus-nudge": parseHistory(history["plus-nudge"]),
      review: parseHistory(history.review),
    },
  };
}

/* =========================================================================
 * Runtime (persisted ledger, in-memory session)
 * ========================================================================= */

export interface AskStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface AskRuntime {
  claimAsk(candidates: readonly AskKind[]): Promise<AskKind | null>;
  settle(kind: AskKind): Promise<void>;
  onAppStateChange(state: "active" | "background" | "inactive", now: Date): void;
}

/** A runtime over `store`, with the session starting at `start` (cold start). Exported for tests. */
export function createAskRuntime(store: () => AskStore, clock: () => Date, start: Date = clock()): AskRuntime {
  let session = newAskSession(start);
  let backgroundAt: number | null = null;
  let ledger: AskLedger | null = null;
  // Serialized, so two simultaneous claims can never both win the session.
  let lock: Promise<unknown> = Promise.resolve();

  async function load(): Promise<AskLedger> {
    if (ledger) return ledger;
    try {
      ledger = parseAskLedger(await store().getItem(STORAGE_KEYS.asks));
    } catch {
      ledger = emptyAskLedger();
    }
    return ledger;
  }

  async function save(next: AskLedger): Promise<void> {
    ledger = next;
    try {
      await store().setItem(STORAGE_KEYS.asks, JSON.stringify(next));
    } catch {
      // the in-memory ledger still holds for this process
    }
  }

  function serial<T>(task: () => Promise<T>, fallback: T): Promise<T> {
    const run = lock.then(task).catch(() => fallback);
    lock = run;
    return run;
  }

  return {
    claimAsk: (candidates) =>
      serial(async () => {
        const now = clock();
        const current = await load();
        const kind = pickAsk(current, session, candidates, now);
        if (!kind) return null;
        const next = noteAsked(current, session, kind, now);
        session = next.session;
        await save(next.ledger);
        return kind;
      }, null),
    settle: (kind) =>
      serial(async () => {
        await save(settleAsk(await load(), kind));
      }, undefined),
    onAppStateChange: (state, now) => {
      if (state === "background") {
        backgroundAt ??= now.getTime();
      } else if (state === "active") {
        session = sessionAfterReturn(session, backgroundAt, now);
        backgroundAt = null;
      }
    },
  };
}

function nativeStore(): AskStore {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("@react-native-async-storage/async-storage") as typeof import("@react-native-async-storage/async-storage")).default;
}

const runtime = createAskRuntime(nativeStore, clockNow);

/**
 * Runtime: atomically pick AND consume this session's ask. The caller shows
 * the returned ask (or nothing for null). Never throws.
 */
export function claimAsk(candidates: readonly AskKind[]): Promise<AskKind | null> {
  return runtime.claimAsk(candidates);
}

/** Runtime: persist settleAsk (e.g. after the OS permission answer). Never throws. */
export function settle(kind: AskKind): Promise<void> {
  return runtime.settle(kind);
}

/**
 * Runtime: feed AppState changes (called by useLoopEffects). Going to the
 * background stamps the time; returning 'active' after ≥ sessionGapMs starts a
 * new session (K1).
 */
export function onAppStateChange(state: "active" | "background" | "inactive", now: Date): void {
  runtime.onAppStateChange(state, now);
}
