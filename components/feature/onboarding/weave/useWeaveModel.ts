// What the Weave shows for a chapter, derived from the arc only (its single
// input is the chapter id, so S4's evidence flow can reuse it as is):
// - words: the user's own words that rise and scatter: the woven proof for a
//   chapter written from a bridge proof, the desire for a dream's first chapter
// - the dream's figure for that season, with the stars lit so far
// - the numeral, the chapter's title and stage, and an honest closing caption
import { useMemo } from "react";
import { useArc } from "@/contexts/ArcContext";
import type { ArcValue, ProofKind } from "@/contexts/arc.types";
import type { FocusId } from "@/lib/focus";
import { figureFor, type Figure } from "@/lib/sky";
import { stageMeta } from "@/lib/story/seasons";

export interface WeaveModel {
  readonly chapterId: string;
  readonly dreamId: string;
  readonly focus: FocusId;
  readonly words: string;
  readonly figure: Figure;
  readonly lit: number;
  readonly kinds: readonly ProofKind[];
  readonly numeral: number;
  readonly title: string;
  readonly stageName: string;
  readonly caption: string;
  /** The user's very first chapter: the Weave plays through, no skipping. */
  readonly firstTime: boolean;
}

export function useWeaveModel(chapterId: string | null): WeaveModel | null {
  const arc = useArc();
  // The arc value changes identity only when its state does, so the model (and the
  // figure, which is rebuilt per call for later seasons) stays stable across renders.
  return useMemo(() => buildModel(arc, chapterId), [arc, chapterId]);
}

function buildModel(arc: ArcValue, chapterId: string | null): WeaveModel | null {
  if (!chapterId) return null;
  const meta = arc.chapterMeta(chapterId);
  if (!meta) return null;
  const dream = arc.dream(meta.dreamId);
  if (!dream) return null;

  const proofs = [...arc.proofs(dream.id, meta.season)].sort((a, b) => a.starIndex - b.starIndex);
  const woven = meta.wovenProofId ? arc.proof(meta.wovenProofId) : undefined;
  const fromProof = !!woven && woven.origin !== "onboarding";

  let caption: string;
  if (fromProof && meta.number === 1 && meta.season > 1) caption = `Season ${meta.season} begins with what you did.`;
  else if (fromProof) caption = woven!.kind === "learned" ? "It begins with what you learned." : "It begins with what you did.";
  else if (woven) caption = "Written from your words. It begins with what you’ve already done.";
  else caption = "Written from your words.";

  const totalChapters = arc.dreams.reduce((n, d) => n + arc.chapters(d.id).length, 0);

  return {
    chapterId: meta.id,
    dreamId: dream.id,
    focus: dream.focus,
    words: fromProof ? woven!.text : dream.desire,
    figure: figureFor(dream.id, meta.season),
    lit: Math.min(7, proofs.length),
    kinds: proofs.map((p) => p.kind),
    numeral: meta.number,
    title: meta.title,
    stageName: stageMeta(meta.stage).name,
    caption,
    firstTime: totalChapters <= 1,
  };
}
