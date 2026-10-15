// Ids and seeds for persisted rows. Same shape as 1.0 ('mv9skmkt-6vrjrm'), so
// migrated and new ids read alike in backups and deep links.

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** A fresh 32-bit seed for one engine roll. */
export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
