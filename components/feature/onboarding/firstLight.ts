// First Light handoff: the onboarding draft travels to the Weave in memory.
//
// Why the Weave creates the first dream, not onboarding: the root Stack shows
// `onboarding` only while there is no profile (Stack.Protected). Chapter I
// bakes the user's name in at write time, so the profile must be committed
// (and seen by ArcProvider) BEFORE createDream runs. Committing the profile
// while onboarding is focused would yank the user to Today for a frame. So
// onboarding stages the draft here, replaces itself with /weave/first-light
// and saves the profile in the same tick; the Weave then calls createDream
// (with the seed proof) once the profile is live, and swaps its route param
// for the real chapter id. Nothing here touches storage: a reload mid-Weave
// simply falls back to the active dream's latest chapter, or Today.
import type { FocusId } from "@/lib/focus";

/** Route param the onboarding hands to /weave/[chapterId]. Never a real chapter id. */
export const FIRST_LIGHT_ID = "first-light";

export interface FirstLightDraft {
  readonly focus: FocusId;
  readonly desire: string;
  readonly feeling: string;
  /** 'One thing you've already done toward this'. Empty = no seed proof. */
  readonly seed: string;
}

interface Staged {
  draft: FirstLightDraft;
  /** Set once createDream has been called, so a remount never creates twice. */
  creating: boolean;
  /** The chapter createDream returned. */
  chapterId: string | null;
}

let staged: Staged | null = null;

export function stageFirstLight(draft: FirstLightDraft): void {
  staged = { draft, creating: false, chapterId: null };
}

/** The staged draft and its progress (mutable by the Weave only). */
export function stagedFirstLight(): Staged | null {
  return staged;
}

export function clearFirstLight(): void {
  staged = null;
}
