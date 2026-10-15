// v1 → v2 ARC MIGRATION (contexts/arc.types.ts MigrateV1). Pure and
// release-blocking: it runs once on live 1.0.1 data, and its fixtures are real
// captures of the 1.0 app (lib/fixtures/v1).
//
// The trap it exists to avoid: in 1.0 the reader's refresh icon bumped
// intent.chapter and added a new open action on every tap, with no proof. A
// user who rerolled eight times sits at 'chapter 9' with one star and a stack
// of orphaned actions. So:
// - the stage comes from proofs (min(completed + 1, 7) within the season),
//   never from intent.chapter;
// - only the newest open action survives as the live bridge, older ones are
//   'lapsed' (hidden);
// - ids are kept (dreamId = intentId, chapterId = story id), so deep links work;
// - v1 keys are only read, never written.

import {
  ARC_SCHEMA_VERSION,
  STARS_PER_SEASON,
  type ArcIndex,
  type ArcSnapshot,
  type Bridge,
  type Chapter,
  type ChapterMeta,
  type Dream,
  type MigrateV1,
  type MigrationReport,
  type Paragraph,
  type Proof,
  type V1RawStorage,
} from "@/contexts/arc.types";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";
import { sanitizeEvidence } from "@/lib/futureMemory";
import { localDateKey } from "@/lib/progress";
import type { ParagraphBeat, ProofKind, StageId } from "@/lib/story/content/types";
import { writeChapter } from "@/lib/story/engine";
import { matchMotifs } from "@/lib/story/motifs";
import { seasonSlot } from "@/lib/story/seasons";
import { cleanUserText, collapse, fixPunctuation, hash32, wordCount } from "@/lib/story/text";
import { checkArcInvariants } from "@/lib/store/invariants";

export { checkArcInvariants };

/* =========================================================================
 * v1 shapes (contexts/StoryContext.tsx at 1.0.1), read leniently
 * ========================================================================= */

interface V1Intent {
  id: string;
  focus: FocusId;
  desire: string;
  feeling: string;
  createdAt: string;
}
interface V1Story {
  id: string;
  intentId: string;
  title: string;
  paragraphs: { fragmentId: string; text: string }[];
  createdAt: string;
}
interface V1Action {
  id: string;
  intentId: string;
  storyId: string;
  text: string;
  state: "open" | "completed" | "reshaped";
  createdAt: string;
  completedAt?: string;
  evidence?: string;
  evidenceKind?: ProofKind;
  /** Position in the v1 array (newest first): the tie-break for equal timestamps. */
  order: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const iso = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};
const FOCUS_IDS = new Set<string>(FOCUS_AREAS.map((f) => f.id));
const KINDS = new Set<string>(["did", "moved", "learned"]);

interface ParsedV1 {
  intents: V1Intent[];
  stories: V1Story[];
  actions: V1Action[];
}

function parseStories(raw: string | null, warnings: string[]): ParsedV1 {
  const empty: ParsedV1 = { intents: [], stories: [], actions: [] };
  if (!raw) return empty;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    warnings.push("vela.stories.v1 is not valid JSON; starting fresh");
    return empty;
  }
  if (!isObj(data)) return empty;
  const intents: V1Intent[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(data.intents) ? data.intents : []) {
    const id = isObj(r) ? str(r.id) : null;
    if (!isObj(r) || !id || seen.has(id) || !FOCUS_IDS.has(String(r.focus)) || !str(r.desire)) {
      warnings.push(`skipped malformed intent ${id ?? "?"}`);
      continue;
    }
    seen.add(id);
    intents.push({
      id,
      focus: r.focus as FocusId,
      desire: String(r.desire),
      feeling: str(r.feeling)?.toLowerCase() ?? "grateful",
      createdAt: iso(r.createdAt) ?? new Date(0).toISOString(),
    });
  }
  const stories: V1Story[] = [];
  for (const r of Array.isArray(data.stories) ? data.stories : []) {
    if (!isObj(r) || !str(r.id) || !str(r.intentId) || !Array.isArray(r.paragraphs)) continue;
    const paragraphs = r.paragraphs
      .filter((p): p is Record<string, unknown> => isObj(p) && typeof p.text === "string" && p.text.trim() !== "")
      .map((p) => ({ fragmentId: str(p.fragmentId) ?? "x", text: String(p.text) }));
    stories.push({ id: String(r.id), intentId: String(r.intentId), title: str(r.title) ?? "Your story", paragraphs, createdAt: iso(r.createdAt) ?? new Date(0).toISOString() });
  }
  const actions: V1Action[] = [];
  (Array.isArray(data.actions) ? data.actions : []).forEach((r: unknown, order: number) => {
    if (!isObj(r) || !str(r.id) || !str(r.intentId)) return;
    const state = r.state === "completed" || r.state === "reshaped" ? r.state : "open";
    actions.push({
      id: String(r.id),
      intentId: String(r.intentId),
      storyId: str(r.storyId) ?? "",
      text: str(r.text) ?? "",
      state,
      createdAt: iso(r.createdAt) ?? new Date(0).toISOString(),
      ...(iso(r.completedAt) ? { completedAt: iso(r.completedAt)! } : {}),
      ...(str(r.evidence) ? { evidence: String(r.evidence) } : {}),
      ...(KINDS.has(String(r.evidenceKind)) ? { evidenceKind: r.evidenceKind as ProofKind } : {}),
      order,
    });
  });
  return { intents, stories, actions };
}

