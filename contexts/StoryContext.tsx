// Intents and their stories. An intent is the thing being called in; a story
// is one rendering of life inside it. Regeneration accumulates used fragment
// ids per intent so no two renderings repeat until the pools are exhausted —
// the exact complaint that sinks the incumbent.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FocusId } from "@/lib/focus";
import { composeStory, StoryParagraph } from "@/lib/story/engine";
import {
  deriveFutureAction,
  evidenceBridge,
  sanitizeEvidence,
  type EvidenceKind,
  type FutureAction,
} from "@/lib/futureMemory";
import { useUser } from "./UserContext";

const STORE_KEY = "vela.stories.v1";

/** Free tier: one living intent. Enforced at the UI seam; Plus lifts it (P4). */
export const MAX_FREE_INTENTS = 1;

export interface Intent {
  id: string;
  focus: FocusId;
  desire: string;
  feeling: string;
  createdAt: string;
  /** Fragment/title ids consumed by past renderings — the repetition guard. */
  usedIds: string[];
  /** Increments when evidence is folded into a new future-memory chapter. */
  chapter: number;
}

export interface StoredStory {
  id: string;
  intentId: string;
  title: string;
  paragraphs: StoryParagraph[];
  createdAt: string;
}

interface Persisted {
  intents: Intent[];
  stories: StoredStory[];
  actions: FutureAction[];
}

interface StoryValue {
  ready: boolean;
  intents: Intent[];
  stories: StoredStory[];
  actions: FutureAction[];
  storyForIntent: (intentId: string) => StoredStory | undefined;
  actionForIntent: (intentId: string) => FutureAction | undefined;
  createIntent: (input: {
    focus: FocusId;
    desire: string;
    feeling: string;
  }) => Promise<StoredStory>;
  regenerate: (intentId: string) => Promise<StoredStory | undefined>;
  saveEvidence: (input: {
    intentId: string;
    kind: EvidenceKind;
    evidence: string;
  }) => Promise<FutureAction | undefined>;
  reshapeAction: (intentId: string, text: string) => Promise<void>;
  removeIntent: (intentId: string) => Promise<void>;
}

const Ctx = createContext<StoryValue | null>(null);

const newId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

