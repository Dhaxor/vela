import { describe, expect, test } from "bun:test";
import type { Chapter, Paragraph, Span } from "@/contexts/arc.types";
import {
  MAX_SENTENCE_CHARS,
  estimateRangeMs,
  firstSentenceOfParagraph,
  formatDuration,
  initialQueue,
  queueProgress,
  reduceQueue,
  resumeIndex,
  segmentChapter,
  sleepDeadline,
  sleepRemainingMs,
  splitSentences,
  spokenText,
  type NarrationQueue,
  type QueueEvent,
} from "./narration";

const sentencesOf = (text: string) => splitSentences(text).map((r) => text.slice(r.start, r.end));

describe("splitSentences", () => {
  test("splits plain sentences and trims whitespace", () => {
    expect(sentencesOf("  You wake early. The light is soft!  Is it time? ")).toEqual([
      "You wake early.",
      "The light is soft!",
      "Is it time?",
    ]);
  });

  test("keeps closing quotes and brackets with their sentence", () => {
    expect(sentencesOf("You wrote “I sent it.” Then you smiled. (It was raining.) Rain helps.")).toEqual([
      "You wrote “I sent it.”",
      "Then you smiled.",
      "(It was raining.)",
      "Rain helps.",
    ]);
    expect(sentencesOf('She said "Go." Then she went.')).toEqual(['She said "Go."', "Then she went."]);
  });

  test("does not split when a quote closes mid-sentence", () => {
    expect(sentencesOf("You said “maybe.” and laughed. Then quiet.")).toEqual(["You said “maybe.” and laughed.", "Then quiet."]);
    expect(sentencesOf("“Yes!” they called back.")).toEqual(["“Yes!” they called back."]);
  });

  test("starts a new sentence at an opening quote", () => {
    expect(sentencesOf("It is late. “Ready?” you ask.")).toEqual(["It is late.", "“Ready?” you ask."]);
  });

  test("ellipses end a sentence only before a capital", () => {
    expect(sentencesOf("You wait… and then it comes.")).toEqual(["You wait… and then it comes."]);
    expect(sentencesOf("You wait… Then it comes.")).toEqual(["You wait…", "Then it comes."]);
    expect(sentencesOf("You wait... then it comes. It does.")).toEqual(["You wait... then it comes.", "It does."]);
    expect(sentencesOf("Wait…what?")).toEqual(["Wait…what?"]);
  });

  test("abbreviations, initials and decimals do not end sentences", () => {
    expect(sentencesOf("Dr. Okafor nods. Mrs. Lee waves.")).toEqual(["Dr. Okafor nods.", "Mrs. Lee waves."]);
    expect(sentencesOf("Bring something warm, e.g. Tea. It helps.")).toEqual(["Bring something warm, e.g. Tea.", "It helps."]);
    expect(sentencesOf("J. K. Rowling wrote at a café. You can too.")).toEqual(["J. K. Rowling wrote at a café.", "You can too."]);
    expect(sentencesOf("It ran 3.5 miles. Then home.")).toEqual(["It ran 3.5 miles.", "Then home."]);
    expect(sentencesOf("See No. 5 on the list. Done.")).toEqual(["See No. 5 on the list.", "Done."]);
    expect(sentencesOf("You said no. Then yes.")).toEqual(["You said no.", "Then yes."]);
  });

  test("a sentence that starts with a digit is still a sentence", () => {
    expect(sentencesOf("You counted. 3 steps left.")).toEqual(["You counted.", "3 steps left."]);
  });

  test("text with no terminal punctuation is one sentence; blank text is none", () => {
    expect(sentencesOf("a line without an ending")).toEqual(["a line without an ending"]);
    expect(splitSentences("   ")).toEqual([]);
    expect(splitSentences("")).toEqual([]);
  });

  test("ranges index into the original text", () => {
    const text = "One. Two!";
    const [a, b] = splitSentences(text);
    expect([a.start, a.end, b.start, b.end]).toEqual([0, 4, 5, 9]);
  });

  test("over-long sentences split at the clause break nearest the middle", () => {
    const clause = "you keep walking along the water while the light changes over the hills";
    const text = `${clause}, ${clause}, ${clause}; ${clause}.`;
    expect(text.length).toBeGreaterThan(MAX_SENTENCE_CHARS);
    const parts = sentencesOf(text);
    // The semicolon (strongest break) splits first; the long head then splits at a comma.
    expect(parts.at(-1)).toBe(`${clause}.`);
    expect(parts.at(-2)?.endsWith(";")).toBe(true);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(MAX_SENTENCE_CHARS);
    expect(parts.join(" ")).toBe(text);
  });

  test("an over-long sentence without clause breaks stays whole", () => {
    const text = `${"word ".repeat(60).trim()}.`;
    expect(sentencesOf(text)).toEqual([text]);
  });
});