/* =========================================================================
 * Story → Chapter
 * ========================================================================= */

/** v1 beat from its fragment id prefix ('op4', 'ar-ab3', 'gr7'). */
function v1Beat(fragmentId: string): ParagraphBeat {
  const prefix = fragmentId.split(/[-\d]/u)[0];
  if (prefix === "op") return "opening";
  if (prefix === "ar") return "arrival";
  if (prefix === "se") return "sensory";
  if (prefix === "gr") return "reflection";
  if (prefix === "cl") return "closing";
  if (prefix === "proof") return "recall";
  return "living";
}

function v1Paragraph(p: { fragmentId: string; text: string }, key: string): Paragraph {
  return { key, fragmentId: `v1:${p.fragmentId}`, beat: v1Beat(p.fragmentId), text: fixPunctuation(collapse(p.text)), spans: [] };
}

/**
 * The single 1.0 rendering, kept word for word (minus '..'). Its opening and
 * closing fill both daypart slots; a 1.0 'proof-N' line moves before the closing.
 */
function chapterFromStory(story: V1Story, dreamId: string, season: number, stage: StageId): Chapter | null {
  const story7 = story.paragraphs.filter((p) => !p.fragmentId.startsWith("proof-"));
  const proofLines = story.paragraphs.filter((p) => p.fragmentId.startsWith("proof-"));
  if (story7.length < 2) return null;
  const opening = v1Paragraph(story7[0], "p0");
  const body = [...story7.slice(1, -1), ...proofLines].map((p, i) => v1Paragraph(p, `p${i + 1}`));
  const closing = v1Paragraph(story7[story7.length - 1], `p${body.length + 1}`);
  const words = [opening, ...body, closing].reduce((n, p) => n + wordCount(p.text), 0);
  return {
    id: story.id,
    dreamId,
    season,
    number: stage,
    stage,
    title: collapse(story.title),
    revision: 1,
    writtenAt: story.createdAt,
    source: "migrated-v1",
    wovenProofId: null,
    opening: { morning: opening, evening: opening },
    body,
    closing: { morning: closing, evening: closing },
    wordCount: { morning: words, evening: words },
    engineVersion: 1,
  };
}

const metaOf = (c: Chapter, createdAt: string): ChapterMeta => ({
  id: c.id,
  dreamId: c.dreamId,
  season: c.season,
  number: c.number,
  stage: c.stage,
  title: c.title,
  revision: c.revision,
  source: c.source,
  createdAt,
  revisedAt: null,
  wovenProofId: c.wovenProofId,
  bridgeId: null,
  heardAt: null,
  savedForAt: null,
});

/* =========================================================================
 * Migration
 * ========================================================================= */

/**
 * 1.0 library actions whose wording 1.1 bans ('future self', 'future you'),
 * rewritten for the live bridge. Text the user wrote ('reshaped') is never touched.
 */
