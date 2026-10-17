import { describe, expect, test } from "bun:test";
import { importDoneCopy } from "./importCopy";

const base = { dreamsAdded: 0, dreamsUpdated: 0, dreamsKept: 0, devicePhotos: 0 };

describe("import toast tells the truth", () => {
  test("replace", () => {
    expect(importDoneCopy({ ...base, mode: "replace" })).toBe("Backup restored on this device.");
  });

  test("merge never claims everything is here", () => {
    const all = [
      importDoneCopy({ ...base, mode: "merge" }),
      importDoneCopy({ ...base, mode: "merge", dreamsAdded: 2, dreamsKept: 1, devicePhotos: 3 }),
    ];
    for (const s of all) expect(s.toLowerCase()).not.toContain("everything");
    expect(all[1]).toBe("Backup merged. 2 dreams added. 1 dream kept this device's version. Photos show only on the phone that took them.");
  });

  test("photos are named when the file points at some", () => {
    expect(importDoneCopy({ ...base, mode: "replace", devicePhotos: 1 })).toContain("Photos show only on the phone that took them.");
  });
});
