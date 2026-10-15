import { afterEach, describe, expect, test } from "bun:test";
import type { Proof } from "@/contexts/arc.types";
import {
  addDays,
  DAYS_KEPT,
  daysBetween,
  emptyProgress,
  isDateKey,
  isPaused,
  lastActDateKey,
  localDateKey,
  maxPauseUntil,
  parseProgress,
  pauseUntil,
  progressFromRitualV1,
  recordAct,
  resumeProgress,
  setRhythmTarget,
  shouldShowLedger,
  summarize,
  weekdayIndex,
  weeklyLedger,
  weeklyRhythm,
  weekStartKey,
  type ProgressState,
} from "./progress";

// bun runs every test file in one process, so restore the zone after each test.
const ORIGINAL_TZ = process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

/** Local wall-clock instant in the CURRENT zone. */
const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi);

function withDays(days: string[], extra: Partial<ProgressState> = {}): ProgressState {
  return { ...emptyProgress(), days, nightsShownUp: days.length, ...extra };
}

function proof(id: string, dateKey: string, kind: Proof["kind"], text: string, createdAt = `${dateKey}T10:00:00.000Z`): Proof {
  return {
    id,
    dreamId: "d1",
    bridgeId: null,
    kind,
    text,
    photoUri: null,
    createdAt,
    dateKey,
    wovenInChapterId: null,
    starIndex: 1,
    season: 1,
    origin: "bridge",
  };
}

