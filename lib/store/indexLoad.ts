// What ArcProvider may do with the arc index it read at launch. Pure, so the
// rules that stand between a bad read and data loss are tested, not only
// commented.
//
// - absent: first launch of 1.1. Migrate from the v1 keys (or start empty).
// - readable: load it. Chapter keys it does not point at are orphans from a
//   crash between a chapter write and its index write, and are collected.
// - unreadable: present but corrupt, or written by another schema. The raw
//   string is quarantined before anything can write the index, and no chapter
//   key is ever collected while a quarantine exists, because the quarantined
//   index may still point at them.

import type { ArcIndex } from "@/contexts/arc.types";

export type IndexRead = "absent" | "readable" | "unreadable";

export function classifyIndexRead(raw: string | null, parsed: ArcIndex | null): IndexRead {
  if (!raw) return "absent";
  return parsed ? "readable" : "unreadable";
}

/** Chapter keys to remove at launch: none unless the index was read and nothing is quarantined. */
export function orphanChapterKeys(
  keys: readonly string[],
  index: ArcIndex,
  opts: { read: IndexRead; quarantined: boolean; chapterKey: (chapterId: string) => string; prefix: string }
): string[] {
  if (opts.read !== "readable" || opts.quarantined) return [];
  const known = new Set(index.chapters.map((c) => opts.chapterKey(c.id)));
  return keys.filter((k) => k.startsWith(opts.prefix) && !known.has(k));
}
