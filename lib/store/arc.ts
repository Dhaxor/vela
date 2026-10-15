// ARC STORE: the pure reducer behind ArcContext. Every action is one atomic
// transition from the CURRENT state (never a stale snapshot, the 1.0 bug that
// could drop a saved proof): validate, then return the next state plus the
// action's result, or throw ArcError and leave the state untouched.
//
// Nondeterminism (clock, ids, engine seed, entitlement, name) arrives in
// ArcEnv, so every transition is reproducible in tests. Invariants I1–I15:
// contexts/arc.types.ts; lib/migrate.ts checkArcInvariants verifies them.

import {
  ArcError,
  LIMITS,
  STARS_PER_SEASON,
  canCreateDream,
  isSeasonComplete,
  type ArcIndex,
  type ArcSnapshot,
  type BeginSeasonInput,
  type Bridge,
  type Chapter,
  type ChapterId,
  type ChapterMeta,
  type ChooseBridgeInput,
  type CreateDreamInput,
  type Dream,
  type DreamId,
  type IfThen,
  type IsoTime,
  type Proof,
  type SaveProofInput,
  type SaveProofResult,
} from "@/contexts/arc.types";
import { FOCUS_AREAS } from "@/lib/focus";
import { bridgeText, ownBridgeText, sanitizeEvidence } from "@/lib/futureMemory";
import { localDateKey } from "@/lib/progress";
import { BRIDGES } from "@/lib/story/content";
import { writeChapter, type WeaveProof, type WriteChapterInput } from "@/lib/story/engine";
import { matchMotifs } from "@/lib/story/motifs";
import { cleanUserText, collapse } from "@/lib/story/text";
import {
  chapterMetaOf,
  dreamOf,
  isWeaving,
  latestChapterOf,
  openBridgeOf,
  previousChapterOf,
  proofsOf,
  suggestConstellationNameOf,
} from "./arcSelectors";
import { checkArcInvariants } from "./invariants";

/** In-memory arc state: the index plus every chapter text loaded so far. */
export interface ArcState {
  readonly index: ArcIndex;
  readonly texts: Readonly<Record<ChapterId, Chapter>>;
}

export interface ArcEnv {
  readonly now: Date;
  readonly isPlus: boolean;
  /** Display name for {name} in newly written chapters. */
  readonly name: string;
  readonly newId: () => string;
  /** Engine seed for any chapter this action writes. */
  readonly seed: number;
}

export interface Transition<R> {
  readonly state: ArcState;
  readonly result: R;
}

/* =========================================================================
 * Helpers
 * ========================================================================= */

const fail = (code: ConstructorParameters<typeof ArcError>[0], message?: string): never => {
  throw new ArcError(code, message);
};

function requireDream(index: ArcIndex, dreamId: DreamId): Dream {
  return dreamOf(index, dreamId) ?? fail("not-found", `dream ${dreamId}`);
}

function requireWeaving(index: ArcIndex, dream: Dream, env: ArcEnv): void {
  if (!isWeaving(index, dream.id, env.isPlus)) fail("dream-not-weaving");
}

function requireChapter(index: ArcIndex, chapterId: ChapterId): { meta: ChapterMeta; dream: Dream } {
  const meta = chapterMetaOf(index, chapterId) ?? fail("not-found", `chapter ${chapterId}`);
  const dream = requireDream(index, meta.dreamId);
  return { meta, dream };
}

const replaceBy = <T extends { readonly id: string }>(rows: readonly T[], next: T): T[] =>
  rows.map((r) => (r.id === next.id ? next : r));

/** Rolling repetition guard: newest last, capped. */
function appendUsed(dream: Dream, ids: readonly string[]): Dream {
  const kept = dream.usedIds.filter((id) => !ids.includes(id));
  return { ...dream, usedIds: [...kept, ...ids].slice(-LIMITS.usedIds) };
}

const toWeave = (p: Proof): WeaveProof => ({ id: p.id, kind: p.kind, text: p.text, dateKey: p.dateKey, origin: p.origin });

function metaFor(chapter: Chapter, createdAt: IsoTime): ChapterMeta {
  return {
    id: chapter.id,
    dreamId: chapter.dreamId,
    season: chapter.season,
    number: chapter.number,
    stage: chapter.stage,
    title: chapter.title,
    revision: chapter.revision,
    source: chapter.source,
    createdAt,
    revisedAt: null,
    wovenProofId: chapter.wovenProofId,
    bridgeId: null,
    heardAt: null,
    savedForAt: null,
  };
}

