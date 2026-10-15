// 1.0 vision board API, now an adapter over Scenes (contexts/ScenesContext).
// BoardProvider IS the Scenes provider, so the root tree keeps its shape; the
// 1.0 board tab keeps working through useBoard() until S6 moves it to /scenes.
import { useMemo } from "react";
import { ScenesProvider, useScenes, type SceneCard } from "./ScenesContext";

export { ScenesProvider as BoardProvider };

/** Every 1.0 card field keeps its name; v2 adds dreamId (and proofId on photos). */
export type BoardCard = SceneCard;

interface BoardValue {
  ready: boolean;
  cards: readonly BoardCard[];
  addPhoto: (pickedUri: string, caption: string) => Promise<void>;
  addGoal: (text: string) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
}

export function useBoard(): BoardValue {
  const scenes = useScenes();
  return useMemo(
    () => ({
      ready: scenes.ready,
      cards: scenes.cards,
      addPhoto: async (uri, caption) => void (await scenes.addPhoto(uri, caption)),
      addGoal: async (text) => void (await scenes.addGoal(text)),
      removeCard: scenes.removeCard,
    }),
    [scenes]
  );
}