const para = (key: string, text: string, spans: Span[] = []): Paragraph => ({
  key,
  fragmentId: `f-${key}`,
  beat: "living",
  text,
  spans,
});

const nameSpan = (text: string, name: string): Span => {
  const start = text.indexOf(name);
  return { kind: "name", start, end: start + name.length };
};

describe("spokenText", () => {
  const text = "Siobhan, you open the door. The room is yours, Siobhan.";
  const p = para("p1", text, [
    { kind: "name", start: 0, end: 7 },
    { kind: "name", start: text.lastIndexOf("Siobhan"), end: text.lastIndexOf("Siobhan") + 7 },
  ]);

  test("substitutes the pronunciation into name spans only", () => {
    const [first, second] = splitSentences(text);
    expect(spokenText(p, first, "Siobhan", "Shiv-awn")).toBe("Shiv-awn, you open the door.");
    expect(spokenText(p, second, "Siobhan", "Shiv-awn")).toBe("The room is yours, Shiv-awn.");
  });

  test("without a pronunciation the text is spoken as written", () => {
    const [first] = splitSentences(text);
    expect(spokenText(p, first, "Siobhan", null)).toBe("Siobhan, you open the door.");
    expect(spokenText(p, first, "Siobhan", "   ")).toBe("Siobhan, you open the door.");
  });

  test("span-less (migrated) text gets a whole-word substitution", () => {
    const old = para("v1", "Ana, your plan for Anabelle Street starts here, Ana.");
    expect(spokenText(old, { start: 0, end: old.text.length }, "Ana", "Ah-na")).toBe(
      "Ah-na, your plan for Anabelle Street starts here, Ah-na."
    );
  });

  test("collapses whitespace", () => {
    const p2 = para("p2", "You  breathe\n in.");
    expect(spokenText(p2, { start: 0, end: p2.text.length })).toBe("You breathe in.");
  });
});

const chapter: Chapter = {
  id: "c1",
  dreamId: "d1",
  season: 1,
  number: 2,
  stage: 2,
  title: "The Night Before",
  revision: 1,
  writtenAt: "2026-10-15T20:00:00.000Z",
  source: "engine",
  wovenProofId: "p1",
  opening: {
    morning: para("p0", "Morning comes in gold. You stretch."),
    evening: para("p0", "The evening is quiet. Maya, you sit by the window.", [
      nameSpan("The evening is quiet. Maya, you sit by the window.", "Maya"),
    ]),
  },
  body: [
    para("p1", "You remember the afternoon you sent your portfolio. It counted."),
    para("p2", "Tomorrow waits."),
  ],
  closing: {
    morning: para("p3", "Carry it into the day."),
    evening: para("p3", "Rest now. It is enough."),
  },
  wordCount: { morning: 20, evening: 24 },
  engineVersion: 2,
};

