// What may follow a Star Birth, as a small runtime with its seams injected
// (bun-tested; useProofAsks wires the real arbiter, review gate and timers).
//
// The review prompt is asked at most once ever, and claiming it is what uses
// that once up (lib/asks: maxEver 1 settles on the claim). So the claim waits
// with the prompt: after the delay, and only if the person is still on the
// Star Birth. Leaving first ('Carry it forward' within 1.5 s) claims nothing,
// and the next good moment (the Named Sky, the next Star Birth) asks instead.
// The Plus nudge is claimed at once: it is a card on this screen.
import type { AskKind } from "@/lib/asks";

export interface StarBirthAskDeps {
  /** lib/asks claimAsk: pick and consume this session's ask. */
  claim(candidates: readonly AskKind[]): Promise<AskKind | null>;
  /** lib/reviewPrompt reviewIsDue for the dream's proofs. */
  reviewIsDue(): Promise<boolean>;
  /** lib/reviewPrompt requestReviewNow: the system rating sheet. */
  requestReview(): Promise<unknown>;
  /** setTimeout; returns a cancel. */
  schedule(run: () => void, ms: number): () => void;
  /** Let the success card land first (REVIEW_PROMPT_DELAY_MS). */
  delayMs: number;
}

export type StarBirthAsk = "plus-nudge" | "review-pending" | null;

export interface StarBirthAsks {
  /** After the birth finished. `nudgeEligible`: the caller's business rule (not Plus, 2+ logged proofs). */
  afterStarBirth(nudgeEligible: boolean): Promise<StarBirthAsk>;
  /** The screen is going away: nothing pending is claimed or asked. */
  dispose(): void;
}

export function createStarBirthAsks(deps: StarBirthAskDeps): StarBirthAsks {
  let alive = true;
  let cancel: (() => void) | null = null;
  return {
    async afterStarBirth(nudgeEligible) {
      // Priority as in lib/asks: the nudge before the review.
      if (nudgeEligible && (await deps.claim(["plus-nudge"])) === "plus-nudge") return "plus-nudge";
      if (!alive || !(await deps.reviewIsDue()) || !alive) return null;
      cancel?.();
      cancel = deps.schedule(() => {
        cancel = null;
        if (!alive) return;
        void (async () => {
          // Once claimed, always ask: a claim that never reaches StoreKit would use up the once-ever ask.
          if ((await deps.claim(["review"])) === "review") await deps.requestReview();
        })();
      }, deps.delayMs);
      return "review-pending";
    },
    dispose() {
      alive = false;
      cancel?.();
      cancel = null;
    },
  };
}
