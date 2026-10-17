import { describe, expect, test } from "bun:test";
import { BENEFITS, FREE_FOREVER, FREE_FOREVER_NOTE, PLUS_ON_COPY, RENEWAL_TERMS, orderedBenefits, paywallCopy, paywallSource, statsLine } from "./copy";

const FACTS = { area: "Career", stars: 5 };
const SOURCES = ["general", "second-dream", "bed", "area", "scenes", "nudge", "lapsed"] as const;

describe("paywallSource", () => {
  test("maps ?from= values, arrays and junk", () => {
    expect(paywallSource("second-dream")).toBe("second-dream");
    expect(paywallSource(["bed", "x"])).toBe("bed");
    expect(paywallSource("reader")).toBe("nudge");
    expect(paywallSource("weekly")).toBe("general");
    expect(paywallSource(undefined)).toBe("general");
    expect(paywallSource(null)).toBe("general");
  });
});

describe("paywallCopy", () => {
  test("each entry point has its own header and features the matching benefit", () => {
    expect(paywallCopy("second-dream", FACTS)).toEqual({
      title: "Room for\na second dream.",
      lead: "Your Career sky keeps every star. Plus lets another dream weave beside it.",
      featured: "dreams",
    });
    expect(paywallCopy("bed", FACTS).featured).toBe("beds");
    expect(paywallCopy("bed", FACTS).lead).toContain("Rain on Glass, Hearth and Dawn");
    expect(paywallCopy("area", FACTS).featured).toBe("areas");
    expect(paywallCopy("scenes", FACTS).featured).toBe("scenes");
    expect(paywallCopy("nudge", FACTS).lead).toStartWith("5 stars so far");
    expect(paywallCopy("nudge", { area: "Career", stars: 1 }).lead).toStartWith("Every star");
    expect(paywallCopy("general", FACTS).featured).toBeNull();
  });

  test("works before any dream exists", () => {
    expect(paywallCopy("second-dream", { area: null, stars: 0 }).lead).toStartWith("Your sky keeps");
  });

  test("honest copy: no trial, weekly, credits or 'future self' anywhere", () => {
    const all = [
      ...SOURCES.flatMap((s) => {
        const c = paywallCopy(s, FACTS);
        return [c.title, c.lead];
      }),
      ...BENEFITS.flatMap((b) => [b.title, b.body]),
      ...FREE_FOREVER.map((f) => f.label),
      FREE_FOREVER_NOTE,
      PLUS_ON_COPY.title,
      PLUS_ON_COPY.lead,
      RENEWAL_TERMS,
    ].join(" ");
    expect(all).not.toMatch(/\btrial\b|\bweekly\b|\bcredits?\b|future self|—/i);
  });
});

describe("benefits", () => {
  test("match Plus's four real gates", () => {
    expect(BENEFITS.map((b) => b.id)).toEqual(["dreams", "beds", "areas", "scenes"]);
  });
  test("the featured benefit comes first", () => {
    expect(orderedBenefits("scenes").map((b) => b.id)).toEqual(["scenes", "dreams", "beds", "areas"]);
    expect(orderedBenefits(null)).toBe(BENEFITS);
  });
  test("free forever lists the story, the loop, the sky, listens and backup", () => {
    expect(FREE_FOREVER.map((f) => f.id)).toEqual(["story", "loop", "sky", "listens", "backup"]);
  });
});

describe("statsLine", () => {
  test("'Career · Season 1 · 5 proofs'", () => {
    expect(statsLine("Career", 1, 5)).toBe("Career · Season 1 · 5 proofs");
    expect(statsLine("Love", 1, 1)).toBe("Love · Season 1 · 1 proof");
    expect(statsLine("Peace", 0, 0)).toBe("Peace · Season 1 · 0 proofs");
  });
});