function validIso(value: string | null | undefined): IsoTime | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function cleanIfThen(ifThen: IfThen | null | undefined): IfThen | null {
  if (!ifThen) return null;
  const when = cleanUserText(ifThen.when, LIMITS.ifThenWhen);
  const then = cleanUserText(ifThen.then, LIMITS.ifThenThen).replace(/[.!?]+$/u, "");
  return when && then ? { when, then } : null;
}

interface EngineCall {
  readonly dream: Dream;
  readonly chapterId: ChapterId;
  readonly season: number;
  readonly number: number;
  readonly stage: WriteChapterInput["stage"];
  readonly mode: WriteChapterInput["mode"];
  readonly revision: number;
  readonly woven: Proof | null;
  /** Proofs that exist at this chapter's moment (the woven one included). */
  readonly proofs: readonly Proof[];
  readonly previousIds: readonly string[];
}

function runEngine(call: EngineCall, env: ArcEnv): ReturnType<typeof writeChapter> {
  const history = call.proofs.filter((p) => p.id !== call.woven?.id).map(toWeave);
  return writeChapter({
    chapterId: call.chapterId,
    dreamId: call.dream.id,
    season: call.season,
    number: call.number,
    stage: call.stage,
    mode: call.mode,
    revision: call.revision,
    name: env.name,
    focus: call.dream.focus,
    desire: call.dream.desire,
    feeling: call.dream.feeling,
    motifIds: call.dream.motifIds,
    recentIds: call.dream.usedIds,
    previousIds: call.previousIds,
    woven: call.woven ? toWeave(call.woven) : null,
    history,
    totalProofs: call.proofs.length,
    seed: env.seed,
    now: env.now,
    todayKey: localDateKey(env.now),
  });
}

const idsOf = (chapter: Chapter | undefined): readonly string[] => chapter?.usedIds ?? [];

/* =========================================================================
 * Transitions (one per atomic action)
 * ========================================================================= */

export function createDream(state: ArcState, input: CreateDreamInput, env: ArcEnv): Transition<Chapter> {
  const { index } = state;
  if (!FOCUS_AREAS.some((f) => f.id === input.focus)) fail("invalid-input", "focus");
  const desire = cleanUserText(input.desire, LIMITS.desire);
  const feeling = collapse(input.feeling).toLowerCase().slice(0, LIMITS.feeling);
  if (!desire || !feeling) fail("invalid-input", "desire and feeling are required");
  if (!canCreateDream(index.dreams, env.isPlus)) fail("plan-limit");

  const nowIso = env.now.toISOString();
  const dreamId = env.newId();
  const chapterId = env.newId();
  const seedText = input.seedProof ? sanitizeEvidence(input.seedProof.text) : "";
  const seed: Proof | null = seedText
    ? {
        id: env.newId(),
        dreamId,
        bridgeId: null,
        kind: "did",
        text: seedText,
        photoUri: input.seedProof?.photoUri ?? null,
        createdAt: nowIso,
        dateKey: localDateKey(env.now),
        wovenInChapterId: chapterId,
        starIndex: 1,
        season: 1,
        origin: "onboarding",
      }
    : null;
  const dream: Dream = {
    id: dreamId,
    focus: input.focus,
    desire,
    feeling,
    label: null,
    createdAt: nowIso,
    status: "active",
    statusChangedAt: nowIso,
    season: 1,
    seasonStartedAt: nowIso,
    constellations: [],
    usedIds: [],
    motifIds: matchMotifs(desire, input.focus),
  };
  const { chapter, usedIds } = runEngine(
    { dream, chapterId, season: 1, number: 1, stage: 1, mode: "chapter-one", revision: 1, woven: seed, proofs: seed ? [seed] : [], previousIds: [] },
    env
  );
  return {
    state: {
      index: {
        ...index,
        dreams: [appendUsed(dream, usedIds), ...index.dreams],
        chapters: [...index.chapters, metaFor(chapter, nowIso)],
        proofs: seed ? [...index.proofs, seed] : index.proofs,
        activeDreamId: dreamId,
      },
      texts: { ...state.texts, [chapterId]: chapter },
    },
    result: chapter,
  };
}

