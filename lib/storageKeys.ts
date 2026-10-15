// Every AsyncStorage / localStorage key Vela uses, in one registry, so two
// parallel agents can never collide on a key or silently fork a schema.
//
// CONTRACT (docs/CONTRACTS.md §3). Steward: A2. Additive changes only.
//
// Rules
// - v1 keys are READ-ONLY in 1.1. Migration reads them once; nothing writes or
//   deletes them for one release, so a rollback to 1.0.1 still finds its data.
// - Every v2 user-data key below is included in the private backup file
//   (lib/backup.ts), except the ones marked "device-local".
// - A new key needs an entry here first. Never inline a key string elsewhere.

/** 1.0.x keys. Read once by lib/migrate.ts; never written or deleted in 1.1. */
export const V1_KEYS = {
  stories: "vela.stories.v1",
  ritual: "vela.ritual.v1",
  profile: "vela.profile.v1",
  journal: "vela.journal.v1",
  board: "vela.board.v1",
} as const;

export const STORAGE_KEYS = {
  /** Arc index: dreams, chapter metas, bridges, proofs, activeDreamId. Owner A2. */
  arcs: "vela.arcs.v2",
  /** Prefix of the one-immutable-key-per-chapter store. Use chapterStorageKey(). Owner A2. */
  chapterPrefix: "vela.chapter.v2.",
  /** ProfileV2 (contexts/user.types.ts). Migrated from vela.profile.v1. Owner A2. */
  profile: "vela.profile.v2",
  /** ProgressState (lib/progress.ts). Migrated from vela.ritual.v1. Persisted by RitualContext (A2), shape owned by A6. */
  progress: "vela.progress.v2",
  /** Journal entries + 369 sheet. Migrated from vela.journal.v1. Owner A2. */
  journal: "vela.journal.v2",
  /** Scenes (former board) cards with optional dreamId. Migrated from vela.board.v1. Owner A2. */
  scenes: "vela.scenes.v2",
  /** Ask arbiter ledger (lib/asks.ts). Device-local, not backed up. Owner A6. */
  asks: "vela.asks.v1",
  /** Notification template rotation history (lib/notifications). Device-local. Owner A6. */
  notifications: "vela.notifications.v2",
  /** Plus entitlement cache. Unchanged from 1.0. Device-local. Owner A2 (PlusContext). */
  plus: "vela.plus.v1",
  /** Review prompt once-ever flag. Unchanged from 1.0. Device-local. Owner A6. */
  reviewRequested: "vela-review-requested-v1",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** The per-chapter key: `vela.chapter.v2.<chapterId>`. */
export function chapterStorageKey(chapterId: string): string {
  return `${STORAGE_KEYS.chapterPrefix}${chapterId}`;
}
