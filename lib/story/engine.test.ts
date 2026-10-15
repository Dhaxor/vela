// Story engine v2 on SYNTHETIC content (large pools), so the rules are
// observable whatever state the real content files are in: skeleton, both
// dayparts, weave placement by kind, recall/cumulative gating, motif and flag
// gating, the repetition guard, the word budget and highlight spans.
// The real content runs through lib/story/content/golden.test.ts.
import { describe, expect, test } from "bun:test";
import { paragraphsForDaypart, type Chapter } from "@/contexts/arc.types";
import { FOCUS_AREAS } from "@/lib/focus";
import { STAGE_IDS, WRITING_RULES, type FocusContent, type Fragment, type MotifArchetype, type StageId } from "./content";
import { writeChapter, weavePosition, type ContentSource, type WeaveProof, type WriteChapterInput } from "./engine";
import { wordCount } from "./text";

const SENT = "Quiet light rests on the table while the room wakes.";
const filler = (sentences: number) => Array.from({ length: sentences }, () => SENT).join(" ");
const fr = (id: string, text: string, extra: Partial<Fragment> = {}): Fragment => ({ id, text, ...extra });
const pool = (prefix: string, n: number, text: (i: number) => string, extra: Partial<Fragment> = {}) =>
  Array.from({ length: n }, (_, i) => fr(`${prefix}${i + 1}`, text(i + 1), extra));

function synthFocus(fx: string): FocusContent {
  const stages = Object.fromEntries(
    STAGE_IDS.map((s) => [
      s,
      {
        arrival: pool(`${fx}${s}-ar`, 6, (i) => `Arrival ${i}. It is real: {desire.quote}. ${filler(3)}`),
        living: [
          ...pool(`${fx}${s}-li`, 6, (i) => `Living ${i}, and you feel {feeling}. ${filler(3)}`),
          fr(`${fx}${s}-li-romance`, `Your partner laughs in the doorway. ${filler(3)}`, { requires: ["romance"] }),
          fr(`${fx}${s}-li-place`, `You unlock {motif.place} and breathe in. ${filler(3)}`),
        ],
        titles: pool(`${fx}${s}-t`, 3, (i) => `Title ${i}`),
      },
    ])
  ) as unknown as FocusContent["stages"];
  const one = (id: string, motifs: FocusContent["chapterOne"][number]["motifs"]) => ({
    id,
    motifs,
    title: { id: `${id}-t`, text: `First Light ${id}` },
    opening: { morning: fr(`${id}-op-m`, `Morning finds you, {name}. ${filler(3)}`), evening: fr(`${id}-op-e`, `Evening finds you, {name}. ${filler(3)}`) },
    body: [
      { kind: "text" as const, fragment: fr(`${id}-p1`, `Here it is: {desire.quote}. ${filler(3)}`) },
      { kind: "weave" as const },
      { kind: "motif" as const, part: "living" as const },
      { kind: "text" as const, fragment: fr(`${id}-p2`, `You feel {feeling}, all the way through. ${filler(3)}`) },
    ],
    closing: { morning: fr(`${id}-cl-m`, `Into the day. ${filler(3)}`), evening: fr(`${id}-cl-e`, `Into rest. ${filler(3)}`) },
  });
  return { focus: fx as FocusContent["focus"], stages, chapterOne: [one(`${fx}-one-studio`, ["own-business"]), one(`${fx}-one-default`, [])] };
}

const motif = (id: MotifArchetype["id"], flags: MotifArchetype["flags"]): MotifArchetype => ({
  id,
  focus: "career",
  label: id,
  keywords: [id],
  flags,
  place: "the studio",
  details: ["a key with a paper tag", "swatches above the desk"],
  living: pool(`mo-${id}-li`, 3, (i) => `Motif living ${i} at {motif.place}. ${filler(1)}`),
  witness: pool(`mo-${id}-wi`, 2, (i) => `Motif witness ${i}. ${filler(1)}`),
});

