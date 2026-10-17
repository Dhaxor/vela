// The asks that may follow a Star Birth, through the one-per-session arbiter
// (lib/asks, CONTRACTS §12). Never during the ceremony, never stacked:
// - after a proof's Star Birth: the soft Plus nudge (from the 2nd proof, not
//   for Plus members) or the review prompt (2nd proof, first proof ≥ 4h old,
//   once ever), whichever the arbiter allows;
// - after the Named Sky: the review prompt only.
import { useCallback, useEffect, useRef, useState } from "react";
import type { DreamId } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { usePlus } from "@/contexts/PlusContext";
import { claimAsk, type AskKind } from "@/lib/asks";
import { REVIEW_PROMPT_DELAY_MS, requestReviewIfDue, requestReviewNow, reviewIsDue } from "@/lib/reviewPrompt";

/** The Plus nudge is offered from the 2nd logged proof on, the seed not counted (the arbiter caps and spaces it). */
export const PLUS_NUDGE_MIN_PROOFS = 2;

export function useProofAsks() {
  const arc = useArc();
  const plus = usePlus();
  const latest = useRef({ arc, isPlus: plus.isPlus });
  latest.current = { arc, isPlus: plus.isPlus };
  const [nudge, setNudge] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const asked = useRef(false);

  // Leaving before the delay elapses cancels the system sheet; a later moment retries.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  /** Call once the Star Birth has finished. */
  const afterStarBirth = useCallback(async (dreamId: DreamId) => {
    if (asked.current) return;
    asked.current = true;
    const { arc: a, isPlus } = latest.current;
    const proofs = a.proofs(dreamId);
    const candidates: AskKind[] = [];
    // Proofs the person logged (the onboarding seed is a star, but not a step taken after First Light),
    // so a brand-new user's first real Star Birth stays free of any Plus mention.
    const logged = a.dreams.reduce((n, d) => n + a.proofs(d.id).filter((p) => p.origin !== "onboarding").length, 0);
    if (!isPlus && logged >= PLUS_NUDGE_MIN_PROOFS) candidates.push("plus-nudge");
    if (await reviewIsDue(proofs)) candidates.push("review");
    if (candidates.length === 0) return;
    const ask = await claimAsk(candidates);
    if (ask === "plus-nudge") setNudge(true);
    if (ask === "review") timer.current = setTimeout(() => void requestReviewNow(), REVIEW_PROMPT_DELAY_MS);
  }, []);

  /** Call once the constellation is named. */
  const afterNamedSky = useCallback((dreamId: DreamId) => {
    const proofs = latest.current.arc.proofs(dreamId);
    timer.current = setTimeout(() => void requestReviewIfDue(proofs), REVIEW_PROMPT_DELAY_MS);
  }, []);

  return { nudge, dismissNudge: () => setNudge(false), afterStarBirth, afterNamedSky };
}
