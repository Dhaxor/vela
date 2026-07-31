import { describe, expect, test } from "bun:test";
import { remindersFor } from "./notifications";

describe("remindersFor", () => {
  test("morning ritual gets one 8am reminder", () => {
    const r = remindersFor("morning");
    expect(r.length).toBe(1);
    expect(r[0].hour).toBe(8);
  });
  test("evening ritual gets one 9pm reminder", () => {
    const r = remindersFor("evening");
    expect(r.length).toBe(1);
    expect(r[0].hour).toBe(21);
  });
  test("both bookend the day, morning first", () => {
    const r = remindersFor("both");
    expect(r.map((x) => x.hour)).toEqual([8, 21]);
  });
  test("every reminder carries human copy", () => {
    for (const ritual of ["morning", "evening", "both"] as const) {
      for (const r of remindersFor(ritual)) {
        expect(r.title.length).toBeGreaterThan(8);
        expect(r.body.length).toBeGreaterThan(8);
        expect(r.minute).toBe(0);
      }
    }
  });
});
