// The 1.0 view of v2 data (useStories adapter). The 1.0 screens must keep
// their loop: story → open action → evidence → 'Weave chapter N+1'.
import { describe, expect, test } from "bun:test";
import { EMPTY_ARC_INDEX } from "@/contexts/arc.types";
import { applyArcAction, type ArcAction, type ArcResults, type ArcState } from "./arc";
import { offersFor } from "./arcSelectors";
import { actionFor, actionsOf, intentOf, isPendingChapter, storyOf } from "./legacy";

function world() {
  let state: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };
  let t = new Date(2026, 9, 15, 20).getTime();
  let n = 0;
  const run = <A extends ArcAction>(a: A): ArcResults[A["type"]] => {
    t += 3600_000;
    const out = applyArcAction(state, a, { now: new Date(t), isPlus: false, name: "Maya", newId: () => `id${++n}`, seed: n });
    state = out.state;
    return out.result;
  };
  return { run, get state() { return state; }, now: () => new Date(t) };
}

describe("1.0 view of the arc", () => {
  test("the loop the 1.0 Today screen expects", () => {
    const w = world();
    const ch1 = w.run({ type: "CREATE_DREAM", input: { focus: "career", desire: "my own design studio", feeling: "proud", seedProof: { text: "Bought the domain" } } });
    const dream = w.state.index.dreams[0];
    const [offer] = offersFor(w.state.index, ch1.id, false);
    w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch1.id, choice: { tier: offer.tier, libraryId: offer.libraryId } } });

    // the seed proof shows as a completed action; the bridge as the open one
    expect(actionFor(w.state.index, dream.id)).toMatchObject({ state: "open", text: offer.text });
    expect(actionsOf(w.state.index, new Set([dream.id])).map((a) => a.state).sort()).toEqual(["completed", "open"]);
    expect(intentOf(w.state.index, dream).chapter).toBe(1);

    const r = w.run({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId: dream.id, kind: "did", text: "Sketched the sign" } });
    const pending = w.state.index.chapters.find((c) => c.id === r.nextChapter!.id)!;
    // woven but not yet opened: 1.0 still says 'chapter 1' and shows the folded proof + 'Weave chapter 2'
    expect(isPendingChapter(w.state.index, pending)).toBe(true);
    expect(intentOf(w.state.index, dream).chapter).toBe(1);
    expect(actionFor(w.state.index, dream.id)).toMatchObject({ state: "completed", evidence: "Sketched the sign", evidenceKind: "did" });

    w.run({ type: "MARK_HEARD", chapterId: pending.id });
    expect(isPendingChapter(w.state.index, w.state.index.chapters.find((c) => c.id === pending.id)!)).toBe(false);
    expect(intentOf(w.state.index, w.state.index.dreams[0]).chapter).toBe(2);
  });

  test("a 1.0 story is the latest chapter, in the daypart of the moment", () => {
    const w = world();
    const ch = w.run({ type: "CREATE_DREAM", input: { focus: "peace", desire: "Peace of mind", feeling: "peaceful" } });
    const meta = w.state.index.chapters[0];
    const morning = storyOf(meta, ch, new Date(2026, 9, 16, 8));
    const evening = storyOf(meta, ch, new Date(2026, 9, 16, 21));
    expect(morning.paragraphs[0].text).toBe(ch.opening.morning.text);
    expect(evening.paragraphs[0].text).toBe(ch.opening.evening.text);
    expect(morning.paragraphs.slice(1, -1)).toEqual(evening.paragraphs.slice(1, -1));
    expect(morning).toMatchObject({ id: ch.id, intentId: ch.dreamId, title: ch.title });
  });

  test("lapsed bridges never show as 1.0 actions", () => {
    const w = world();
    const ch = w.run({ type: "CREATE_DREAM", input: { focus: "career", desire: "my own design studio", feeling: "proud" } });
    const dreamId = w.state.index.dreams[0].id;
    w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch.id, choice: { tier: "own", text: "Call the printer" } } });
    expect(actionFor(w.state.index, dreamId)?.state).toBe("reshaped");
    w.run({ type: "RELEASE_DREAM", dreamId });
    expect(actionsOf(w.state.index, new Set([dreamId]))).toEqual([]);
  });
});
