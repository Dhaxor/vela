// The focused field stays in the band between the header and the keyboard
// plus the dock riding on it (results-4 C17/C18: the proof sentence at y 636
// sat under a dock at ~550 and a keyboard at 655 on a 440x956 iPhone).
import { describe, expect, test } from "bun:test";
import { HostStack, REVEAL_MARGIN, TEXT_SLACK, bandBottom, clampOffset, revealDelta, revealSpan } from "./keyboardReveal";

describe("revealDelta", () => {
  // The run-4 proof form: scroll view from 100, keyboard top 655, dock top 550.
  const band = { top: 100, bottom: bandBottom(655, 655, 550) };

  test("the run-4 proof field (y 636, 128 tall) scrolls up until it clears the dock", () => {
    const field = { y: 636, height: 128 };
    const d = revealDelta(field, band);
    expect(d).toBe(636 + 128 - (550 - REVEAL_MARGIN));
    const after = { y: field.y - d, height: field.height };
    expect(after.y + after.height).toBeLessThanOrEqual(550 - REVEAL_MARGIN);
    expect(after.y).toBeGreaterThanOrEqual(100 + REVEAL_MARGIN);
  });

  test("a field already in the band stays put", () => {
    expect(revealDelta({ y: 300, height: 56 }, band)).toBe(0);
  });

  test("a field above the band scrolls back down into it", () => {
    expect(revealDelta({ y: 40, height: 56 }, band)).toBe(40 - (100 + REVEAL_MARGIN));
  });

  test("a field taller than the band shows its start on focus and its end while it grows", () => {
    const tall = { y: 500, height: 600 };
    expect(revealDelta(tall, band, { prefer: "start" })).toBe(500 - (100 + REVEAL_MARGIN));
    expect(revealDelta(tall, band, { prefer: "end" })).toBe(1100 - (550 - REVEAL_MARGIN));
  });

  test("an iPhone SE-sized band (667pt, keyboard 260, dock 104) still fits a one-line field", () => {
    const se = { top: 96, bottom: bandBottom(667 - 260, 667 - 260, 667 - 260 - 104) };
    const field = { y: 420, height: 56 };
    const d = revealDelta(field, se);
    expect(d).toBeGreaterThan(0);
    expect(field.y - d + field.height).toBeLessThanOrEqual(se.bottom - REVEAL_MARGIN);
    expect(field.y - d).toBeGreaterThanOrEqual(se.top + REVEAL_MARGIN);
  });

  test("no band left, or a broken measurement: no move", () => {
    expect(revealDelta({ y: 500, height: 56 }, { top: 300, bottom: 310 })).toBe(0);
    expect(revealDelta({ y: Number.NaN, height: 56 }, band)).toBe(0);
    expect(revealDelta({ y: 500, height: -1 }, band)).toBe(0);
  });
});

describe("revealSpan", () => {
  const page = { y: 120, height: 240 }; // the Script page's empty minimum height
  test("on focus: the whole field", () => {
    expect(revealSpan(page, "start", 56)).toEqual(page);
    expect(revealSpan(page, "end")).toEqual(page);
  });
  test("while writing: the text so far, never more than the field", () => {
    expect(revealSpan(page, "end", 84)).toEqual({ y: 120, height: 84 + TEXT_SLACK });
    expect(revealSpan(page, "end", 400)).toEqual(page);
  });
  test("three lines on a 240pt page in an SE band stay in view without pushing the words up", () => {
    const band = { top: 76, bottom: 303 };
    const page2 = { y: 100, height: 240 };
    // The text's end is in the band already: no move (the page's empty end may sit under the dock).
    expect(revealDelta(revealSpan(page2, "end", 84), band, { prefer: "end" })).toBe(0);
    // Eight lines: scroll just enough to keep the newest line above the band's bottom.
    const d = revealDelta(revealSpan(page2, "end", 224), band, { prefer: "end" });
    expect(d).toBe(100 + 224 + TEXT_SLACK - (303 - REVEAL_MARGIN));
  });
});

describe("bandBottom", () => {
  test("whichever is highest of the keyboard, the scroll view's bottom and a dock", () => {
    expect(bandBottom(655, 700, 550)).toBe(550);
    expect(bandBottom(655, 600, null)).toBe(600);
    expect(bandBottom(500, 655, 560)).toBe(500);
  });
});

describe("clampOffset", () => {
  test("stays within what the content can scroll", () => {
    expect(clampOffset(250, 1400, 555)).toBe(250);
    expect(clampOffset(-20, 1400, 555)).toBe(0);
    expect(clampOffset(2000, 1400, 555)).toBe(845);
    expect(clampOffset(120, 400, 555)).toBe(0);
  });
});

describe("HostStack", () => {
  test("the newest host is on top; a closed sheet hands the keyboard back to the screen", () => {
    const stack = new HostStack<string>();
    expect(stack.top()).toBeNull();
    stack.push("today");
    stack.push("sheet");
    expect(stack.top()).toBe("sheet");
    stack.remove("sheet");
    expect(stack.top()).toBe("today");
    stack.push("today");
    expect(stack.size).toBe(1);
    stack.push("proof-form");
    stack.remove("today");
    expect(stack.top()).toBe("proof-form");
  });
});
