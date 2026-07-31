import { describe, expect, test } from "bun:test";
import { FOCUS_AREAS, focusById, sanitizeFocusIds } from "./focus";

describe("focus areas", () => {
  test("all six areas exist with unique ids", () => {
    expect(FOCUS_AREAS.length).toBe(6);
    expect(new Set(FOCUS_AREAS.map((f) => f.id)).size).toBe(6);
  });

  test("every area has display copy", () => {
    for (const f of FOCUS_AREAS) {
      expect(f.label.length).toBeGreaterThan(2);
      expect(f.invitation.length).toBeGreaterThan(10);
      expect(f.domainWord.length).toBeGreaterThan(2);
    }
  });

  test("focusById round-trips and rejects unknowns", () => {
    expect(focusById("love")?.label).toBe("Love");
    expect(focusById("nope")).toBeUndefined();
  });

  test("sanitizeFocusIds drops junk and keeps order", () => {
    expect(sanitizeFocusIds(["career", "bogus", 7, "love"])).toEqual([
      "career",
      "love",
    ]);
    expect(sanitizeFocusIds(null)).toEqual([]);
    expect(sanitizeFocusIds("love")).toEqual([]);
  });
});
