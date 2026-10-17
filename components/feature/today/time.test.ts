import { describe, expect, test } from "bun:test";
import { MAX_REFRESH_MS, chapterEyebrow, dayMonth, dreamDay, greetingFor, nextRefreshAt, nextRitual, relativeDay, saveForLabel, wallTime } from "./time";

const at = (h: number, m = 0, day = 21) => new Date(2026, 9, day, h, m, 0, 0);
const TIMES = { morning: "08:00", evening: "21:00" };

describe("greeting and eyebrow", () => {
  test("daypart greeting", () => {
    expect(greetingFor(at(5))).toBe("Good morning");
    expect(greetingFor(at(11, 59))).toBe("Good morning");
    expect(greetingFor(at(12))).toBe("Good afternoon");
    expect(greetingFor(at(21, 4))).toBe("Good evening");
    expect(greetingFor(at(2))).toBe("Good evening");
  });

  test("chapter eyebrow", () => {
    expect(chapterEyebrow(at(21, 4))).toBe("Tonight’s chapter");
    expect(chapterEyebrow(at(8))).toBe("This morning’s chapter");
    expect(chapterEyebrow(at(14))).toBe("Today’s chapter");
  });
});

describe("nextRitual", () => {
  test("evening ritual later today", () => {
    const n = nextRitual("evening", TIMES, at(12, 40));
    expect(n?.hhmm).toBe("21:00");
    expect(n?.tomorrow).toBe(false);
    expect(n?.at.getHours()).toBe(21);
    expect(n && saveForLabel(n)).toBe("Save for 21:00");
  });

  test("after today's ritual it is tomorrow's", () => {
    const n = nextRitual("evening", TIMES, at(21, 4));
    expect(n?.tomorrow).toBe(true);
    expect(n?.at.getDate()).toBe(22);
    expect(n && saveForLabel(n)).toBe("Save for tomorrow, 21:00");
  });

  test("both picks whichever comes first", () => {
    expect(nextRitual("both", TIMES, at(6))?.hhmm).toBe("08:00");
    expect(nextRitual("both", TIMES, at(9))?.hhmm).toBe("21:00");
    const late = nextRitual("both", TIMES, at(22));
    expect(late?.hhmm).toBe("08:00");
    expect(late?.tomorrow).toBe(true);
  });

  test("malformed times are skipped", () => {
    expect(nextRitual("morning", { morning: "8am", evening: "21:00" }, at(6))).toBeNull();
  });
});

describe("day phrases", () => {
  test("relative day", () => {
    expect(relativeDay("2026-10-21", at(21))).toBe("today");
    expect(relativeDay("2026-10-20", at(21))).toBe("yesterday");
    expect(relativeDay("2026-10-14", at(21))).toBe("on 14 October");
  });

  test("dayMonth and wallTime", () => {
    expect(dayMonth("2026-01-03")).toBe("3 January");
    expect(wallTime(at(21).toISOString())).toBe("21:00");
  });

  test("dream day counts the first day as Day 1", () => {
    const created = at(21, 2, 7).toISOString();
    expect(dreamDay(created, "2026-10-07")).toBe(1);
    expect(dreamDay(created, "2026-10-15")).toBe(9);
  });
});

describe("nextRefreshAt: Today never keeps yesterday's clock", () => {
  test("the next whole hour, so the greeting, the eyebrow and midnight all land", () => {
    expect(nextRefreshAt(at(21, 4)).getTime()).toBe(at(22).getTime());
    expect(nextRefreshAt(at(23, 59)).getTime()).toBe(new Date(2026, 9, 22, 0, 0, 0, 0).getTime());
    expect(nextRefreshAt(at(11, 59)).getHours()).toBe(12);
  });

  test("an earlier boundary wins: a chapter saved for 21:30 opens at 21:30", () => {
    const savedFor = at(21, 30).toISOString();
    expect(nextRefreshAt(at(21, 4), [savedFor]).getTime()).toBe(at(21, 30).getTime());
    // past, missing or later-than-the-hour boundaries change nothing
    expect(nextRefreshAt(at(21, 4), [at(20).toISOString(), null, undefined, "nope", at(23).toISOString()]).getTime()).toBe(at(22).getTime());
  });

  test("always strictly after now, never more than an hour away", () => {
    for (const t of [at(0), at(0, 0, 1), at(12, 0), at(21, 59)]) {
      const next = nextRefreshAt(t).getTime();
      expect(next).toBeGreaterThan(t.getTime());
      expect(next - t.getTime()).toBeLessThanOrEqual(MAX_REFRESH_MS);
    }
  });

  test("a saved-for time read on a stale card: the loop sees tomorrow once the clock moves on", () => {
    // Saved last night for 21:00; reopened the next evening at 20:12: the next look is 21:00, when it opens.
    const tonight = new Date(2026, 9, 22, 21, 0, 0, 0).toISOString();
    expect(nextRefreshAt(new Date(2026, 9, 22, 20, 12), [tonight]).getTime()).toBe(Date.parse(tonight));
  });
});
