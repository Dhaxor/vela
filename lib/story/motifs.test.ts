// Motif matching on the real lexicon: it reads the desire's core, so a
// deadline ('before her wedding') never sets a motif or its flags.
import { describe, expect, test } from "bun:test";
import { matchMotifs, motifFlags } from "./motifs";

describe("matchMotifs runs on desireCore()", () => {
  test("someone else's wedding is a deadline: no romance flag", () => {
    const ids = matchMotifs("Heal things with my sister before her wedding", "love");
    expect(motifFlags(ids).has("romance")).toBe(false);
    expect(ids).not.toContain("wedding");
    // The repair outscores healing's bare 'heal', so the family motif leads.
    expect(ids[0]).toBe("family-repair");
  });

  test("a deadline tail never adds a motif of its own", () => {
    expect(matchMotifs("Run a marathon before my wedding", "health")).not.toContain("wedding");
    expect(matchMotifs("Make peace with my brother before his move", "love")).toEqual(["family-repair"]);
  });

  test("the desire's own words still match", () => {
    expect(matchMotifs("Get married next spring", "love")).toContain("wedding");
    expect(matchMotifs("I want to plan my dream wedding", "love")[0]).toBe("wedding");
    expect(matchMotifs("my own design studio, with clients who trust my eye", "career")[0]).toBe("own-business");
  });

  test("a desire that is only a deadline is matched as typed", () => {
    expect(matchMotifs("Before my wedding", "love")).toContain("wedding");
  });
});
