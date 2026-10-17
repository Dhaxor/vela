import { describe, expect, test } from "bun:test";
import {
  backupSummaryLine as summaryLine,
  exportedOn,
  formatClock,
  formatDay,
  hourLabel,
  parseHHmm,
  pauseOptions,
  resumesLabel,
  ritualTimesLabel,
  slotsFor,
  stepHour,
  stepMinutes,
  toHHmm,
} from "./time";

const TIMES = { morning: "08:00", evening: "21:00" };
const wed = new Date(2026, 9, 21, 21, 4); // the still clock

describe("ritual times", () => {
  test("slots", () => {
    expect(slotsFor("morning")).toEqual(["morning"]);
    expect(slotsFor("evening")).toEqual(["evening"]);
    expect(slotsFor("both")).toEqual(["morning", "evening"]);
  });

  test("parse and format", () => {
    expect(parseHHmm("21:00")).toEqual({ h: 21, m: 0 });
    expect(parseHHmm("7:05")).toEqual({ h: 7, m: 5 });
    expect(parseHHmm("24:00")).toBeNull();
    expect(parseHHmm("nine")).toBeNull();
    expect(toHHmm(7, 5)).toBe("07:05");
    expect(toHHmm(24, 0)).toBe("00:00");
    expect(toHHmm(-1, 0)).toBe("23:00");
  });

  test("12- and 24-hour clocks", () => {
    expect(formatClock("21:00", true)).toBe("9:00 PM");
    expect(formatClock("00:30", true)).toBe("12:30 AM");
    expect(formatClock("12:00", true)).toBe("12:00 PM");
    expect(formatClock("08:00", false)).toBe("08:00");
  });

  test("stepper hour label", () => {
    expect(hourLabel("21:30", true)).toBe("9 PM");
    expect(hourLabel("00:05", true)).toBe("12 AM");
    expect(hourLabel("07:00", false)).toBe("07");
  });

  test("hour and minute steppers wrap", () => {
    expect(stepHour("23:00", 1)).toBe("00:00");
    expect(stepHour("00:15", -1)).toBe("23:15");
    expect(stepMinutes("21:55", 1)).toBe("21:00");
    expect(stepMinutes("21:00", -1)).toBe("21:55");
    expect(stepMinutes("21:07", 1)).toBe("21:10");
  });

  test("reminder summary follows the ritual", () => {
    expect(ritualTimesLabel("evening", TIMES, true)).toBe("9:00 PM");
    expect(ritualTimesLabel("both", TIMES, true)).toBe("8:00 AM and 9:00 PM");
    expect(ritualTimesLabel("morning", TIMES, false)).toBe("08:00");
  });
});

describe("pause my sky", () => {
  test("choices count tonight and never pass 30 days", () => {
    const opts = pauseOptions(wed);
    expect(opts.map((o) => o.nights)).toEqual([3, 7, 14, 30]);
    expect(opts[0]).toMatchObject({ until: "2026-10-23", resumes: "2026-10-24" });
    expect(opts[1]).toMatchObject({ until: "2026-10-27", resumes: "2026-10-28" });
    expect(opts[3].until).toBe("2026-11-19");
    expect(opts[3].until <= "2026-11-20").toBe(true);
  });

  test("labels", () => {
    expect(formatDay("2026-10-28")).toBe("Wed 28 Oct");
    expect(resumesLabel("2026-10-27")).toBe("Resumes Wed 28 Oct");
    expect(resumesLabel("2026-10-31")).toBe("Resumes Sun 1 Nov");
  });
});

describe("backup summary", () => {
  const backupSummaryLine = (s: Parameters<typeof summaryLine>[0]) => summaryLine(s).replace(/\u00a0/g, " ");
  test("a count never wraps away from its noun", () => {
    expect(summaryLine({ dreams: 1, chapters: 5, proofs: 0, pages: 0, scenes: 0, name: null })).toBe("1\u00a0dream · 5\u00a0chapters");
  });
  test("counts, singular and plural, empty parts left out", () => {
    expect(backupSummaryLine({ dreams: 2, chapters: 14, proofs: 9, pages: 4, scenes: 5, name: "Maya" })).toBe(
      "2 dreams · 14 chapters · 9 proofs · 4 pages · 5 Scenes"
    );
    expect(backupSummaryLine({ dreams: 1, chapters: 1, proofs: 1, pages: 0, scenes: 0, name: null })).toBe("1 dream · 1 chapter · 1 proof");
    expect(backupSummaryLine({ dreams: 0, chapters: 0, proofs: 0, pages: 0, scenes: 0, name: null })).toBe("0 dreams");
  });

  test("export date", () => {
    expect(exportedOn(new Date(2026, 9, 21, 12).toISOString())).toBe("21 Oct 2026");
    expect(exportedOn("not a date")).toBeNull();
  });
});