export function chooseBridge(state: ArcState, input: ChooseBridgeInput, env: ArcEnv): Transition<Bridge> {
  const { index } = state;
  const { meta, dream } = requireChapter(index, input.chapterId);
  requireWeaving(index, dream, env);
  if (latestChapterOf(index, dream.id)?.id !== meta.id) fail("not-latest-chapter");
  if (isSeasonComplete(proofsOf(index, dream.id, dream.season).length)) fail("season-complete");
  const existing = meta.bridgeId ? index.bridges.find((b) => b.id === meta.bridgeId) : undefined;
  if (existing && (existing.status === "crossed" || existing.status === "learned")) fail("bridge-resolved");

  let tier: Bridge["tier"];
  let libraryId: string | null;
  let text: string;
  if (input.choice.tier === "own") {
    tier = "own";
    libraryId = null;
    text = ownBridgeText(input.choice.text, LIMITS.bridgeOwnText);
  } else {
    const { tier: libTier, libraryId: id } = input.choice;
    const entry = BRIDGES.entries.find((b) => b.id === id && b.tier === libTier && b.focus === dream.focus);
    if (!entry) fail("invalid-input", `bridge ${id}`);
    tier = libTier;
    libraryId = id;
    text = bridgeText(entry!, dream.desire, dream.motifIds);
  }
  if (!text) fail("invalid-input", "empty bridge");

  const nowIso = env.now.toISOString();
  const fields = { tier, libraryId, text, ifThen: cleanIfThen(input.ifThen), remindAt: validIso(input.remindAt) };
  const bridge: Bridge =
    existing && existing.status === "open"
      ? { ...existing, ...fields }
      : {
          id: env.newId(),
          dreamId: dream.id,
          chapterId: meta.id,
          season: meta.season,
          ...fields,
          status: "open",
          createdAt: nowIso,
          resolvedAt: null,
          proofId: null,
        };
  // I6: at most one open bridge per dream, on its latest chapter.
  const bridges = index.bridges
    .filter((b) => b.id !== bridge.id)
    .map((b) => (b.dreamId === dream.id && b.status === "open" ? { ...b, status: "lapsed" as const, resolvedAt: nowIso } : b));
  return {
    state: {
      ...state,
      index: { ...index, bridges: [...bridges, bridge], chapters: replaceBy(index.chapters, { ...meta, bridgeId: bridge.id }) },
    },
    result: bridge,
  };
}

export function saveProofAndWeave(state: ArcState, input: SaveProofInput, env: ArcEnv): Transition<SaveProofResult> {
  const { index } = state;
  const dream = requireDream(index, input.dreamId);
  requireWeaving(index, dream, env);
  const origin = input.origin ?? "bridge";
  const kind = origin === "not-today" ? "learned" : input.kind;
  const text = sanitizeEvidence(input.text);
  if (!text) fail("invalid-input", "empty proof");
  const seasonProofs = proofsOf(index, dream.id, dream.season);
  if (isSeasonComplete(seasonProofs.length)) fail("season-complete");
  const open = openBridgeOf(index, dream.id);
  if (origin === "not-today" && !open) fail("no-open-bridge");
  const latest = latestChapterOf(index, dream.id) ?? fail("not-found", "dream has no chapter");

  const nowIso = env.now.toISOString();
  const starIndex = seasonProofs.length + 1;
  const seasonComplete = starIndex === STARS_PER_SEASON;
  // The proof weaves the next chapter unless this season's Chapter VII already exists (I5).
  const writesNext = latest.stage < 7;
  const nextChapterId = writesNext ? env.newId() : null;
  const proof: Proof = {
    id: env.newId(),
    dreamId: dream.id,
    bridgeId: open?.id ?? null,
    kind,
    text,
    photoUri: input.photoUri ?? null,
    createdAt: nowIso,
    dateKey: localDateKey(env.now),
    wovenInChapterId: nextChapterId,
    starIndex,
    season: dream.season,
    origin,
  };
  const bridges = open
    ? replaceBy(index.bridges, { ...open, status: kind === "learned" ? "learned" : "crossed", resolvedAt: nowIso, proofId: proof.id })
    : index.bridges;

  let next: Chapter | undefined;
  let dreams = index.dreams;
  let chapters = index.chapters;
  let texts = state.texts;
  if (nextChapterId) {
    const stage = Math.min(latest.stage + 1, 7) as ChapterMeta["stage"];
    const written = runEngine(
      {
        dream,
        chapterId: nextChapterId,
        season: dream.season,
        number: latest.number + 1,
        stage,
        mode: "engine",
        revision: 1,
        woven: proof,
        proofs: [...proofsOf(index, dream.id), proof],
        previousIds: idsOf(state.texts[latest.id]),
      },
      env
    );
    next = written.chapter;
    dreams = replaceBy(index.dreams, appendUsed(dream, written.usedIds));
    chapters = [...index.chapters, metaFor(next, nowIso)];
    texts = { ...state.texts, [next.id]: next };
  }
  return {
    state: { index: { ...index, dreams, chapters, bridges, proofs: [...index.proofs, proof] }, texts },
    result: { proof, starIndex, ...(next ? { nextChapter: next } : {}), seasonComplete },
  };
}