function parse(raw: string | null): Persisted {
  if (!raw) return { intents: [], stories: [], actions: [] };
  try {
    const p = JSON.parse(raw) as Partial<Persisted>;
    const intents = Array.isArray(p.intents)
      ? (p.intents as Intent[]).map((intent) => ({
          ...intent,
          chapter:
            typeof intent.chapter === "number" && intent.chapter > 0
              ? intent.chapter
              : 1,
        }))
      : [];
    const stories = Array.isArray(p.stories) ? (p.stories as StoredStory[]) : [];
    const actions = Array.isArray(p.actions) ? [...(p.actions as FutureAction[])] : [];
    // Existing users keep their story data and receive the new action bridge
    // automatically. Migration is additive and never resets an intent.
    for (const intent of intents) {
      if (actions.some((action) => action.intentId === intent.id)) continue;
      const story = stories.find((item) => item.intentId === intent.id);
      if (!story) continue;
      actions.push({
        id: newId(),
        intentId: intent.id,
        storyId: story.id,
        text: deriveFutureAction({
          focus: intent.focus,
          desire: intent.desire,
          chapter: intent.chapter,
        }),
        state: "open",
        createdAt: story.createdAt,
      });
    }
    return {
      intents,
      stories,
      actions,
    };
  } catch {
    return { intents: [], stories: [], actions: [] };
  }
}

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUser();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Persisted>({ intents: [], stories: [], actions: [] });

  useEffect(() => {
    let stale = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (!stale) setData(parse(raw));
      } catch {
        // first run
      } finally {
        if (!stale) setReady(true);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const persist = useCallback(async (next: Persisted) => {
    setData(next);
    try {
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // session state still stands
    }
  }, []);

  const render = useCallback(
    (
      intent: Intent,
      chapter: number,
      latestEvidence?: string
    ): { story: StoredStory; action: FutureAction; usedIds: string[] } => {
      const composed = composeStory({
        name: profile?.name ?? "",
        focus: intent.focus,
        desire: intent.desire,
        feeling: intent.feeling,
        seed: (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
        avoid: new Set(intent.usedIds),
      });
      const storyId = newId();
      const bridge = evidenceBridge(latestEvidence);
      const paragraphs = bridge
        ? [
            ...composed.paragraphs,
            { fragmentId: `proof-${chapter}`, text: bridge },
          ]
        : composed.paragraphs;
      const createdAt = new Date().toISOString();
      return {
        story: {
          id: storyId,
          intentId: intent.id,
          title: composed.title,
          paragraphs,
          createdAt,
        },
        action: {
          id: newId(),
          intentId: intent.id,
          storyId,
          text: deriveFutureAction({
            focus: intent.focus,
            desire: intent.desire,
            chapter,
          }),
          state: "open",
          createdAt,
        },
        usedIds: composed.usedIds,
      };
    },
    [profile?.name]
  );

  const createIntent = useCallback(
    async (input: { focus: FocusId; desire: string; feeling: string }) => {
      const intent: Intent = {
        id: newId(),
        focus: input.focus,
        desire: input.desire.trim(),
        feeling: input.feeling,
        createdAt: new Date().toISOString(),
        usedIds: [],
        chapter: 1,
      };
      const { story, action, usedIds } = render(intent, 1);
      intent.usedIds = usedIds;
      await persist({
        intents: [intent, ...data.intents],
        // One living story per intent: the newest rendering replaces the old.
        stories: [story, ...data.stories.filter((s) => s.intentId !== intent.id)],
        actions: [action, ...data.actions],
      });
      return story;
    },
    [data, persist, render]
  );

  const regenerate = useCallback(
    async (intentId: string) => {
      const intent = data.intents.find((i) => i.id === intentId);
      if (!intent) return undefined;
      const chapter = (intent.chapter ?? 1) + 1;
      const latestEvidence = data.actions.find(
        (action) => action.intentId === intentId && action.evidence
      )?.evidence;
      const { story, action, usedIds } = render(intent, chapter, latestEvidence);
      const nextIntent: Intent = {
        ...intent,
        usedIds: [...intent.usedIds, ...usedIds],
        chapter,
      };
      await persist({
        intents: data.intents.map((i) => (i.id === intentId ? nextIntent : i)),
        stories: [story, ...data.stories.filter((s) => s.intentId !== intentId)],
        actions: [action, ...data.actions],
      });
      return story;
    },
    [data, persist, render]
  );

  const saveEvidence = useCallback(
    async (input: { intentId: string; kind: EvidenceKind; evidence: string }) => {
      const current = data.actions.find(
        (action) => action.intentId === input.intentId && action.state !== "completed"
      );
      const evidence = sanitizeEvidence(input.evidence);
      if (!current || !evidence) return undefined;
      const completed: FutureAction = {
        ...current,
        state: "completed",
        evidence,
        evidenceKind: input.kind,
        completedAt: new Date().toISOString(),
      };
      await persist({
        ...data,
        actions: data.actions.map((action) =>
          action.id === current.id ? completed : action
        ),
      });
      return completed;
    },
    [data, persist]
  );

  const reshapeAction = useCallback(
    async (intentId: string, text: string) => {
      const current = data.actions.find(
        (action) => action.intentId === intentId && action.state !== "completed"
      );
      const clean = text.trim().replace(/\s+/gu, " ").slice(0, 180);
      if (!current || !clean) return;
      await persist({
        ...data,
        actions: data.actions.map((action) =>
          action.id === current.id
            ? { ...action, text: clean, state: "reshaped" }
            : action
        ),
      });
    },
    [data, persist]
  );

  const removeIntent = useCallback(
    async (intentId: string) => {
      await persist({
        intents: data.intents.filter((i) => i.id !== intentId),
        stories: data.stories.filter((s) => s.intentId !== intentId),
        actions: data.actions.filter((a) => a.intentId !== intentId),
      });
    },
    [data, persist]
  );

  const storyForIntent = useCallback(
    (intentId: string) => data.stories.find((s) => s.intentId === intentId),
    [data.stories]
  );

  const actionForIntent = useCallback(
    (intentId: string) =>
      data.actions.find(
        (action) => action.intentId === intentId && action.state !== "completed"
      ) ?? data.actions.find((action) => action.intentId === intentId),
    [data.actions]
  );

  const value = useMemo<StoryValue>(
    () => ({
      ready,
      intents: data.intents,
      stories: data.stories,
      actions: data.actions,
      storyForIntent,
      actionForIntent,
      createIntent,
      regenerate,
      saveEvidence,
      reshapeAction,
      removeIntent,
    }),
    [
      ready,
      data,
      storyForIntent,
      actionForIntent,
      createIntent,
      regenerate,
      saveEvidence,
      reshapeAction,
      removeIntent,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStories(): StoryValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStories must be used inside StoryProvider");
  return v;
}
