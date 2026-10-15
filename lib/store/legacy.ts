// 1.0 VIEW OF THE ARC. Pure mappings behind the useStories() adapter
// (CONTRACTS §15), so the 1.0 screens keep running on v2 data until Phase 2
// replaces them. Deleted with the adapter once no screen imports useStories.
//
// The 1.0 Today screen knows one loop: story → open action → evidence →
// 'Weave chapter N+1'. In v2 the proof weaves the next chapter at once, so a
// chapter that was woven from a proof and not yet opened is 'pending': the 1.0
// view keeps showing the previous chapter number and the folded proof until
// the user taps Weave, which opens the already-woven chapter.

import {
  daypartAt,
  paragraphsForDaypart,
  type ArcIndex,
  type Bridge,
  type Chapter,
  type ChapterMeta,
  type Dream,
  type Proof,
} from "@/contexts/arc.types";
import type { FutureAction } from "@/lib/futureMemory";
import type { FocusId } from "@/lib/focus";
import { latestChapterOf, openBridgeOf } from "./arcSelectors";

export interface Intent {
  id: string;
  focus: FocusId;
  desire: string;
  feeling: string;
  createdAt: string;
  usedIds: string[];
  /** The chapter the 1.0 UI is 'on' (a pending woven chapter does not count yet). */
  chapter: number;
}

export interface StoryParagraph {
  fragmentId: string;
  text: string;
}

export interface StoredStory {
  id: string;
  intentId: string;
  title: string;
  paragraphs: StoryParagraph[];
  createdAt: string;
}

/** Woven from a loop proof, no bridge chosen, never opened: waiting behind the 1.0 'Weave' button. */
export function isPendingChapter(index: ArcIndex, meta: ChapterMeta): boolean {
  if (meta.bridgeId || meta.heardAt || !meta.wovenProofId) return false;
  const proof = index.proofs.find((p) => p.id === meta.wovenProofId);
  return !!proof && proof.origin !== "onboarding";
}

export function intentOf(index: ArcIndex, dream: Dream): Intent {
  const latest = latestChapterOf(index, dream.id);
  const number = latest ? latest.number - (isPendingChapter(index, latest) ? 1 : 0) : 1;
  return {
    id: dream.id,
    focus: dream.focus,
    desire: dream.desire,
    feeling: dream.feeling,
    createdAt: dream.createdAt,
    usedIds: [...dream.usedIds],
    chapter: Math.max(1, number),
  };
}

export function storyOf(meta: ChapterMeta, chapter: Chapter, now: Date): StoredStory {
  return {
    id: chapter.id,
    intentId: chapter.dreamId,
    title: chapter.title,
    paragraphs: paragraphsForDaypart(chapter, daypartAt(now)).map((p) => ({ fragmentId: p.fragmentId, text: p.text })),
    createdAt: meta.revisedAt ?? meta.createdAt,
  };
}

export function actionOfBridge(bridge: Bridge, proof: Proof | undefined): FutureAction {
  const resolved = bridge.status === "crossed" || bridge.status === "learned";
  return {
    id: bridge.id,
    intentId: bridge.dreamId,
    storyId: bridge.chapterId,
    text: bridge.text,
    state: resolved ? "completed" : bridge.tier === "own" ? "reshaped" : "open",
    createdAt: bridge.createdAt,
    ...(resolved && proof ? { completedAt: proof.createdAt, evidence: proof.text, evidenceKind: proof.kind } : {}),
  };
}

/** A proof with no bridge (onboarding seed, 1.0 history) as a completed 1.0 action. */
export function actionOfProof(proof: Proof): FutureAction {
  return {
    id: proof.id,
    intentId: proof.dreamId,
    storyId: proof.wovenInChapterId ?? "",
    text: "",
    state: "completed",
    createdAt: proof.createdAt,
    completedAt: proof.createdAt,
    evidence: proof.text,
    evidenceKind: proof.kind,
  };
}

/** Every visible bridge and proof as 1.0 actions, newest first (lapsed bridges are hidden). */
export function actionsOf(index: ArcIndex, dreamIds: ReadonlySet<string>): FutureAction[] {
  const proofById = new Map(index.proofs.map((p) => [p.id, p]));
  const fromBridges = index.bridges
    .filter((b) => b.status !== "lapsed" && dreamIds.has(b.dreamId))
    .map((b) => actionOfBridge(b, b.proofId ? proofById.get(b.proofId) : undefined));
  const fromProofs = index.proofs.filter((p) => !p.bridgeId && dreamIds.has(p.dreamId)).map(actionOfProof);
  return [...fromBridges, ...fromProofs].sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
}

/** 1.0 actionForIntent: the open bridge, else the most recently resolved one. */
export function actionFor(index: ArcIndex, dreamId: string): FutureAction | undefined {
  const open = openBridgeOf(index, dreamId);
  if (open) return actionOfBridge(open, undefined);
  const resolved = index.bridges
    .filter((b) => b.dreamId === dreamId && (b.status === "crossed" || b.status === "learned"))
    .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))[0];
  return resolved ? actionOfBridge(resolved, index.proofs.find((p) => p.id === resolved.proofId)) : undefined;
}