describe("segmentChapter", () => {
  test("segments the chosen daypart in reading order with global indices", () => {
    const s = segmentChapter(chapter, "evening", { name: "Maya", pronunciation: "My-ah" });
    expect(s.map((x) => x.text)).toEqual([
      "The evening is quiet.",
      "Maya, you sit by the window.",
      "You remember the afternoon you sent your portfolio.",
      "It counted.",
      "Tomorrow waits.",
      "Rest now.",
      "It is enough.",
    ]);
    expect(s.map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(s.map((x) => x.paragraphIndex)).toEqual([0, 0, 1, 1, 2, 3, 3]);
    expect(s.map((x) => x.sentenceInParagraph)).toEqual([0, 1, 0, 1, 0, 0, 1]);
    expect(s[1].ttsText).toBe("My-ah, you sit by the window.");
    expect(s[1].text).toBe("Maya, you sit by the window.");
    expect(s[1].wordCount).toBe(6);
  });

  test("offsets point at the displayed paragraph text", () => {
    const paragraphs = [chapter.opening.morning, ...chapter.body, chapter.closing.morning];
    for (const s of segmentChapter(chapter, "morning")) {
      expect(paragraphs[s.paragraphIndex].text.slice(s.start, s.end)).toBe(s.text);
    }
  });

  test("firstSentenceOfParagraph finds the tap-to-listen target", () => {
    const s = segmentChapter(chapter, "evening");
    expect(firstSentenceOfParagraph(s, 1)).toBe(2);
    expect(firstSentenceOfParagraph(s, 3)).toBe(5);
    expect(firstSentenceOfParagraph(s, 9)).toBe(-1);
  });
});

describe("estimates", () => {
  const s = segmentChapter(chapter, "evening");

  test("slower rates take longer and ranges add up", () => {
    const slow = estimateRangeMs(s, 0.8);
    const normal = estimateRangeMs(s, 1.0);
    expect(slow).toBeGreaterThan(normal);
    expect(estimateRangeMs(s, 0.9, 0, 3) + estimateRangeMs(s, 0.9, 3)).toBeCloseTo(estimateRangeMs(s, 0.9), -1);
    expect(estimateRangeMs(s, 0.9, 5, 5)).toBe(0);
  });

  test("formatDuration is m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(161_000)).toBe("2:41");
    expect(formatDuration(59_600)).toBe("1:00");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

/* Queue state machine ---------------------------------------------------- */

const run = (q: NarrationQueue, ...events: QueueEvent[]) => events.reduce(reduceQueue, q);
const playFrom = (q: NarrationQueue, from = 0) => reduceQueue(q, { type: "enqueue", from });
const start = (q: NarrationQueue, index: number): QueueEvent => ({ type: "start", generation: q.generation, index });
const done = (q: NarrationQueue, index: number): QueueEvent => ({ type: "done", generation: q.generation, index });

/** Speak sentences [from, to) to completion in the current generation. */
function speak(q: NarrationQueue, from: number, to: number): NarrationQueue {
  for (let i = from; i < to; i++) q = run(q, start(q, i), done(q, i));
  return q;
}

describe("reduceQueue", () => {
  test("starts idle at the beginning", () => {
    const q = initialQueue(5);
    expect(q).toMatchObject({ status: "idle", position: 0, current: null, speaking: false, heardCount: 0 });
    expect(queueProgress(q)).toBe(0);
  });

  test("onStart sets the highlight; onDone advances and keeps it until the next onStart", () => {
    let q = playFrom(initialQueue(5));
    expect(q.status).toBe("playing");
    q = reduceQueue(q, start(q, 0));
    expect(q).toMatchObject({ current: 0, speaking: true, position: 0 });
    q = reduceQueue(q, done(q, 0));
    expect(q).toMatchObject({ current: 0, speaking: false, position: 1, heardCount: 1 });
    expect(queueProgress(q)).toBeCloseTo(0.2);
    q = reduceQueue(q, start(q, 1));
    expect(q.current).toBe(1);
  });

  test("a replacement queue (new chapter) continues the generation count", () => {
    const old = playFrom(initialQueue(5));
    const next = initialQueue(3, old.generation + 1);
    expect(reduceQueue(playFrom(next), { type: "start", generation: old.generation, index: 0 }).current).toBeNull();
  });

  test("callbacks from a replaced queue are ignored", () => {
    let q = playFrom(initialQueue(5));
    const stale = q.generation;
    q = playFrom(q, 2); // re-queued (seek or rate change)
    const before = q;
    q = run(q, { type: "start", generation: stale, index: 0 }, { type: "done", generation: stale, index: 0 });
    expect(q).toBe(before);
    q = reduceQueue(q, { type: "error", generation: stale, index: 1 });
    expect(q).toBe(before);
  });

  test("pause keeps the sentence being spoken as the resume point", () => {
    let q = speak(playFrom(initialQueue(5)), 0, 2);
    q = reduceQueue(q, start(q, 2));
    const generation = q.generation;
    q = reduceQueue(q, { type: "pause" });
    expect(q).toMatchObject({ status: "paused", position: 2, current: null, speaking: false });
    expect(q.generation).toBe(generation + 1);
    expect(resumeIndex(q)).toBe(2);
    // a cancelled utterance reporting late changes nothing
    expect(reduceQueue(q, { type: "done", generation, index: 2 })).toBe(q);
  });

  test("pause between utterances resumes at the next sentence", () => {
    const q = reduceQueue(speak(playFrom(initialQueue(5)), 0, 3), { type: "pause" });
    expect(resumeIndex(q)).toBe(3);
  });

  test("finishing the last sentence finishes the queue; play again restarts", () => {
    const q = speak(playFrom(initialQueue(3)), 0, 3);
    expect(q).toMatchObject({ status: "finished", current: null, position: 3 });
    expect(queueProgress(q)).toBe(1);
    expect(resumeIndex(q)).toBe(0);
  });

  test("heard is reached once at 60% of distinct sentences", () => {
    let q = speak(playFrom(initialQueue(5)), 0, 2);
    expect(q.heardReached).toBe(false);
    q = speak(q, 2, 3);
    expect(q.heardCount).toBe(3);
    expect(q.heardReached).toBe(true);
    // re-listening does not double count
    q = speak(playFrom(q, 0), 0, 1);
    expect(q.heardCount).toBe(3);
    expect(q.heardReached).toBe(true);
  });

  test("an utterance error pauses at that sentence", () => {
    let q = playFrom(initialQueue(4));
    q = run(q, start(q, 0), done(q, 0));
    q = reduceQueue(q, { type: "error", generation: q.generation, index: 1 });
    expect(q).toMatchObject({ status: "paused", position: 1, speaking: false });
  });

  test("stop resets to the start but remembers what was heard", () => {
    const q = reduceQueue(speak(playFrom(initialQueue(5)), 0, 3), { type: "stop" });
    expect(q).toMatchObject({ status: "idle", position: 0, current: null, heardCount: 3, heardReached: true });
  });

  test("seek moves the resume point only when nothing is queued", () => {
    const idle = reduceQueue(initialQueue(5), { type: "seek", index: 3 });
    expect(idle).toMatchObject({ status: "idle", position: 3 });
    const finished = reduceQueue(speak(playFrom(initialQueue(2)), 0, 2), { type: "seek", index: 1 });
    expect(finished).toMatchObject({ status: "paused", position: 1 });
    const playing = playFrom(initialQueue(5));
    expect(reduceQueue(playing, { type: "seek", index: 4 })).toBe(playing);
    expect(reduceQueue(initialQueue(5), { type: "seek", index: 99 }).position).toBe(4);
  });

  test("enqueue clamps its start and an empty chapter never plays", () => {
    expect(playFrom(initialQueue(3), 10).position).toBe(2);
    expect(playFrom(initialQueue(3), -4).position).toBe(0);
    expect(playFrom(initialQueue(0)).status).toBe("idle");
  });

  test("unavailable is terminal for the queue", () => {
    const q = reduceQueue(initialQueue(3), { type: "unavailable" });
    expect(q.status).toBe("unavailable");
    expect(playFrom(q)).toBe(q);
  });
});

describe("sleep timer", () => {
  test("only minute timers have a deadline", () => {
    expect(sleepDeadline({ kind: "minutes", minutes: 10 }, 1_000)).toBe(601_000);
    expect(sleepDeadline({ kind: "off" }, 1_000)).toBeNull();
    expect(sleepDeadline({ kind: "end-of-chapter" }, 1_000)).toBeNull();
  });

  test("remaining time counts down to zero", () => {
    expect(sleepRemainingMs(601_000, 1_000)).toBe(600_000);
    expect(sleepRemainingMs(601_000, 700_000)).toBe(0);
    expect(sleepRemainingMs(null, 1_000)).toBeNull();
  });
});
