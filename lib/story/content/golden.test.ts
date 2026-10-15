// GOLDEN TESTS on the real content (release-blocking). Owner: A2.
// Lives beside the contract test so the writers' self-check
// (bun test lib/story/content) runs it too.
//
// 1. Golden matrix: 30 realistic desires × every frame that takes a desire.
// 2. Style lint over rendered chapters (banned phrases and patterns, em-dash
//    density, sentence length, 'now', doubled subjects).
// 3. A 30-chapter run of real dreams: no back-to-back paragraph or bridge,
//    each proof woven exactly once, invariants hold, word-count bounds once
//    the content is final.
// Assertions are pool-size agnostic: they hold for placeholder and final content.

import { describe, expect, test } from "bun:test";
import { EMPTY_ARC_INDEX, paragraphsForDaypart, type Chapter, type Paragraph } from "@/contexts/arc.types";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";
import { applyArcAction, type ArcAction, type ArcEnv, type ArcState } from "@/lib/store/arc";
import { chaptersOf, offersFor, seasonProgressOf } from "@/lib/store/arcSelectors";
import { checkArcInvariants } from "@/lib/store/invariants";
import { fillTemplate, type TokenValues } from "../fill";
import { motifFlags } from "../motifs";
import { shapeDesire } from "../shaper";
import { proofAgo, proofDate, proofDone, proofQuote } from "../weave";
import {
  BANNED_PATTERNS,
  BANNED_PHRASES,
  BRIDGES,
  CONTENT_STATUS,
  FOCUS_CONTENT,
  MOTIFS,
  SHARED_STAGES,
  STAGE_IDS,
  WEAVE,
  WRITING_RULES,
  contentEntries,
  type ContentKind,
  type Fragment,
  type Token,
} from "./index";

const DESIRES: readonly (readonly [FocusId, string])[] = [
  ["career", "my own design studio"],
  ["career", "To open my own bakery by next summer"],
  ["love", "Find my soulmate"],
  ["abundance", "I am debt free"],
  ["abundance", "I want to be debt free by 2027"],
  ["love", "A loving partner who truly sees me"],
  ["health", "Run a marathon"],
  ["health", "Sleep through the night again"],
  ["confidence", "I want to feel confident speaking up at work"],
  ["career", "a promotion to senior designer"],
  ["abundance", "Move to Lisbon and work remotely"],
  ["abundance", "Buy a house with a garden for my kids"],
  ["abundance", "financial freedom"],
  ["peace", "Peace of mind"],
  ["love", "Heal my relationship with my dad"],
  ["career", "Write and publish my first novel"],
  ["abundance", "I want to save $20,000 this year"],
  ["confidence", "Calm and confident"],
  ["love", "Get married next spring"],
  ["love", "Start a family"],
  ["career", "Land my dream job in tech"],
  ["health", "Being healthy and strong"],
  ["peace", "Stop overthinking everything"],
  ["love", "Travel the world with my best friend"],
  ["love", "Make new friends in my city"],
  ["career", "Get my nursing degree"],
  ["peace", "Have more time for myself"],
  ["peace", "I live by the sea"],
  ["confidence", "Pass my driving test"],
  ["career", "Grow my Etsy shop to 1,000 sales"],
  ["career", "my own design studio, with clients who trust my eye"],
  ["abundance", "Travel, art and good friends"],
];

/** Kinds read aloud in the second person: no first person may leak outside quotes. */
const NARRATION: ReadonlySet<ContentKind> = new Set<ContentKind>([
  "beat", "weave", "seed", "notToday", "recall", "cumulative", "motifLine", "bridge", "reshape", "learnedRetry", "notification", "scriptPrompt", "arcPrompt",
]);

