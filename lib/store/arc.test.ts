// The arc reducer: season flows (CONTRACTS §4.1), every precondition, the
// Plus-lapse rule and the Today loop-card state machine. Every state is run
// through checkArcInvariants.
import { describe, expect, test } from "bun:test";
import { ArcError, EMPTY_ARC_INDEX, type ArcSnapshot, type BridgeChoice, type Chapter } from "@/contexts/arc.types";
import { applyArcAction, changedChapterIds, type ArcAction, type ArcEnv, type ArcResults, type ArcState } from "./arc";
import { chaptersOf, loopStateOf, offersFor, openBridgeOf, planLockedOf, proofsOf, seasonProgressOf, totalStarsOf } from "./arcSelectors";
import { checkArcInvariants } from "./invariants";

const EMPTY: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };

/** A world with a clock that moves one hour per action, deterministic ids and seeds. */
function world(opts: { isPlus?: boolean; start?: Date } = {}) {
  let t = (opts.start ?? new Date(2026, 9, 15, 20, 0)).getTime();
  let n = 0;
  let state = EMPTY;
  let isPlus = opts.isPlus ?? false;
  const env = (): ArcEnv => ({ now: new Date(t), isPlus, name: "Maya", newId: () => `id${++n}`, seed: n * 7919 + 1 });
  const run = <A extends ArcAction>(action: A): ArcResults[A["type"]] => {
    t += 60 * 60 * 1000;
    const out = applyArcAction(state, action, env());
    state = out.state;
    expect(checkArcInvariants(snapshot())).toEqual([]);
    return out.result;
  };
  const snapshot = (): ArcSnapshot => ({ index: state.index, chapters: state.texts });
  return {
    run,
    get state() {
      return state;
    },
    snapshot,
    now: () => new Date(t),
    tick: (ms: number) => (t += ms),
    setPlus: (v: boolean) => (isPlus = v),
  };
}

const errorCode = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof ArcError ? e.code : `not-arc: ${String(e)}`;
  }
};

const create = (w: ReturnType<typeof world>, seed?: string, focus: "career" | "love" = "career") =>
  w.run({ type: "CREATE_DREAM", input: { focus, desire: "To open my own design studio by next summer", feeling: "proud", ...(seed ? { seedProof: { text: seed } } : {}) } });

function crossBridge(w: ReturnType<typeof world>, dreamId: string, kind: "did" | "moved" | "learned" = "did") {
  const latest = chaptersOf(w.state.index, dreamId).at(-1)!;
  const offers = offersFor(w.state.index, latest.id, true);
  if (offers.length > 0) w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: latest.id, choice: { tier: offers[0].tier, libraryId: offers[0].libraryId } } });
  return w.run({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind, text: `Proof for chapter ${latest.number}.` } });
}