export function rerenderChapter(state: ArcState, chapterId: ChapterId, env: ArcEnv): Transition<Chapter> {
  const { index } = state;
  const { meta, dream } = requireChapter(index, chapterId);
  requireWeaving(index, dream, env);
  if (latestChapterOf(index, dream.id)?.id !== meta.id) fail("not-latest-chapter");
  const woven = meta.wovenProofId ? index.proofs.find((p) => p.id === meta.wovenProofId) ?? null : null;
  const prev = previousChapterOf(index, meta.id);
  const { chapter, usedIds } = runEngine(
    {
      dream,
      chapterId: meta.id,
      season: meta.season,
      number: meta.number,
      stage: meta.stage,
      mode: "engine",
      revision: meta.revision + 1,
      woven,
      proofs: proofsOf(index, dream.id).filter((p) => p.createdAt <= meta.createdAt || p.id === woven?.id),
      previousIds: [...idsOf(state.texts[meta.id]), ...idsOf(prev ? state.texts[prev.id] : undefined)],
    },
    env
  );
  const nextMeta: ChapterMeta = { ...meta, title: chapter.title, revision: chapter.revision, source: chapter.source, revisedAt: env.now.toISOString() };
  return {
    state: {
      index: { ...index, dreams: replaceBy(index.dreams, appendUsed(dream, usedIds)), chapters: replaceBy(index.chapters, nextMeta) },
      texts: { ...state.texts, [meta.id]: chapter },
    },
    result: chapter,
  };
}

/** Result: true when this call set heardAt (the caller records the 'chapter-heard' act). */
export function markHeard(state: ArcState, chapterId: ChapterId, env: ArcEnv): Transition<boolean> {
  const meta = chapterMetaOf(state.index, chapterId) ?? fail("not-found");
  if (meta.heardAt) return { state, result: false };
  const next = { ...meta, heardAt: env.now.toISOString() };
  return { state: { ...state, index: { ...state.index, chapters: replaceBy(state.index.chapters, next) } }, result: true };
}

export function saveForRitual(state: ArcState, chapterId: ChapterId, at: IsoTime): Transition<void> {
  const meta = chapterMetaOf(state.index, chapterId) ?? fail("not-found");
  const iso = validIso(at) ?? fail("invalid-input", "savedForAt");
  const next = { ...meta, savedForAt: iso };
  return { state: { ...state, index: { ...state.index, chapters: replaceBy(state.index.chapters, next) } }, result: undefined };
}

export function nameConstellation(state: ArcState, dreamId: DreamId, season: number, name: string, env: ArcEnv): Transition<void> {
  const dream = requireDream(state.index, dreamId);
  if (!isSeasonComplete(proofsOf(state.index, dreamId, season).length)) fail("season-incomplete");
  const clean = cleanUserText(name, LIMITS.constellationName);
  if (!clean) fail("invalid-input", "empty name");
  const constellations = [
    ...dream.constellations.filter((c) => c.season !== season),
    { season, name: clean, namedAt: env.now.toISOString() },
  ].sort((a, b) => a.season - b.season);
  return { state: { ...state, index: { ...state.index, dreams: replaceBy(state.index.dreams, { ...dream, constellations }) } }, result: undefined };
}