const FIRST_PERSON = /(?<![\p{L}'’])(?:I|I['’](?:m|ve|ll|d))(?![\p{L}'’])|(?<![\p{L}'’])(?:my|me|mine|myself)(?![\p{L}'’])/iu;
const withoutQuotes = (s: string) => s.replace(/“[^”]*”/gu, "“”");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const phraseRe = (p: string) => new RegExp(`(?<![\\p{L}\\p{N}'’])${escapeRe(p)}(?![\\p{L}\\p{N}'’])`, "iu");
const BANNED_RES = BANNED_PHRASES.map((p) => [p, phraseRe(p)] as const);
const PATTERN_RES = BANNED_PATTERNS.map((p) => [p.id, new RegExp(p.source, "iu")] as const);

/** Problems that must never appear in rendered text, whatever the user typed. */
function hygiene(text: string): string[] {
  const out: string[] = [];
  if (/(?<![\p{L}])(?:in)?to to(?![\p{L}])/iu.test(text)) out.push("to to");
  if (/(?<!\.)\.\.(?!\.)/u.test(text)) out.push("..");
  if (/[!?]\./u.test(text)) out.push("!.");
  if (/ {2,}/u.test(text)) out.push("double space");
  if (/\{[^{}]*\}/u.test(text.replace(/“[^”]*”/gu, ""))) out.push("unfilled token");
  if (/(?<![\p{L}])you you(?![\p{L}])/iu.test(text)) out.push("you you");
  return out;
}

function valuesFor(desire: string): TokenValues {
  const shaped = shapeDesire(desire);
  const motif = MOTIFS[0];
  const proofText = "Sent my portfolio to two studios I admire.";
  return {
    "{name}": { value: "Maya" },
    "{feeling}": { value: "proud" },
    "{desire.quote}": { value: shaped.quote },
    "{desire.np}": { value: shaped.np },
    "{desire.done}": { value: shaped.done },
    "{desire.np.my}": { value: shaped.npMy },
    "{desire.done.i}": { value: shaped.doneI },
    "{proof.quote}": { value: proofQuote(proofText) },
    "{proof.done}": { value: proofDone(proofText) },
    "{proof.ago}": { value: proofAgo("2026-10-03", "2026-10-15") },
    "{proof.date}": { value: proofDate("2026-10-03", "2026-10-15") },
    "{proofs.count}": { value: "four" },
    "{proofs.phrase}": { value: "four proofs" },
    "{nights.count}": { value: "twelve" },
    "{nights.phrase}": { value: "twelve nights" },
    "{bridge.quote}": { value: "“Send one piece of work to someone whose eye you trust”" },
    "{ifthen.when}": { value: "9am" },
    "{ifthen.then}": { value: "open the portfolio file" },
    "{chapter.numeral}": { value: "IV" },
    "{chapter.title}": { value: "The Studio Door" },
    "{stage.name}": { value: "Someone Notices" },
    "{ritual.time}": { value: "9:00 PM" },
    ...(motif ? { "{motif.place}": { value: motif.place }, "{motif.detail}": { value: motif.details[0] ?? "a key with a paper tag" } } : {}),
  };
}

const DESIRE_TOKEN = /\{desire\.[a-z.]+\}/u;
const CANONICAL_FRAMES = [
  "You walk toward {desire.np}.",
  "Since {desire.done}, mornings feel different.",
  "It began with {desire.quote}.",
  "You wrote {desire.quote}, and here it is.",
  "The morning after {desire.done}, you wake slowly.",
  "This is what {desire.np} looks like up close.",
];

describe("golden matrix: 30 desires × every desire frame", () => {
  const frames = [
    ...CANONICAL_FRAMES.map((text, i) => ({ id: `canonical-${i}`, kind: "beat" as ContentKind, text })),
    ...contentEntries().filter((e) => DESIRE_TOKEN.test(e.text)),
  ];

  test("there are frames to test", () => {
    expect(frames.length).toBeGreaterThan(CANONICAL_FRAMES.length);
  });

  for (const [focus, desire] of DESIRES) {
    test(`${focus}: ${JSON.stringify(desire)}`, () => {
      const values = valuesFor(desire);
      const problems: string[] = [];
      for (const f of frames) {
        const text = fillTemplate(f.text, values).text;
        for (const p of hygiene(text)) problems.push(`${f.id}: ${p} → ${text}`);
        if (NARRATION.has(f.kind) && FIRST_PERSON.test(withoutQuotes(text))) problems.push(`${f.id}: first person → ${text}`);
      }
      expect(problems).toEqual([]);
    });
  }
});

/* =========================================================================
 * Rendered chapters
 * ========================================================================= */

/** Text with the user's own words (span ranges) blanked: those are not ours to lint. */
function ownText(p: Paragraph): string {
  let out = "";
  let last = 0;
  for (const s of p.spans) {
    out += `${p.text.slice(last, s.start)}WORDS`;
    last = s.end;
  }
  return out + p.text.slice(last);
}

const sentencesOf = (s: string) => s.split(/(?<=[.!?…])\s+/u).filter(Boolean);
const wordsIn = (s: string) => s.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function lintChapter(c: Chapter): string[] {
  const out: string[] = [];
  for (const daypart of ["morning", "evening"] as const) {
    const paragraphs = paragraphsForDaypart(c, daypart);
    const full = paragraphs.map((p) => p.text).join(" ");
    const own = paragraphs.map(ownText).join(" ");
    for (const p of hygiene(full)) out.push(`${daypart}: ${p}`);
    for (const [phrase, re] of BANNED_RES) if (re.test(own)) out.push(`${daypart}: banned "${phrase}"`);
    for (const [id, re] of PATTERN_RES) if (re.test(id === "to-to" || id === "double-stop" ? full : own)) out.push(`${daypart}: pattern ${id}`);
    if ((own.match(/(?<![\p{L}])now(?![\p{L}])/giu) ?? []).length > WRITING_RULES.maxNowPerChapter) out.push(`${daypart}: 'now' more than once`);
    const dashes = (own.match(/—/gu) ?? []).length;
    if (dashes > Math.max(2, Math.ceil(wordsIn(full) / 100))) out.push(`${daypart}: ${dashes} em dashes`);
    for (const p of paragraphs) {
      if ((ownText(p).match(/—/gu) ?? []).length > 2) out.push(`${p.fragmentId}: em dashes`);
      for (const sentence of sentencesOf(ownText(p))) {
        if (wordsIn(sentence) > WRITING_RULES.maxSentenceWords) out.push(`${p.fragmentId}: ${wordsIn(sentence)}-word sentence`);
      }
      if (FIRST_PERSON.test(withoutQuotes(ownText(p)))) out.push(`${p.fragmentId}: first person`);
    }
  }
  return out;
}

/* =========================================================================
 * A real run through the reducer
 * ========================================================================= */

interface Run {
  readonly renders: { chapter: Chapter; flags: ReadonlySet<string>; motif: boolean }[];
  readonly bridges: { libraryId: string; tier: string; pool: number }[];
  readonly state: ArcState;
}

function run(focus: FocusId, desire: string, chapters: number, seedText: string | null): Run {
  let state: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };
  let t = new Date(2026, 9, 1, 21).getTime();
  let n = 0;
  const act = <A extends ArcAction>(a: A) => {
    t += 26 * 3600_000;
    const env: ArcEnv = { now: new Date(t), isPlus: true, name: "Maya", newId: () => `g${++n}`, seed: n * 2654435761 };
    const out = applyArcAction(state, a, env);
    state = out.state;
    return out.result;
  };
  const renders: Run["renders"] = [];
  const bridges: Run["bridges"] = [];
  const first = act({ type: "CREATE_DREAM", input: { focus, desire, feeling: "proud", ...(seedText ? { seedProof: { text: seedText } } : {}) } });
  const dream = () => state.index.dreams[0];
  const record = (c: Chapter) => renders.push({ chapter: c, flags: motifFlags(dream().motifIds), motif: dream().motifIds.length > 0 });
  record(first);
  const kinds = ["did", "moved", "learned", "did", "did", "moved"] as const;
  while (renders.length < chapters) {
    const latest = chaptersOf(state.index, dream().id).at(-1)!;
    if (seasonProgressOf(state.index, dream().id)?.complete) {
      record(act({ type: "BEGIN_NEXT_SEASON", dreamId: dream().id }));
      continue;
    }
    if (renders.length % 5 === 4) {
      record(act({ type: "RERENDER_CHAPTER", chapterId: latest.id }));
      continue;
    }
    const offers = offersFor(state.index, latest.id, true);
    const pick = offers.find((o) => o.suggested) ?? offers[0];
    if (pick) {
      act({ type: "CHOOSE_BRIDGE", input: { chapterId: latest.id, choice: { tier: pick.tier, libraryId: pick.libraryId } } });
      const pool = BRIDGES.entries.filter((b) => b.focus === focus && b.tier === pick.tier && (!b.motif || dream().motifIds.includes(b.motif))).length;
      bridges.push({ libraryId: pick.libraryId, tier: pick.tier, pool });
    }
    const r = act({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId: dream().id, kind: kinds[renders.length % kinds.length], text: `Sent the ${renders.length}th draft to a friend.` } });
    if (r.nextChapter) record(r.nextChapter);
  }
  return { renders, bridges, state };
}