describe("createDream", () => {
  test("writes a hand-tuned Chapter I and focuses the dream", () => {
    const w = world();
    const ch = create(w);
    const dream = w.state.index.dreams[0];
    expect(ch.number).toBe(1);
    expect(ch.stage).toBe(1);
    expect(ch.source).toBe("chapter-one");
    expect(ch.wovenProofId).toBeNull();
    expect(w.state.index.activeDreamId).toBe(dream.id);
    expect(dream.motifIds).toContain("own-business");
    expect(dream.usedIds.length).toBeGreaterThan(0);
    expect(w.state.texts[ch.id]).toBe(ch);
  });

  test("a seed proof is star 1, woven into Chapter I, and does not advance the stage", () => {
    const w = world();
    const ch = create(w, "Sketched the sign for the door..");
    const [seed] = w.state.index.proofs;
    expect(seed.origin).toBe("onboarding");
    expect(seed.starIndex).toBe(1);
    expect(seed.text).toBe("Sketched the sign for the door.");
    expect(seed.wovenInChapterId).toBe(ch.id);
    expect(ch.wovenProofId).toBe(seed.id);
    const weaving = [...ch.body].filter((p) => p.wovenProofId === seed.id);
    expect(weaving).toHaveLength(1);
    expect(weaving[0].spans.some((s) => s.kind === "proof" && s.proofId === seed.id)).toBe(true);
  });

  test("free tier: a second active dream is a plan-limit; Plus lifts it", () => {
    const w = world();
    create(w);
    expect(errorCode(() => applyArcAction(w.state, { type: "CREATE_DREAM", input: { focus: "love", desire: "a home by the sea", feeling: "free" } }, { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 }))).toBe("plan-limit");
    w.setPlus(true);
    create(w, undefined, "love");
    expect(w.state.index.dreams).toHaveLength(2);
  });

  test("empty desire or feeling is invalid input", () => {
    const env: ArcEnv = { now: new Date(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    expect(errorCode(() => applyArcAction(EMPTY, { type: "CREATE_DREAM", input: { focus: "career", desire: "   ", feeling: "proud" } }, env))).toBe("invalid-input");
    expect(errorCode(() => applyArcAction(EMPTY, { type: "CREATE_DREAM", input: { focus: "career", desire: "a studio", feeling: "" } }, env))).toBe("invalid-input");
  });
});

describe("a season, unseeded (§4.1)", () => {
  test("proofs 1–6 write Chapters II–VII; proof 7 completes the season with no new chapter", () => {
    const w = world();
    create(w);
    const dreamId = w.state.index.dreams[0].id;
    for (let i = 1; i <= 6; i += 1) {
      const r = crossBridge(w, dreamId);
      expect(r.starIndex).toBe(i);
      expect(r.seasonComplete).toBe(false);
      expect(r.nextChapter?.number).toBe(i + 1);
      expect(r.nextChapter?.stage as number).toBe(i + 1);
      expect(r.nextChapter?.wovenProofId).toBe(r.proof.id);
    }
    const seventh = crossBridge(w, dreamId);
    expect(seventh.starIndex).toBe(7);
    expect(seventh.seasonComplete).toBe(true);
    expect(seventh.nextChapter).toBeUndefined();
    expect(seventh.proof.wovenInChapterId).toBeNull();
    expect(seasonProgressOf(w.state.index, dreamId)?.complete).toBe(true);
  });

  test("a complete season rejects new bridges and proofs; beginNextSeason weaves the carried 7th star", () => {
    const w = world();
    create(w);
    const dreamId = w.state.index.dreams[0].id;
    for (let i = 0; i < 7; i += 1) crossBridge(w, dreamId);
    const latest = chaptersOf(w.state.index, dreamId).at(-1)!;
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    expect(errorCode(() => applyArcAction(w.state, { type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind: "did", text: "more" } }, env))).toBe("season-complete");
    expect(errorCode(() => applyArcAction(w.state, { type: "CHOOSE_BRIDGE", input: { chapterId: latest.id, choice: { tier: "own", text: "x" } } }, env))).toBe("season-complete");
    expect(offersFor(w.state.index, latest.id, false)).toEqual([]);

    const seventh = proofsOf(w.state.index, dreamId).at(-1)!;
    const s2 = w.run({ type: "BEGIN_NEXT_SEASON", dreamId });
    const dream = w.state.index.dreams[0];
    expect(dream.season).toBe(2);
    expect(dream.constellations).toHaveLength(1);
    expect(s2.season).toBe(2);
    expect(s2.number).toBe(1);
    expect(s2.wovenProofId).toBe(seventh.id);
    expect(w.state.index.proofs.find((p) => p.id === seventh.id)?.wovenInChapterId).toBe(s2.id);
  });

  test("beginNextSeason before 7 stars is season-incomplete", () => {
    const w = world();
    create(w);
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    expect(errorCode(() => applyArcAction(w.state, { type: "BEGIN_NEXT_SEASON", dreamId: w.state.index.dreams[0].id }, env))).toBe("season-incomplete");
  });
});

describe("a season, seeded (§4.1)", () => {
  test("proof 6 is star 7: it writes Chapter VII AND completes the season", () => {
    const w = world();
    create(w, "Signed up for the evening course");
    const dreamId = w.state.index.dreams[0].id;
    for (let i = 1; i <= 5; i += 1) expect(crossBridge(w, dreamId).nextChapter?.stage as number).toBe(i + 1);
    const last = crossBridge(w, dreamId);
    expect(last.starIndex).toBe(7);
    expect(last.seasonComplete).toBe(true);
    expect(last.nextChapter?.stage).toBe(7);
    expect(last.nextChapter?.wovenProofId).toBe(last.proof.id);
    const s2 = w.run({ type: "BEGIN_NEXT_SEASON", dreamId });
    expect(s2.wovenProofId).toBeNull();
  });
});

describe("bridges", () => {
  test("offers are exactly 2min, 15min, brave with one suggested, and stable per chapter", () => {
    const w = world();
    const ch = create(w);
    const offers = offersFor(w.state.index, ch.id, false);
    expect(offers.map((o) => o.tier)).toEqual(["2min", "15min", "brave"]);
    expect(offers.filter((o) => o.suggested)).toHaveLength(1);
    expect(offers.find((o) => o.suggested)?.tier).toBe("15min");
    expect(offersFor(w.state.index, ch.id, false)).toEqual(offers);
  });

  test("choosing again replaces the open bridge in place; own bridges are cleaned", () => {
    const w = world();
    const ch = create(w);
    const first = w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch.id, choice: { tier: "own", text: "  sketch the   sign  " } } });
    expect(first.text).toBe("Sketch the sign.");
    const again = w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch.id, choice: { tier: "own", text: "Call the printer!" }, ifThen: { when: "9am", then: "open the file." }, remindAt: "2026-10-16T09:00:00+02:00" } });
    expect(again.id).toBe(first.id);
    expect(again.text).toBe("Call the printer!");
    expect(again.ifThen).toEqual({ when: "9am", then: "open the file" });
    expect(again.remindAt).toBe("2026-10-16T07:00:00.000Z");
    expect(w.state.index.bridges.filter((b) => b.status === "open")).toHaveLength(1);
  });

  test("errors: unknown chapter, older chapter, resolved bridge, unknown library id", () => {
    const w = world();
    const ch = create(w);
    const dreamId = w.state.index.dreams[0].id;
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    const choose = (chapterId: string, choice: BridgeChoice) =>
      errorCode(() => applyArcAction(w.state, { type: "CHOOSE_BRIDGE", input: { chapterId, choice } }, env));
    expect(choose("nope", { tier: "own", text: "x" })).toBe("not-found");
    expect(choose(ch.id, { tier: "2min", libraryId: "br-none" })).toBe("invalid-input");
    crossBridge(w, dreamId);
    expect(choose(ch.id, { tier: "own", text: "x" })).toBe("not-latest-chapter");
  });

  test("'not today' needs an open bridge and is always a learned proof", () => {
    const w = world();
    const ch = create(w);
    const dreamId = w.state.index.dreams[0].id;
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    expect(errorCode(() => applyArcAction(w.state, { type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind: "did", text: "too tired", origin: "not-today" } }, env))).toBe("no-open-bridge");
    w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch.id, choice: { tier: "own", text: "Call the printer" } } });
    const r = w.run({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind: "did", text: "Too tired, tomorrow at lunch.", origin: "not-today" } });
    expect(r.proof.kind).toBe("learned");
    expect(w.state.index.bridges.find((b) => b.id === r.proof.bridgeId)?.status).toBe("learned");
    // the next offers start smaller after a lesson
    expect(offersFor(w.state.index, r.nextChapter!.id, false).find((o) => o.suggested)?.tier).toBe("2min");
  });
});

