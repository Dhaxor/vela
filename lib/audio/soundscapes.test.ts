import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FOCUS_AREAS } from "@/lib/focus";
import { DAYPARTS } from "@/lib/story/content/types";
import * as audio from "./index";
import {
  SOUNDSCAPES,
  SUGGESTED_BEDS,
  bedVolume,
  fadeLevel,
  isBedLocked,
  resolveBed,
  suggestedBed,
} from "./soundscapes";
import { BEDS, BED_IDS, BED_LEVELS, DEFAULT_BED, FREE_BEDS } from "./types";

const ASSET_DIR = join(import.meta.dir, "..", "..", "assets", "audio");

describe("catalogue", () => {
  test("every bed is listed once, free bed first, each with a blurb", () => {
    expect(SOUNDSCAPES.map((s) => s.id)).toEqual([...BED_IDS]);
    expect(SOUNDSCAPES[0].id).toBe(DEFAULT_BED);
    for (const s of SOUNDSCAPES) expect(s.blurb.length).toBeGreaterThan(10);
  });

  test("only 'night' is free", () => {
    expect(FREE_BEDS).toEqual(["night"]);
    expect(SOUNDSCAPES.filter((s) => !s.plus).map((s) => s.id)).toEqual(["night"]);
  });

  test("every catalogued file exists as a real, in-budget AAC .m4a", () => {
    let total = 0;
    for (const id of BED_IDS) {
      const path = join(ASSET_DIR, BEDS[id].file);
      const { size } = statSync(path);
      total += size;
      expect(size).toBeGreaterThan(500_000); // ~90-120 s at 96 kb/s
      expect(readFileSync(path).subarray(4, 8).toString("latin1")).toBe("ftyp"); // MP4 container
    }
    total += statSync(join(ASSET_DIR, "star-birth.m4a")).size;
    expect(total).toBeLessThan(7_000_000);
  });
});

describe("plus gate", () => {
  test("Plus beds lock without Plus", () => {
    expect(isBedLocked("night", false)).toBe(false);
    expect(isBedLocked("rain", false)).toBe(true);
    expect(isBedLocked("rain", true)).toBe(false);
  });

  test("a lapsed Plus bed falls back to the free bed", () => {
    expect(resolveBed("hearth", true)).toBe("hearth");
    expect(resolveBed("hearth", false)).toBe("night");
    expect(resolveBed(null, true)).toBe("night");
    expect(resolveBed(undefined, false)).toBe("night");
  });
});

describe("suggestions", () => {
  test("every focus × daypart has a suggestion", () => {
    for (const focus of FOCUS_AREAS) {
      for (const daypart of DAYPARTS) expect(BED_IDS).toContain(SUGGESTED_BEDS[focus.id][daypart]);
    }
  });

  test("free users are only offered the free bed", () => {
    expect(suggestedBed("love", "evening", true)).toBe("hearth");
    expect(suggestedBed("love", "evening", false)).toBe("night");
    expect(suggestedBed("career", "morning", true)).toBe("rain");
  });
});

describe("levels", () => {
  test("bed volume scales and clamps", () => {
    expect(bedVolume("full", 1)).toBe(1);
    expect(bedVolume("underSpeech", 1)).toBe(BED_LEVELS.underSpeech);
    expect(bedVolume("gap", 0.5)).toBeCloseTo(0.3);
    expect(bedVolume("full", 2)).toBe(1);
    expect(bedVolume("full", -1)).toBe(0);
  });

  test("fades hit their endpoints exactly and move monotonically", () => {
    expect(fadeLevel(1, 0, 0)).toBe(1);
    expect(fadeLevel(1, 0, 1)).toBe(0);
    expect(fadeLevel(0.35, 0.6, 1)).toBeCloseTo(0.6, 10);
    let last = 1;
    for (let p = 0.1; p <= 1; p += 0.1) {
      const v = fadeLevel(1, 0, p);
      expect(v).toBeLessThan(last);
      last = v;
    }
    expect(fadeLevel(1, 0, 2)).toBe(0);
    expect(fadeLevel(1, 0, -1)).toBe(1);
  });

  test("fades are even in loudness: halfway through a fade-out is well below half amplitude", () => {
    const mid = fadeLevel(1, 0, 0.5);
    expect(mid).toBeGreaterThan(0.25);
    expect(mid).toBeLessThan(0.4);
  });
});

describe("barrel", () => {
  test("imports without native modules and reports the real implementation", () => {
    expect(audio.AUDIO_IS_STUB).toBe(false);
    expect(typeof audio.useNarration).toBe("function");
    expect(typeof audio.useSoundscape).toBe("function");
    expect(typeof audio.setAudioSession).toBe("function");
    expect(typeof audio.playStarBirthChime).toBe("function");
    expect(audio.rankVoices([])).toEqual([]);
  });
});