/** id → the content pool it was drawn from. */
function poolIndex(focus: FocusId): Map<string, readonly Fragment[]> {
  const map = new Map<string, readonly Fragment[]>();
  const add = (pool: readonly Fragment[]) => pool.forEach((f) => map.set(f.id, pool));
  for (const s of STAGE_IDS) {
    const sh = SHARED_STAGES[s];
    [sh.opening.morning, sh.opening.evening, sh.sensory, sh.reflection, sh.closing.morning, sh.closing.evening].forEach(add);
    const fc = FOCUS_CONTENT[focus].stages[s];
    add(fc.arrival);
    add(fc.living);
  }
  for (const byPos of Object.values(WEAVE.woven)) Object.values(byPos).forEach(add);
  [WEAVE.seed, WEAVE.notToday, WEAVE.recall, WEAVE.cumulative].forEach(add);
  for (const m of MOTIFS) [m.living, m.witness].forEach(add);
  return map;
}

/** Fragments of a pool this dream could draw (flags and motif tokens). */
function eligibleSize(pool: readonly Fragment[], flags: ReadonlySet<string>, motif: boolean): number {
  return pool.filter(
    (f) => (!f.requires || f.requires.every((x) => flags.has(x))) && !(f.excludes ?? []).some((x) => flags.has(x)) && (motif || !/\{motif\./u.test(f.text))
  ).length;
}

const allFinal = (focus: FocusId) =>
  [CONTENT_STATUS["stages.shared"], CONTENT_STATUS[focus], CONTENT_STATUS.weave, CONTENT_STATUS.motifs].every((s) => s === "final");

describe("rendered chapters: style lint and word counts", () => {
  for (const area of FOCUS_AREAS) {
    test(`${area.id}: a full season, both dayparts`, () => {
      const desire = DESIRES.find(([f]) => f === area.id)![1];
      const { renders } = run(area.id, desire, 9, "Wrote the first page of the plan.");
      const problems = renders.flatMap(({ chapter }) => lintChapter(chapter).map((p) => `${chapter.title} (${chapter.stage}): ${p}`));
      expect(problems).toEqual([]);
      if (allFinal(area.id)) {
        for (const { chapter } of renders) {
          for (const n of [chapter.wordCount.morning, chapter.wordCount.evening]) {
            expect(n).toBeGreaterThanOrEqual(WRITING_RULES.chapterWords.min);
            expect(n).toBeLessThanOrEqual(WRITING_RULES.chapterWords.max);
          }
        }
      }
    });
  }
});

describe("a 30-chapter run", () => {
  for (const [focus, desire] of [DESIRES[0], DESIRES[2], DESIRES[7]] as const) {
    test(`${focus}: ${desire}`, () => {
      const { renders, bridges, state } = run(focus, desire, 30, focus === "career" ? "Bought the domain name." : null);
      expect(renders.length).toBe(30);
      expect(checkArcInvariants({ index: state.index, chapters: state.texts })).toEqual([]);

      // No back-to-back paragraph, unless its pool is too small to avoid it.
      const pools = poolIndex(focus);
      const repeats: string[] = [];
      for (let i = 1; i < renders.length; i += 1) {
        const prev = new Set(renders[i - 1].chapter.usedIds ?? []);
        const ids = renders[i].chapter.usedIds ?? [];
        for (const id of ids) {
          const pool = pools.get(id);
          if (!prev.has(id) || !pool) continue;
          const drawn = ids.filter((x) => pools.get(x) === pool).length;
          if (eligibleSize(pool, renders[i].flags, renders[i].motif) >= 2 * drawn + 1) repeats.push(`render ${i}: ${id}`);
        }
      }
      expect(repeats).toEqual([]);

      // No back-to-back bridge, unless its tier has a single eligible entry.
      for (let i = 1; i < bridges.length; i += 1) {
        if (bridges[i].tier === bridges[i - 1].tier && bridges[i].pool >= 2) expect(bridges[i].libraryId).not.toBe(bridges[i - 1].libraryId);
      }

      // Each proof woven exactly once; only a season's carried 7th star may wait.
      for (const proof of state.index.proofs) {
        const weaving = Object.values(state.texts).flatMap((c) => [...c.body, c.opening.morning, c.closing.morning]).filter((p) => p.wovenProofId === proof.id);
        if (proof.wovenInChapterId) expect(weaving).toHaveLength(1);
        else expect(proof.starIndex).toBe(7);
      }

      // Serialising a whole year of chapters stays cheap and small.
      const started = performance.now();
      const bytes = Object.values(state.texts).reduce((sum, c) => sum + JSON.stringify(c).length, 0);
      expect(performance.now() - started).toBeLessThan(250);
      expect(bytes / Object.keys(state.texts).length).toBeLessThan(8_000);
    });
  }
});

describe("hygiene helpers catch what they should", () => {
  test("the bans fire on known-bad text", () => {
    expect(hygiene("You step into to open your bakery.")).toEqual(["to to"]);
    expect(hygiene("It counted.. Then  more!.")).toEqual(["..", "!.", "double space"]);
    expect(hygiene("The afternoon you you sent it.")).toEqual(["you you"]);
    expect(FIRST_PERSON.test(withoutQuotes("Toward my own studio."))).toBe(true);
    expect(FIRST_PERSON.test(withoutQuotes("You wrote “my own studio”."))).toBe(false);
  });

  test("token reference is covered by the matrix values", () => {
    const values = valuesFor("x");
    const missing = contentEntries().flatMap((e) => (e.text.match(/\{[^{}]+\}/gu) ?? []).filter((t) => !(t in values)));
    expect([...new Set(missing)] as Token[]).toEqual([]);
  });
});
