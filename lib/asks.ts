// ONE ASK PER SESSION — the arbiter for every interruption we initiate
// (docs/CONTRACTS.md §12).
//
// OWNER: A6 (implements the STUBS in place, with lib/asks.test.ts; also owns
// lib/reviewPrompt.ts). Exported names and signatures are frozen.
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
//   notifications — S3 BridgeChooser/IfThenBuilder on commit with a time.
//   plus-nudge    — S4 after the 2nd proof's Star Birth (never in Chapter I).
//   review        — S4 after the 2nd proof and after Named Sky, through
//                   lib/reviewPrompt (once ever, 4-hour return gap).

import type { IsoTime } from "@/contexts/arc.types";

/** False once A6 lands the real implementation. */
export const ASKS_IS_STUB: boolean = true;

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
 * STUBS — A6 implements (signatures frozen)
 * ========================================================================= */

/** Pure. The single ask to show now from `candidates`, or null (K1, K2, K4, cooldowns). STUB: null (never asks). */
export function pickAsk(
  _ledger: AskLedger,
  _session: AskSession,
  _candidates: readonly AskKind[],
  _now: Date
): AskKind | null {
  return null;
}

/** Pure. Record that `kind` was shown. STUB: unchanged. */
export function noteAsked(
  ledger: AskLedger,
  session: AskSession,
  _kind: AskKind,
  _now: Date
): { readonly ledger: AskLedger; readonly session: AskSession } {
  return { ledger, session };
}

/** Pure. Mark `kind` settled (K4). STUB: unchanged. */
export function settleAsk(ledger: AskLedger, _kind: AskKind): AskLedger {
  return ledger;
}

/**
 * Runtime: atomically pick AND consume this session's ask. The caller shows
 * the returned ask (or nothing for null). Never throws. STUB: null.
 */
export async function claimAsk(_candidates: readonly AskKind[]): Promise<AskKind | null> {
  return null;
}

/** Runtime: persist settleAsk (e.g. after the OS permission answer). STUB: no-op. */
export async function settle(_kind: AskKind): Promise<void> {}

/**
 * Runtime: feed AppState changes (called by useLoopEffects). Going to the
 * background stamps the time; returning 'active' after ≥ sessionGapMs starts a
 * new session (K1). STUB: no-op.
 */
export function onAppStateChange(_state: "active" | "background" | "inactive", _now: Date): void {}
