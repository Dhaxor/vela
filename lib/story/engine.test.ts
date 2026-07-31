import { describe, expect, test } from "bun:test";
import { FOCUS_AREAS } from "../focus";
import { BEAT_ORDER, composeStory, normalizeDesire } from "./engine";
import { FRAGMENTS, fragmentsFor } from "./fragments";

const base = {
  name: "Alex",
  focus: "abundance" as const,
  desire: "financial freedom",
  feeling: "grateful",
  seed: 42,
};

describe("normalizeDesire", () => {
  test("strips trailing punctuation and whitespace", () => {
    expect(normalizeDesire("a loving partner.  ")).toBe("a loving partner");
    expect(normalizeDesire("peace!")).toBe("peace");
  });
  test("lowercases a leading capital on ordinary phrases", () => {
    expect(normalizeDesire("To open my bakery")).toBe("to open my bakery");
  });
  test("keeps 'I' phrases and shouty/proper tokens intact", () => {
    expect(normalizeDesire("I am debt-free")).toBe("I am debt-free");
    expect(normalizeDesire("I'm finally home")).toBe("I'm finally home");
    expect(normalizeDesire("NYC apartment")).toBe("NYC apartment");
  });
});

describe("composeStory", () => {
  test("is deterministic under a seed", () => {
    const a = composeStory(base);
    const b = composeStory(base);
    expect(a).toEqual(b);
  });

  test("different seeds produce different stories", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      seen.add(
        composeStory({ ...base, seed })
          .paragraphs.map((p) => p.fragmentId)
          .join("|")
      );
    }
    expect(seen.size).toBeGreaterThanOrEqual(15);
  });

  test("all seven beats, in order, for every focus area", () => {
    for (const f of FOCUS_AREAS) {
      const story = composeStory({ ...base, focus: f.id, seed: 7 });
      expect(story.paragraphs.length).toBe(BEAT_ORDER.length);
      story.paragraphs.forEach((p, i) => {
        const frag = FRAGMENTS.find((x) => x.id === p.fragmentId)!;
        expect(frag.beat).toBe(BEAT_ORDER[i]);
        if (frag.focus) expect(frag.focus).toBe(f.id);
      });
    }
  });

  test("no unfilled slots survive, for any focus or awkward desire", () => {
    const desires = [
      "To earn $10,000/month",
      "a partner who truly sees me",
      "I am healed",
      "peace.",
      "{weird} braces (and) sym*bols",
    ];
    for (const f of FOCUS_AREAS) {
      for (const desire of desires) {
        for (let seed = 0; seed < 12; seed++) {
          const story = composeStory({ ...base, focus: f.id, desire, seed });
          const all = story.title + story.paragraphs.map((p) => p.text).join(" ");
          expect(all).not.toMatch(/\{(name|desire|feeling|domain)\}/);
        }
      }
    }
  });

  test("dollar signs in the desire come through literally", () => {
    const story = composeStory({ ...base, desire: "To earn $10,000/month", seed: 3 });
    const arrival = story.paragraphs[1].text;
    expect(arrival).toContain("$10,000/month");
  });

  test("avoid-set prevents repetition until a pool is exhausted", () => {
    const avoid = new Set<string>();
    const arrivalPool = fragmentsFor("arrival", "abundance");
    const seenArrivals = new Set<string>();
    for (let i = 0; i < arrivalPool.length; i++) {
      const story = composeStory({ ...base, seed: 100 + i, avoid });
      story.usedIds.forEach((id) => avoid.add(id));
      seenArrivals.add(story.paragraphs[1].fragmentId);
    }
    // Every regeneration up to pool size yielded a fresh arrival fragment.
    expect(seenArrivals.size).toBe(arrivalPool.length);
    // And the next one degrades gracefully instead of throwing.
    expect(() => composeStory({ ...base, seed: 999, avoid })).not.toThrow();
  });

  test("empty inputs fall back to safe defaults", () => {
    const story = composeStory({
      name: "  ",
      focus: "peace",
      desire: "",
      feeling: "",
      seed: 1,
    });
    const all = story.paragraphs.map((p) => p.text).join(" ");
    expect(all).toContain("the life you asked for");
    expect(all).not.toContain("{");
  });

  test("shared fragment pools never leak another focus's fragments", () => {
    for (const f of FOCUS_AREAS) {
      for (const beat of ["arrival", "living"] as const) {
        for (const frag of fragmentsFor(beat, f.id)) {
          expect(frag.focus).toBe(f.id);
        }
      }
    }
  });
});