describe("rerender, heard, saved for later", () => {
  test("rerender keeps id, number, stage, woven proof and bridge; bumps revision; avoids the old ids", () => {
    const w = world();
    create(w, "Sketched the logo");
    const dreamId = w.state.index.dreams[0].id;
    const r = crossBridge(w, dreamId);
    const before = r.nextChapter!;
    w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: before.id, choice: { tier: "own", text: "Email the landlord" } } });
    const meta0 = w.state.index.chapters.find((c) => c.id === before.id)!;
    const prev = w.state;
    const after = w.run({ type: "RERENDER_CHAPTER", chapterId: before.id });
    const meta = w.state.index.chapters.find((c) => c.id === before.id)!;
    expect(after.id).toBe(before.id);
    expect([after.number, after.stage, after.wovenProofId]).toEqual([before.number, before.stage, before.wovenProofId]);
    expect(after.revision).toBe(2);
    expect(meta.revision).toBe(2);
    expect(meta.bridgeId).toBe(meta0.bridgeId);
    expect(meta.revisedAt).not.toBeNull();
    expect(changedChapterIds(prev, w.state)).toEqual([before.id]);
    expect(chaptersOf(w.state.index, dreamId)).toHaveLength(2);
  });

  test("only the latest chapter can be rerendered", () => {
    const w = world();
    const ch = create(w);
    crossBridge(w, w.state.index.dreams[0].id);
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    expect(errorCode(() => applyArcAction(w.state, { type: "RERENDER_CHAPTER", chapterId: ch.id }, env))).toBe("not-latest-chapter");
  });

  test("markHeard sets heardAt once", () => {
    const w = world();
    const ch = create(w);
    expect(w.run({ type: "MARK_HEARD", chapterId: ch.id })).toBe(true);
    const at = w.state.index.chapters[0].heardAt;
    expect(w.run({ type: "MARK_HEARD", chapterId: ch.id })).toBe(false);
    expect(w.state.index.chapters[0].heardAt).toBe(at);
  });
});

