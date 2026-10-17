import { describe, expect, test } from "bun:test";
import type { Span } from "@/contexts/arc.types";
import { isUserWords, paragraphRuns } from "./segments";
import {
  CUES,
  buildIfThen,
  chapterLinkLabel,
  cleanMove,
  cueById,
  ifThenLine,
  minutesLabel,
  neighbours,
  nextLocalTime,
  nextRate,
  nextRitualAt,
  parseHHmm,
  rateLabel,
  remindAtFor,
  sleepTimerFor,
} from "./cues";

const TEXT = "You remember the afternoon you wrote “Bought the domain name”. Maya, it counted. Then you rest.";
const q0 = TEXT.indexOf("“");
const q1 = TEXT.indexOf("”") + 1;
const n0 = TEXT.indexOf("Maya");
const PROOF: Span = { kind: "proof", start: q0, end: q1, proofId: "p0" };
const NAME: Span = { kind: "name", start: n0, end: n0 + 4 };

const join = (runs: { text: string }[]) => runs.map((r) => r.text).join("");

describe("paragraphRuns", () => {
  test("plain paragraph is one run", () => {
    const runs = paragraphRuns("Lie back. Let it be slow.", [], null);
    expect(runs).toEqual([{ start: 0, end: 25, text: "Lie back. Let it be slow.", kind: null, spoken: false }]);
  });

  test("empty text has no runs", () => {
    expect(paragraphRuns("", [PROOF], null)).toEqual([]);
  });

  test("spans become their own runs and the text is preserved", () => {
    const runs = paragraphRuns(TEXT, [NAME, PROOF], null);
    expect(join(runs)).toBe(TEXT);
    const proof = runs.find((r) => r.kind === "proof");
    expect(proof?.text).toBe("“Bought the domain name”");
    expect(runs.find((r) => r.kind === "name")?.text).toBe("Maya");
    expect(runs.every((r) => !r.spoken)).toBe(true);
  });

  test("the spoken sentence cuts through a span", () => {
    const sentence = { start: 0, end: TEXT.indexOf(".") + 1 };
    const runs = paragraphRuns(TEXT, [PROOF], sentence);
    expect(join(runs)).toBe(TEXT);
    const spoken = runs.filter((r) => r.spoken);
    expect(join(spoken)).toBe(TEXT.slice(0, sentence.end));
    expect(spoken.some((r) => r.kind === "proof")).toBe(true);
    expect(runs[runs.length - 1].spoken).toBe(false);
  });

  test("adjacent runs with the same style merge", () => {
    const runs = paragraphRuns(TEXT, [], { start: 0, end: TEXT.length });
    expect(runs).toHaveLength(1);
    expect(runs[0].spoken).toBe(true);
  });

  test("out-of-range and overlapping spans are tolerated", () => {
    const bad: Span[] = [
      { kind: "desire", start: -5, end: 3 },
      { kind: "proof", start: 2, end: 6 },
      { kind: "name", start: TEXT.length - 2, end: TEXT.length + 40 },
      { kind: "desire", start: 10, end: 10 },
    ];
    const runs = paragraphRuns(TEXT, bad, { start: 90, end: 4000 });
    expect(join(runs)).toBe(TEXT);
    expect(runs[0]).toMatchObject({ start: 0, end: 3, kind: "desire" });
    expect(runs.some((r) => r.kind === "proof")).toBe(false);
  });

  test("only desire and proof are the user's words", () => {
    expect(isUserWords("desire")).toBe(true);
    expect(isUserWords("proof")).toBe(true);
    expect(isUserWords("name")).toBe(false);
    expect(isUserWords(null)).toBe(false);
  });
});

describe("if-then cues", () => {
  const evening = new Date(2026, 9, 21, 21, 4);
  const morning = new Date(2026, 9, 21, 7, 30);

  test("next local time is today when later, else tomorrow", () => {
    expect(nextLocalTime(9, 0, morning).getDate()).toBe(21);
    expect(nextLocalTime(9, 0, evening).getDate()).toBe(22);
    expect(nextLocalTime(9, 0, evening).getHours()).toBe(9);
    // exactly now is not 'later'
    expect(nextLocalTime(21, 4, evening).getDate()).toBe(22);
  });

  test("remindAt comes from the cue; other has no clock", () => {
    const at = new Date(remindAtFor(cueById("lunch"), morning)!);
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([21, 12, 30]);
    expect(remindAtFor(cueById("other"), morning)).toBeNull();
    expect(remindAtFor(null, morning)).toBeNull();
    expect(CUES.map((c) => c.id)).toEqual(["9am", "lunch", "after-work", "other"]);
  });

  test("an if-then needs both halves", () => {
    expect(buildIfThen("9am", "open the sketchbook.")).toEqual({ when: "9am", then: "open the sketchbook" });
    expect(buildIfThen("9am", "   ")).toBeNull();
    expect(buildIfThen(null, "open it")).toBeNull();
    expect(buildIfThen("  after   the school run ", " text  Sam ")).toEqual({ when: "after the school run", then: "text Sam" });
  });

  test("the line reads as one sentence", () => {
    expect(ifThenLine({ when: "9am", then: "open the sketchbook to a clean page." })).toBe(
      "If it’s 9am and I hesitate, then I open the sketchbook to a clean page."
    );
    expect(cleanMove("send it!!")).toBe("send it");
  });

  test("ritual time parsing and the next ritual", () => {
    expect(parseHHmm("08:15")).toEqual({ hour: 8, minute: 15 });
    expect(parseHHmm("nonsense")).toEqual({ hour: 21, minute: 0 });
    expect(parseHHmm("25:00")).toEqual({ hour: 21, minute: 0 });
    const next = nextRitualAt("evening", { morning: "08:00", evening: "21:00" }, evening);
    expect([next.getDate(), next.getHours()]).toEqual([22, 21]);
    const m = nextRitualAt("morning", { morning: "08:00", evening: "21:00" }, morning);
    expect([m.getDate(), m.getHours()]).toEqual([21, 8]);
  });
});

describe("listening controls and labels", () => {
  test("speed cycles through the three rates", () => {
    expect(nextRate(0.8)).toBe(0.9);
    expect(nextRate(0.9)).toBe(1.0);
    expect(nextRate(1.0)).toBe(0.8);
    expect(rateLabel(1)).toBe("1.0×");
  });

  test("sleep choices map to timers", () => {
    expect(sleepTimerFor("20")).toEqual({ kind: "minutes", minutes: 20 });
    expect(sleepTimerFor("end")).toEqual({ kind: "end-of-chapter" });
    expect(sleepTimerFor("off")).toEqual({ kind: "off" });
  });

  test("minutes never read zero", () => {
    expect(minutesLabel(0)).toBe("1 min");
    expect(minutesLabel(161_000)).toBe("3 min");
  });

  test("chapter links and neighbours", () => {
    expect(chapterLinkLabel({ number: 4, title: "They Know Your Work" })).toBe("IV · They Know Your Work");
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(neighbours(list, "b")).toEqual({ prev: { id: "a" }, next: { id: "c" } });
    expect(neighbours(list, "a")).toEqual({ prev: null, next: { id: "b" } });
    expect(neighbours(list, "zz")).toEqual({ prev: null, next: null });
  });
});
