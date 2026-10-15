import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { PlannedNotification, TemplateHistory } from "./types";
import { onRebuildRequest } from "./bus";
import { snapshot, TEST_LIBRARY } from "./fixtures";
import {
  getPermission,
  isRepeatingTrigger,
  legacyReminderChoice,
  parseTemplateHistory,
  permissionFromResponse,
  rebuild,
  rebuildWith,
  requestPermissionAtCommitment,
  type NotificationScheduler,
  type RebuildDeps,
  type ScheduledRef,
} from "./runtime";
import { emptyTemplateHistory } from "./types";

const ORIGINAL_TZ = process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
beforeEach(() => {
  process.env.TZ = "America/New_York";
});
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi);
const S = (overrides = {}) => snapshot({ lastActDateKey: "2026-10-14", ...overrides });

/** An in-memory OS: pending notifications by identifier, plus a call log. */
function fakeOS(options: { permission?: string; preexisting?: ScheduledRef[] } = {}) {
  const pending = new Map<string, ScheduledRef>();
  for (const ref of options.preexisting ?? []) pending.set(ref.id, ref);
  const log: string[] = [];
  let permission = options.permission ?? "granted";
  const scheduler: NotificationScheduler = {
    permission: async () => permission as never,
    request: async () => {
      log.push("request");
      permission = "granted";
      return "granted";
    },
    pending: async () => [...pending.values()],
    cancel: async (id) => {
      log.push(`cancel ${id}`);
      pending.delete(id);
    },
    schedule: async (n: PlannedNotification) => {
      log.push(`schedule ${n.id}`);
      pending.set(n.id, { id: n.id, title: n.title, body: n.body, url: n.url, repeats: false });
    },
  };
  return { scheduler, pending, log, setPermission: (p: string) => (permission = p) };
}

function deps(scheduler: NotificationScheduler | null, now: () => Date, store: { history: TemplateHistory }): RebuildDeps {
  return {
    scheduler,
    loadHistory: async () => store.history,
    saveHistory: async (h) => {
      store.history = h;
    },
    now,
    library: TEST_LIBRARY,
  };
}

const LEGACY_DAILY: ScheduledRef = { id: "A1B2-legacy", title: "Close the day inside your story", body: "One listen, one line, and the streak stays lit.", url: null, repeats: true };
const FOREIGN_ONE_OFF: ScheduledRef = { id: "someone-else", title: "x", body: "y", url: null, repeats: false };

describe("rebuild: exact cancellation (N2, N3)", () => {
  test("schedules the plan and remembers it as pending", async () => {
    const os = fakeOS();
    const store = { history: { ...emptyTemplateHistory(), quietSpell: "2026-10-14" } as TemplateHistory };
    const result = await rebuildWith(S(), deps(os.scheduler, () => at(2026, 10, 15, 20), store));
    expect(result.permission).toBe("granted");
    expect(result.skipped).toBeUndefined();
    expect(result.scheduled).toBe(10);
    expect(result.cancelled).toBe(0);
    expect(os.pending.size).toBe(10);
    expect(store.history.pending?.map((p) => p.id)).toEqual(result.planned.map((n) => n.id));
  });

  test("an unchanged plan costs no native writes", async () => {
    const os = fakeOS();
    const store = { history: emptyTemplateHistory() };
    const d = deps(os.scheduler, () => at(2026, 10, 15, 20), store);
    await rebuildWith(S(), d);
    os.log.length = 0;
    const again = await rebuildWith(S(), d);
    expect(again.scheduled).toBe(0);
    expect(again.cancelled).toBe(0);
    expect(again.kept).toBe(again.planned.length);
    expect(os.log).toEqual([]);
  });

  test("replans cancel exactly our stale identifiers and never touch anyone else's", async () => {
    const os = fakeOS({ preexisting: [FOREIGN_ONE_OFF] });
    const store = { history: emptyTemplateHistory() };
    const d = deps(os.scheduler, () => at(2026, 10, 15, 20), store);
    const first = await rebuildWith(S(), d);
    // The user switches to a morning ritual: every evening cue must go.
    const second = await rebuildWith(S({ ritual: "morning" }), d);
    const firstIds = new Set(first.planned.map((n) => n.id));
    expect(second.cancelled).toBe(first.planned.length);
    expect([...os.pending.keys()].some((id) => firstIds.has(id))).toBe(false);
    expect(os.pending.has(FOREIGN_ONE_OFF.id)).toBe(true);
    expect(os.pending.size).toBe(second.planned.length + 1);
  });

  test("the 1.0 daily reminders are superseded once the queue owns reminders", async () => {
    const os = fakeOS({ preexisting: [LEGACY_DAILY] });
    await rebuildWith(S(), deps(os.scheduler, () => at(2026, 10, 15, 20), { history: emptyTemplateHistory() }));
    expect(os.pending.has(LEGACY_DAILY.id)).toBe(false);
  });

  test("…but stay while there is no weaving dream yet (the 1.0 Settings path keeps working)", async () => {
    const os = fakeOS({ preexisting: [LEGACY_DAILY] });
    const result = await rebuildWith(S({ dreams: [] }), deps(os.scheduler, () => at(2026, 10, 15, 20), { history: emptyTemplateHistory() }));
    expect(result.planned).toEqual([]);
    expect(os.pending.has(LEGACY_DAILY.id)).toBe(true);
  });

  test("reminders off: everything of ours and every 1.0 daily goes, nothing new", async () => {
    const os = fakeOS({ preexisting: [LEGACY_DAILY, FOREIGN_ONE_OFF] });
    const store = { history: emptyTemplateHistory() };
    const d = deps(os.scheduler, () => at(2026, 10, 15, 20), store);
    await rebuildWith(S(), d);
    const off = await rebuildWith(S({ enabled: false }), d);
    expect(off.skipped).toBe("disabled");
    expect([...os.pending.keys()]).toEqual([FOREIGN_ONE_OFF.id]);
    expect(store.history.pending).toEqual([]);
  });

  test("no permission: nothing scheduled, the plan still reported for diagnostics", async () => {
    const os = fakeOS({ permission: "denied" });
    const result = await rebuildWith(S(), deps(os.scheduler, () => at(2026, 10, 15, 20), { history: emptyTemplateHistory() }));
    expect(result.skipped).toBe("no-permission");
    expect(result.permission).toBe("denied");
    expect(result.planned.length).toBeGreaterThan(0);
    expect(os.pending.size).toBe(0);
  });

  test("paused through the horizon: reported as paused", async () => {
    const os = fakeOS();
    const result = await rebuildWith(S({ pausedUntil: "2026-11-14" }), deps(os.scheduler, () => at(2026, 10, 15, 20), { history: emptyTemplateHistory() }));
    expect(result.skipped).toBe("paused");
    expect(os.pending.size).toBe(0);
  });

  test("web: no scheduler, a safe no-op", async () => {
    const result = await rebuildWith(S(), deps(null, () => at(2026, 10, 15, 20), { history: emptyTemplateHistory() }));
    expect(result.skipped).toBe("unavailable");
    expect(result.permission).toBe("unavailable");
    expect(result.planned.length).toBeGreaterThan(0);
  });
});

