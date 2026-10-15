// 1.0 STORIES API, now a thin adapter over ArcContext (CONTRACTS §15). The
// 1.0 screens (Today, reader, evidence, intake, Stories tab) keep running on
// v2 data until Phase 2 replaces them; then this file is deleted.
//
// The rule that matters: the chapter number never moves without a proof.
// regenerate() opens a chapter already woven from a proof, starts the next
// season when the current one is complete, and otherwise REWRITES the latest
// chapter (same number). 1.0 tied every chapter to an action, so the adapter
// picks the suggested bridge where 1.0 derived one.
import React, { useCallback, useContext, useMemo } from "react";
import { isArcError, type ChapterId } from "./arc.types";
import { ArcStateCtx } from "./arcCtx";
import { useArc } from "./ArcContext";
import { usePlus } from "./PlusContext";
import type { FocusId } from "@/lib/focus";
import type { EvidenceKind, FutureAction } from "@/lib/futureMemory";
import { now } from "@/lib/clock";
import { latestChapterOf, offersFor, openBridgeOf, seasonProgressOf, chapterMetaOf } from "@/lib/store/arcSelectors";
import { actionFor, actionOfBridge, actionsOf, intentOf, isPendingChapter, storyOf, type Intent, type StoredStory } from "@/lib/store/legacy";

export type { Intent, StoredStory };

interface StoryValue {
  ready: boolean;
  intents: Intent[];
  stories: StoredStory[];
  actions: FutureAction[];
  storyForIntent: (intentId: string) => StoredStory | undefined;
  actionForIntent: (intentId: string) => FutureAction | undefined;
  createIntent: (input: { focus: FocusId; desire: string; feeling: string }) => Promise<StoredStory>;
  regenerate: (intentId: string) => Promise<StoredStory | undefined>;
  saveEvidence: (input: { intentId: string; kind: EvidenceKind; evidence: string }) => Promise<FutureAction | undefined>;
  reshapeAction: (intentId: string, text: string) => Promise<void>;
  removeIntent: (intentId: string) => Promise<void>;
}

/** Pass-through: the data lives in ArcProvider. Kept so the root tree keeps its shape. */
export function StoryProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useStories(): StoryValue {
  const arc = useArc();
  const live = useContext(ArcStateCtx);
  const { isPlus } = usePlus();
  if (!live) throw new Error("useStories must be used inside ArcProvider");

  const index = live.current.index;
  const texts = live.current.texts;

  /** Pick the suggested bridge for a chapter, as 1.0 derived one automatically. */
  const chooseSuggested = useCallback(
    async (chapterId: ChapterId) => {
      const offers = offersFor(live.current.index, chapterId, isPlus);
      const pick = offers.find((o) => o.suggested) ?? offers[0];
      if (pick) await arc.chooseBridge({ chapterId, choice: { tier: pick.tier, libraryId: pick.libraryId } });
    },
    [arc, live, isPlus]
  );

  const storyById = useCallback(
    (chapterId: ChapterId): StoredStory | undefined => {
      const meta = chapterMetaOf(live.current.index, chapterId);
      const text = live.current.texts[chapterId];
      return meta && text ? storyOf(meta, text, now()) : undefined;
    },
    [live]
  );

  const regenerate = useCallback(
    async (intentId: string) => {
      const latest = latestChapterOf(live.current.index, intentId);
      if (!latest) return undefined;
      try {
        if (isPendingChapter(live.current.index, latest)) {
          // The 1.0 'Weave chapter N+1' button: the chapter was woven when the proof was saved.
          await arc.markHeard(latest.id);
          if (!seasonProgressOf(live.current.index, intentId)?.complete) await chooseSuggested(latest.id);
          return storyById(latest.id);
        }
        if (seasonProgressOf(live.current.index, intentId)?.complete) {
          const first = await arc.beginNextSeason(intentId);
          await chooseSuggested(first.id);
          return storyById(first.id);
        }
        return storyById((await arc.rerenderChapter(latest.id)).id);
      } catch (e) {
        if (isArcError(e)) return undefined;
        throw e;
      }
    },
    [arc, live, chooseSuggested, storyById]
  );

  return useMemo<StoryValue>(() => {
    const dreams = index.dreams.filter((d) => d.status !== "released");
    const ids = new Set(dreams.map((d) => d.id));
    const stories = dreams.flatMap((d) => {
      const meta = latestChapterOf(index, d.id);
      const text = meta ? texts[meta.id] : undefined;
      return meta && text ? [storyOf(meta, text, now())] : [];
    });
    return {
      ready: arc.ready,
      intents: dreams.map((d) => intentOf(index, d)),
      stories,
      actions: actionsOf(index, ids),
      storyForIntent: (intentId) => stories.find((s) => s.intentId === intentId),
      actionForIntent: (intentId) => actionFor(index, intentId),
      createIntent: async (input) => {
        const chapter = await arc.createDream(input);
        await chooseSuggested(chapter.id);
        return storyById(chapter.id)!;
      },
      regenerate,
      saveEvidence: async ({ intentId, kind, evidence }) => {
        const open = openBridgeOf(live.current.index, intentId);
        if (!open) return undefined;
        try {
          const { proof } = await arc.saveProofAndWeave({ dreamId: intentId, kind, text: evidence });
          return actionOfBridge({ ...open, status: kind === "learned" ? "learned" : "crossed", proofId: proof.id }, proof);
        } catch (e) {
          if (isArcError(e)) return undefined;
          throw e;
        }
      },
      reshapeAction: async (intentId, text) => {
        const open = openBridgeOf(live.current.index, intentId);
        if (open) await arc.chooseBridge({ chapterId: open.chapterId, choice: { tier: "own", text } }).catch(() => undefined);
      },
      removeIntent: (intentId) => arc.releaseDream(intentId),
    };
  }, [arc, index, texts, live, chooseSuggested, storyById, regenerate]);
}