export function beginNextSeason(state: ArcState, dreamId: DreamId, input: BeginSeasonInput | undefined, env: ArcEnv): Transition<Chapter> {
  const { index } = state;
  const dream = requireDream(index, dreamId);
  requireWeaving(index, dream, env);
  const finished = proofsOf(index, dreamId, dream.season);
  if (!isSeasonComplete(finished.length)) fail("season-incomplete");
  const desire = input?.desire !== undefined ? cleanUserText(input.desire, LIMITS.desire) : dream.desire;
  const feeling = input?.feeling !== undefined ? collapse(input.feeling).toLowerCase().slice(0, LIMITS.feeling) : dream.feeling;
  if (!desire || !feeling) fail("invalid-input", "desire and feeling are required");

  const nowIso = env.now.toISOString();
  const named = dream.constellations.some((c) => c.season === dream.season)
    ? dream.constellations
    : [...dream.constellations, { season: dream.season, name: suggestConstellationNameOf(dream), namedAt: nowIso }];
  const next: Dream = {
    ...dream,
    desire,
    feeling,
    motifIds: desire === dream.desire ? dream.motifIds : matchMotifs(desire, dream.focus),
    season: dream.season + 1,
    seasonStartedAt: nowIso,
    constellations: named,
  };
  // The season's 7th star, if no chapter wove it yet, opens the new season ("Season 2 begins with what you did").
  const carried = finished.find((p) => p.starIndex === STARS_PER_SEASON && p.wovenInChapterId === null) ?? null;
  const chapterId = env.newId();
  const latest = latestChapterOf(index, dreamId);
  const { chapter, usedIds } = runEngine(
    {
      dream: next,
      chapterId,
      season: next.season,
      number: 1,
      stage: 1,
      mode: "engine",
      revision: 1,
      woven: carried,
      proofs: proofsOf(index, dreamId),
      previousIds: idsOf(latest ? state.texts[latest.id] : undefined),
    },
    env
  );
  const proofs = carried ? replaceBy(index.proofs, { ...carried, wovenInChapterId: chapterId }) : index.proofs;
  return {
    state: {
      index: {
        ...index,
        dreams: replaceBy(index.dreams, appendUsed(next, usedIds)),
        chapters: [...index.chapters, metaFor(chapter, nowIso)],
        proofs,
      },
      texts: { ...state.texts, [chapterId]: chapter },
    },
    result: chapter,
  };
}

export function renameDream(state: ArcState, dreamId: DreamId, label: string | null): Transition<void> {
  const dream = requireDream(state.index, dreamId);
  if (dream.status === "released") fail("invalid-input", "released");
  const clean = label === null ? "" : cleanUserText(label, LIMITS.dreamLabel);
  const next = { ...dream, label: clean || null };
  return { state: { ...state, index: { ...state.index, dreams: replaceBy(state.index.dreams, next) } }, result: undefined };
}