describe("day keys", () => {
  test("validate real calendar dates only", () => {
    expect(isDateKey("2026-10-15")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-10-15T00:00")).toBe(false);
    expect(isDateKey(20261015)).toBe(false);
  });

  test("calendar arithmetic ignores DST and month ends", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-10-25", "2026-11-01")).toBe(7);
    expect(daysBetween("2026-11-01", "2026-10-25")).toBe(-7);
  });

  test("weeks run Monday to Sunday", () => {
    expect(weekdayIndex("2026-10-12")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-18")).toBe(6); // Sunday
    expect(weekStartKey(at(2026, 10, 18, 23, 59))).toBe("2026-10-12");
    expect(weekStartKey(at(2026, 10, 19, 0, 1))).toBe("2026-10-19");
  });
});

describe("recordAct", () => {
  test("one night per distinct local day, every act counted for life", () => {
    let s = emptyProgress();
    s = recordAct(s, "chapter-heard", at(2026, 10, 15, 8));
    s = recordAct(s, "proof", at(2026, 10, 15, 21));
    s = recordAct(s, "proof", at(2026, 10, 15, 22));
    expect(s.nightsShownUp).toBe(1);
    expect(s.days).toEqual(["2026-10-15"]);
    expect(s.today).toEqual({ dateKey: "2026-10-15", acts: ["chapter-heard", "proof"] });
    expect(s.lifetime).toEqual({ "chapter-heard": 1, proof: 2, "line-carried": 0, "ritual-saved": 0 });

    s = recordAct(s, "line-carried", at(2026, 10, 16, 7));
    expect(s.nightsShownUp).toBe(2);
    expect(s.today).toEqual({ dateKey: "2026-10-16", acts: ["line-carried"] });
  });

  test("a day key is the LOCAL date, not the UTC one", () => {
    process.env.TZ = "America/Los_Angeles";
    // 2026-10-15 23:30 in LA is already the 16th in UTC.
    const s = recordAct(emptyProgress(), "proof", at(2026, 10, 15, 23, 30));
    expect(s.days).toEqual(["2026-10-15"]);
  });

  test("nightsShownUp survives pruning and never decreases (P2)", () => {
    const start = "2025-01-01";
    const days = Array.from({ length: DAYS_KEPT }, (_, i) => addDays(start, i));
    let s = withDays(days, { nightsShownUp: 900 });
    s = recordAct(s, "proof", at(2026, 10, 15));
    expect(s.days.length).toBe(DAYS_KEPT);
    expect(s.days[0]).toBe("2025-01-02");
    expect(s.nightsShownUp).toBe(901);
    // A day older than everything kept may have been pruned: never double-count it.
    const back = recordAct(s, "proof", new Date(2024, 5, 1, 12));
    expect(back.nightsShownUp).toBe(901);
    expect(back.days).toBe(s.days);
  });

  test("DST spring-forward and fall-back days are still one night each", () => {
    process.env.TZ = "America/New_York";
    let s = emptyProgress();
    // 2026-03-08: clocks jump 02:00 → 03:00. 2026-11-01: 02:00 → 01:00.
    s = recordAct(s, "proof", at(2026, 3, 8, 0, 30));
    s = recordAct(s, "chapter-heard", at(2026, 3, 8, 23, 30));
    s = recordAct(s, "proof", at(2026, 11, 1, 1, 30));
    s = recordAct(s, "chapter-heard", at(2026, 11, 1, 23, 59));
    expect(s.days).toEqual(["2026-03-08", "2026-11-01"]);
    expect(s.nightsShownUp).toBe(2);
  });

  test("a timezone change counts the day the user actually lives in", () => {
    process.env.TZ = "America/New_York";
    const instant = Date.UTC(2026, 9, 16, 3, 30); // 23:30 on the 15th in New York
    let s = recordAct(emptyProgress(), "proof", new Date(instant));
    expect(s.days).toEqual(["2026-10-15"]);

    // Same instant, now in Tokyo: it is 12:30 on the 16th there. A new local day.
    process.env.TZ = "Asia/Tokyo";
    s = recordAct(s, "chapter-heard", new Date(instant + 60_000));
    expect(s.days).toEqual(["2026-10-15", "2026-10-16"]);
    expect(s.nightsShownUp).toBe(2);

    // Flying back west lands on an already-counted day: no double count.
    process.env.TZ = "America/Los_Angeles";
    s = recordAct(s, "proof", new Date(Date.UTC(2026, 9, 17, 4, 0))); // 21:00 on the 16th in LA
    expect(s.days).toEqual(["2026-10-15", "2026-10-16"]);
    expect(s.nightsShownUp).toBe(2);
  });

  test("a clock moved back to an earlier, uncounted day inserts it in order", () => {
    let s = withDays(["2026-10-10", "2026-10-15"]);
    s = recordAct(s, "proof", at(2026, 10, 12));
    expect(s.days).toEqual(["2026-10-10", "2026-10-12", "2026-10-15"]);
    expect(s.nightsShownUp).toBe(3);
    expect(lastActDateKey(s)).toBe("2026-10-15");
  });
});

describe("rhythm target", () => {
  test("clamps to 3..7 and ignores non-numbers", () => {
    expect(setRhythmTarget(emptyProgress(), 9).rhythmTarget).toBe(7);
    expect(setRhythmTarget(emptyProgress(), 1).rhythmTarget).toBe(3);
    expect(setRhythmTarget(emptyProgress(), 5.4).rhythmTarget).toBe(5);
    expect(setRhythmTarget(emptyProgress(), Number.NaN).rhythmTarget).toBe(4);
  });
});

describe("pause my sky", () => {
  const now = at(2026, 10, 15, 9);

  test("pauses through the chosen day, inclusive, and resumes after", () => {
    const s = pauseUntil(emptyProgress(), "2026-10-20", now);
    expect(s.pausedUntil).toBe("2026-10-20");
    expect(s.pausedFrom).toBe("2026-10-15");
    expect(isPaused(s, at(2026, 10, 20, 23, 59))).toBe(true);
    expect(isPaused(s, at(2026, 10, 21, 0, 1))).toBe(false);
  });

  test("never longer than MAX_PAUSE_DAYS", () => {
    expect(maxPauseUntil(now)).toBe("2026-11-14");
    expect(pauseUntil(emptyProgress(), "2027-01-01", now).pausedUntil).toBe("2026-11-14");
  });

  test("a past day or a malformed one never pauses", () => {
    const paused = pauseUntil(emptyProgress(), "2026-10-20", now);
    expect(pauseUntil(paused, "2026-10-01", now).pausedUntil).toBeNull();
    expect(pauseUntil(emptyProgress(), "soon", now)).toEqual(emptyProgress());
  });

  test("extending a running pause keeps its first day", () => {
    const first = pauseUntil(emptyProgress(), "2026-10-18", now);
    const extended = pauseUntil(first, "2026-10-25", at(2026, 10, 17));
    expect(extended.pausedFrom).toBe("2026-10-15");
    expect(extended.pausedUntil).toBe("2026-10-25");
  });

  test("resume clears it", () => {
    const s = resumeProgress(pauseUntil(emptyProgress(), "2026-10-20", now));
    expect(s.pausedUntil).toBeNull();
    expect(isPaused(s, now)).toBe(false);
  });
});

describe("weeklyRhythm", () => {
  test("rest nights, never missed ones (P3)", () => {
    // Thursday 2026-10-15; shown up Monday and Wednesday.
    const s = withDays(["2026-10-12", "2026-10-14"]);
    const week = weeklyRhythm(s, at(2026, 10, 15, 20));
    expect(week.weekStart).toBe("2026-10-12");
    expect(week.days.map((d) => d.state)).toEqual([
      "shown-up", "rest", "shown-up", "today-open", "future", "future", "future",
    ]);
    expect(week.days.map((d) => d.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(week.shownUp).toBe(2);
    expect(week.target).toBe(4);
    expect(week.met).toBe(false);
  });

  test("met once shown up target times", () => {
    const s = withDays(["2026-10-12", "2026-10-13", "2026-10-14"], { rhythmTarget: 3 });
    expect(weeklyRhythm(s, at(2026, 10, 15)).met).toBe(true);
  });

  test("the week boundary: Sunday 23:59 and Monday 00:01 are different weeks", () => {
    const s = withDays(["2026-10-12", "2026-10-18"]);
    const sunday = weeklyRhythm(s, at(2026, 10, 18, 23, 59));
    expect(sunday.weekStart).toBe("2026-10-12");
    expect(sunday.shownUp).toBe(2);
    expect(sunday.days[6]).toEqual({ dateKey: "2026-10-18", index: 6, state: "shown-up" });

    const monday = weeklyRhythm(s, at(2026, 10, 19, 0, 1));
    expect(monday.weekStart).toBe("2026-10-19");
    expect(monday.shownUp).toBe(0);
    expect(monday.days[0].state).toBe("today-open");
  });

  test("seven distinct consecutive days across a DST change", () => {
    process.env.TZ = "Europe/London"; // clocks go back on 2026-10-25 (Sunday)
    const week = weeklyRhythm(emptyProgress(), at(2026, 10, 25, 1, 30));
    expect(week.days.map((d) => d.dateKey)).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
    process.env.TZ = "America/New_York"; // clocks go forward on 2026-03-08 (Sunday)
    const spring = weeklyRhythm(emptyProgress(), at(2026, 3, 9, 0, 30));
    expect(spring.weekStart).toBe("2026-03-09");
  });

  test("paused days render as paused; earlier rest nights stay rest", () => {
    let s = withDays(["2026-10-12"]);
    s = pauseUntil(s, "2026-10-16", at(2026, 10, 14, 9));
    const week = weeklyRhythm(s, at(2026, 10, 15, 9));
    expect(week.days.map((d) => d.state)).toEqual([
      "shown-up", "rest", "paused", "paused", "paused", "future", "future",
    ]);
  });

  test("showing up during a pause still counts", () => {
    let s = pauseUntil(emptyProgress(), "2026-10-20", at(2026, 10, 15));
    s = recordAct(s, "chapter-heard", at(2026, 10, 16));
    expect(weeklyRhythm(s, at(2026, 10, 16)).days[4].state).toBe("shown-up");
  });
});

describe("summarize", () => {
  test("chip, today's acts and pause in one call", () => {
    let s = recordAct(emptyProgress(), "proof", at(2026, 10, 15, 8));
    s = pauseUntil(s, "2026-10-17", at(2026, 10, 15, 9));
    const sum = summarize(s, 9, at(2026, 10, 15, 21));
    expect(sum.chipLabel).toBe("1 night · 9 stars");
    expect(sum.doneToday).toEqual(["proof"]);
    expect(sum.paused).toBe(true);
    expect(sum.pausedUntil).toBe("2026-10-17");

    const later = summarize(s, 9, at(2026, 10, 18, 9));
    expect(later.doneToday).toEqual([]);
    expect(later.paused).toBe(false);
    expect(later.pausedUntil).toBeNull();
  });
});

describe("parseProgress", () => {
  test("round-trips a real state, from an object or a JSON string", () => {
    let s = recordAct(emptyProgress(), "proof", at(2026, 10, 15));
    s = pauseUntil(setRhythmTarget(s, 6), "2026-10-20", at(2026, 10, 15));
    expect(parseProgress(s)).toEqual(s);
    expect(parseProgress(JSON.stringify(s))).toEqual(s);
  });

  test("anything malformed becomes empty", () => {
    for (const raw of [null, undefined, 42, "not json", "[]", [], "null"]) {
      expect(parseProgress(raw)).toEqual(emptyProgress());
    }
  });

  test("repairs rows leniently and never lets nights fall below the kept days", () => {
    const parsed = parseProgress({
      days: ["2026-10-15", "bad", "2026-10-14", "2026-10-15", "2026-13-01"],
      nightsShownUp: -3,
      today: { dateKey: "2026-10-15", acts: ["proof", "dance", "proof"] },
      rhythmTarget: 12,
      pausedUntil: "someday",
      lifetime: { proof: 3.7, "chapter-heard": "x" },
    });
    expect(parsed.days).toEqual(["2026-10-14", "2026-10-15"]);
    expect(parsed.nightsShownUp).toBe(2);
    expect(parsed.today).toEqual({ dateKey: "2026-10-15", acts: ["proof"] });
    expect(parsed.rhythmTarget).toBe(7);
    expect(parsed.pausedUntil).toBeNull();
    expect(parsed.lifetime).toEqual({ "chapter-heard": 0, proof: 3, "line-carried": 0, "ritual-saved": 0 });
  });
});

describe("progressFromRitualV1", () => {
  test("carries 1.0 days into nights and maps today's practices to acts", () => {
    const v1 = JSON.stringify({
      days: ["2026-10-13", "2026-10-15", "2026-10-14", "2026-10-15"],
      todayKey: "2026-10-15",
      todayDone: ["story", "script", "unknown"],
    });
    const s = progressFromRitualV1(v1);
    expect(s.days).toEqual(["2026-10-13", "2026-10-14", "2026-10-15"]);
    expect(s.nightsShownUp).toBe(3);
    expect(s.today).toEqual({ dateKey: "2026-10-15", acts: ["chapter-heard", "ritual-saved"] });
    expect(s.lifetime).toEqual({ "chapter-heard": 1, proof: 0, "line-carried": 0, "ritual-saved": 1 });
    expect(s.rhythmTarget).toBe(4);
    expect(s.pausedUntil).toBeNull();
  });

  test("an absent or broken 1.0 value is a fresh start", () => {
    expect(progressFromRitualV1(null)).toEqual(emptyProgress());
    expect(progressFromRitualV1("{oops")).toEqual(emptyProgress());
    expect(progressFromRitualV1({ days: "x", todayKey: 3, todayDone: null })).toEqual(emptyProgress());
  });
});

describe("weekly Proof Ledger", () => {
  const proofs = [
    proof("p0", "2026-10-11", "did", "Sunday before: not this week"),
    proof("p1", "2026-10-12", "learned", "Learned that mornings work better for calls"),
    proof("p2", "2026-10-14", "moved", "Drafted the portfolio intro"),
    proof("p3", "2026-10-16", "did", "Sent my portfolio to two studios"),
    proof("p4", "2026-10-18", "did", "Booked the call"),
    proof("p5", "2026-10-19", "did", "Next Monday: not this week"),
  ];

  test("counts the Monday–Sunday week and features the strongest sentence", () => {
    const ledger = weeklyLedger(proofs, at(2026, 10, 18, 20));
    expect(ledger.weekStart).toBe("2026-10-12");
    expect(ledger.weekEnd).toBe("2026-10-18");
    expect(ledger.total).toBe(4);
    expect(ledger.counts).toEqual({ did: 2, moved: 1, learned: 1 });
    expect(ledger.sentenceOfWeek?.id).toBe("p3");
  });

  test("shows on Sunday only, and only with at least two proofs", () => {
    expect(shouldShowLedger(weeklyLedger(proofs, at(2026, 10, 18, 9)), at(2026, 10, 18, 9))).toBe(true);
    expect(shouldShowLedger(weeklyLedger(proofs, at(2026, 10, 17)), at(2026, 10, 17))).toBe(false);
    const thin = weeklyLedger([proofs[3]], at(2026, 10, 18));
    expect(thin.sentenceOfWeek?.id).toBe("p3");
    expect(shouldShowLedger(thin, at(2026, 10, 18))).toBe(false);
  });

  test("an empty week has no sentence", () => {
    const ledger = weeklyLedger([], at(2026, 10, 18));
    expect(ledger.total).toBe(0);
    expect(ledger.sentenceOfWeek).toBeNull();
  });

  test("Sunday is the local Sunday", () => {
    process.env.TZ = "Pacific/Auckland";
    // 2026-10-18 09:00 in Auckland is still Saturday in UTC.
    const now = new Date(Date.UTC(2026, 9, 17, 20, 0));
    expect(localDateKey(now)).toBe("2026-10-18");
    expect(shouldShowLedger(weeklyLedger(proofs, now), now)).toBe(true);
  });
});
