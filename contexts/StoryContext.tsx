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
}

interface StoryValue {
  ready: boolean;
  intents: Intent[];
  stories: StoredStory[];
  storyForIntent: (intentId: string) => StoredStory | undefined;
  createIntent: (input: {
    focus: FocusId;
    desire: string;
    feeling: string;
  }) => Promise<StoredStory>;
  regenerate: (intentId: string) => Promise<StoredStory | undefined>;
  removeIntent: (intentId: string) => Promise<void>;
}

const Ctx = createContext<StoryValue | null>(null);

const newId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

function parse(raw: string | null): Persisted {
  if (!raw) return { intents: [], stories: [] };
  try {
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      intents: Array.isArray(p.intents) ? (p.intents as Intent[]) : [],
      stories: Array.isArray(p.stories) ? (p.stories as StoredStory[]) : [],
    };
  } catch {
    return { intents: [], stories: [] };
  }
}

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUser();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Persisted>({ intents: [], stories: [] });

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
    (intent: Intent): { story: StoredStory; usedIds: string[] } => {
      const composed = composeStory({
        name: profile?.name ?? "",
        focus: intent.focus,
        desire: intent.desire,
        feeling: intent.feeling,
        seed: (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
        avoid: new Set(intent.usedIds),
      });
      return {
        story: {
          id: newId(),
          intentId: intent.id,
          title: composed.title,
          paragraphs: composed.paragraphs,
          createdAt: new Date().toISOString(),
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
      };
      const { story, usedIds } = render(intent);
      intent.usedIds = usedIds;
      await persist({
        intents: [intent, ...data.intents],
        // One living story per intent: the newest rendering replaces the old.
        stories: [story, ...data.stories.filter((s) => s.intentId !== intent.id)],
      });
      return story;
    },
    [data, persist, render]
  );

  const regenerate = useCallback(
    async (intentId: string) => {
      const intent = data.intents.find((i) => i.id === intentId);
      if (!intent) return undefined;
      const { story, usedIds } = render(intent);
      const nextIntent: Intent = {
        ...intent,
        usedIds: [...intent.usedIds, ...usedIds],
      };
      await persist({
        intents: data.intents.map((i) => (i.id === intentId ? nextIntent : i)),
        stories: [story, ...data.stories.filter((s) => s.intentId !== intentId)],
      });
      return story;
    },
    [data, persist, render]
  );

  const removeIntent = useCallback(
    async (intentId: string) => {
      await persist({
        intents: data.intents.filter((i) => i.id !== intentId),
        stories: data.stories.filter((s) => s.intentId !== intentId),
      });
    },
    [data, persist]
  );

  const storyForIntent = useCallback(
    (intentId: string) => data.stories.find((s) => s.intentId === intentId),
    [data.stories]
  );

  const value = useMemo<StoryValue>(
    () => ({
      ready,
      intents: data.intents,
      stories: data.stories,
      storyForIntent,
      createIntent,
      regenerate,
      removeIntent,
    }),
    [ready, data, storyForIntent, createIntent, regenerate, removeIntent]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStories(): StoryValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStories must be used inside StoryProvider");
  return v;
}