describe("rebuild: resilience", () => {
  test("never throws, whatever the OS does", async () => {
    const os = fakeOS();
    os.scheduler.pending = async () => {
      throw new Error("native crash");
    };
    const result = await rebuildWith(S(), deps(os.scheduler, () => at(2026, 10, 15, 20), { history: emptyTemplateHistory() }));
    expect(result.skipped).toBe("unavailable");

    const broken = fakeOS();
    const d = deps(broken.scheduler, () => at(2026, 10, 15, 20), { history: emptyTemplateHistory() });
    d.loadHistory = async () => {
      throw new Error("storage");
    };
    d.saveHistory = async () => {
      throw new Error("storage");
    };
    expect((await rebuildWith(S(), d)).scheduled).toBe(10);
  });

  test("one failing trigger never blocks the rest, and is not remembered as pending", async () => {
    const os = fakeOS();
    const schedule = os.scheduler.schedule;
    let calls = 0;
    os.scheduler.schedule = async (n) => {
      calls += 1;
      if (calls === 3) throw new Error("bad trigger");
      return schedule(n);
    };
    const store = { history: emptyTemplateHistory() };
    const result = await rebuildWith(S(), deps(os.scheduler, () => at(2026, 10, 15, 20), store));
    expect(result.scheduled).toBe(9);
    expect(store.history.pending?.length).toBe(9);
  });

  test("rebuild() serializes: two calls never interleave", async () => {
    const os = fakeOS();
    const cancel = os.scheduler.cancel;
    os.scheduler.cancel = async (id) => {
      await new Promise((r) => setTimeout(r, 1));
      return cancel(id);
    };
    const store = { history: emptyTemplateHistory() };
    const d = deps(os.scheduler, () => at(2026, 10, 15, 20), store);
    await rebuild(S(), d);
    os.log.length = 0;
    await Promise.all([rebuild(S({ ritual: "morning" }), d), rebuild(S({ ritual: "evening" }), d)]);
    // Evening → morning → evening, one whole rebuild at a time.
    const kinds = os.log.map((l) => l.split(" ")[0][0]).join("");
    expect(kinds).toBe(`${"c".repeat(10)}${"s".repeat(10)}${"c".repeat(10)}${"s".repeat(10)}`);
    expect(os.pending.size).toBe(10);
    for (const ref of os.pending.values()) expect(new Date(Date.parse(ref.id.slice(-24))).getHours()).toBe(21);
  });
});