/** I14: focus a non-released dream, preferring active ones, newest first. */
function refocus(dreams: readonly Dream[], current: DreamId | null, leaving: DreamId): DreamId | null {
  if (current !== leaving && dreams.some((d) => d.id === current && d.status !== "released")) return current;
  const pick = (status: Dream["status"]) =>
    [...dreams].filter((d) => d.id !== leaving && d.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const leavingDream = dreams.find((d) => d.id === leaving);
  return (pick("active") ?? pick("resting") ?? (leavingDream && leavingDream.status !== "released" ? leavingDream : undefined))?.id ?? null;
}

export function restDream(state: ArcState, dreamId: DreamId, env: ArcEnv): Transition<void> {
  const dream = requireDream(state.index, dreamId);
  if (dream.status === "released") fail("invalid-input", "released");
  if (dream.status === "resting") return { state, result: undefined };
  const dreams = replaceBy<Dream>(state.index.dreams, { ...dream, status: "resting", statusChangedAt: env.now.toISOString() });
  return {
    state: { ...state, index: { ...state.index, dreams, activeDreamId: refocus(dreams, state.index.activeDreamId, dreamId) } },
    result: undefined,
  };
}

export function releaseDream(state: ArcState, dreamId: DreamId, env: ArcEnv): Transition<void> {
  const dream = requireDream(state.index, dreamId);
  if (dream.status === "released") return { state, result: undefined };
  const nowIso = env.now.toISOString();
  const dreams = replaceBy<Dream>(state.index.dreams, { ...dream, status: "released", statusChangedAt: nowIso });
  const bridges = state.index.bridges.map((b) =>
    b.dreamId === dreamId && b.status === "open" ? { ...b, status: "lapsed" as const, resolvedAt: nowIso } : b
  );
  return {
    state: { ...state, index: { ...state.index, dreams, bridges, activeDreamId: refocus(dreams, state.index.activeDreamId, dreamId) } },
    result: undefined,
  };
}

export function setActiveDream(state: ArcState, dreamId: DreamId, env: ArcEnv): Transition<void> {
  const dream = requireDream(state.index, dreamId);
  if (dream.status === "released") fail("invalid-input", "released");
  const nowIso = env.now.toISOString();
  let dreams = state.index.dreams;
  if (dream.status === "resting") {
    // Free tier swap: waking one dream rests the other active one(s).
    dreams = dreams.map((d) => {
      if (d.id === dreamId) return { ...d, status: "active" as const, statusChangedAt: nowIso };
      if (!env.isPlus && d.status === "active") return { ...d, status: "resting" as const, statusChangedAt: nowIso };
      return d;
    });
  }
  return { state: { ...state, index: { ...state.index, dreams, activeDreamId: dreamId } }, result: undefined };
}

/** Replace everything with a validated snapshot (backup import). */
export function importSnapshot(snapshot: ArcSnapshot): Transition<void> {
  const problems = checkArcInvariants(snapshot);
  if (problems.length > 0) fail("invalid-input", problems.slice(0, 3).join("; "));
  return { state: { index: snapshot.index, texts: { ...snapshot.chapters } }, result: undefined };
}

/* =========================================================================
 * Atomic action vocabulary
 * ========================================================================= */

export type ArcAction =
  | { readonly type: "CREATE_DREAM"; readonly input: CreateDreamInput }
  | { readonly type: "CHOOSE_BRIDGE"; readonly input: ChooseBridgeInput }
  | { readonly type: "SAVE_PROOF_AND_WEAVE"; readonly input: SaveProofInput }
  | { readonly type: "RERENDER_CHAPTER"; readonly chapterId: ChapterId }
  | { readonly type: "MARK_HEARD"; readonly chapterId: ChapterId }
  | { readonly type: "SAVE_FOR_RITUAL"; readonly chapterId: ChapterId; readonly at: IsoTime }
  | { readonly type: "NAME_CONSTELLATION"; readonly dreamId: DreamId; readonly season: number; readonly name: string }
  | { readonly type: "BEGIN_NEXT_SEASON"; readonly dreamId: DreamId; readonly input?: BeginSeasonInput }
  | { readonly type: "RENAME_DREAM"; readonly dreamId: DreamId; readonly label: string | null }
  | { readonly type: "REST_DREAM"; readonly dreamId: DreamId }
  | { readonly type: "RELEASE_DREAM"; readonly dreamId: DreamId }
  | { readonly type: "SET_ACTIVE_DREAM"; readonly dreamId: DreamId }
  | { readonly type: "IMPORT"; readonly snapshot: ArcSnapshot };

export interface ArcResults {
  CREATE_DREAM: Chapter;
  CHOOSE_BRIDGE: Bridge;
  SAVE_PROOF_AND_WEAVE: SaveProofResult;
  RERENDER_CHAPTER: Chapter;
  MARK_HEARD: boolean;
  SAVE_FOR_RITUAL: void;
  NAME_CONSTELLATION: void;
  BEGIN_NEXT_SEASON: Chapter;
  RENAME_DREAM: void;
  REST_DREAM: void;
  RELEASE_DREAM: void;
  SET_ACTIVE_DREAM: void;
  IMPORT: void;
}

/** Apply one atomic action. Throws ArcError (state untouched) when a precondition fails. */
export function applyArcAction<A extends ArcAction>(state: ArcState, action: A, env: ArcEnv): Transition<ArcResults[A["type"]]> {
  const a = action as ArcAction;
  const t = ((): Transition<unknown> => {
    switch (a.type) {
      case "CREATE_DREAM": return createDream(state, a.input, env);
      case "CHOOSE_BRIDGE": return chooseBridge(state, a.input, env);
      case "SAVE_PROOF_AND_WEAVE": return saveProofAndWeave(state, a.input, env);
      case "RERENDER_CHAPTER": return rerenderChapter(state, a.chapterId, env);
      case "MARK_HEARD": return markHeard(state, a.chapterId, env);
      case "SAVE_FOR_RITUAL": return saveForRitual(state, a.chapterId, a.at);
      case "NAME_CONSTELLATION": return nameConstellation(state, a.dreamId, a.season, a.name, env);
      case "BEGIN_NEXT_SEASON": return beginNextSeason(state, a.dreamId, a.input, env);
      case "RENAME_DREAM": return renameDream(state, a.dreamId, a.label);
      case "REST_DREAM": return restDream(state, a.dreamId, env);
      case "RELEASE_DREAM": return releaseDream(state, a.dreamId, env);
      case "SET_ACTIVE_DREAM": return setActiveDream(state, a.dreamId, env);
      case "IMPORT": return importSnapshot(a.snapshot);
    }
  })();
  return t as Transition<ArcResults[A["type"]]>;
}

/** Chapter ids whose text changed between two states (by reference): the per-chapter keys to write. */
export function changedChapterIds(prev: ArcState, next: ArcState): ChapterId[] {
  return Object.keys(next.texts).filter((id) => next.texts[id] !== prev.texts[id]);
}
