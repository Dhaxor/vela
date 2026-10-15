import { describe, expect, test } from "bun:test";
import type { Bridge, ChapterMeta, Dream, Proof } from "@/contexts/arc.types";
import { emptyProgress } from "@/lib/progress";
import { bridge, chapter, dream, proof, season, snapshot } from "./fixtures";
import { buildNotificationSnapshot, snapshotKey, type ArcReader } from "./snapshot";

function fakeArc(input: {
  dreams: Dream[];
  weaving: string[];
  active: string | null;
  chapters?: Record<string, ChapterMeta>;
  bridges?: Record<string, Bridge>;
  proofs?: Record<string, Proof[]>;
}): ArcReader {
  return {
    dreams: input.dreams,
    weavingDreamIds: input.weaving,
    activeDreamId: input.active,
    dream: (id) => input.dreams.find((d) => d.id === id),
    loopState: (id) => (id ? { kind: "chapter-waiting", dreamId: id, chapterId: `c-${id}`, heard: false } : { kind: "empty" }),
    latestChapter: (id) => input.chapters?.[id],
    openBridge: (id) => input.bridges?.[id],
    proofs: (id) => input.proofs?.[id] ?? [],
    seasonProgress: (id) => season(id, (input.proofs?.[id] ?? []).length),
  };
}

const NOW = new Date(2026, 9, 15, 20, 0);

describe("buildNotificationSnapshot", () => {
  test("weaving dreams only, focused first, straight from the selectors", () => {
    const arc = fakeArc({
      dreams: [dream("d3"), dream("d2"), dream("d1"), dream("dx", { status: "resting" })],
      weaving: ["d3", "d2", "d1"],
      active: "d2",
      chapters: { d2: chapter("c-d2", "d2") },
      bridges: { d2: bridge("b2", "d2", "c-d2") },
      proofs: { d2: [proof("p1", "d2", "2026-10-12"), proof("p2", "d2", "2026-10-14")], dx: [proof("p9", "dx", "2026-10-13")] },
    });
    const s = buildNotificationSnapshot({
      profile: { name: "Maya", ritual: "evening" },
      arc,
      progress: { ...emptyProgress(), days: ["2026-10-13", "2026-10-14"], nightsShownUp: 9 },
      now: NOW,
    });
    expect(s.dreams.map((d) => d.dream.id)).toEqual(["d2", "d3", "d1"]);
    const focused = s.dreams[0];
    expect(focused.latestChapter?.id).toBe("c-d2");
    expect(focused.openBridge?.id).toBe("b2");
    expect(focused.latestProof?.id).toBe("p2");
    expect(focused.proofCount).toBe(2);
    expect(focused.loop.kind).toBe("chapter-waiting");
    expect(s.dreams[1].latestChapter).toBeNull();
    expect(s.dreams[1].openBridge).toBeNull();
    expect(s.lastActDateKey).toBe("2026-10-14");
    expect(s.nightsShownUp).toBe(9);
    // The ledger counts every proof, resting dreams included.
    expect([...(s.proofDateKeys ?? [])].sort()).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
  });

  test("the last act also comes from the arc, so a lagging progress store never reads as quiet", () => {
    const arc = fakeArc({
      dreams: [dream("d1")],
      weaving: ["d1"],
      active: "d1",
      chapters: { d1: chapter("c-d1", "d1", { heardAt: new Date(2026, 9, 15, 7, 0).toISOString() }) },
      proofs: { d1: [proof("p1", "d1", "2026-10-13")] },
    });
    const s = buildNotificationSnapshot({ profile: { name: "Maya", ritual: "evening" }, arc, progress: emptyProgress(), now: NOW });
    expect(s.lastActDateKey).toBe("2026-10-15");
    const proofOnly = buildNotificationSnapshot({
      profile: { name: "Maya", ritual: "evening" },
      arc: fakeArc({ dreams: [dream("d1")], weaving: ["d1"], active: "d1", proofs: { d1: [proof("p1", "d1", "2026-10-13")] } }),
      progress: { ...emptyProgress(), days: ["2026-10-11"] },
      now: NOW,
    });
    expect(proofOnly.lastActDateKey).toBe("2026-10-13");
  });

  test("a 1.0 profile gets the v2 defaults: reminders on, private, 08:00 / 21:00", () => {
    const s = buildNotificationSnapshot({
      profile: { name: "Maya", ritual: "both" },
      arc: fakeArc({ dreams: [], weaving: [], active: null }),
      progress: emptyProgress(),
      now: NOW,
    });
    expect(s.enabled).toBe(true);
    expect(s.lockScreenPrivate).toBe(true);
    expect(s.ritualTimes).toEqual({ morning: "08:00", evening: "21:00" });
    expect(s.lastActDateKey).toBeNull();
    expect(s.dreams).toEqual([]);
  });

  test("ProfileV2 choices win; a malformed time falls back alone", () => {
    const s = buildNotificationSnapshot({
      profile: {
        name: "Maya",
        ritual: "morning",
        ritualTimes: { morning: "06:45", evening: "late" },
        remindersEnabled: false,
        lockScreenPrivate: false,
      },
      arc: fakeArc({ dreams: [dream("d1")], weaving: ["d1"], active: "d1" }),
      progress: { ...emptyProgress(), pausedUntil: "2026-10-20" },
      now: NOW,
      desireNp: (d) => (d.id === "d1" ? "your own design studio" : null),
    });
    expect(s.enabled).toBe(false);
    expect(s.lockScreenPrivate).toBe(false);
    expect(s.ritualTimes).toEqual({ morning: "06:45", evening: "21:00" });
    expect(s.pausedUntil).toBe("2026-10-20");
    expect(s.dreams[0].desireNp).toBe("your own design studio");
  });
});

describe("snapshotKey", () => {
  test("stable for equal snapshots, different for any planning input", () => {
    const base = snapshot();
    expect(snapshotKey(snapshot())).toBe(snapshotKey(base));
    const changed = [
      snapshot({ enabled: false }),
      snapshot({ lockScreenPrivate: false }),
      snapshot({ pausedUntil: "2026-10-20" }),
      snapshot({ ritualTimes: { morning: "08:00", evening: "21:30" } }),
      snapshot({ lastActDateKey: "2026-10-15" }),
      snapshot({ proofDateKeys: ["2026-10-15"] }),
      snapshot({ dreams: [{ ...base.dreams[0], latestChapter: chapter("c-d1", "d1", { heardAt: "2026-10-15T20:00:00.000Z" }) }] }),
      snapshot({ dreams: [{ ...base.dreams[0], openBridge: bridge("b1", "d1", "c-d1", { remindAt: "2026-10-16T13:00:00.000Z" }) }] }),
    ];
    for (const s of changed) expect(snapshotKey(s)).not.toBe(snapshotKey(base));
  });
});
