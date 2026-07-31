import { describe, expect, test } from "bun:test";
import {
  addRepetition,
  dailyGratitudeStems,
  dailyPrompt,
  emptySheet,
  progress369,
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
