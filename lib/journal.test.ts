import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  addJournalEntry,
  addRepetition,
  dailyGratitudeStems,
  dailyPrompt,
  emptyJournal,
  emptySheet,
  journalFromV1,
  parseJournal,
  progress369,
  SCRIPT_PROMPTS,
  SLOT_CAPS,
  slotForHour,
  TOTAL_369,
} from "./journal";

describe("slotForHour", () => {
  test("boundaries: 0-11 morning, 12-16 afternoon, 17-23 evening", () => {
    expect(slotForHour(0)).toBe("morning");
    expect(slotForHour(11)).toBe("morning");
    expect(slotForHour(12)).toBe("afternoon");
    expect(slotForHour(16)).toBe("afternoon");
    expect(slotForHour(17)).toBe("evening");
    expect(slotForHour(23)).toBe("evening");
  });
});

describe("369 sheet", () => {
  test("caps are 3/6/9 and total 18", () => {
    expect(SLOT_CAPS.morning + SLOT_CAPS.afternoon + SLOT_CAPS.evening).toBe(
      TOTAL_369
    );
  });

  test("addRepetition fills up to the cap then rejects", () => {
    let sheet = emptySheet("2026-07-31", "I am debt-free");
    for (let i = 0; i < 3; i++) {
      const next = addRepetition(sheet, "morning", "I am debt-free");
      expect(next).not.toBeNull();
      sheet = next!;
    }
    expect(addRepetition(sheet, "morning", "I am debt-free")).toBeNull();
    expect(sheet.morning.length).toBe(3);
  });

  test("blank text is rejected", () => {
    const sheet = emptySheet("2026-07-31", "x");
    expect(addRepetition(sheet, "evening", "   ")).toBeNull();
  });

  test("progress counts across slots and detects completion", () => {
    let sheet = emptySheet("2026-07-31", "phrase");
    const fill = (slot: "morning" | "afternoon" | "evening", n: number) => {
      for (let i = 0; i < n; i++) sheet = addRepetition(sheet, slot, "phrase")!;
    };
    fill("morning", 3);
    fill("afternoon", 6);
    expect(progress369(sheet).done).toBe(9);
    expect(progress369(sheet).complete).toBe(false);
    fill("evening", 9);
    const p = progress369(sheet);
    expect(p.done).toBe(18);
    expect(p.complete).toBe(true);
    expect(p.bySlot.evening.done).toBe(9);
  });
});

describe("daily prompts", () => {
  test("script prompt is deterministic per day and varies across days", () => {
    expect(dailyPrompt("2026-07-31").id).toBe(dailyPrompt("2026-07-31").id);
    const seen = new Set<string>();
    for (let d = 1; d <= 24; d++) {
      seen.add(dailyPrompt(`2026-08-${String(d).padStart(2, "0")}`).id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  test("gratitude stems are three distinct prompts", () => {
    for (let d = 1; d <= 9; d++) {
      const stems = dailyGratitudeStems(`2026-08-0${d}`);
      expect(stems.length).toBe(3);
      expect(new Set(stems.map((s) => s.id)).size).toBe(3);
    }
  });
});

describe("journal storage v2", () => {
  const v1 = JSON.parse(JSON.parse(fs.readFileSync(path.join(import.meta.dir, "fixtures", "v1", "nine-proofs.json"), "utf8")).raw.journal);

  test("a real 1.0 journal migrates with its entry ids, so past pages can be opened", () => {
    const j = journalFromV1(v1);
    expect(j.version).toBe(2);
    expect(j.entries.map((e) => e.id)).toEqual(v1.entries.map((e: { id: string }) => e.id));
    expect(j.phrase369).toBe(v1.phrase369);
    expect(j.sheet?.evening).toEqual(v1.sheet.evening);
    expect(parseJournal(JSON.parse(JSON.stringify(j)))).toEqual(j);
  });

  test("entries without an id get a stable one; malformed entries are dropped", () => {
    const raw = { entries: [{ kind: "script", text: "A page", createdAt: "2026-10-01T10:00:00.000Z" }, { kind: "poem", text: "x" }, { kind: "gratitude", text: "  " }] };
    const a = journalFromV1(raw);
    expect(a.entries).toHaveLength(1);
    expect(a.entries[0].id).toBe(journalFromV1(raw).entries[0].id);
    expect(parseJournal({ entries: [] })).toEqual(emptyJournal());
  });

  test("adding a page prepends, trims and caps", () => {
    const page = { id: "p", kind: "script" as const, dateKey: "2026-10-16", prompt: "Write it", text: "  It happened.  ", createdAt: "2026-10-16T08:00:00.000Z", dreamId: "d1" };
    const j = addJournalEntry(journalFromV1(v1), page);
    expect(j.entries[0]).toMatchObject({ id: "p", text: "It happened.", dreamId: "d1" });
    expect(addJournalEntry(emptyJournal(), { ...page, text: "   " })).toEqual(emptyJournal());
  });

  test("no 1.0 prompt says 'future self'", () => {
    for (const p of SCRIPT_PROMPTS) expect(p.text.toLowerCase()).not.toContain("future self");
  });
});

describe("pages are never dropped (review: data-safety-silent-caps-delete-oldest)", () => {
  test("260 days of a script page and a gratitude page: all 520 kept, the first one too", () => {
    let j = emptyJournal();
    for (let day = 0; day < 260; day++) {
      for (const kind of ["script", "gratitude"] as const) {
        const at = new Date(2026, 0, 1 + day, kind === "script" ? 8 : 21);
        j = addJournalEntry(j, { id: `${kind}-${day}`, kind, dateKey: at.toISOString().slice(0, 10), prompt: "p", text: `Page ${day}`, createdAt: at.toISOString() });
      }
    }
    expect(j.entries).toHaveLength(520);
    expect(j.entries.at(-1)!.id).toBe("script-0");
    // And they survive a reload.
    expect(parseJournal(JSON.parse(JSON.stringify(j))).entries).toHaveLength(520);
  });
});
