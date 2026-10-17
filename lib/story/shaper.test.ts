import { describe, expect, test } from "bun:test";
import { desireCore, NP_FALLBACK, shapeDesire } from "./shaper";
import { verbByBase, verbByGerund, VERBS } from "./verbs";

/** [as typed, shape, np, done, done.i] */
const TABLE: readonly (readonly [string, string, string, string, string])[] = [
  ["my own design studio", "noun", "your own design studio", "you have your own design studio", "I have my own design studio"],
  ["To open my own design studio by next summer", "to-verb", "opening your own design studio", "you opened your own design studio", "I opened my own design studio"],
  ["Find my soulmate", "imperative", "finding your soulmate", "you found your soulmate", "I found my soulmate"],
  ["I am debt free", "i-clause", "being debt free", "you are debt free", "I am debt free"],
  ["I want to be debt free", "to-verb", "being debt free", "you are debt free", "I am debt free"],
  ["Debt-free by 30", "state", "being debt-free", "you are debt-free", "I am debt-free"],
  ["I want to travel", "to-verb", "traveling", "you traveled", "I traveled"],
  ["A loving partner who truly sees me", "noun", "a loving partner who truly sees you", "you have a loving partner who truly sees you", "I have a loving partner who truly sees me"],
  ["Run my own bakery", "imperative", "running your own bakery", "you run your own bakery", "I run my own bakery"],
  ["Run a marathon", "imperative", "running a marathon", "you ran a marathon", "I ran a marathon"],
  ["Stop overthinking", "imperative", "no longer overthinking", "you stopped overthinking", "I stopped overthinking"],
  ["Quit my job and freelance", "imperative", "quitting your job and freelancing", "you quit your job and freelanced", "I quit my job and freelanced"],
  ["Write a book and sell it", "imperative", "writing a book and selling it", "you wrote a book and sold it", "I wrote a book and sold it"],
  ["Move to Lisbon this year", "imperative", "moving to Lisbon", "you moved to Lisbon", "I moved to Lisbon"],
  ["I want to feel confident at work", "to-verb", "feeling confident at work", "you feel confident at work", "I feel confident at work"],
  ["I've found my person", "i-clause", "finding your person", "you have found your person", "I have found my person"],
  ["I live by the sea", "i-clause", "living by the sea", "you live by the sea", "I live by the sea"],
  ["Being able to work from home", "state", "being able to work from home", "you are able to work from home", "I am able to work from home"],
  ["Journaling every morning", "gerund", "journaling every morning", "you journal every morning", "I journal every morning"],
  ["financial freedom", "noun", "financial freedom", "financial freedom is part of your life", "financial freedom is part of my life"],
  ["new clients", "noun", "new clients", "new clients are part of your life", "new clients are part of my life"],
  ["I wanna run my own café", "to-verb", "running your own café", "you run your own café", "I run my own café"],
  ["My goal is to buy a house before I turn 35", "to-verb", "buying a house", "you bought a house", "I bought a house"],
  ["I hope that I feel at home in my body 🏠", "i-clause", "feeling at home in your body", "you feel at home in your body", "I feel at home in my body"],
  ["manifesting a new job", "noun", "a new job", "you have a new job", "I have a new job"],
  ["Never worry about money again", "imperative", "never worrying about money again", "you never worry about money again", "I never worry about money again"],
  ["To finally open my bakery!!", "to-verb", "finally opening your bakery", "you finally opened your bakery", "I finally opened my bakery"],
  ["In love", "state", "being in love", "you are in love", "I am in love"],
  ["my own design studio, with clients who trust my eye", "noun", "your own design studio with clients who trust your eye", "you have your own design studio with clients who trust your eye", "I have my own design studio with clients who trust my eye"],
  ["Buy a house, near my parents", "imperative", "buying a house near your parents", "you bought a house near your parents", "I bought a house near my parents"],
  ["a home, a garden and a dog", "noun", "a home, a garden and a dog", "you have a home, a garden and a dog", "I have a home, a garden and a dog"],
  ["Travel, art and good friends", "noun", "travel, art and good friends", "travel, art and good friends are part of your life", "travel, art and good friends are part of my life"],
  ["peace and quiet", "noun", "peace and quiet", "peace and quiet are part of your life", "peace and quiet are part of my life"],
  // A coordinated verb after 'stop …ing' is a second wish: gerund in np, present for a habit, past for a one-off.
  ["Stop overthinking every message and just trust myself more", "imperative", "no longer overthinking every message and just trusting yourself more", "you stopped overthinking every message and just trust yourself more", "I stopped overthinking every message and just trust myself more"],
  ["Stop smoking and get fit", "imperative", "no longer smoking and getting fit", "you stopped smoking and got fit", "I stopped smoking and got fit"],
  ["Stop comparing myself and start living", "imperative", "no longer comparing yourself and starting living", "you stopped comparing yourself and started living", "I stopped comparing myself and started living"],
  ["Heal things with my sister before her wedding", "imperative", "healing things with your sister", "you healed things with your sister", "I healed things with my sister"],
];

