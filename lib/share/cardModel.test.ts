import { describe, expect, test } from "bun:test";
import { ORIGINAL_FIGURES, VELA_SAIL, litEdges } from "@/lib/sky/figures";
import {
  CARD_HEIGHT,
  CARD_LAYOUT,
  CARD_TYPE,
  CARD_WIDTH,
  KIND_STATEMENT,
  SENTENCE_LINE_CHARS,
  SENTENCE_MAX_LINES,
  buildShareCard,
  cardFileName,
  cleanSentence,
  formatCardDate,
  quoteLines,
  wrapLines,
  type ShareCardInput,
} from "./cardModel";

const BASE: ShareCardInput = {
  figure: VELA_SAIL,
  lit: 4,
  kinds: ["did", "did", "learned", "moved"],
  starIndex: 4,
  kind: "moved",
  dateKey: "2026-10-21",
  sentence: "Booked a call with a studio lead.",
  season: 1,
  seed: 12345,
};

describe("formatCardDate", () => {
  test("formats a local date key without a locale", () => {
    expect(formatCardDate("2026-10-21")).toBe("21 October 2026");
    expect(formatCardDate("2027-01-01")).toBe("1 January 2027");
  });
  test("rejects anything that isn't a real day", () => {
    expect(formatCardDate("")).toBe("");
    expect(formatCardDate("2026-13-01")).toBe("");
    expect(formatCardDate("2026-02-30")).toBe("");
    expect(formatCardDate("21/10/2026")).toBe("");
  });
  test("knows leap days", () => {
    expect(formatCardDate("2028-02-29")).toBe("29 February 2028");
    expect(formatCardDate("2026-02-29")).toBe("");
  });
});

describe("wrapLines", () => {
  test("keeps every word, in order, within the width", () => {
    const text = "Sent my portfolio to two studios I admire and asked for one honest note back.";
    const lines = wrapLines(text, 24, 10);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(24);
    expect(lines.join(" ")).toBe(text);
  });
  test("ellipsizes when the text needs more lines than allowed", () => {
    const text = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    const lines = wrapLines(text, 20, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith("…")).toBe(true);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(20);
  });
  test("splits a word longer than a line", () => {
    const lines = wrapLines("a".repeat(30), 12, 5);
    expect(lines).toEqual(["a".repeat(12), "a".repeat(12), "a".repeat(6)]);
  });
  test("never ends an ellipsized line on punctuation", () => {
    const lines = wrapLines("one two three, four five six seven eight nine ten", 14, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/[a-z]…$/u);
  });
  test("collapses whitespace and empty input", () => {
    expect(wrapLines("  hello \n  world ", 40, 2)).toEqual(["hello world"]);
    expect(wrapLines("   ", 40, 2)).toEqual([]);
  });
});

describe("quoteLines / cleanSentence", () => {
  test("wraps the whole sentence in one pair of curly quotes", () => {
    const lines = quoteLines("Quoted my first real client and did not apologise for the price.");
    expect(lines[0].startsWith("“")).toBe(true);
    expect(lines[lines.length - 1].endsWith("”")).toBe(true);
    expect(lines.join(" ").match(/[“”]/gu)).toHaveLength(2);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(SENTENCE_LINE_CHARS);
    expect(lines.length).toBeLessThanOrEqual(SENTENCE_MAX_LINES);
  });
  test("drops quotes the user typed, so the card never prints doubled quotes", () => {
    expect(cleanSentence('  "Bought the domain."  ')).toBe("Bought the domain.");
    expect(quoteLines("“Bought the domain.”")).toEqual(["“Bought the domain.”"]);
  });
  test("a 240-character proof fits in the allowed lines", () => {
    const long = "I ".repeat(40) + "finally sent the email to the studio I have admired for years and asked about the open role";
    const lines = quoteLines(long.slice(0, 240));
    expect(lines.length).toBeLessThanOrEqual(SENTENCE_MAX_LINES);
    expect(lines[lines.length - 1].endsWith("…”")).toBe(true);
  });
});

describe("cardFileName", () => {
  test("is file-system safe and names the season and star", () => {
    expect(cardFileName(1, 4, "2026-10-21")).toBe("vela-proof-s1-4-2026-10-21.png");
    expect(cardFileName(2, 9, "bad")).toBe("vela-proof-s2-7-undated.png");
    expect(cardFileName(0, 0, "2026-10-21")).toBe("vela-proof-s1-1-2026-10-21.png");
  });
});

