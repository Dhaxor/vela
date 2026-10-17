// What the rituals know about tonight, gathered once from the stores: the
// dream in focus, the last chapter heard, the open bridge, the newest proof,
// and from them tonight's Script prompts, 3·6·9 suggestions and Your line.
// Selection rules live in lib/rituals.ts (pure, tested); this hook only
// reads useArc()/useUser() and the clock.
import { useMemo } from "react";
import type { ChapterMeta, Dream, Proof } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { useUser } from "@/contexts/UserContext";
import { now } from "@/lib/clock";
import type { FocusId } from "@/lib/focus";
import { localDateKey } from "@/lib/progress";
import { identityLineFor, scriptPrompts, suggestions369, type ScriptContext, type ScriptPrompt, type Suggestion369, type YourLine } from "@/lib/rituals";

export interface RitualToday {
  readonly dateKey: string;
  readonly name: string;
  readonly dream: Dream | null;
  readonly focus: FocusId | null;
  /** The newest chapter of the focused dream that has been heard. */
  readonly heardChapter: ChapterMeta | null;
  /** The dream's newest chapter, heard or not. */
  readonly latestChapter: ChapterMeta | null;
  /** What the Script prompts were filled from (for a prompt asked for by id). */
  readonly scriptContext: ScriptContext;
  readonly proofs: readonly Proof[];
  readonly prompts: readonly ScriptPrompt[];
  readonly suggestions: readonly Suggestion369[];
  /** Today's identity line, or null before the first proof. */
  readonly line: YourLine | null;
}

export function useRitualToday(): RitualToday {
  const arc = useArc();
  const { profile } = useUser();
  const dateKey = localDateKey(now());
  const dream = arc.activeDream && arc.activeDream.status !== "released" ? arc.activeDream : null;
  const fallbackFocus = profile?.focusAreas[0] ?? null;
  const name = profile?.name ?? "";

  return useMemo(() => {
    const focus = dream?.focus ?? fallbackFocus;
    const chapters = dream ? arc.chapters(dream.id) : [];
    const heardChapter = [...chapters].reverse().find((c) => c.heardAt) ?? null;
    const bridge = dream ? arc.openBridge(dream.id) ?? null : null;
    const proofs = dream ? arc.proofs(dream.id) : [];
    const proof = proofs.at(-1) ?? null;
    const scriptContext: ScriptContext = { dateKey, name, dream, fallbackFocus, chapter: heardChapter, bridge, proof };
    return {
      dateKey,
      name,
      dream,
      focus,
      heardChapter,
      latestChapter: chapters.at(-1) ?? null,
      scriptContext,
      proofs,
      prompts: scriptPrompts(scriptContext),
      suggestions: suggestions369(dream, dateKey, fallbackFocus),
      line: focus ? identityLineFor(proofs, focus, dateKey) : null,
    };
  }, [arc, dream, dateKey, name, fallbackFocus]);
}
