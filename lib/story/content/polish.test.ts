// S8 polish: regression tests on the REAL content for the story editors'
// requests. Each test names the defect it pins.
import { describe, expect, test } from "bun:test";
import { paragraphsForDaypart, type Chapter } from "@/contexts/arc.types";
import { bridgeOffers, reshapeStarters } from "@/lib/futureMemory";
import type { FocusId } from "@/lib/focus";
import { MAX_RECALL_WORDS, writeChapter, type WeaveProof, type WriteChapterInput } from "../engine";
import { matchMotifs } from "../motifs";
import { wordCount } from "../text";
import { BRIDGES, FOCUS_CONTENT, MOTIFS, SHARED_STAGES, STAGE_IDS, type ProofKind, type StageId } from "./index";

const proof = (id: string, kind: ProofKind, text: string, dateKey: string, origin: WeaveProof["origin"] = "bridge"): WeaveProof => ({ id, kind, text, dateKey, origin });

function chapterFor(focus: FocusId, desire: string, stage: StageId, seed: number, over: Partial<WriteChapterInput> = {}): Chapter {
  const history = [
    proof("h1", "did", "Made a decision without asking anyone first", "2026-09-20"),
    proof("h2", "moved", "Wore the yellow coat to the office", "2026-09-28"),
    proof("h3", "did", "Told my friend how I really felt about the plan", "2026-10-05"),
  ].slice(0, Math.max(0, stage - 2));
  return writeChapter({
    chapterId: `c${stage}-${seed}`,
    dreamId: "d1",
    season: 1,
    number: stage,
    stage,
    mode: stage === 1 ? "chapter-one" : "engine",
    revision: 1,
    name: "Leah",
    focus,
    desire,
    feeling: "free",
    motifIds: matchMotifs(desire, focus),
    recentIds: [],
    previousIds: [],
    woven: stage === 1 ? null : proof("w", (["did", "moved", "learned"] as const)[seed % 3], "Booked the trip on my own", "2026-10-12"),
    history,
    totalProofs: history.length + 1,
    seed: seed * 2654435761,
    now: new Date(2026, 9, 15, 21),
    todayKey: "2026-10-15",
    ...over,
  }).chapter;
}

const texts = (c: Chapter) =>
  [...paragraphsForDaypart(c, "morning"), c.opening.evening, c.closing.evening].map((p) => p.text);

describe("(a) bridges never splice the desire", () => {
  test("no bridge or 'Write my own' starter carries a desire token", () => {
    const withDesire = [...BRIDGES.entries.map((b) => [b.id, b.text]), ...Object.values(BRIDGES.reshape).flat().map((f) => [f.id, f.text])].filter(([, t]) => /\{desire\./u.test(t));
    expect(withDesire).toEqual([]);
  });

  test("a bridge that names {motif.place} is motif-tagged, so the place always exists", () => {
    expect(BRIDGES.entries.filter((b) => /\{motif\.place\}/u.test(b.text) && !b.motif).map((b) => b.id)).toEqual([]);
  });

  test("a long desire never shows up inside a step", () => {
    const desire = "my own design studio, with clients who trust my eye";
    const motifIds = matchMotifs(desire, "career");
    for (const stage of STAGE_IDS) {
      for (const lastProofKind of [null, "did", "moved", "learned"] as const) {
        for (const offer of bridgeOffers({ chapterId: `c${stage}`, focus: "career", stage, desire, motifIds, lastProofKind, pastLibraryIds: [] })) {
          expect(offer.text).not.toMatch(/design studio with|trust your eye/u);
        }
      }
    }
    for (const starter of reshapeStarters("career", desire)) expect(starter).not.toMatch(/design studio|trust your eye/u);
  });
});

describe("(e) motif lines leave {feeling} to the shared reflection", () => {
  test("no motif living or witness line uses {feeling}", () => {
    expect(MOTIFS.flatMap((m) => [...m.living, ...m.witness]).filter((f) => f.text.includes("{feeling}")).map((f) => f.id)).toEqual([]);
  });
});

describe("(f) recall stacking on the real content", () => {
  test(`no chapter opens with more than ${MAX_RECALL_WORDS} words of past proofs`, () => {
    for (const focus of ["career", "confidence", "peace"] as const) {
      for (const stage of [4, 5, 6, 7] as const) {
        for (let seed = 0; seed < 25; seed += 1) {
          const recall = chapterFor(focus, "Stop overthinking every message and just trust myself more", stage, seed).body.find((p) => p.beat === "recall");
          if (recall) expect(wordCount(recall.text)).toBeLessThanOrEqual(MAX_RECALL_WORDS);
        }
      }
    }
  });
});

describe("(h) a bare-noun desire never lands '… is part of your life' on a payoff", () => {
  const BARE: readonly (readonly [FocusId, string])[] = [
    ["confidence", "self-belief"],
    ["confidence", "confidence to speak up in meetings"],
    ["abundance", "financial freedom"],
    ["peace", "Peace of mind"],
  ];
  for (const [focus, desire] of BARE) {
    test(`${focus}: “${desire}”`, () => {
      const bad: string[] = [];
      for (const stage of STAGE_IDS) {
        for (let seed = 0; seed < 30; seed += 1) {
          for (const t of texts(chapterFor(focus, desire, stage, seed))) {
            if (/:\s[^.!?:]*\bpart of your life\b/u.test(t) || /\blife where [^.!?]*\bpart of your life\b/u.test(t)) bad.push(t);
          }
        }
      }
      expect([...new Set(bad)]).toEqual([]);
    });
  }

  test("the confidence frames the editors flagged no longer use a colon payoff", () => {
    const ids = new Set(["co1-ar3", "co5-ar2", "co5-ar4"]);
    const frames = STAGE_IDS.flatMap((s) => FOCUS_CONTENT.confidence.stages[s].arrival).filter((f) => ids.has(f.id));
    expect(frames).toHaveLength(3);
    for (const f of frames) expect(f.text).not.toMatch(/:\s*\{desire\.done\}/u);
    for (const f of SHARED_STAGES[5].reflection) expect(f.text).not.toMatch(/:\s*\{desire\.done\}/u);
  });
});

describe("(i) a proof that opens with 'Wrote…' is never framed as 'you wrote “Wrote…”'", () => {
  test("woven, recalled, seeded and not-today lines on the real content", () => {
    const text = "Wrote a message to Mum. Didn’t send it yet.";
    const doubled = /\bwr(?:ote|ite|iting)\b[^.!?“]{0,16}“Wrote|“Wrote[^”]*”,? you wrote/iu;
    const bad: string[] = [];
    for (let seed = 0; seed < 40; seed += 1) {
      for (const kind of ["did", "moved", "learned"] as const) {
        for (const origin of ["bridge", "not-today", "onboarding"] as const) {
          const stage: StageId = origin === "onboarding" ? 1 : 4;
          const w = proof("w", origin === "not-today" ? "learned" : kind, text, "2026-10-10", origin);
          const c = chapterFor("love", "To be close to my mum again", stage, seed, {
            woven: w,
            history: [proof("h", kind, text, "2026-10-01")],
            mode: stage === 1 ? "chapter-one" : "engine",
          });
          for (const t of texts(c)) if (doubled.test(t)) bad.push(t);
        }
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