describe("Today loop card (A/B/C/D)", () => {
  test("walks A → B → C → D for one evening", () => {
    const w = world({ start: new Date(2026, 9, 15, 7, 0) });
    const ch = create(w);
    const dreamId = w.state.index.dreams[0].id;
    const state = () => loopStateOf(w.state.index, dreamId, w.now(), false);
    expect(state()).toEqual({ kind: "chapter-waiting", dreamId, chapterId: ch.id, heard: false });
    w.run({ type: "MARK_HEARD", chapterId: ch.id });
    expect(state()).toMatchObject({ kind: "chapter-waiting", heard: true });
    const bridge = w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch.id, choice: { tier: "own", text: "Email the landlord" } } });
    expect(state()).toEqual({ kind: "bridge-open", dreamId, chapterId: ch.id, bridgeId: bridge.id });
    const r = w.run({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind: "did", text: "Emailed the landlord about the unit" } });
    expect(state()).toEqual({ kind: "next-woven", dreamId, chapterId: r.nextChapter!.id, proofId: r.proof.id });
    const later = new Date(w.now().getTime() + 6 * 3600_000).toISOString();
    w.run({ type: "SAVE_FOR_RITUAL", chapterId: r.nextChapter!.id, at: later });
    expect(state()).toMatchObject({ kind: "sealed", until: later });
    w.run({ type: "MARK_HEARD", chapterId: r.nextChapter!.id });
    // heard, but saved-for-later still in the future: D until then; after it passes, D for today
    w.tick(7 * 3600_000);
    expect(state()).toMatchObject({ kind: "sealed", until: null });
    w.tick(24 * 3600_000);
    expect(state()).toMatchObject({ kind: "chapter-waiting", heard: true });
  });

  test("the onboarding seed never seals the day, and a complete, heard season shows Named Sky", () => {
    const w = world();
    const ch = create(w, "Bought the domain");
    const dreamId = w.state.index.dreams[0].id;
    w.run({ type: "MARK_HEARD", chapterId: ch.id });
    expect(loopStateOf(w.state.index, dreamId, w.now(), false)).toMatchObject({ kind: "chapter-waiting", heard: true });
    for (let i = 0; i < 6; i += 1) crossBridge(w, dreamId);
    const last = chaptersOf(w.state.index, dreamId).at(-1)!;
    w.run({ type: "MARK_HEARD", chapterId: last.id });
    expect(loopStateOf(w.state.index, dreamId, w.now(), false)).toEqual({ kind: "season-complete", dreamId, season: 1, named: false });
    w.run({ type: "NAME_CONSTELLATION", dreamId, season: 1, name: "  The   Studio " });
    expect(loopStateOf(w.state.index, dreamId, w.now(), false)).toMatchObject({ kind: "season-complete", named: true });
    expect(w.state.index.dreams[0].constellations[0].name).toBe("The Studio");
  });

  test("empty and resting", () => {
    expect(loopStateOf(EMPTY_ARC_INDEX, null, new Date(), false)).toEqual({ kind: "empty" });
    const w = world();
    create(w);
    const dreamId = w.state.index.dreams[0].id;
    w.run({ type: "REST_DREAM", dreamId });
    expect(loopStateOf(w.state.index, dreamId, w.now(), false)).toEqual({ kind: "resting", dreamId, reason: "resting" });
  });
});

