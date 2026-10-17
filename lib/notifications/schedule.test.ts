import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { localDateKey } from "@/lib/progress";
import { NOTIFICATIONS } from "@/lib/content/notifications";
import {
  bridge,
  chapter,
  dream,
  dreamState,
  proof,
  season,
  snapshot,
  TEST_LIBRARY,
} from "./fixtures";
import { notificationId, planQueue, planWindow, settleHistory } from "./schedule";
import { isNeutral } from "./templates";
import { emptyTemplateHistory, ID_PREFIX, NOTIFICATION_LIMITS, type PlannedNotification, type TemplateHistory } from "./types";

const ORIGINAL_TZ = process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
beforeEach(() => {
  process.env.TZ = "America/New_York";
});
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

/** Local wall-clock instant in the current zone. */
const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi);
const NOW = () => at(2026, 10, 15, 20, 0); // Thursday 20:00
/** The quiet spell of the default fixture (last act yesterday) already delivered: no quiet-return noise. */
const QUIET_DONE: TemplateHistory = { ...emptyTemplateHistory(), quietSpell: "2026-10-14" };

const plan = (s = snapshot({ lastActDateKey: "2026-10-14" }), now = NOW(), history = QUIET_DONE) =>
  planQueue(s, now, history, TEST_LIBRARY);