const SYNTH: ContentSource = {
  shared: Object.fromEntries(
    STAGE_IDS.map((s) => [
      s,
      {
        opening: {
          morning: pool(`sh${s}-op-m`, 6, (i) => `Morning opening ${i}, {name}. ${filler(3)}`),
          evening: pool(`sh${s}-op-e`, 6, (i) => `Evening opening ${i}, {name}. ${filler(3)}`),
        },
        sensory: pool(`sh${s}-se`, 6, (i) => `Sensory ${i}. ${filler(3)}`),
        reflection: pool(`sh${s}-re`, 6, (i) => `Reflection ${i}, and now it holds. ${filler(3)}`),
        closing: {
          morning: pool(`sh${s}-cl-m`, 6, (i) => `Morning closing ${i}. ${filler(3)}`),
          evening: pool(`sh${s}-cl-e`, 6, (i) => `Evening closing ${i}. ${filler(3)}`),
        },
      },
    ])
  ) as unknown as ContentSource["shared"],
  focus: Object.fromEntries(FOCUS_AREAS.map((f) => [f.id, synthFocus(f.id)])) as unknown as ContentSource["focus"],
  weave: {
    woven: {
      did: { arrival: pool("wv-d-ar", 6, (i) => `You remember the afternoon you {proof.done}. Did ${i}.`), witness: pool("wv-d-wi", 6, (i) => `Witness did ${i}: {proof.quote}.`), preClosing: pool("wv-d-pc", 6, (i) => `Before rest, did ${i}: {proof.quote}.`) },
      moved: { arrival: pool("wv-m-ar", 6, (i) => `Moved arrival ${i}: {proof.quote}.`), witness: pool("wv-m-wi", 6, (i) => `Someone saw it, moved ${i}: {proof.quote}.`), preClosing: pool("wv-m-pc", 6, (i) => `Moved before rest ${i}: {proof.quote}.`) },
      learned: { arrival: pool("wv-l-ar", 6, (i) => `Learned arrival ${i}: {proof.quote}.`), witness: pool("wv-l-wi", 6, (i) => `Learned witness ${i}: {proof.quote}.`), preClosing: pool("wv-l-pc", 6, (i) => `What it taught you, ${i}: {proof.quote}.`) },
    },
    seed: pool("wv-sd", 6, (i) => `Before tonight you had already started: {proof.quote}. Seed ${i}.`),
    notToday: pool("wv-nt", 6, (i) => `It was not the day, and you said so: {proof.quote}. Not today ${i}.`),
    recall: pool("wv-rc", 12, (i) => `On {proof.date} you wrote {proof.quote}. Recall ${i}.`),
    cumulative: pool("wv-cu", 8, (i) => `Reality has answered you {proofs.count} times, {name}. Cumulative ${i}.`),
  },
  motifs: [motif("own-business", ["business"]), motif("partner", ["romance"])],
};

const proof = (id: string, kind: WeaveProof["kind"], text: string, dateKey = "2026-10-14", origin: WeaveProof["origin"] = "bridge"): WeaveProof => ({ id, kind, text, dateKey, origin });

const base = (over: Partial<WriteChapterInput> = {}): WriteChapterInput => ({
  chapterId: "c2",
  dreamId: "d1",
  season: 1,
  number: 2,
  stage: 2,
  mode: "engine",
  revision: 1,
  name: "Maya",
  focus: "career",
  desire: "To open my own design studio by next summer",
  feeling: "proud",
  motifIds: [],
  recentIds: [],
  previousIds: [],
  woven: proof("p1", "did", "Sent my portfolio to two studios I admire."),
  history: [],
  totalProofs: 1,
  seed: 42,
  now: new Date(2026, 9, 15, 21),
  todayKey: "2026-10-15",
  ...over,
});

const write = (over: Partial<WriteChapterInput> = {}) => writeChapter(base(over), SYNTH);
const all = (c: Chapter) => [c.opening.morning, c.opening.evening, ...c.body, c.closing.morning, c.closing.evening];

