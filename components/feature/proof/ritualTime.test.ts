import { describe, expect, test } from "bun:test";
import { nextRitual } from "./ritualTime";

const times = { morning: "08:00", evening: "21:00" };

describe("nextRitual", () => {
  test("evening ritual later today", () => {
    const slot = nextRitual({ ritual: "evening", ritualTimes: times }, new Date(2026, 9, 21, 12, 40));
    expect(slot.label).toBe("21:00");
    expect(slot.at).toEqual(new Date(2026, 9, 21, 21, 0));
    expect(slot.later).toBe(false);
  });
  test("an evening ritual that has passed rolls to tomorrow", () => {
    const slot = nextRitual({ ritual: "evening", ritualTimes: times }, new Date(2026, 9, 21, 21, 4));
    expect(slot.at).toEqual(new Date(2026, 9, 22, 21, 0));
    expect(slot.later).toBe(true);
  });
  test("exactly at the ritual time means the next one", () => {
    expect(nextRitual({ ritual: "evening", ritualTimes: times }, new Date(2026, 9, 21, 21, 0)).at).toEqual(new Date(2026, 9, 22, 21, 0));
  });
  test("both rituals pick the earlier upcoming one", () => {
    expect(nextRitual({ ritual: "both", ritualTimes: times }, new Date(2026, 9, 21, 12, 0)).label).toBe("21:00");
    expect(nextRitual({ ritual: "both", ritualTimes: times }, new Date(2026, 9, 21, 22, 0)).at).toEqual(new Date(2026, 9, 22, 8, 0));
    expect(nextRitual({ ritual: "both", ritualTimes: times }, new Date(2026, 9, 21, 6, 0)).label).toBe("08:00");
  });
  test("month ends roll over", () => {
    const slot = nextRitual({ ritual: "morning", ritualTimes: times }, new Date(2026, 9, 31, 9, 0));
    expect(slot.at).toEqual(new Date(2026, 10, 1, 8, 0));
    expect(slot.later).toBe(true);
  });
  test("no profile or a malformed time falls back to 21:00", () => {
    expect(nextRitual(null, new Date(2026, 9, 21, 12, 0)).label).toBe("21:00");
    expect(nextRitual({ ritual: "evening", ritualTimes: { morning: "x", evening: "25:00" } }, new Date(2026, 9, 21, 12, 0)).label).toBe("21:00");
  });
});