const slots = (planned: readonly PlannedNotification[]) => planned.map((n) => n.slot);
const localTimes = (planned: readonly PlannedNotification[]) =>
  planned.map((n) => {
    const d = new Date(n.fireAt);
    return `${localDateKey(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

describe("planQueue: what is never planned (N5)", () => {
  test("reminders off, or no weaving dream", () => {
    expect(plan(snapshot({ enabled: false })).planned).toEqual([]);
    expect(plan(snapshot({ dreams: [] })).planned).toEqual([]);
    const resting = dreamState("d1", { dream: dream("d1", { status: "resting" }) });
    expect(plan(snapshot({ dreams: [resting] })).planned).toEqual([]);
  });

  test("nothing on paused days; reminders resume the day after the pause", () => {
    const { planned } = plan(snapshot({ pausedUntil: "2026-10-18", lastActDateKey: "2026-10-14" }));
    expect(localTimes(planned)[0]).toBe("2026-10-19 21:00");
    expect(planned.every((n) => localDateKey(new Date(n.fireAt)) > "2026-10-18")).toBe(true);
  });

  test("a pause longer than the horizon still plans the resume day and the days after it", () => {
    // 'Two weeks' and '30 nights' (Settings): the queue is rebuilt only while the app is open,
    // so the 10-day horizon must start where the pause ends, or reminders never resume.
    for (const [nights, pausedUntil, resume] of [
      [10, "2026-10-25", "2026-10-26"],
      [14, "2026-10-29", "2026-10-30"],
      [30, "2026-11-14", "2026-11-15"],
    ] as const) {
      const { planned } = plan(snapshot({ pausedUntil, lastActDateKey: "2026-10-14" }));
      expect(planned.length).toBeGreaterThan(0);
      expect(localTimes(planned)[0]).toBe(`${resume} 21:00`);
      expect(planned.every((n) => localDateKey(new Date(n.fireAt)) > pausedUntil)).toBe(true);
      // Ten days of the resumed rhythm (one voice per evening), never more than the pending cap.
      expect(planned.length).toBeLessThanOrEqual(NOTIFICATION_LIMITS.maxPending);
      expect(new Set(planned.map((n) => localDateKey(new Date(n.fireAt)))).size).toBe(10);
      expect(nights).toBeGreaterThanOrEqual(NOTIFICATION_LIMITS.horizonDays);
    }
  });

  test("planWindow: today without a pause, the day after the pause while one runs", () => {
    expect(planWindow(null, NOW()).firstDay).toBe("2026-10-15");
    expect(planWindow("2026-10-14", NOW()).firstDay).toBe("2026-10-15"); // an expired pause
    const w = planWindow("2026-11-14", NOW());
    expect(w.firstDay).toBe("2026-11-15");
    expect(localDateKey(w.from)).toBe("2026-11-15");
    expect([w.from.getHours(), w.from.getMinutes()]).toEqual([0, 0]);
    expect(localDateKey(w.end)).toBe("2026-11-25");
  });
});

describe("planQueue: ritual cues (N1)", () => {
  test("one-off cues at the ritual time for the next 10 days, sorted, inside the horizon", () => {
    const { planned } = plan();
    expect(planned.length).toBe(10);
    expect(localTimes(planned)).toEqual([
      "2026-10-15 21:00", "2026-10-16 21:00", "2026-10-17 21:00", "2026-10-18 21:00", "2026-10-19 21:00",
      "2026-10-20 21:00", "2026-10-21 21:00", "2026-10-22 21:00", "2026-10-23 21:00", "2026-10-24 21:00",
    ]);
    const end = new Date(NOW());
    end.setDate(end.getDate() + NOTIFICATION_LIMITS.horizonDays);
    for (const n of planned) {
      expect(n.slot).toBe("ritual-chapter");
      expect(n.url).toBe("vela://story/c-d1");
      expect(n.dreamId).toBe("d1");
      expect(n.id).toBe(notificationId("ritual-chapter", "d1", n.fireAt));
      expect(n.id.startsWith(ID_PREFIX)).toBe(true);
      expect(Date.parse(n.fireAt)).toBeGreaterThan(NOW().getTime());
      expect(Date.parse(n.fireAt)).toBeLessThanOrEqual(end.getTime());
    }
  });

  test("'both' rituals cue morning and evening", () => {
    const { planned } = plan(snapshot({ ritual: "both", ritualTimes: { morning: "07:30", evening: "21:15" }, lastActDateKey: "2026-10-14" }));
    expect(localTimes(planned).slice(0, 3)).toEqual(["2026-10-15 21:15", "2026-10-16 07:30", "2026-10-16 21:15"]);
    expect(planned.length).toBe(20); // 21:15 tonight, both times through the 24th, 07:30 on the 25th
  });

  test("an open bridge cues the bridge and opens the proof form", () => {
    const heard = chapter("c-d1", "d1", { heardAt: "2026-10-14T22:00:00.000Z" });
    const s = snapshot({
      lastActDateKey: "2026-10-14",
      dreams: [dreamState("d1", { latestChapter: heard, openBridge: bridge("b1", "d1", "c-d1") })],
    });
    const { planned } = plan(s);
    expect(new Set(slots(planned))).toEqual(new Set(["ritual-bridge"]));
    expect(planned[0].url).toBe("vela://evidence/d1");
  });

  test("quiet for the rest of today once the loop is done; back tomorrow", () => {
    const heard = chapter("c-d1", "d1", { number: 3, heardAt: "2026-10-15T23:00:00.000Z" });
    const s = snapshot({
      lastActDateKey: "2026-10-15",
      dreams: [dreamState("d1", { latestChapter: heard, latestProof: proof("p2", "d1", "2026-10-15") })],
    });
    const { planned } = planQueue(s, NOW(), { ...emptyTemplateHistory(), quietSpell: "2026-10-15" }, TEST_LIBRARY);
    expect(localTimes(planned)[0]).toBe("2026-10-16 21:00");
    // Heard, no bridge chosen yet: a bridge cue that opens the chapter's chooser.
    expect(planned[0].slot).toBe("ritual-bridge");
    expect(planned[0].url).toBe("vela://story/c-d1");
  });

  test("a proof today with its new chapter still unheard keeps tonight's cue: that is the payoff", () => {
    const s = snapshot({
      lastActDateKey: "2026-10-15",
      dreams: [dreamState("d1", { latestChapter: chapter("c-d1", "d1", { number: 3 }), latestProof: proof("p2", "d1", "2026-10-15") })],
    });
    const { planned } = planQueue(s, NOW(), { ...emptyTemplateHistory(), quietSpell: "2026-10-15" }, TEST_LIBRARY);
    expect(localTimes(planned)[0]).toBe("2026-10-15 21:00");
    expect(planned[0].title).toBe("Chapter III is waiting");
  });

  test("a complete season whose last chapter is heard asks for nothing", () => {
    const s = snapshot({
      lastActDateKey: "2026-10-14",
      dreams: [
        dreamState("d1", {
          latestChapter: chapter("c-d1", "d1", { number: 7, heardAt: "2026-10-14T22:00:00.000Z" }),
          season: season("d1", 7),
        }),
      ],
    });
    expect(plan(s).planned).toEqual([]);
  });

  test("weaving dreams take turns, stably across rebuilds", () => {
    const s = snapshot({ lastActDateKey: "2026-10-14", dreams: [dreamState("d1"), dreamState("d2")] });
    const first = plan(s).planned;
    expect(new Set(first.map((n) => n.dreamId))).toEqual(new Set(["d1", "d2"]));
    for (let i = 1; i < first.length; i += 1) expect(first[i].dreamId).not.toBe(first[i - 1].dreamId);
    // An hour later (before the first cue fires) every surviving cue keeps its dream.
    const later = plan(s, at(2026, 10, 15, 20, 30)).planned;
    expect(later.map((n) => n.id)).toEqual(first.map((n) => n.id));
  });

  test("a dream with nothing to ask gives its turn to the next one", () => {
    const done = dreamState("d1", {
      latestChapter: chapter("c-d1", "d1", { number: 7, heardAt: "2026-10-14T22:00:00.000Z" }),
      season: season("d1", 7),
    });
    const { planned } = plan(snapshot({ lastActDateKey: "2026-10-14", dreams: [done, dreamState("d2")] }));
    expect(planned.length).toBe(10);
    expect(new Set(planned.map((n) => n.dreamId))).toEqual(new Set(["d2"]));
  });
});

describe("planQueue: specific moments", () => {
  test("the if-then cue fires at remindAt and the nearby ritual cue yields", () => {
    const remindAt = at(2026, 10, 16, 9, 0).toISOString();
    const heard = chapter("c-d1", "d1", { heardAt: "2026-10-15T01:00:00.000Z" });
    const s = snapshot({
      ritual: "both",
      ritualTimes: { morning: "08:30", evening: "21:00" },
      lastActDateKey: "2026-10-14",
      dreams: [
        dreamState("d1", {
          latestChapter: heard,
          openBridge: bridge("b1", "d1", "c-d1", { remindAt, ifThen: { when: "9am", then: "Open the portfolio file." } }),
        }),
      ],
    });
    const { planned } = plan(s);
    const times = localTimes(planned);
    expect(times).toContain("2026-10-16 09:00");
    expect(times).not.toContain("2026-10-16 08:30");
    expect(times).toContain("2026-10-17 08:30");
    const ifthen = planned.find((n) => n.slot === "ifthen")!;
    expect(ifthen.url).toBe("vela://evidence/d1");
    expect(ifthen.templateId).toBe("if1"); // private by default: the neutral one
  });

  test("with the Lock Screen privacy off, the if-then quotes the user's plan", () => {
    const s = snapshot({
      lockScreenPrivate: false,
      lastActDateKey: "2026-10-14",
      dreams: [
        dreamState("d1", {
          openBridge: bridge("b1", "d1", "c-d1", {
            remindAt: at(2026, 10, 16, 9).toISOString(),
            ifThen: { when: "9am", then: "Open the portfolio file." },
          }),
        }),
      ],
    });
    // if1 is first in the library; rotation moves on to if2 once if1 was delivered.
    const history: TemplateHistory = { ...QUIET_DONE, used: { ifthen: ["if1"] } };
    const ifthen = planQueue(s, NOW(), history, TEST_LIBRARY).planned.find((n) => n.slot === "ifthen")!;
    expect(ifthen.title).toBe("It’s 9am");
    expect(ifthen.body).toBe("Time to open the portfolio file.");
  });

  test("a chapter saved for later fires at savedForAt; no ritual cue for it that day", () => {
    const savedForAt = at(2026, 10, 16, 21, 0).toISOString();
    const s = snapshot({
      lastActDateKey: "2026-10-15",
      dreams: [dreamState("d1", { latestChapter: chapter("c-d1", "d1", { number: 3, savedForAt }) })],
    });
    const { planned } = planQueue(s, NOW(), { ...emptyTemplateHistory(), quietSpell: "2026-10-15" }, TEST_LIBRARY);
    expect(localTimes(planned).slice(0, 2)).toEqual(["2026-10-16 21:00", "2026-10-17 21:00"]);
    expect(slots(planned).slice(0, 2)).toEqual(["next-woven", "ritual-chapter"]);
    expect(planned[0].url).toBe("vela://story/c-d1");
    expect(planned[0].title).toBe("Chapter III is ready");
  });

  test("the Sunday ledger once the week holds two proofs, in place of that evening's cue", () => {
    const s = snapshot({ lastActDateKey: "2026-10-14", proofDateKeys: ["2026-10-12", "2026-10-14", "2026-10-05"] });
    const { planned } = plan(s);
    const ledger = planned.filter((n) => n.slot === "ledger");
    expect(localTimes(ledger)).toEqual(["2026-10-18 21:00"]);
    expect(ledger[0].url).toBe("vela://");
    expect(ledger[0].dreamId).toBeNull();
    expect(ledger[0].body).toBe("two proofs this week. Your ledger is ready.");
    expect(localTimes(planned.filter((n) => n.slot !== "ledger"))).not.toContain("2026-10-18 21:00");
  });

  test("no ledger for a thin week", () => {
    const s = snapshot({ lastActDateKey: "2026-10-14", proofDateKeys: ["2026-10-14"] });
    expect(slots(plan(s).planned)).not.toContain("ledger");
  });
});

describe("planQueue: quiet return", () => {
  test("after three quiet days, once, at the next ritual time", () => {
    const s = snapshot({ lastActDateKey: "2026-10-10" });
    const { planned, history } = planQueue(s, NOW(), emptyTemplateHistory(), TEST_LIBRARY);
    expect(planned[0].slot).toBe("quiet-return");
    expect(localTimes(planned)[0]).toBe("2026-10-15 21:00");
    expect(planned[0].url).toBe("vela://");
    expect(planned.filter((n) => n.slot === "quiet-return").length).toBe(1);
    expect(history.pending?.find((p) => p.slot === "quiet-return")?.spell).toBe("2026-10-10");

    // Delivered: the same quiet spell never gets a second one.
    const after = planQueue(s, at(2026, 10, 15, 21, 5), history, TEST_LIBRARY);
    expect(after.history.quietSpell).toBe("2026-10-10");
    expect(slots(after.planned)).not.toContain("quiet-return");
  });

  test("a recent act schedules it four days out; paused days never count as quiet", () => {
    const fresh = planQueue(snapshot({ lastActDateKey: "2026-10-14" }), NOW(), emptyTemplateHistory(), TEST_LIBRARY);
    expect(localTimes(fresh.planned.filter((n) => n.slot === "quiet-return"))).toEqual(["2026-10-18 21:00"]);

    const paused = planQueue(
      snapshot({ lastActDateKey: "2026-10-01", pausedUntil: "2026-10-14" }),
      NOW(),
      emptyTemplateHistory(),
      TEST_LIBRARY
    );
    expect(localTimes(paused.planned.filter((n) => n.slot === "quiet-return"))).toEqual(["2026-10-18 21:00"]);
  });

  test("never acted: the spell starts with the first dream", () => {
    const s = snapshot({ lastActDateKey: null, dreams: [dreamState("d1", { dream: dream("d1", { createdAt: "2026-10-13T15:00:00.000Z" }) })] });
    const quiet = planQueue(s, NOW(), emptyTemplateHistory(), TEST_LIBRARY).planned.filter((n) => n.slot === "quiet-return");
    expect(localTimes(quiet)).toEqual(["2026-10-17 21:00"]);
  });
});

describe("planQueue: copy (N4)", () => {
  test("rotates without replacement and never repeats back-to-back", () => {
    const { planned } = plan();
    const ids = planned.map((n) => n.templateId);
    // Private: rc3 quotes the desire, so only rc1 and rc2 are eligible.
    expect(ids.slice(0, 4)).toEqual(["rc1", "rc2", "rc1", "rc2"]);
    for (let i = 1; i < ids.length; i += 1) expect(ids[i]).not.toBe(ids[i - 1]);
  });

  test("delivered templates are skipped until the cycle is spent", () => {
    const history: TemplateHistory = { ...QUIET_DONE, used: { "ritual-chapter": ["rc1"] } };
    expect(plan(undefined, undefined, history).planned[0].templateId).toBe("rc2");
  });

  test("Lock Screen privacy: no personal words anywhere by default", () => {
    const personal = dreamState("d1", {
      openBridge: bridge("b1", "d1", "c-d1", { remindAt: at(2026, 10, 16, 9).toISOString(), ifThen: { when: "9am", then: "call Sam" } }),
      latestProof: proof("p1", "d1", "2026-10-14"),
    });
    const { planned } = plan(snapshot({ lastActDateKey: "2026-10-14", dreams: [personal] }));
    for (const n of planned) {
      const copy = `${n.title} ${n.body}`;
      expect(copy).not.toContain("design studio");
      expect(copy).not.toContain("portfolio");
      expect(copy).not.toContain("call Sam");
      expect(copy).not.toContain("trust");
    }
  });

  test("privacy off: the user's own words, in curly quotes, trailing period dropped", () => {
    const { planned } = plan(snapshot({ lockScreenPrivate: false, lastActDateKey: "2026-10-14" }));
    expect(planned.map((n) => n.templateId).slice(0, 3)).toEqual(["rc1", "rc2", "rc3"]);
    expect(planned[2].title).toBe("For “my own design studio”");
  });

  test("a template that overflows with the user's words is skipped, never truncated", () => {
    const long = dreamState("d1", { dream: dream("d1", { desire: "a quiet house by the sea where my whole family can gather every summer" }) });
    const { planned } = plan(snapshot({ lockScreenPrivate: false, lastActDateKey: "2026-10-14", dreams: [long] }));
    expect(planned.map((n) => n.templateId)).not.toContain("rc3");
    for (const n of planned) {
      expect(n.title.length).toBeLessThanOrEqual(NOTIFICATION_LIMITS.maxTitleChars);
      expect(n.body.length).toBeLessThanOrEqual(NOTIFICATION_LIMITS.maxBodyChars);
    }
  });

  test("the empty name falls back to 'friend'", () => {
    expect(plan(snapshot({ name: "  ", lastActDateKey: "2026-10-14" })).planned[0].body).toBe("Whenever you are ready, friend.");
  });

  test("the shipped library plans neutral copy with every token filled", () => {
    const { planned } = planQueue(snapshot({ lastActDateKey: "2026-10-10" }), NOW(), emptyTemplateHistory(), NOTIFICATIONS);
    expect(planned.length).toBeGreaterThan(0);
    for (const n of planned) {
      expect(`${n.title} ${n.body}`).not.toMatch(/[{}]/);
      const template = NOTIFICATIONS[n.slot].find((t) => t.id === n.templateId)!;
      expect(isNeutral(template)).toBe(true);
    }
  });
});

describe("planQueue: bounds and stability", () => {
  test("at most 40 pending, earliest first", () => {
    const dreams = Array.from({ length: 30 }, (_, i) =>
      dreamState(`d${i}`, {
        openBridge: bridge(`b${i}`, `d${i}`, `c-d${i}`, { remindAt: at(2026, 10, 16, 6, i).toISOString() }),
      })
    );
    const { planned } = plan(snapshot({ ritual: "both", lastActDateKey: "2026-10-14", dreams }));
    expect(planned.length).toBe(NOTIFICATION_LIMITS.maxPending);
    const times = planned.map((n) => Date.parse(n.fireAt));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(planned.map((n) => n.id)).size).toBe(planned.length);
  });

  test("same inputs, same plan; the history remembers it as pending", () => {
    const a = plan();
    const b = plan();
    expect(b).toEqual(a);
    expect(a.history.pending?.map((p) => p.id)).toEqual(a.planned.map((n) => n.id));
    expect(a.history.used).toEqual(QUIET_DONE.used);
  });

  test("settleHistory moves delivered templates into the rotation", () => {
    const first = plan();
    const settled = settleHistory(first.history, at(2026, 10, 16, 21, 30));
    expect(settled.used["ritual-chapter"]).toEqual(["rc1", "rc2"]);
    expect(settled.pending?.length).toBe(8);
    // A repeat means a new cycle began.
    const third = settleHistory(settled, at(2026, 10, 17, 21, 30));
    expect(third.used["ritual-chapter"]).toEqual(["rc1"]);
  });
});

describe("planQueue: DST and timezones", () => {
  test("fall back: every cue stays at 21:00 local; that day lasts 25 hours", () => {
    const { planned } = plan(snapshot({ lastActDateKey: "2026-10-29" }), at(2026, 10, 30, 12), {
      ...emptyTemplateHistory(),
      quietSpell: "2026-10-29",
    });
    for (const n of planned) expect(new Date(n.fireAt).getHours()).toBe(21);
    const oct31 = planned.find((n) => localDateKey(new Date(n.fireAt)) === "2026-10-31")!;
    const nov1 = planned.find((n) => localDateKey(new Date(n.fireAt)) === "2026-11-01")!;
    expect(Date.parse(nov1.fireAt) - Date.parse(oct31.fireAt)).toBe(25 * 60 * 60 * 1000);
  });

  test("spring forward: a ritual time inside the skipped hour fires once, just after the gap", () => {
    const s = snapshot({ ritual: "morning", ritualTimes: { morning: "02:30", evening: "21:00" }, lastActDateKey: "2026-03-06" });
    const { planned } = planQueue(s, at(2026, 3, 7, 12), { ...emptyTemplateHistory(), quietSpell: "2026-03-06" }, TEST_LIBRARY);
    const days = planned.map((n) => localDateKey(new Date(n.fireAt)));
    expect(new Set(days).size).toBe(days.length);
    expect(days).toContain("2026-03-08");
    const gapDay = planned.find((n) => localDateKey(new Date(n.fireAt)) === "2026-03-08")!;
    expect(new Date(gapDay.fireAt).getHours()).toBe(3);
  });

  test("a timezone change replans at the new local ritual time with new identifiers", () => {
    const ny = plan();
    process.env.TZ = "Asia/Tokyo";
    const tokyoNow = new Date(NOW().getTime()); // the same instant
    const tokyo = plan(undefined, tokyoNow);
    for (const n of tokyo.planned) expect(new Date(n.fireAt).getHours()).toBe(21);
    const nyIds = new Set(ny.planned.map((n) => n.id));
    expect(tokyo.planned.some((n) => nyIds.has(n.id))).toBe(false);
  });
});