describe("skeleton and dayparts", () => {
  test("deterministic under a seed; other seeds roll differently", () => {
    expect(write()).toEqual(write());
    const rolls = new Set(Array.from({ length: 12 }, (_, s) => write({ seed: s }).chapter.body.map((p) => p.fragmentId).join("|")));
    expect(rolls.size).toBeGreaterThan(8);
  });

  test("both daypart variants are stored with shared keys; the body is shared", () => {
    const { chapter } = write();
    expect(chapter.opening.morning.key).toBe("p0");
    expect(chapter.opening.evening.key).toBe("p0");
    expect(chapter.opening.morning.fragmentId).toMatch(/op-m/u);
    expect(chapter.opening.evening.fragmentId).toMatch(/op-e/u);
    expect(chapter.closing.morning.key).toBe(chapter.closing.evening.key);
    expect(chapter.closing.morning.key).toBe(`p${chapter.body.length + 1}`);
    const keys = paragraphsForDaypart(chapter, "evening").map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(chapter.wordCount.morning).toBe(paragraphsForDaypart(chapter, "morning").reduce((n, p) => n + wordCount(p.text), 0));
  });

  test("the 6 beats appear in order", () => {
    const beats = paragraphsForDaypart(write({ woven: null }).chapter, "morning").map((p) => p.beat).filter((b) => ["opening", "arrival", "sensory", "living", "reflection", "closing"].includes(b));
    expect(beats).toEqual(["opening", "arrival", "sensory", "living", "reflection", "closing"]);
  });
});

describe("weaving", () => {
  test("position follows the kind: did → after arrival, moved → before reflection, learned → before closing", () => {
    expect([weavePosition("did"), weavePosition("moved"), weavePosition("learned")]).toEqual(["arrival", "witness", "preClosing"]);
    const beatsFor = (kind: WeaveProof["kind"]) => write({ woven: proof("p1", kind, "Called the printer"), totalProofs: 1 }).chapter.body.map((p) => p.beat);
    const did = beatsFor("did");
    expect(did.indexOf("weave")).toBe(did.indexOf("arrival") + 1);
    const moved = beatsFor("moved");
    expect(moved.indexOf("weave")).toBe(moved.indexOf("reflection") - 1);
    expect(beatsFor("learned").at(-1)).toBe("weave");
  });

  test("exactly one paragraph weaves the proof, with a proof span over the user's words", () => {
    const { chapter } = write();
    const weaving = all(chapter).filter((p) => p.wovenProofId);
    expect(weaving).toHaveLength(1);
    expect(chapter.wovenProofId).toBe("p1");
    const span = weaving[0].spans.find((s) => s.kind === "proof")!;
    expect(span.proofId).toBe("p1");
    expect(weaving[0].text.slice(span.start, span.end)).toBe("sent your portfolio to two studios you admire");
    expect(weaving[0].text).not.toMatch(/you you/iu);
  });

  test("seed and not-today proofs use their own pools", () => {
    const seed = write({ mode: "engine", woven: proof("s", "did", "Bought the domain", "2026-10-15", "onboarding") }).chapter;
    expect(seed.body.find((p) => p.wovenProofId)?.fragmentId).toMatch(/^wv-sd/u);
    const nt = write({ woven: proof("n", "learned", "Too tired, lunch tomorrow", "2026-10-15", "not-today") }).chapter;
    expect(nt.body.find((p) => p.wovenProofId)?.fragmentId).toMatch(/^wv-nt/u);
  });

  test("no proof, no weave paragraph", () => {
    expect(all(write({ woven: null }).chapter).some((p) => p.beat === "weave" || p.wovenProofId)).toBe(false);
  });
});

describe("recall and cumulative", () => {
  const history = [
    proof("h1", "did", "Sketched the logo", "2026-09-01"),
    proof("h2", "moved", "Priced the rent", "2026-09-20"),
    proof("h3", "did", "Called a landlord", "2026-10-01"),
    proof("h4", "learned", "Mornings work better", "2026-10-10"),
  ];

  test("from stage II, a 'Previously' paragraph cites up to three older proofs, oldest first", () => {
    const { chapter } = write({ history, totalProofs: 5, stage: 3, number: 3 });
    const recall = chapter.body.find((p) => p.beat === "recall")!;
    expect(chapter.body[0]).toBe(recall);
    const cited = recall.spans.filter((s) => s.kind === "proof").map((s) => s.proofId);
    expect(cited.length).toBeGreaterThanOrEqual(1);
    expect(cited.length).toBeLessThanOrEqual(3);
    expect(cited).toEqual(["h2", "h3", "h4"].slice(0, cited.length));
    expect(recall.text).toContain("September 20");
  });

  test("no recall in Chapter I, none without history", () => {
    expect(write({ history, stage: 1, number: 1 }).chapter.body.some((p) => p.beat === "recall")).toBe(false);
    expect(write({ history: [] }).chapter.body.some((p) => p.beat === "recall")).toBe(false);
  });

  test("cumulative only from three proofs, with the count in words", () => {
    expect(write({ totalProofs: 2 }).chapter.body.some((p) => p.beat === "cumulative")).toBe(false);
    const cu = write({ totalProofs: 4 }).chapter.body.find((p) => p.beat === "cumulative");
    expect(cu?.text).toContain("four times");
  });

  test("the cumulative line claims its room before the recall paragraph", () => {
    // Recall lines long enough to eat the whole budget if they were drawn first.
    const greedy: ContentSource = { ...SYNTH, weave: { ...SYNTH.weave, recall: pool("wv-rc", 12, (i) => `On {proof.date} you wrote {proof.quote}. ${filler(2 + (i % 6))}`) } };
    for (let seed = 0; seed < 40; seed += 1) {
      const c = writeChapter(base({ seed, history, totalProofs: 5, stage: 5, number: 5 }), greedy).chapter;
      expect(c.body.some((p) => p.beat === "cumulative")).toBe(true);
      expect(c.body.some((p) => p.beat === "recall")).toBe(true);
    }
  });
});

