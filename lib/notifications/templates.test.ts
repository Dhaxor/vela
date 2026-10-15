import { describe, expect, test } from "bun:test";
import type { NotificationTemplate } from "@/lib/story/content/types";
import {
  agoPhrase,
  countValues,
  curlyQuote,
  fillTemplate,
  formatRitualTime,
  isNeutral,
  midSentence,
  noteDelivered,
  numberWord,
  parseHHmm,
  pickTemplate,
  romanNumeral,
  tokensIn,
} from "./templates";

const nt = (id: string, title: string, body: string): NotificationTemplate => ({ id, title, body });

describe("tokens and privacy", () => {
  test("finds tokens and tells neutral templates from personal ones", () => {
    expect(tokensIn("Chapter {chapter.numeral} for {name}")).toEqual(["{chapter.numeral}", "{name}"]);
    expect(isNeutral(nt("a", "Chapter {chapter.numeral}", "Ready, {name}."))).toBe(true);
    expect(isNeutral(nt("b", "Today", "{bridge.quote}"))).toBe(false);
    expect(isNeutral(nt("c", "{desire.quote}", "x"))).toBe(false);
    expect(isNeutral(nt("d", "x", "It’s {ifthen.when}"))).toBe(false);
  });
});

describe("fillTemplate", () => {
  test("fills every token", () => {
    expect(fillTemplate(nt("a", "Chapter {chapter.numeral}", "Ready, {name}."), { "{chapter.numeral}": "IV", "{name}": "Maya" })).toEqual({
      title: "Chapter IV",
      body: "Ready, Maya.",
    });
  });

  test("a missing or empty value makes the template ineligible", () => {
    expect(fillTemplate(nt("a", "Hi", "{proof.quote}"), {})).toBeNull();
    expect(fillTemplate(nt("a", "Hi", "{proof.quote}"), { "{proof.quote}": "" })).toBeNull();
  });

  test("copy over the Lock Screen limits is ineligible", () => {
    const long = "x".repeat(41);
    expect(fillTemplate(nt("a", "{name}", "ok"), { "{name}": long })).toBeNull();
    expect(fillTemplate(nt("a", "ok", "{name}"), { "{name}": "y".repeat(121) })).toBeNull();
    expect(fillTemplate(nt("a", "{name}", "ok"), { "{name}": "x".repeat(40) })).not.toBeNull();
  });
});

describe("pickTemplate", () => {
  const pool = [nt("a", "A", "a"), nt("b", "B {desire.quote}", "b"), nt("c", "C", "c")];
  const values = { "{desire.quote}": "“a studio”" };

  test("library order, skipping templates used this cycle", () => {
    expect(pickTemplate(pool, [], values, false)?.template.id).toBe("a");
    expect(pickTemplate(pool, ["a"], values, false)?.used).toEqual(["a", "b"]);
  });

  test("neutral-only skips personal templates", () => {
    expect(pickTemplate(pool, ["a"], values, true)?.template.id).toBe("c");
  });

  test("a spent cycle restarts without repeating the last one", () => {
    const pick = pickTemplate(pool, ["a", "c"], values, true)!;
    expect(pick.template.id).toBe("a");
    expect(pick.used).toEqual(["a"]);
    const afterA = pickTemplate(pool, ["c", "a"], values, true)!;
    expect(afterA.template.id).toBe("c");
  });

  test("a single eligible template repeats rather than going silent", () => {
    expect(pickTemplate([nt("only", "O", "o")], ["only"], {}, true)?.template.id).toBe("only");
  });

  test("nothing eligible → null", () => {
    expect(pickTemplate([nt("p", "{proof.quote}", "x")], [], {}, false)).toBeNull();
    expect(pickTemplate([], [], {}, false)).toBeNull();
  });

  test("noteDelivered starts a new cycle on a repeat", () => {
    expect(noteDelivered(["a"], "b")).toEqual(["a", "b"]);
    expect(noteDelivered(["a", "b"], "a")).toEqual(["a"]);
  });
});

describe("token values", () => {
  test("number words for TTS-friendly copy", () => {
    expect(numberWord(2)).toBe("two");
    expect(numberWord(12)).toBe("twelve");
    expect(numberWord(40)).toBe("forty");
    expect(numberWord(42)).toBe("forty-two");
    expect(numberWord(100)).toBe("one hundred");
    expect(numberWord(301)).toBe("three hundred one");
    expect(numberWord(2026)).toBe("two thousand twenty-six");
    expect(numberWord(12345)).toBe("12345");
  });

  test("roman numerals", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(romanNumeral)).toEqual(["I", "II", "III", "IV", "V", "VI", "VII"]);
    expect(romanNumeral(14)).toBe("XIV");
    expect(romanNumeral(0)).toBe("0");
  });

  test("quotes: curly, trailing punctuation dropped", () => {
    expect(curlyQuote("my own design studio.")).toBe("“my own design studio”");
    expect(curlyQuote("  Sent it!!  ")).toBe("“Sent it”");
    expect(curlyQuote("said \"yes\" today")).toBe("“said “yes” today”");
    expect(curlyQuote("   ")).toBe("");
  });

  test("mid-sentence phrases lose the capital and the full stop, but keep acronyms and 'I'", () => {
    expect(midSentence("Open the portfolio file.")).toBe("open the portfolio file");
    expect(midSentence("After work")).toBe("after work");
    expect(midSentence("9am")).toBe("9am");
    expect(midSentence("NYC trip planning")).toBe("NYC trip planning");
    expect(midSentence("I'll call back")).toBe("I'll call back");
  });

  test("relative days", () => {
    expect(agoPhrase(0)).toBe("earlier today");
    expect(agoPhrase(1)).toBe("yesterday");
    expect(agoPhrase(12)).toBe("twelve days ago");
    expect(agoPhrase(-1)).toBeNull();
  });

  test("counts are offered only from two", () => {
    expect(countValues(1, "proofs")).toBeNull();
    expect(countValues(4, "proofs")).toEqual({ count: "four", phrase: "four proofs" });
  });

  test("ritual times", () => {
    expect(parseHHmm("21:00")).toEqual({ hour: 21, minute: 0 });
    expect(parseHHmm("7:05")).toEqual({ hour: 7, minute: 5 });
    expect(parseHHmm("24:00")).toBeNull();
    expect(parseHHmm("nine")).toBeNull();
    expect(formatRitualTime("21:00", "en-US")).toMatch(/^9:00\sPM$/);
    expect(formatRitualTime("21:00", "en-GB")).toBe("21:00");
    expect(formatRitualTime("oops")).toBe("oops");
  });
});
