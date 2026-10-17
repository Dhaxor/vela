import { describe, expect, test } from "bun:test";
import { nextRitualMoment, parseRitualHHmm, saveForLabel, whenLabel } from "./ritualTime";

const TIMES = { morning: "08:00", evening: "21:00" };
const at = (h: number, m = 0, month = 9, day = 21) => new Date(2026, month, day, h, m, 0, 0);

describe("nextRitualMoment", () => {
  test("evening ritual later today", () => {
    const n = nextRitualMoment("evening", TIMES, at(12, 40));
    expect(n?.at).toEqual(at(21));
    expect(n?.hhmm).toBe("21:00");
    expect(n?.tomorrow).toBe(false);
  });
  test("a passed ritual rolls to tomorrow, and 21:00 sharp counts as passed", () => {
    expect(nextRitualMoment("evening", TIMES, at(21, 4))?.at).toEqual(at(21, 0, 9, 22));
    expect(nextRitualMoment("evening", TIMES, at(21, 0))?.tomorrow).toBe(true);
    expect(nextRitualMoment("evening", TIMES, at(20, 59, 9, 21))?.tomorrow).toBe(true);
    expect(nextRitualMoment("evening", TIMES, at(20, 58, 9, 21))?.tomorrow).toBe(false);
  });
  test("both picks whichever comes first", () => {
    expect(nextRitualMoment("both", TIMES, at(6))?.hhmm).toBe("08:00");
    expect(nextRitualMoment("both", TIMES, at(9))?.hhmm).toBe("21:00");
    const late = nextRitualMoment("both", TIMES, at(22));
    expect(late?.hhmm).toBe("08:00");
    expect(late?.tomorrow).toBe(true);
  });
  test("month and year ends roll over", () => {
    expect(nextRitualMoment("morning", TIMES, at(9, 0, 9, 31))?.at).toEqual(new Date(2026, 10, 1, 8, 0));
    expect(nextRitualMoment("evening", TIMES, at(22, 0, 11, 31))?.at).toEqual(new Date(2027, 0, 1, 21, 0));
  });
  test("malformed times are skipped, null when nothing is valid", () => {
    expect(nextRitualMoment("morning", { morning: "8am", evening: "21:00" }, at(6))).toBeNull();
    expect(nextRitualMoment("both", { morning: "8am", evening: "21:00" }, at(6))?.hhmm).toBe("21:00");
    expect(parseRitualHHmm("25:00")).toBeNull();
    expect(parseRitualHHmm("7:30")).toEqual({ hour: 7, minute: 30 });
  });
});

describe("labels", () => {
  test("Save for", () => {
    expect(saveForLabel({ hhmm: "21:00", tomorrow: false })).toBe("Save for 21:00");
    expect(saveForLabel({ hhmm: "21:00", tomorrow: true })).toBe("Save for tomorrow, 21:00");
  });
  test("when a saved chapter opens", () => {
    const now = at(21, 4);
    expect(whenLabel(at(22, 30).toISOString(), now)).toBe("22:30");
    expect(whenLabel(at(21, 0, 9, 22).toISOString(), now)).toBe("tomorrow, 21:00");
    expect(whenLabel(at(8, 0, 9, 24).toISOString(), now)).toBe("24 October, 08:00");
    expect(whenLabel("nope", now)).toBe("");
  });
});