describe("motifs and flags", () => {
  test("a fragment that assumes a partner never appears without the romance flag", () => {
    for (let seed = 0; seed < 120; seed += 1) {
      expect(write({ seed }).chapter.body.some((p) => p.fragmentId.endsWith("-li-romance"))).toBe(false);
    }
    const withPartner = Array.from({ length: 120 }, (_, seed) => write({ seed, motifIds: ["partner"] }).chapter);
    expect(withPartner.some((c) => c.body.some((p) => p.fragmentId.endsWith("-li-romance")))).toBe(true);
  });

  test("a fragment written for a matched flag is drawn about twice as often as a general one", () => {
    const romance = Array.from({ length: 400 }, (_, seed) => write({ seed, motifIds: ["partner"] }).chapter).filter((c) =>
      c.body.some((p) => p.fragmentId.endsWith("-li-romance"))
    ).length;
    // 7 eligible living lines with the romance one doubled: 2 of 8 ≈ 0.25 (unweighted it would be 1 of 7 ≈ 0.14).
    expect(romance / 400).toBeGreaterThan(0.19);
  });

  test("the Hard Day (stage III) takes no motif 'living' moment; its motif appears as a witness", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const c = write({ seed, stage: 3, number: 3, motifIds: ["own-business"], woven: proof("p1", "did", "Called the printer") }).chapter;
      const motifIds = c.body.filter((p) => p.beat === "motif").map((p) => p.fragmentId);
      expect(motifIds.some((id) => id.includes("-li"))).toBe(false);
      expect(motifIds.length).toBeGreaterThan(0);
    }
  });

  test("the Threshold (stage V) is one unbroken minute: no motif paragraph", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const c = write({ seed, stage: 5, number: 5, motifIds: ["own-business"], woven: proof("p1", "learned", "Asked too late") }).chapter;
      expect(c.body.filter((p) => p.beat === "motif")).toEqual([]);
    }
  });

  test("{motif.*} fragments only when a motif matched; then a motif paragraph joins", () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const c = write({ seed }).chapter;
      expect(c.body.some((p) => p.fragmentId.endsWith("-li-place") || p.beat === "motif")).toBe(false);
    }
    const c = write({ motifIds: ["own-business"] }).chapter;
    expect(c.body.some((p) => p.beat === "motif")).toBe(true);
    expect(all(c).map((p) => p.text).join(" ")).not.toMatch(/\{/u);
  });
});

describe("Chapter I", () => {
  test("hand-tuned script by motif, seed woven in its slot", () => {
    const { chapter } = write({ mode: "chapter-one", stage: 1, number: 1, motifIds: ["own-business"], woven: proof("s", "did", "Bought the domain", "2026-10-15", "onboarding"), totalProofs: 1 });
    expect(chapter.source).toBe("chapter-one");
    expect(chapter.title).toBe("First Light career-one-studio");
    expect(chapter.body.map((p) => p.beat)).toEqual(["arrival", "weave", "motif", "reflection"]);
  });

  test("default script without a motif; no seed, no weave slot", () => {
    const { chapter } = write({ mode: "chapter-one", stage: 1, number: 1, woven: null, totalProofs: 0 });
    expect(chapter.title).toBe("First Light career-one-default");
    expect(chapter.body.map((p) => p.beat)).toEqual(["arrival", "reflection"]);
  });

  test("a rewritten Chapter I rolls from the stage I pools", () => {
    const { chapter } = write({ mode: "engine", stage: 1, number: 1, woven: null, totalProofs: 0 });
    expect(chapter.source).toBe("engine");
    expect(chapter.body[0].fragmentId).toMatch(/^career1-ar/u);
  });
});