const V1_ACTION_REWRITES: Readonly<Record<string, string>> = {
  "Protect twenty focused minutes for the skill your future self relies on.": "Protect twenty focused minutes for the skill this work relies on.",
  "Move one small amount toward the future you described.": "Move one small amount toward the life you described.",
  "Send the message that could move this future one conversation closer.": "Send the message that could move this one conversation closer.",
};

function bridgeTextFromV1(a: V1Action): string {
  const text = cleanUserText(a.text, 180);
  if (!text) return "One small step toward it.";
  return a.state === "reshaped" ? text : V1_ACTION_REWRITES[text] ?? text;
}

const byNewest = (a: V1Action, b: V1Action) => b.createdAt.localeCompare(a.createdAt) || a.order - b.order;

export const migrateV1: MigrateV1 = (raw: V1RawStorage, ctx) => {
  const warnings: string[] = [];
  const { intents, stories, actions } = parseStories(raw.stories, warnings);
  const nowIso = ctx.now.toISOString();
  const dreams: Dream[] = [];
  const metas: ChapterMeta[] = [];
  const bridges: Bridge[] = [];
  const proofs: Proof[] = [];
  const texts: Record<string, Chapter> = {};
  let lapsedCount = 0;

  for (const intent of intents) {
    const own = actions.filter((a) => a.intentId === intent.id).sort(byNewest);
    const completed = own
      .filter((a) => a.state === "completed" && a.completedAt && sanitizeEvidence(a.evidence ?? ""))
      .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!) || b.order - a.order);
    const n = completed.length;
    const newest = own[0];
    // Case B: the newest action is a saved proof whose next chapter was never woven.
    const proofPending = !!newest && completed.includes(newest);
    const desire = cleanUserText(intent.desire, 200);
    const motifIds = matchMotifs(desire, intent.focus);

    // Where the surviving 1.0 story sits. Case B: the newest proof (star k of season s)
    // resolved it, so it was written after k − 1 proofs: stage k. Case A: it follows
    // every proof: stage min(k + 1, 7). No proof yet: Season 1, Chapter I.
    const lastSlot = n > 0 ? seasonSlot(n - 1) : { season: 1, starIndex: 0 };
    const storySeason = lastSlot.season;
    const storyStage = (proofPending ? lastSlot.starIndex : Math.min(lastSlot.starIndex + 1, STARS_PER_SEASON)) as StageId;

    const dreamProofs: Proof[] = completed.map((a, i) => {
      const slot = seasonSlot(i);
      return {
        id: a.id,
        dreamId: intent.id,
        bridgeId: null,
        kind: a.evidenceKind ?? "did",
        text: sanitizeEvidence(a.evidence ?? ""),
        photoUri: null,
        createdAt: a.completedAt!,
        dateKey: localDateKey(new Date(a.completedAt!)),
        wovenInChapterId: null,
        starIndex: slot.starIndex,
        season: slot.season,
        origin: "bridge",
        migratedFromV1: true,
      };
    });
    const seasonStars = dreamProofs.filter((p) => p.season === storySeason).length;
    const seasonDone = seasonStars >= STARS_PER_SEASON;

    const story = stories.find((s) => s.intentId === intent.id);
    let chapter = story ? chapterFromStory(story, intent.id, storySeason, storyStage) : null;
    if (!chapter) {
      warnings.push(`intent ${intent.id} had no readable story; wrote a fresh chapter`);
      // It stands in for the lost 1.0 story, so it is staged like one.
      chapter = {
        ...writeChapter({
          chapterId: story?.id ?? `${intent.id}-c1`, dreamId: intent.id, season: storySeason, number: storyStage, stage: storyStage,
          mode: "engine", revision: 1, name: ctx.name, focus: intent.focus, desire, feeling: intent.feeling, motifIds,
          recentIds: [], previousIds: [], woven: null, history: [], totalProofs: n, seed: hash32(intent.id), now: ctx.now,
          todayKey: localDateKey(ctx.now),
        }).chapter,
        source: "migrated-v1",
      };
    }
    let meta = metaOf(chapter, story?.createdAt ?? nowIso);
    texts[chapter.id] = chapter;

    // Bridges: the newest open action lives on (unless its season is already complete); older open ones lapse.
    const pending = own.filter((a) => a.state !== "completed");
    pending.forEach((a, i) => {
      const live = !proofPending && i === 0 && a === newest && !seasonDone;
      const text = bridgeTextFromV1(a);
      bridges.push({
        id: a.id,
        dreamId: intent.id,
        chapterId: live ? chapter!.id : a.storyId || chapter!.id,
        season: storySeason,
        tier: a.state === "reshaped" ? "own" : "15min",
        libraryId: null,
        text,
        ifThen: null,
        remindAt: null,
        status: live ? "open" : "lapsed",
        createdAt: a.createdAt,
        resolvedAt: live ? null : nowIso,
        proofId: null,
      });
      if (live) meta = { ...meta, bridgeId: a.id };
      else lapsedCount += 1;
    });

    let woven: Chapter | null = null;
    let usedIds: readonly string[] = [];
    if (proofPending) {
      const proof = dreamProofs[n - 1];
      const bridge: Bridge = {
        id: newest!.id,
        dreamId: intent.id,
        chapterId: chapter.id,
        season: storySeason,
        tier: "15min",
        libraryId: null,
        text: bridgeTextFromV1(newest!),
        ifThen: null,
        remindAt: null,
        status: proof.kind === "learned" ? "learned" : "crossed",
        createdAt: newest!.createdAt,
        resolvedAt: proof.createdAt,
        proofId: proof.id,
      };
      bridges.push(bridge);
      // They crossed this chapter's bridge, so they read it.
      meta = { ...meta, bridgeId: bridge.id, heardAt: meta.createdAt };
      dreamProofs[n - 1] = { ...proof, bridgeId: bridge.id };
      if (!seasonDone) {
        const next = writeChapter({
          chapterId: `${chapter.id}-w`,
          dreamId: intent.id,
          season: storySeason,
          number: storyStage + 1,
          stage: (storyStage + 1) as StageId,
          mode: "engine",
          revision: 1,
          name: ctx.name,
          focus: intent.focus,
          desire,
          feeling: intent.feeling,
          motifIds,
          recentIds: [],
          previousIds: [],
          woven: { id: proof.id, kind: proof.kind, text: proof.text, dateKey: proof.dateKey, origin: proof.origin },
          history: dreamProofs.slice(0, n - 1).map((p) => ({ id: p.id, kind: p.kind, text: p.text, dateKey: p.dateKey, origin: p.origin })),
          totalProofs: n,
          seed: hash32(`${intent.id}|${chapter.id}`),
          now: ctx.now,
          todayKey: localDateKey(ctx.now),
        });
        woven = next.chapter;
        usedIds = next.usedIds;
        dreamProofs[n - 1] = { ...dreamProofs[n - 1], wovenInChapterId: woven.id };
        texts[woven.id] = woven;
      }
    }

    metas.push(meta);
    if (woven) metas.push(metaOf(woven, nowIso));
    proofs.push(...dreamProofs);
    const firstOfSeason = dreamProofs.find((p) => p.season === storySeason && p.starIndex === 1);
    const prevSeventh = dreamProofs.find((p) => p.season === storySeason - 1 && p.starIndex === STARS_PER_SEASON);
    dreams.push({
      id: intent.id,
      focus: intent.focus,
      desire,
      feeling: intent.feeling.slice(0, 24),
      label: null,
      createdAt: intent.createdAt,
      status: "active",
      statusChangedAt: intent.createdAt,
      season: storySeason,
      seasonStartedAt: prevSeventh?.createdAt ?? firstOfSeason?.createdAt ?? intent.createdAt,
      constellations: [],
      usedIds: [...usedIds],
      motifIds,
    });
  }

  const index: ArcIndex = {
    schemaVersion: ARC_SCHEMA_VERSION,
    dreams,
    chapters: metas,
    bridges,
    proofs,
    activeDreamId: dreams[0]?.id ?? null,
    migratedFromV1At: raw.stories ? nowIso : null,
  };
  const snapshot: ArcSnapshot = { index, chapters: texts };
  for (const problem of checkArcInvariants(snapshot)) warnings.push(`invariant: ${problem}`);
  const report: MigrationReport = {
    dreams: dreams.length,
    chapters: metas.length,
    proofs: proofs.length,
    openBridges: bridges.filter((b) => b.status === "open").length,
    lapsedBridges: lapsedCount,
    warnings,
  };
  return { snapshot, report };
};
