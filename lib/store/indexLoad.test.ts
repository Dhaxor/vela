// Launch-time handling of the stored arc index: a bad read never deletes data.
import { describe, expect, test } from "bun:test";
import { EMPTY_ARC_INDEX, type ArcIndex, type ChapterMeta } from "@/contexts/arc.types";
import { chapterStorageKey, STORAGE_KEYS } from "@/lib/storageKeys";
import { classifyIndexRead, orphanChapterKeys } from "./indexLoad";

const withChapters = (...ids: string[]): ArcIndex => ({
  ...EMPTY_ARC_INDEX,
  chapters: ids.map((id) => ({ id }) as ChapterMeta),
});
const KEYS = [chapterStorageKey("c1"), chapterStorageKey("c2"), chapterStorageKey("lost"), STORAGE_KEYS.arcs, STORAGE_KEYS.profile];
const opts = { chapterKey: chapterStorageKey, prefix: STORAGE_KEYS.chapterPrefix };

describe("arc index load policy", () => {
  test("classifies the stored index", () => {
    expect(classifyIndexRead(null, null)).toBe("absent");
    expect(classifyIndexRead("", null)).toBe("absent");
    expect(classifyIndexRead('{"schemaVersion":2}', withChapters())).toBe("readable");
    expect(classifyIndexRead('{"schemaVer', null)).toBe("unreadable");
  });

  test("a readable index collects only chapter keys it does not point at", () => {
    expect(orphanChapterKeys(KEYS, withChapters("c1", "c2"), { ...opts, read: "readable", quarantined: false })).toEqual([chapterStorageKey("lost")]);
  });

  test("an unreadable index never collects: every chapter key may still be its", () => {
    expect(orphanChapterKeys(KEYS, EMPTY_ARC_INDEX, { ...opts, read: "unreadable", quarantined: true })).toEqual([]);
    expect(orphanChapterKeys(KEYS, EMPTY_ARC_INDEX, { ...opts, read: "absent", quarantined: false })).toEqual([]);
  });

  test("after a quarantine, a fresh index still leaves the old chapter keys alone", () => {
    expect(orphanChapterKeys(KEYS, withChapters("c2"), { ...opts, read: "readable", quarantined: true })).toEqual([]);
  });
});
