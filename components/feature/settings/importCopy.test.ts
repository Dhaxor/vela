import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { EMPTY_ARC_INDEX } from "@/contexts/arc.types";
import { planImport, type BackupData } from "@/lib/backup";
import { emptyJournal, journalFromV1 } from "@/lib/journal";
import { migrateV1 } from "@/lib/migrate";
import { emptyProgress } from "@/lib/progress";
import { profileFromV1 } from "@/lib/store/profile";
import { emptyScenes } from "@/lib/store/scenes";
import { BACKUP_KEEPS_COPY, DEVICE_AHEAD_COPY, importDoneCopy, importDoneDuration, nextImportStep } from "./importCopy";

const base = { dreamsAdded: 0, dreamsUpdated: 0, dreamsKept: 0, devicePhotos: 0 };

describe("import toast tells the truth", () => {
  test("replace", () => {
    expect(importDoneCopy({ ...base, mode: "replace" })).toBe("Replaced. This device now matches the backup.");
  });

  test("merge says what it did, dream by dream", () => {
    expect(importDoneCopy({ ...base, mode: "merge", dreamsKept: 2 })).toBe("Merged. 2 dreams kept this device's version.");
    expect(importDoneCopy({ ...base, mode: "merge", dreamsAdded: 1 })).toBe("Merged. 1 dream added.");
    expect(importDoneCopy({ ...base, mode: "merge", dreamsUpdated: 1 })).toBe("Merged. 1 dream brought up to date.");
    expect(importDoneCopy({ ...base, mode: "merge", dreamsAdded: 2, dreamsUpdated: 1, dreamsKept: 1, devicePhotos: 3 })).toBe(
      "Merged. 2 dreams added. 1 dream brought up to date. 1 dream kept this device's version. Photos stay on the phone that took them."
    );
    expect(importDoneCopy({ ...base, mode: "merge" })).toBe("Merged.");
  });

  test("a merge from a file this device was ahead of says nothing was new", () => {
    expect(importDoneCopy({ ...base, mode: "merge" }, { nothingNew: true })).toBe("Merged. Nothing new was in the file.");
  });

  test("never 'everything'", () => {
    const all = [
      importDoneCopy({ ...base, mode: "merge" }),
      importDoneCopy({ ...base, mode: "replace", devicePhotos: 1 }),
      importDoneCopy({ ...base, mode: "merge", dreamsAdded: 2, dreamsKept: 1, devicePhotos: 3 }),
    ];
    for (const s of all) expect(s.toLowerCase()).not.toContain("everything");
  });

  test("photos are named when the file points at some", () => {
    expect(importDoneCopy({ ...base, mode: "replace", devicePhotos: 1 })).toBe("Replaced. This device now matches the backup. Photos stay on the phone that took them.");
  });

  test("longer toasts stay up longer", () => {
    expect(importDoneDuration({ ...base, mode: "merge" })).toBeUndefined();
    expect(importDoneDuration({ ...base, mode: "merge", dreamsKept: 1 })).toBe(5000);
    expect(importDoneDuration({ ...base, mode: "replace", devicePhotos: 2 })).toBe(5000);
  });
});

describe("Settings > Your data copy", () => {
  test("the backup file says what it keeps and that photos stay on this phone", () => {
    for (const word of ["words", "chapters", "proofs", "pages", "progress"]) expect(BACKUP_KEEPS_COPY).toContain(word);
    expect(BACKUP_KEEPS_COPY).toContain("Photos stay on this phone.");
    expect(DEVICE_AHEAD_COPY).toContain("Replace");
  });
});

describe("nextImportStep", () => {
  const plan = (p: { differs: boolean; needsChoice: boolean; recommended: "merge" | "replace"; nothingNew?: boolean }) => p;

  test("this device ahead of the file (nothing new, but it differs): the choice, so Replace stays reachable", () => {
    expect(nextImportStep(plan({ differs: true, needsChoice: true, recommended: "merge", nothingNew: true }))).toBe("choose");
  });

  test("the same file twice: nothing to import", () => {
    expect(nextImportStep(plan({ differs: false, needsChoice: true, recommended: "merge", nothingNew: true }))).toBe("nothing-to-import");
  });

  test("a fresh device: one confirm, then replace", () => {
    expect(nextImportStep(plan({ differs: true, needsChoice: false, recommended: "replace" }))).toBe("confirm");
  });

  test("an empty file over real data: never an import that only erases", () => {
    expect(nextImportStep(plan({ differs: true, needsChoice: false, recommended: "merge" }))).toBe("empty-file");
  });

  test("with the real planner and a real migrated device", () => {
    const r = JSON.parse(fs.readFileSync(path.join(import.meta.dir, "../../../lib/fixtures/v1/nine-proofs.json"), "utf8")).raw;
    const NOW = new Date(2026, 9, 16, 9);
    const phone: BackupData = {
      arcs: migrateV1(r, { now: NOW, name: "Ana" }).snapshot,
      profile: profileFromV1(JSON.parse(r.profile ?? "null"), NOW),
      progress: emptyProgress(),
      journal: r.journal ? journalFromV1(JSON.parse(r.journal)) : emptyJournal(),
      scenes: emptyScenes(),
    };
    const blank: BackupData = { arcs: { index: EMPTY_ARC_INDEX, chapters: {} }, profile: null, progress: emptyProgress(), journal: emptyJournal(), scenes: emptyScenes() };
    expect(nextImportStep(planImport(phone, structuredClone(phone)))).toBe("nothing-to-import");
    expect(nextImportStep(planImport(blank, phone))).toBe("confirm");
    expect(nextImportStep(planImport(phone, blank))).toBe("empty-file");
  });
});
