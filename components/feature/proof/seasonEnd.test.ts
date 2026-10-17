import { describe, expect, test } from "bun:test";
import { afterNamingLine, nextSeasonCopy, pastSeasonNamedLine, seasonCarries } from "./seasonEnd";

const proofs = (seventhWovenIn: string | null) =>
  Array.from({ length: 7 }, (_, i) => ({ starIndex: i + 1, wovenInChapterId: i === 6 ? seventhWovenIn : `c${i + 2}` }));

describe("season-end copy matches what Season 2's Chapter I weaves", () => {
  test("seeded First Light season: the 7th star wove Chapter VII, so nothing is carried and nothing is promised", () => {
    const seeded = proofs("chapter-vii");
    expect(seasonCarries(seeded)).toBe(false);
    const copy = nextSeasonCopy(1, false);
    expect(copy.title).toBe("Season 2 is ready.");
    expect(`${copy.title} ${copy.body}`).not.toContain("what you did");
    expect(`${copy.title} ${copy.body}`).not.toContain("last step you took");
    expect(afterNamingLine(1, false)).not.toContain("what you did");
  });

  test("unseeded season: the 7th proof is still unwoven, so Season 2 begins with it", () => {
    const unseeded = proofs(null);
    expect(seasonCarries(unseeded)).toBe(true);
    expect(nextSeasonCopy(1, true).title).toBe("Season 2 begins with what you did.");
    expect(nextSeasonCopy(1, true).body).toContain("last step you took");
    expect(afterNamingLine(2, true)).toBe("Season 3 begins with what you did.");
  });

  test("an incomplete season carries nothing", () => {
    expect(seasonCarries(proofs(null).slice(0, 6))).toBe(false);
    expect(seasonCarries([])).toBe(false);
  });

  test("a past season named late", () => {
    expect(pastSeasonNamedLine(1)).toBe("Season 1 keeps this name in your sky.");
  });
});
