import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { V1RawStorage } from "@/contexts/arc.types";
import {
  BACKUP_ERROR_COPY,
  backupFileName,
  buildBackup,
  parseBackup,
  planImport,
  resolveImport,
  serializeBackup,
  type BackupData,
} from "./backup";
import { emptyJournal, journalFromV1 } from "./journal";
import { migrateV1 } from "./migrate";
import { emptyProgress, recordAct } from "./progress";
import { checkArcInvariants } from "./store/invariants";
import { profileFromV1 } from "./store/profile";
import { emptyScenes, scenesFromV1 } from "./store/scenes";
import { EMPTY_ARC_INDEX } from "@/contexts/arc.types";

const NOW = new Date(2026, 9, 16, 9);
const raw = (name: string): V1RawStorage => JSON.parse(fs.readFileSync(path.join(import.meta.dir, "fixtures", "v1", `${name}.json`), "utf8")).raw;

/** A real device: the nine-proofs capture, migrated. */
function device(name: string): BackupData {
  const r = raw(name);
  return {
    arcs: migrateV1(r, { now: NOW, name: "Ana" }).snapshot,
    profile: profileFromV1(JSON.parse(r.profile ?? "null"), NOW),
    progress: recordAct(emptyProgress(), "proof", NOW),
    journal: r.journal ? journalFromV1(JSON.parse(r.journal)) : emptyJournal(),
    scenes: r.board ? scenesFromV1(JSON.parse(r.board)) : emptyScenes(),
  };
}

const EMPTY_DEVICE: BackupData = { arcs: { index: EMPTY_ARC_INDEX, chapters: {} }, profile: null, progress: null, journal: null, scenes: null };

describe("export → import round trip", () => {
  test("a backup file parses back to the same data", () => {
    const data = device("nine-proofs");
    const text = serializeBackup(buildBackup(data, NOW, "1.1.0"));
    const parsed = parseBackup(text, NOW);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.data.arcs).toEqual(data.arcs);
    expect(parsed.backup.data.profile).toEqual(data.profile);
    expect(parsed.backup.data.journal).toEqual(data.journal);
    expect(parsed.backup.data.scenes).toEqual(data.scenes);
    expect(parsed.backup.appVersion).toBe("1.1.0");
    expect(parsed.summary).toMatchObject({ dreams: 1, proofs: 9, pages: 2, scenes: 1, name: "Ana" });
  });

  test("the file name carries the LOCAL date", () => {
    expect(backupFileName(new Date(2026, 0, 2, 23, 30))).toBe("vela-backup-2026-01-02.json");
  });
});

describe("validation never applies a bad file", () => {
  test("refusals are typed and have copy", () => {
    const cases: [string, string][] = [
      ["not json", "not-json"],
      [JSON.stringify({ hello: 1 }), "not-a-backup"],
      [JSON.stringify({ kind: "vela-backup", version: 99, data: {} }), "newer-version"],
      [JSON.stringify({ kind: "vela-backup", version: 1, data: { arcs: { index: {}, chapters: {} } } }), "invalid-arcs"],
    ];
    for (const [text, error] of cases) {
      const r = parseBackup(text, NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toBe(error as typeof r.error);
        expect(BACKUP_ERROR_COPY[r.error].length).toBeGreaterThan(10);
      }
    }
  });

  test("a damaged arc (chapter text missing) is refused", () => {
    const data = device("reroll-heavy");
    const broken = { ...data, arcs: { ...data.arcs, chapters: {} } };
    const r = parseBackup(serializeBackup(buildBackup(broken, NOW, null)), NOW);
    expect(r.ok ? null : r.error).toBe("invalid-arcs");
  });

  test("other stores are sanitized, not trusted", () => {
    const data = device("nine-proofs");
    const file = JSON.parse(serializeBackup(buildBackup(data, NOW, null)));
    file.data.profile.rate = 7;
    file.data.scenes.cards.push({ id: "x", kind: "photo" });
    const r = parseBackup(JSON.stringify(file), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.data.profile?.rate).toBe(0.9);
      expect(r.backup.data.scenes?.cards.map((c) => c.id)).toEqual(data.scenes!.cards.map((c) => c.id));
    }
  });
});

describe("merge or replace", () => {
  test("an empty device just takes the file", () => {
    const plan = planImport(EMPTY_DEVICE, device("nine-proofs"));
    expect(plan).toMatchObject({ needsChoice: false, recommended: "replace", nothingNew: false });
  });

  test("the same backup twice has nothing new", () => {
    const d = device("nine-proofs");
    expect(planImport(d, d)).toMatchObject({ needsChoice: true, nothingNew: true });
  });

  test("two devices: merge is recommended and keeps both sets of dreams, valid", () => {
    const here = device("reroll-heavy");
    const there = device("plus-two-dreams");
    const plan = planImport(here, there);
    expect(plan).toMatchObject({ needsChoice: true, recommended: "merge", nothingNew: false });
    const merged = resolveImport(here, there, "merge");
    expect(merged.arcs.index.dreams).toHaveLength(3);
    expect(checkArcInvariants(merged.arcs)).toEqual([]);
    expect(merged.arcs.index.activeDreamId).toBe(here.arcs.index.activeDreamId);
    expect(merged.profile).toEqual(here.profile);
  });

  test("merge adds pages and Scenes without duplicates; progress never goes down", () => {
    const here = device("nine-proofs");
    const later: BackupData = {
      ...here,
      journal: { ...here.journal!, entries: [{ ...here.journal!.entries[0], id: "new-page", createdAt: "2026-10-20T20:00:00.000Z" }, ...here.journal!.entries] },
      progress: { ...here.progress!, nightsShownUp: 40, days: ["2026-10-01", ...here.progress!.days] },
    };
    const merged = resolveImport(here, later, "merge");
    expect(merged.journal!.entries.map((e) => e.id)).toEqual(["new-page", ...here.journal!.entries.map((e) => e.id)]);
    expect(merged.scenes!.cards).toHaveLength(here.scenes!.cards.length);
    expect(merged.progress!.nightsShownUp).toBe(40);
    expect(merged.progress!.days).toContain("2026-10-01");
  });

  test("replace makes the file the truth", () => {
    const here = device("reroll-heavy");
    const there = device("nine-proofs");
    expect(resolveImport(here, there, "replace")).toBe(there);
  });
});
