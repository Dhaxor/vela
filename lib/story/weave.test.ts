import { describe, expect, test } from "bun:test";
import { proofAgo, proofDate, proofDone, proofDoneClause, proofQuote, proofsCount } from "./weave";
import { fillTemplate } from "./fill";
import { numberWord, toRoman } from "./text";

describe("{proof.done}", () => {
  const cases: readonly (readonly [string, string])[] = [
    ["Sent my portfolio to two studios I admire.", "you sent your portfolio to two studios you admire"],
    ["Paid an extra 50 toward the card..", "you paid an extra 50 toward the card"],
    ["I emailed three past clients", "you emailed three past clients"],
    ["Called mum", "you called mum"],
    ["Walk 20 minutes", "you walked 20 minutes"],
    ["I was brave", "you were brave"],
    ["I've started the course", "you started the course"],
    ["Today I asked for the raise!", "you asked for the raise"],
    ["Learned that I need more rest", "you learned that you need more rest"],
    ["Told the team I was ready", "you told the team you were ready"],
    ["Fixed the constructor in my app", "you fixed the constructor in your app"],
  ];
  for (const [raw, expected] of cases) {
    test(JSON.stringify(raw), () => expect(proofDone(raw)).toBe(expected));
  }

  test("notes that are not a deed stay quoted", () => {
    for (const raw of ["Proof number 1: asked for feedback", "Design review went well", "Two things. First I called.", "That mornings are better", "Said I love you first.", "Told my sister you were right", "I write better at night with the phone in another room"]) {
      expect(proofDoneClause(raw)).toBeNull();
      expect(proofDone(raw)).toBe(`you wrote ${proofQuote(raw)}`);
    }
  });

  test("quotes are curly and lose the final punctuation", () => {
    expect(proofQuote("Sent it..")).toBe("“Sent it”");
    expect(proofQuote("\"Done\"")).toBe("“Done”");
  });
});

describe("dates and counts", () => {
  test("{proof.ago} in words", () => {
    expect(proofAgo("2026-10-15", "2026-10-15")).toBe("earlier today");
    expect(proofAgo("2026-10-14", "2026-10-15")).toBe("yesterday");
    expect(proofAgo("2026-10-03", "2026-10-15")).toBe("twelve days ago");
    expect(proofAgo("2026-09-20", "2026-10-15")).toBe("three weeks ago");
    expect(proofAgo("2026-07-01", "2026-10-15")).toBe("three months ago");
    expect(proofAgo("2025-10-01", "2026-10-15")).toBe("a year ago");
  });

  test("{proof.date} for TTS, with the year only when it differs", () => {
    expect(proofDate("2026-10-14", "2026-10-15")).toBe("October 14");
    expect(proofDate("2025-12-31", "2026-01-02")).toBe("December 31, 2025");
  });

  test("number words", () => {
    expect([0, 4, 12, 21, 40, 99, 312].map(numberWord)).toEqual(["zero", "four", "twelve", "twenty-one", "forty", "ninety-nine", "three hundred twelve"]);
    expect(proofsCount(1)).toEqual({ count: "one", phrase: "one proof" });
    expect(proofsCount(4)).toEqual({ count: "four", phrase: "four proofs" });
    expect([1, 3, 4, 7, 9, 14].map(toRoman)).toEqual(["I", "III", "IV", "VII", "IX", "XIV"]);
  });
});

describe("fill", () => {
  test("a/an agrees with the value; a sentence-opening value is capitalised; a doubled subject collapses", () => {
    const v = { "{feeling}": { value: "alive" }, "{proof.done}": { value: "you sent it", span: "proof" as const } };
    expect(fillTemplate("It is a {feeling} morning.", v).text).toBe("It is an alive morning.");
    expect(fillTemplate("The afternoon you {proof.done}.", v).text).toBe("The afternoon you sent it.");
    const f = fillTemplate("Look. {proof.done}, and it shows.", v);
    expect(f.text).toBe("Look. You sent it, and it shows.");
    expect(f.text.slice(f.spans[0].start, f.spans[0].end)).toBe("You sent it");
  });

  test("dollar signs and braces in user words come through literally", () => {
    const f = fillTemplate("It is real: {desire.quote}.", { "{desire.quote}": { value: "“earn $10,000/month {really}”", span: "desire" } });
    expect(f.text).toBe("It is real: “earn $10,000/month {really}”.");
  });
});