describe("Plus-lapse rule (I12)", () => {
  test("on lapse nothing is mutated: one dream keeps weaving, the others are plan-locked but readable", () => {
    const w = world({ isPlus: true });
    create(w);
    const older = w.state.index.dreams[0].id;
    w.run({ type: "CREATE_DREAM", input: { focus: "love", desire: "a home full of friends", feeling: "loved" } });
    const newer = w.state.index.dreams[0].id;
    const before = w.state.index;
    w.setPlus(false);
    expect(planLockedOf(w.state.index, false)).toEqual([older]);
    expect(loopStateOf(w.state.index, older, w.now(), false)).toMatchObject({ kind: "resting", reason: "plan-locked" });
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    expect(errorCode(() => applyArcAction(w.state, { type: "SAVE_PROOF_AND_WEAVE", input: { dreamId: older, kind: "did", text: "x" } }, env))).toBe("dream-not-weaving");
    expect(errorCode(() => applyArcAction(w.state, { type: "RERENDER_CHAPTER", chapterId: chaptersOf(w.state.index, older)[0].id }, env))).toBe("dream-not-weaving");
    expect(w.state.index).toBe(before);
    // the lapsed user picks which dream keeps weaving (focus only)
    w.run({ type: "SET_ACTIVE_DREAM", dreamId: older });
    expect(planLockedOf(w.state.index, false)).toEqual([newer]);
    // re-subscribing resumes everything
    expect(planLockedOf(w.state.index, true)).toEqual([]);
  });

  test("free swap: waking a resting dream rests the active one", () => {
    const w = world();
    create(w);
    const a = w.state.index.dreams[0].id;
    w.run({ type: "REST_DREAM", dreamId: a });
    w.run({ type: "CREATE_DREAM", input: { focus: "love", desire: "a home full of friends", feeling: "loved" } });
    const b = w.state.index.dreams[0].id;
    w.run({ type: "SET_ACTIVE_DREAM", dreamId: a });
    const status = Object.fromEntries(w.state.index.dreams.map((d) => [d.id, d.status]));
    expect(status).toEqual({ [a]: "active", [b]: "resting" });
    expect(w.state.index.activeDreamId).toBe(a);
  });

  test("release lapses the open bridge, keeps chapters readable, and moves focus (I14)", () => {
    const w = world();
    const ch = create(w);
    const a = w.state.index.dreams[0].id;
    w.run({ type: "CHOOSE_BRIDGE", input: { chapterId: ch.id, choice: { tier: "own", text: "Call the printer" } } });
    w.run({ type: "RELEASE_DREAM", dreamId: a });
    expect(openBridgeOf(w.state.index, a)).toBeUndefined();
    expect(w.state.index.activeDreamId).toBeNull();
    expect(w.state.texts[ch.id]).toBeDefined();
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    expect(errorCode(() => applyArcAction(w.state, { type: "SET_ACTIVE_DREAM", dreamId: a }, env))).toBe("invalid-input");
    expect(errorCode(() => applyArcAction(w.state, { type: "RENAME_DREAM", dreamId: a, label: "x" }, env))).toBe("invalid-input");
  });
});

describe("totals, import, storage shape", () => {
  test("totalStars counts every proof across dreams", () => {
    const w = world({ isPlus: true });
    create(w, "Seed");
    crossBridge(w, w.state.index.dreams[0].id);
    expect(totalStarsOf(w.state.index)).toBe(2);
  });

  test("IMPORT validates with checkArcInvariants", () => {
    const w = world();
    create(w);
    const snap = w.snapshot();
    const env: ArcEnv = { now: w.now(), isPlus: false, name: "M", newId: () => "x", seed: 1 };
    const broken: ArcSnapshot = { ...snap, chapters: {} };
    expect(errorCode(() => applyArcAction(EMPTY, { type: "IMPORT", snapshot: broken }, env))).toBe("invalid-input");
    const ok = applyArcAction(EMPTY, { type: "IMPORT", snapshot: snap }, env).state;
    expect(ok.index).toEqual(snap.index);
  });

  test("the index stays small (no chapter text) and a chapter key holds about 3 KB", () => {
    const w = world();
    create(w, "Seed");
    const dreamId = w.state.index.dreams[0].id;
    for (let i = 0; i < 6; i += 1) crossBridge(w, dreamId);
    const index = JSON.stringify(w.state.index);
    const chapters = Object.values(w.state.texts) as Chapter[];
    expect(index.length).toBeLessThan(16_000);
    for (const c of chapters) expect(JSON.stringify(c).length).toBeLessThan(12_000);
    expect(index).not.toContain(chapters[0].body[0].text);
  });
});