describe("desire shapes", () => {
  for (const [raw, shape, np, done, doneI] of TABLE) {
    test(JSON.stringify(raw), () => {
      const s = shapeDesire(raw);
      expect([s.shape, s.np, s.done, s.doneI]).toEqual([shape, np, done, doneI]);
      expect(s.fallback).toBe(false);
    });
  }

  test("a modifier comma is dropped from the shaped phrases, never from the quote", () => {
    const s = shapeDesire("my own design studio, with clients who trust my eye");
    expect(s.quote).toBe("“my own design studio, with clients who trust my eye”");
    expect(s.np).not.toContain(",");
  });

  test("the quote keeps the user's exact words, minus trailing punctuation", () => {
    expect(shapeDesire("To finally open my bakery!!").quote).toBe("“To finally open my bakery”");
    expect(shapeDesire("  \"a home by the sea.\" ").quote).toBe("“a home by the sea”");
    expect(shapeDesire("I'm \"done\" waiting").quote).toBe("“I'm “done” waiting”");
  });
});

describe("normalisation", () => {
  test("want-verbs and deadline tails are stripped, places and objects are kept", () => {
    expect(desireCore("I really want a house in Lisbon by next year")).toBe("a house in Lisbon");
    expect(desireCore("This year, I will run a marathon")).toBe("to run a marathon");
    expect(desireCore("Spend the summer in Italy")).toBe("Spend the summer in Italy");
    expect(desireCore("Get married before my 30th birthday")).toBe("Get married");
    expect(desireCore("be debt free soon")).toBe("be debt free");
    expect(desireCore("Lose 10 pounds within 6 months")).toBe("Lose 10 pounds");
  });

  test("someone else's event is a deadline too: 'before her wedding', 'before his move', 'before their visit'", () => {
    expect(desireCore("Heal things with my sister before her wedding")).toBe("Heal things with my sister");
    expect(desireCore("Make peace with my brother before his move")).toBe("Make peace with my brother");
    expect(desireCore("Be close to my parents before their anniversary")).toBe("Be close to my parents");
  });

  test("an unknown capitalised word after 'to' is a place, never a verb", () => {
    expect(shapeDesire("To Paris").fallback).toBe(true);
  });
});

describe("cessation with a coordinated 'be' or 'have'", () => {
  test("'stop … and just be myself' cannot be shaped, so it falls back to the quote", () => {
    for (const raw of ["Stop overthinking and just be myself", "Stop worrying and have fun again"]) {
      const s = shapeDesire(raw);
      expect(s.fallback).toBe(true);
      expect(s.done).toBe(`you found your way to ${s.quote}`);
    }
  });

  test("an ambiguous word with no object after 'and' stays a noun", () => {
    expect(shapeDesire("Stop worrying about money and work").np).toBe("no longer worrying about money and work");
  });
});

describe("the short done form (after a colon, after 'the life where')", () => {
  test("a bare noun reads 'is yours' there; every other shape keeps its done clause", () => {
    expect(shapeDesire("financial freedom").doneShort).toBe("financial freedom is yours");
    expect(shapeDesire("Travel, art and good friends").doneShort).toBe("travel, art and good friends are yours");
    expect(shapeDesire("self-belief").doneShort).toBe("self-belief is yours");
    for (const raw of ["Find my soulmate", "I am debt free", "my own design studio", "To Paris"]) {
      const s = shapeDesire(raw);
      expect(s.doneShort).toBe(s.done);
    }
  });
});

describe("fallbacks (pinned: content is written against them)", () => {
  test("unshapeable input falls back to safe phrases", () => {
    for (const raw of ["", "I want. I need. Everything.", "To Paris", "a ".repeat(30)]) {
      const s = shapeDesire(raw);
      expect(s.shape).toBe("unshaped");
      expect(s.np).toBe(NP_FALLBACK);
      expect(s.np).toBe("the life you described");
      expect(s.done).toBe(`you found your way to ${s.quote}`);
      expect(s.npMy).toBe("the life I described");
    }
  });
});

describe("verb table", () => {
  test("about 150+ verbs with past, participle and gerund", () => {
    expect(VERBS.size).toBeGreaterThanOrEqual(150);
    for (const v of VERBS.values()) {
      expect(v.past).toMatch(/^[a-z]+$/u);
      expect(v.gerund).toMatch(/ing$/u);
    }
  });

  test("irregular and doubling forms", () => {
    expect(verbByBase("buy")).toMatchObject({ past: "bought", gerund: "buying" });
    expect(verbByBase("write")).toMatchObject({ past: "wrote", participle: "written", gerund: "writing" });
    expect(verbByBase("plan")).toMatchObject({ past: "planned", gerund: "planning" });
    expect(verbByBase("study")?.past).toBe("studied");
    expect(verbByGerund("running")?.base).toBe("run");
  });
});
