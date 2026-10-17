// A season never repeats an opening or closing CADENCE ('Let your breathing
// slow…', 'Come back…', 'give it a time', 'Good morning, Maya.'). CADENCES in
// types.ts names the families. A season reads one chapter per stage, so each
// family may live in one stage only (Chapter I scripts count as stage I), and
// inside that stage in its openings or its closings, never both.
import { describe, expect, test } from "bun:test";
import { EMPTY_ARC_INDEX, type Chapter } from "@/contexts/arc.types";
import type { FocusId } from "@/lib/focus";
import { applyArcAction, type ArcAction, type ArcEnv, type ArcState } from "@/lib/store/arc";
import { chaptersOf, offersFor } from "@/lib/store/arcSelectors";
import { CADENCES, FOCUS_CONTENT, SHARED_STAGES, STAGE_IDS, type Fragment } from "./index";

const FAMILIES = CADENCES.map((c) => ({ id: c.id, re: new RegExp(c.source, "iu") }));
const familiesOf = (text: string) => FAMILIES.filter((f) => f.re.test(text)).map((f) => f.id);

type Slot = "opening" | "closing";
interface Piece { readonly stage: number; readonly slot: Slot; readonly daypart: "morning" | "evening"; readonly fragment: Fragment; readonly script?: string }

const SHARED: Piece[] = STAGE_IDS.flatMap((stage) =>
  (["opening", "closing"] as const).flatMap((slot) =>
    (["morning", "evening"] as const).flatMap((daypart) => SHARED_STAGES[stage][slot][daypart].map((fragment) => ({ stage, slot, daypart, fragment })))
  )
);
const SCRIPTS: Piece[] = Object.values(FOCUS_CONTENT).flatMap((fc) =>
  fc.chapterOne.flatMap((sc) =>
    (["opening", "closing"] as const).flatMap((slot) =>
      (["morning", "evening"] as const).map((daypart) => ({ stage: 1, slot, daypart, fragment: sc[slot][daypart], script: sc.id }))
    )
  )
);

describe("cadence families", () => {
  test("families compile, have unique ids and name real moves in the content", () => {
    expect(new Set(CADENCES.map((c) => c.id)).size).toBe(CADENCES.length);
    // A family the pass wrote out of the content entirely ('Rest.' as a whole
    // closing line) stays listed to keep the formula from coming back; any
    // other vacancy is a typo in a source.
    const vacant = FAMILIES.filter((f) => ![...SHARED, ...SCRIPTS].some((p) => f.re.test(p.fragment.text))).map((f) => f.id);
    expect(vacant).toEqual(["rest-imperative"]);
  });

  test("each family lives in one stage (Chapter I scripts are stage I)", () => {
    const spread: string[] = [];
    for (const f of FAMILIES) {
      const stages = new Set([...SHARED, ...SCRIPTS].filter((p) => f.re.test(p.fragment.text)).map((p) => p.stage));
      if (stages.size > 1) spread.push(`${f.id}: stages ${[...stages].join(", ")}`);
    }
    expect(spread).toEqual([]);
  });

  test("inside its stage, a shared family sits in the openings or the closings, never both", () => {
    const both: string[] = [];
    for (const f of FAMILIES) {
      const slots = new Set(SHARED.filter((p) => f.re.test(p.fragment.text)).map((p) => p.slot));
      if (slots.size > 1) both.push(f.id);
    }
    expect(both).toEqual([]);
  });

  test("a Chapter I script never opens and closes the same daypart with the same move", () => {
    const clashes: string[] = [];
    for (const fc of Object.values(FOCUS_CONTENT)) {
      for (const sc of fc.chapterOne) {
        for (const d of ["morning", "evening"] as const) {
          const shared = familiesOf(sc.opening[d].text).filter((id) => familiesOf(sc.closing[d].text).includes(id));
          if (shared.length) clashes.push(`${sc.id} ${d}: ${shared.join(", ")}`);
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  test("the editors' three flagged cadences appear in stage I only", () => {
    for (const id of ["breath-let", "come-back", "give-a-time"]) {
      const f = FAMILIES.find((x) => x.id === id)!;
      expect(SHARED.filter((p) => f.re.test(p.fragment.text) && p.stage !== 1).map((p) => p.fragment.id)).toEqual([]);
    }
  });
});

/* =========================================================================
 * Rendered seasons through the reducer (CREATE_DREAM → six proofs)
 * ========================================================================= */

function season(focus: FocusId, desire: string, salt: number): Chapter[] {
  let state: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };
  let t = new Date(2026, 9, 1, 21).getTime();
  let n = 0;
  const act = <A extends ArcAction>(a: A) => {
    t += 26 * 3600_000;
    const env: ArcEnv = { now: new Date(t), isPlus: true, name: "Maya", newId: () => `g${salt}-${++n}`, seed: ((salt + n) * 2654435761) >>> 0 };
    const out = applyArcAction(state, a, env);
    state = out.state;
    return out.result;
  };
  const chapters: Chapter[] = [act({ type: "CREATE_DREAM", input: { focus, desire, feeling: "proud", ...(salt % 2 ? { seedProof: { text: "Wrote the first page of the plan." } } : {}) } })];
  const kinds = ["did", "moved", "learned", "did", "did", "moved"] as const;
  for (const kind of kinds) {
    const dream = state.index.dreams[0];
    const latest = chaptersOf(state.index, dream.id).at(-1)!;
    const offer = offersFor(state.index, latest.id, true).find((o) => o.suggested);
    if (offer) act({ type: "CHOOSE_BRIDGE", input: { chapterId: latest.id, choice: { tier: offer.tier, libraryId: offer.libraryId } } });
    const r = act({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId: dream.id, kind, text: `Sent draft ${chapters.length} to a friend.` } });
    if (r.nextChapter) chapters.push(r.nextChapter);
  }
  return chapters;
}

describe("a rendered season never repeats a cadence", () => {
  const DREAMS: readonly (readonly [FocusId, string])[] = [
    ["love", "Find my person"],
    ["love", "I want a calm home where friends drop by"],
    ["abundance", "being debt free by next summer"],
    ["career", "my own design studio, with clients who trust my eye"],
    ["health", "to run a half marathon"],
    ["confidence", "Stop overthinking every message and just trust myself more"],
    ["peace", "Peace of mind"],
  ];
  for (const [focus, desire] of DREAMS) {
    test(`${focus}: “${desire}”`, () => {
      const repeats: string[] = [];
      for (let salt = 0; salt < 6; salt += 1) {
        const chapters = season(focus, desire, salt);
        expect(chapters).toHaveLength(7);
        const seen = new Map<string, number>();
        for (const c of chapters) {
          const here = new Set([c.opening.morning, c.opening.evening, c.closing.morning, c.closing.evening].flatMap((p) => familiesOf(p.text)));
          for (const id of here) {
            if (seen.has(id)) repeats.push(`salt ${salt}: ${id} in chapters ${seen.get(id)} and ${c.number}`);
            else seen.set(id, c.number);
          }
        }
      }
      expect(repeats).toEqual([]);
    });
  }
});