describe("rebuild: rotation across deliveries", () => {
  test("a delivered template is not used again until the cycle is spent", async () => {
    const os = fakeOS();
    const store = { history: { ...emptyTemplateHistory(), quietSpell: "2026-10-14" } as TemplateHistory };
    let now = at(2026, 10, 15, 20);
    const d = deps(os.scheduler, () => now, store);
    const first = await rebuildWith(S(), d);
    expect(first.planned[0].templateId).toBe("rc1");

    now = at(2026, 10, 15, 21, 5); // tonight's rc1 was delivered
    const second = await rebuildWith(S(), d);
    expect(store.history.used["ritual-chapter"]).toEqual(["rc1"]);
    expect(second.planned[0].templateId).toBe("rc2");
  });
});

describe("permission (N6)", () => {
  test("asks only when undetermined, and a grant rebuilds the queue at once", async () => {
    let rebuilds = 0;
    const off = onRebuildRequest(() => {
      rebuilds += 1;
    });
    try {
      const fresh = fakeOS({ permission: "undetermined" });
      expect(await requestPermissionAtCommitment(fresh.scheduler)).toBe("granted");
      expect(fresh.log).toEqual(["request"]);
      expect(rebuilds).toBe(1);

      const denied = fakeOS({ permission: "denied" });
      expect(await requestPermissionAtCommitment(denied.scheduler)).toBe("denied");
      expect(denied.log).toEqual([]);
      expect(rebuilds).toBe(1);

      expect(await requestPermissionAtCommitment(null)).toBe("unavailable");
      expect(await getPermission(null)).toBe("unavailable");
      expect(await getPermission(fakeOS({ permission: "denied" }).scheduler)).toBe("denied");
    } finally {
      off();
    }
  });

  test("never throws", async () => {
    const os = fakeOS({ permission: "undetermined" });
    os.scheduler.request = async () => {
      throw new Error("prompt failed");
    };
    expect(await requestPermissionAtCommitment(os.scheduler)).toBe("unavailable");
  });

  test("maps the expo permission response; provisional iOS grants deliver", () => {
    expect(permissionFromResponse({ granted: true, status: "granted" })).toBe("granted");
    expect(permissionFromResponse({ granted: false, status: "denied" })).toBe("denied");
    expect(permissionFromResponse({ granted: false, status: "undetermined" })).toBe("undetermined");
    expect(permissionFromResponse({ granted: false, status: "undetermined", ios: { status: 3 } })).toBe("granted");
    expect(permissionFromResponse(null)).toBe("unavailable");
  });
});

describe("legacyReminderChoice (v1 → v2 profile migration)", () => {
  test("1.0 dailies pending → on; granted but nothing pending → turned off; never granted → no choice", async () => {
    expect(await legacyReminderChoice(fakeOS({ preexisting: [LEGACY_DAILY] }).scheduler)).toBe(true);
    expect(await legacyReminderChoice(fakeOS().scheduler)).toBe(false);
    expect(await legacyReminderChoice(fakeOS({ permission: "undetermined", preexisting: [LEGACY_DAILY] }).scheduler)).toBeNull();
    expect(await legacyReminderChoice(null)).toBeNull();
  });

  test("our own one-off queue is not a 1.0 choice", async () => {
    const os = fakeOS({ preexisting: [{ id: "vela-q-ritual-chapter-d1-x", title: "t", body: "b", url: null, repeats: false }] });
    expect(await legacyReminderChoice(os.scheduler)).toBe(false);
  });
});

describe("helpers", () => {
  test("repeating triggers are the 1.0 dailies, as either platform reports them", () => {
    expect(isRepeatingTrigger({ type: "calendar", repeats: true, dateComponents: { hour: 21 } })).toBe(true);
    expect(isRepeatingTrigger({ type: "daily", hour: 21, minute: 0 })).toBe(true);
    expect(isRepeatingTrigger({ type: "date", value: 1760000000000 })).toBe(false);
    expect(isRepeatingTrigger({ type: "calendar", repeats: false })).toBe(false);
    expect(isRepeatingTrigger(null)).toBe(false);
  });

  test("history parses leniently", () => {
    const h: TemplateHistory = {
      version: 1,
      used: { "ritual-chapter": ["rc1"] },
      pending: [{ id: "x", slot: "quiet-return", templateId: "qr1", fireAt: "2026-10-18T01:00:00.000Z", spell: "2026-10-14" }],
      quietSpell: "2026-10-01",
    };
    expect(parseTemplateHistory(JSON.stringify(h))).toEqual(h);
    expect(parseTemplateHistory("nope")).toEqual(emptyTemplateHistory());
    expect(parseTemplateHistory({ used: { ledger: [1, "lg1"] }, pending: [{ id: 3 }] })).toEqual({
      version: 1,
      used: { ledger: ["lg1"] },
      pending: [],
      quietSpell: null,
    });
  });
});
