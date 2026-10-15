// ArcContext — STUB. Contract: contexts/arc.types.ts (ArcValue).
//
// OWNER: A2. Replace this file with the real reducer + serialized persist
// queue + v1 migration. Keep the two exports (ArcProvider, useArc) and their
// signatures. Until then the stub is inert and safe: ready=true, no dreams,
// every action rejects with ArcError('not-implemented'), so A1 can mount it
// in the root and screens can compile against useArc() today. The 1.0 screens
// keep running on StoryContext until A2 turns useStories() into an adapter.

import React, { createContext, useContext } from "react";
import {
  ARC_SCHEMA_VERSION,
  ArcError,
  type ArcValue,
} from "./arc.types";

/** False once A2 lands the real provider. */
export const ARC_IS_STUB: boolean = true;

const notImplemented = <T,>(): Promise<T> =>
  Promise.reject(new ArcError("not-implemented", "ArcContext is a contract stub (A2)."));

const STUB_VALUE: ArcValue = {
  ready: true,
  schemaVersion: ARC_SCHEMA_VERSION,
  dreams: [],
  activeDreamId: null,
  activeDream: null,
  weavingDreamIds: [],
  planLockedDreamIds: [],
  canCreateDream: true,
  totalStars: 0,
  dream: () => undefined,
  chapters: () => [],
  chapterMeta: () => undefined,
  latestChapter: () => undefined,
  bridges: () => [],
  bridge: () => undefined,
  openBridge: () => undefined,
  proofs: () => [],
  proof: () => undefined,
  seasonProgress: () => undefined,
  bridgeOffers: () => [],
  loopState: () => ({ kind: "empty" }),
  suggestConstellationName: () => "",
  peekChapter: () => undefined,
  loadChapter: () => Promise.resolve(null),
  createDream: () => notImplemented(),
  chooseBridge: () => notImplemented(),
  saveProofAndWeave: () => notImplemented(),
  rerenderChapter: () => notImplemented(),
  markHeard: () => notImplemented(),
  saveForRitual: () => notImplemented(),
  nameConstellation: () => notImplemented(),
  beginNextSeason: () => notImplemented(),
  renameDream: () => notImplemented(),
  restDream: () => notImplemented(),
  releaseDream: () => notImplemented(),
  setActiveDream: () => notImplemented(),
  flush: () => Promise.resolve(),
  exportSnapshot: () => notImplemented(),
  importSnapshot: () => notImplemented(),
};

const Ctx = createContext<ArcValue | null>(null);

/** Target position in the tree: inside UserProvider, PlusProvider and RitualProvider (docs/CONTRACTS.md §15). */
export function ArcProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={STUB_VALUE}>{children}</Ctx.Provider>;
}

export function useArc(): ArcValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useArc must be used inside ArcProvider");
  return v;
}
