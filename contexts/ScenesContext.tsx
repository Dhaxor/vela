// Scenes (the former vision board, CONTRACTS §3): photos and goals with
// captions and an optional dream link. Proof photos are added automatically
// from the arc, once each. Stored under 'vela.scenes.v2'; migrated once from
// 'vela.board.v1' (never written). Mounted inside ArcProvider.
// - A failed read is retried, never taken as 'absent' (which would re-migrate
//   the 1.0 board over 1.1 Scenes).
// - Photo URIs are rebased into this install's document directory on load and
//   on import (lib/photos): iOS moves the app container on every update, so a
//   1.0 board photo's stored URI points at a container that is gone.
// - Nothing evicts a card (lib/store/scenes). MAX_SCENES only limits adding by hand.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArcCtx } from "./arcCtx";
import { usePlus } from "./PlusContext";
import { createStoreQueue, loadUntilRead, parseJson, readKey } from "./persist";
import { STORAGE_KEYS, V1_KEYS } from "@/lib/storageKeys";
import { now } from "@/lib/clock";
import { persistPhoto, photoUriResolver, rebaseScenePhotos } from "@/lib/photos";
import { newId } from "@/lib/store/ids";
import {
  emptyScenes,
  GOAL_TEXT_MAX,
  MAX_SCENES,
  parseScenes,
  SCENE_CAPTION_MAX,
  scenesFromV1,
  syncProofPhotos,
  userSceneCount,
  type SceneCard,
  type ScenesData,
} from "@/lib/store/scenes";

export type { SceneCard, ScenesData };

export interface SceneOptions {
  readonly dreamId?: string | null;
}

export interface ScenesValue {
  ready: boolean;
  /** A launch read failed and is being retried (still not ready, nothing written). */
  storageError: boolean;
  /** Newest first. */
  cards: readonly SceneCard[];
  /** False once a free user has added their free Scenes by hand (proof photos never count). */
  canAddScene: boolean;
  addPhoto: (pickedUri: string, caption: string, opts?: SceneOptions) => Promise<SceneCard | null>;
  addGoal: (text: string, opts?: SceneOptions) => Promise<SceneCard | null>;
  setCaption: (id: string, caption: string) => Promise<void>;
  /** Link a card to a dream, or unlink with null. */
  attach: (id: string, dreamId: string | null) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  /** Backup. */
  exportScenes: () => ScenesData;
  replaceScenes: (data: ScenesData) => Promise<void>;
}

const Ctx = createContext<ScenesValue | null>(null);

const clean = (s: string, max: number) => s.replace(/\s+/gu, " ").trim().slice(0, max);

export function ScenesProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [data, setData] = useState<ScenesData>(emptyScenes);
  const ref = useRef<ScenesData>(data);
  const queue = useMemo(createStoreQueue, []);
  const arc = useContext(ArcCtx);
  const { sceneLimit } = usePlus();

  const commit = useCallback(
    (next: ScenesData) => {
      if (next === ref.current) return;
      ref.current = next;
      setData(next);
      queue.enqueue({ head: [STORAGE_KEYS.scenes, next] });
    },
    [queue]
  );

  useEffect(() => {
    const job = loadUntilRead(
      async () => {
        const raw = await readKey(STORAGE_KEYS.scenes);
        let loaded: ScenesData;
        let write = false;
        if (raw) loaded = parseScenes(parseJson(raw));
        else {
          const v1 = await readKey(V1_KEYS.board);
          loaded = v1 ? scenesFromV1(parseJson(v1)) : emptyScenes();
          write = !!v1;
        }
        // 1.0 board photos (and 1.1 ones after an update) point at an older container: rebase them.
        const rebased = rebaseScenePhotos(loaded, photoUriResolver());
        return { loaded: rebased, write: write || rebased !== loaded };
      },
      {
        onLoaded: ({ loaded, write }) => {
          if (write) queue.enqueue({ head: [STORAGE_KEYS.scenes, loaded] });
          ref.current = loaded;
          setData(loaded);
          setStorageError(false);
          setReady(true);
        },
        onFailure: () => setStorageError(true),
      }
    );
    return () => job.cancel();
  }, [queue]);

  // Proof photos join Scenes on their own (a no-op unless a new proof photo appeared).
  const proofs = useMemo(() => (arc?.ready ? arc.dreams.flatMap((d) => arc.proofs(d.id)) : null), [arc]);
  useEffect(() => {
    if (ready && proofs) commit(syncProofPhotos(ref.current, proofs));
  }, [ready, proofs, commit]);

  const add = useCallback(
    (card: SceneCard): SceneCard | null => {
      // Only hand-added cards count (proof photos never do), and the cap refuses: it never evicts.
      if (userSceneCount(ref.current) >= Math.min(sceneLimit, MAX_SCENES)) return null;
      commit({ ...ref.current, cards: [card, ...ref.current.cards] });
      return card;
    },
    [commit, sceneLimit]
  );

  const update = useCallback(
    (id: string, fn: (c: SceneCard) => SceneCard) =>
      commit({ ...ref.current, cards: ref.current.cards.map((c) => (c.id === id ? fn(c) : c)) }),
    [commit]
  );

  const value = useMemo<ScenesValue>(
    () => ({
      ready,
      storageError,
      cards: data.cards,
      canAddScene: userSceneCount(data) < Math.min(sceneLimit, MAX_SCENES),
      addPhoto: async (pickedUri, caption, opts) => {
        const id = newId();
        const uri = await persistPhoto(pickedUri, `scene-${id}`);
        return add({ id, kind: "photo", uri, caption: clean(caption, SCENE_CAPTION_MAX), createdAt: now().toISOString(), dreamId: opts?.dreamId ?? null, proofId: null });
      },
      addGoal: async (text, opts) => {
        const t = clean(text, GOAL_TEXT_MAX);
        return t ? add({ id: newId(), kind: "goal", text: t, createdAt: now().toISOString(), dreamId: opts?.dreamId ?? null }) : null;
      },
      setCaption: async (id, caption) =>
        update(id, (c) => (c.kind === "photo" ? { ...c, caption: clean(caption, SCENE_CAPTION_MAX) } : { ...c, text: clean(caption, GOAL_TEXT_MAX) || c.text })),
      attach: async (id, dreamId) => update(id, (c) => ({ ...c, dreamId })),
      removeCard: async (id) => commit({ ...ref.current, cards: ref.current.cards.filter((c) => c.id !== id) }),
      exportScenes: () => ref.current,
      replaceScenes: async (next) => {
        // A backup carries the photo URIs of the install it came from: rebase the ones whose file is here.
        commit(rebaseScenePhotos(parseScenes(next), photoUriResolver()));
        await queue.flush();
      },
    }),
    [ready, storageError, data, sceneLimit, add, update, commit, queue]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScenes(): ScenesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScenes must be used inside ScenesProvider (BoardProvider)");
  return v;
}