describe("buildShareCard", () => {
  test("is a 1080×1920 story card", () => {
    const card = buildShareCard(BASE);
    expect(card.width).toBe(CARD_WIDTH);
    expect(card.height).toBe(CARD_HEIGHT);
    expect(CARD_WIDTH / CARD_HEIGHT).toBeCloseTo(9 / 16, 5);
  });

  test("keeps the sentence private by default", () => {
    const card = buildShareCard(BASE);
    expect(card.sentence).toEqual([]);
    expect(card.accessibilityLabel).not.toContain("Booked");
    expect(JSON.stringify(card)).not.toContain("Booked a call");
  });

  test("includes the sentence only when asked", () => {
    const card = buildShareCard({ ...BASE, includeSentence: true });
    expect(card.sentence.map((l) => l.text).join(" ")).toBe("“Booked a call with a studio lead.”");
    expect(card.accessibilityLabel).toContain("Booked a call");
    expect(buildShareCard({ ...BASE, includeSentence: true, sentence: "   " }).sentence).toEqual([]);
  });

  test("never carries the dream itself (there is no desire field to leak)", () => {
    const card = buildShareCard({ ...BASE, includeSentence: false });
    const text = [card.eyebrow, card.title, card.date, card.sky, card.mark.word].map((t) => t.text).join(" | ");
    expect(text).toBe("PROOF 4 · CHARTED | Something moved. | 21 October 2026 | Season 1 · Star 4 of 7 | VELA");
  });

  test("names the constellation when the season has one", () => {
    const card = buildShareCard({ ...BASE, constellationName: " The Studio ", lit: 7, starIndex: 7, kinds: ["did", "did", "learned", "moved", "did", "did", "did"], kind: "did" });
    expect(card.sky.text).toBe("The Studio · Season 1");
    expect(card.title.text).toBe(KIND_STATEMENT.did);
    expect(card.accessibilityLabel).toBe("Proof card. Star 7 of 7, in The Studio, I did it, 21 October 2026");
  });

  test("highlights exactly the shared star, lit with its kind", () => {
    const card = buildShareCard(BASE);
    const hi = card.stars.filter((s) => s.highlighted);
    expect(hi).toHaveLength(1);
    expect(hi[0]).toMatchObject({ index: 4, lit: true, kind: "moved" });
    expect(card.focus).toMatchObject({ x: hi[0].x, y: hi[0].y });
    expect(card.stars.filter((s) => s.lit).map((s) => s.kind)).toEqual(["did", "did", "learned", "moved"]);
    expect(card.stars.filter((s) => !s.lit).every((s) => s.kind === null)).toBe(true);
  });

  test("lights the same edges as the app's figure", () => {
    const card = buildShareCard(BASE);
    expect(card.lines.filter((l) => l.lit)).toHaveLength(litEdges(VELA_SAIL, 4).length);
    expect(card.lines).toHaveLength(VELA_SAIL.edges.length);
  });

  test("a card for an earlier star still shows every star lit so far", () => {
    const card = buildShareCard({ ...BASE, starIndex: 2, kind: "did" });
    expect(card.stars.filter((s) => s.lit)).toHaveLength(4);
    expect(card.eyebrow.text).toBe("PROOF 2 · CHARTED");
  });

  test("never lights fewer stars than the one it shares", () => {
    const card = buildShareCard({ ...BASE, lit: 1, starIndex: 3, kinds: ["did", "did", "did"], kind: "did" });
    expect(card.stars.filter((s) => s.lit)).toHaveLength(3);
  });

  test("the figure sits inside its box and the box inside the card, for every figure", () => {
    for (const figure of [VELA_SAIL, ...ORIGINAL_FIGURES]) {
      const card = buildShareCard({ ...BASE, figure });
      const { x, y, width, height } = card.figureBox;
      for (const p of [card.anchor, ...card.stars]) {
        expect(p.x).toBeGreaterThanOrEqual(x);
        expect(p.x).toBeLessThanOrEqual(x + width);
        expect(p.y).toBeGreaterThanOrEqual(y);
        expect(p.y).toBeLessThanOrEqual(y + height);
      }
      expect(x).toBeGreaterThan(0);
      expect(x + width).toBeLessThan(CARD_WIDTH);
    }
  });

  test("text blocks are stacked top to bottom without overlap and stay on the card", () => {
    const card = buildShareCard({ ...BASE, includeSentence: true, sentence: "x ".repeat(200) });
    const box = card.figureBox;
    expect(card.title.y).toBeLessThan(box.y);
    expect(card.glyph.y - card.glyph.r).toBeGreaterThan(box.y + box.height);
    expect(card.date.y).toBeGreaterThan(card.glyph.y + card.glyph.r);
    expect(card.sky.y).toBeGreaterThan(card.date.y);
    const lastSentence = card.sentence[card.sentence.length - 1];
    expect(card.sentence[0].y - CARD_TYPE.sentence.size).toBeGreaterThan(card.sky.y);
    expect(lastSentence.y).toBeLessThan(card.mark.y);
    expect(card.mark.word.y).toBeLessThan(CARD_HEIGHT);
    expect(card.mark.y + card.mark.size).toBeLessThan(card.mark.word.y - CARD_TYPE.mark.size);
    expect(CARD_LAYOUT.figureTop + CARD_LAYOUT.figureHeight).toBe(box.y + box.height);
  });

  test("without a sentence the kind and day settle lower, still clear of the mark", () => {
    const quiet = buildShareCard(BASE);
    const loud = buildShareCard({ ...BASE, includeSentence: true });
    expect(quiet.date.y - loud.date.y).toBe(CARD_LAYOUT.metaDropWithoutSentence);
    expect(quiet.glyph.y - quiet.glyph.r).toBeGreaterThan(quiet.figureBox.y + quiet.figureBox.height);
    expect(quiet.sky.y).toBeLessThan(quiet.mark.y - CARD_TYPE.meta.size);
  });

  test("is deterministic, and the backdrop follows the seed", () => {
    expect(buildShareCard(BASE)).toEqual(buildShareCard(BASE));
    expect(buildShareCard({ ...BASE, seed: 99 }).backdrop).not.toEqual(buildShareCard(BASE).backdrop);
    for (const s of buildShareCard(BASE).backdrop) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(CARD_WIDTH);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(CARD_HEIGHT);
    }
  });

  test("names the file after the season, star and day", () => {
    expect(buildShareCard(BASE).fileName).toBe("vela-proof-s1-4-2026-10-21.png");
  });
});
