import { describe, expect, test } from "bun:test";
import { MAX_WORD_PIECES, toggleFocus, wordPieces } from "./logic";
import { DEFAULT_PRESET, TIME_PRESETS, fromHHmm, slotsFor, toHHmm } from "./ritualTimes";
import { FIRST_LIGHT_ID, clearFirstLight, stageFirstLight, stagedFirstLight } from "./firstLight";

describe("toggleFocus", () => {
  test("tap order makes the first pick primary", () => {
    expect(toggleFocus([], "career")).toEqual(["career"]);
    expect(toggleFocus(["career"], "peace")).toEqual(["career", "peace"]);
  });
  test("removing the primary promotes the next pick", () => {
    expect(toggleFocus(["career", "peace"], "career")).toEqual(["peace"]);
  });
});

describe("wordPieces", () => {
  test("splits words and drops outer quotes", () => {
    expect(wordPieces("“my own design studio”")).toEqual(["my", "own", "design", "studio"]);
    expect(wordPieces("  a   calm  mind ")).toEqual(["a", "calm", "mind"]);
  });
  test("groups long text into at most MAX_WORD_PIECES pieces, in order", () => {
    const text = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ");
    const pieces = wordPieces(text);
    expect(pieces.length).toBeLessThanOrEqual(MAX_WORD_PIECES);
    expect(pieces.join(" ")).toBe(text);
  });
  test("empty text has no pieces", () => {
    expect(wordPieces("   ")).toEqual([]);
  });
});

describe("ritual time presets", () => {
  test("defaults match the profile defaults and are offered", () => {
    expect(toHHmm(DEFAULT_PRESET.morning)).toBe("08:00");
    expect(toHHmm(DEFAULT_PRESET.evening)).toBe("21:00");
    expect(TIME_PRESETS.morning).toContain(DEFAULT_PRESET.morning);
    expect(TIME_PRESETS.evening).toContain(DEFAULT_PRESET.evening);
    expect(fromHHmm("07:30")).toBe("0730");
  });
  test("slots follow the ritual", () => {
    expect(slotsFor(null)).toEqual([]);
    expect(slotsFor("morning")).toEqual(["morning"]);
    expect(slotsFor("both")).toEqual(["morning", "evening"]);
  });
});

describe("First Light handoff", () => {
  test("stages, exposes and clears the draft", () => {
    stageFirstLight({ focus: "career", desire: "my own studio", feeling: "proud", seed: "" });
    const staged = stagedFirstLight();
    expect(staged?.draft.focus).toBe("career");
    expect(staged?.creating).toBe(false);
    expect(staged?.chapterId).toBeNull();
    expect(FIRST_LIGHT_ID).toBe("first-light");
    clearFirstLight();
    expect(stagedFirstLight()).toBeNull();
  });
});