describe("repetition guard, budget, hygiene", () => {
  test("30 rewrites in a row: no paragraph or title repeats back to back", () => {
    let recent: string[] = [];
    let previous: readonly string[] = [];
    let prevIds = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      const { chapter, usedIds } = write({ seed: 1000 + i, recentIds: recent, previousIds: previous, history: [proof("h", "did", "Old proof", "2026-09-01")], totalProofs: 3 });
      const ids = new Set(usedIds);
      for (const id of ids) expect(prevIds.has(id)).toBe(false);
      expect(chapter.usedIds).toEqual(usedIds);
      prevIds = ids;
      previous = usedIds;
      recent = [...recent, ...usedIds].slice(-400);
    }
  });

  test("an optional insert is dropped rather than repeat a line of the previous chapter", () => {
    // Only one recall line exists, and the previous chapter used it.
    const one: ContentSource = { ...SYNTH, weave: { ...SYNTH.weave, recall: [fr("wv-rc1", "On {proof.date} you wrote {proof.quote}.")] } };
    const c = writeChapter(base({ stage: 3, number: 3, history: [proof("h", "did", "Old proof", "2026-09-01")], previousIds: ["wv-rc1"] }), one).chapter;
    expect(c.body.some((p) => p.beat === "recall")).toBe(false);
  });

  test("ids unused in the recent window always win over used ones", () => {
    const first = write({ seed: 1 }).usedIds;
    const second = write({ seed: 1, recentIds: first }).usedIds;
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  test("optional inserts never push a chapter past the word ceiling", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const c = write({ seed, motifIds: ["own-business"], history: [proof("a", "did", "One"), proof("b", "did", "Two"), proof("c", "did", "Three")], totalProofs: 4, stage: 4, number: 4 }).chapter;
      expect(Math.max(c.wordCount.morning, c.wordCount.evening)).toBeLessThanOrEqual(WRITING_RULES.chapterWords.max);
    }
  });

  test("'now' at most once when the pools allow it", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const text = paragraphsForDaypart(write({ seed }).chapter, "evening").map((p) => p.text).join(" ");
      expect((text.match(/\bnow\b/giu) ?? []).length).toBeLessThanOrEqual(1);
    }
  });

  test("spans are sorted, inside the text, and cover the substituted values", () => {
    const c = write({ history: [proof("h", "moved", "Priced the rent", "2026-09-20")], totalProofs: 3, stage: 3, number: 3 }).chapter;
    for (const p of all(c)) {
      let last = 0;
      for (const s of p.spans) {
        expect(s.start).toBeGreaterThanOrEqual(last);
        expect(s.end).toBeGreaterThan(s.start);
        expect(s.end).toBeLessThanOrEqual(p.text.length);
        last = s.end;
        const value = p.text.slice(s.start, s.end);
        if (s.kind === "name") expect(value).toBe("Maya");
        if (s.kind === "desire") expect(["“To open my own design studio by next summer”", "opening your own design studio", "you opened your own design studio"]).toContain(value);
      }
    }
  });

  test("an empty name falls back to 'friend'", () => {
    expect(write({ name: "  " }).chapter.opening.evening.text).toContain("friend");
  });

  test("broken content still weaves the proof (fallback line) instead of throwing", () => {
    const broken: ContentSource = { ...SYNTH, weave: { ...SYNTH.weave, woven: { ...SYNTH.weave.woven, did: { arrival: [], witness: [], preClosing: [] } } } };
    const c = writeChapter(base(), broken).chapter;
    const w = c.body.find((p) => p.wovenProofId)!;
    expect(w.text).toContain("“Sent my portfolio to two studios I admire”");
    expect(c.usedIds).not.toContain("wv-fallback");
  });
});

describe("stage typing", () => {
  test("every stage renders", () => {
    for (const stage of STAGE_IDS) expect(write({ stage: stage as StageId, number: stage }).chapter.stage).toBe(stage);
  });
});
