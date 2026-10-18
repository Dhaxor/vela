// Spoken labels: counts agree with their nouns, and a sentence never ends in
// two marks (the VoiceOver twins of the '1 moments' and 'admire..' bugs).
import { describe, expect, test } from "bun:test";
import { countOf, sentence, spoken } from "./a11y";
import { proofNodeLabel, statsLabel } from "@/components/feature/arc/model";

describe("countOf", () => {
  test("one is singular, everything else plural", () => {
    expect(countOf(1, "chapter")).toBe("1 chapter");
    expect(countOf(0, "chapter")).toBe("0 chapters");
    expect(countOf(2, "night")).toBe("2 nights");
    expect(countOf(3, "story", "stories")).toBe("3 stories");
  });
});

describe("sentence", () => {
  test("adds a full stop only when the text has no closing mark", () => {
    expect(sentence("Sent my portfolio")).toBe("Sent my portfolio.");
    expect(sentence("Sent my portfolio to two studios I admire.")).toBe("Sent my portfolio to two studios I admire.");
    expect(sentence("It worked!")).toBe("It worked!");
    expect(sentence("Ready?")).toBe("Ready?");
    expect(sentence("And then…")).toBe("And then…");
    expect(sentence("She said “yes.”")).toBe("She said “yes.”");
    expect(sentence("(a small step.)")).toBe("(a small step.)");
  });
  test("trims and collapses whitespace; empty stays empty", () => {
    expect(sentence("  two   words \n")).toBe("two words.");
    expect(sentence("")).toBe("");
    expect(sentence("   ")).toBe("");
    expect(sentence(null)).toBe("");
  });
});

describe("spoken", () => {
  test("joins fragments as sentences and skips empty ones", () => {
    expect(spoken("Star 1", "", null, "I did it, day 2", undefined, false, "Sent it.")).toBe("Star 1. I did it, day 2. Sent it.");
  });
  test("never yields a doubled mark", () => {
    const out = spoken("Done.", "Really?", "Yes!", "plain");
    expect(out).toBe("Done. Really? Yes! plain.");
    expect(out).not.toMatch(/[.!?…]\./);
  });
});

describe("the Arc's spoken labels", () => {
  test("the ledger agrees with its counts ('1 chapter, 1 proof, 1 night.')", () => {
    expect(statsLabel({ chapters: 1, proofs: 1, nights: 1 })).toBe("1 chapter, 1 proof, 1 night.");
    expect(statsLabel({ chapters: 2, proofs: 0, nights: 5 })).toBe("2 chapters, 0 proofs, 5 nights.");
    expect(statsLabel({ chapters: 1, proofs: 3, nights: 1 })).not.toMatch(/\b1 (chapters|proofs|nights)\b/);
  });
  test("a proof node keeps the user's own full stop (no 'admire..')", () => {
    const label = proofNodeLabel({ starIndex: 2, label: "I did it", day: 3, text: "Sent my portfolio to two studios I admire.", notes: "Today · Woven into Chapter III" });
    expect(label).toBe("Star 2. I did it, day 3. Sent my portfolio to two studios I admire. Today · Woven into Chapter III.");
    expect(label).not.toContain("..");
  });
  test("a proof with no mark of its own gets one; a question keeps its own", () => {
    expect(proofNodeLabel({ starIndex: 1, label: "I learned", day: 1, text: "Asked for help", notes: "Yesterday" })).toBe("Star 1. I learned, day 1. Asked for help. Yesterday.");
    expect(proofNodeLabel({ starIndex: 4, label: "Something moved", day: 9, text: "Who knew?", notes: "Mon 5 Oct" })).toBe("Star 4. Something moved, day 9. Who knew? Mon 5 Oct.");
  });
});
