// SCENES (the former vision board): photos and written goals, each with a
// caption and an optional link to one dream. Proof photos join automatically,
// once each, and never count toward the free limit. Stored under
// 'vela.scenes.v2'; migrated once from 'vela.board.v1' (never written). Pure.
//
// Nothing here ever drops a card the user has: not on load, not when a proof
// photo joins, not in a backup merge. The one cap (MAX_SCENES) only stops the
// user ADDING more cards by hand; it never evicts.

export const SCENE_CAPTION_MAX = 60;
export const GOAL_TEXT_MAX = 120;
/** Most cards a user can add by hand (Plus included). Proof photos never count, and nothing is ever evicted. */
export const MAX_SCENES = 200;

export type SceneCard =
  | {
      readonly id: string;
      readonly kind: "photo";
      readonly uri: string;
      readonly caption: string;
      readonly createdAt: string;
      readonly dreamId: string | null;
      /** Set when the photo came from a proof (added automatically). */
      readonly proofId: string | null;
    }
  | {
      readonly id: string;
      readonly kind: "goal";
      readonly text: string;
      readonly createdAt: string;
      readonly dreamId: string | null;
    };

export interface ScenesData {
  readonly version: 2;
  /** Newest first. */
  readonly cards: readonly SceneCard[];
  /** Proofs whose photo was already added (so removing that card is final). */
  readonly importedProofIds: readonly string[];
}

/** The slice of a Proof that Scenes needs. */
export interface ProofPhoto {
  readonly id: string;
  readonly dreamId: string;
  readonly text: string;
  readonly photoUri: string | null;
  readonly createdAt: string;
}

export function emptyScenes(): ScenesData {
  return { version: 2, cards: [], importedProofIds: [] };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/gu, " ").trim().slice(0, max) : "");
const idOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);

function parseCard(v: unknown): SceneCard | null {
  if (!isRecord(v) || typeof v.id !== "string" || !v.id) return null;
  const createdAt = typeof v.createdAt === "string" ? v.createdAt : new Date(0).toISOString();
  if (v.kind === "photo" && typeof v.uri === "string" && v.uri) {
    return { id: v.id, kind: "photo", uri: v.uri, caption: text(v.caption, SCENE_CAPTION_MAX), createdAt, dreamId: idOrNull(v.dreamId), proofId: idOrNull(v.proofId) };
  }
  if (v.kind === "goal" && text(v.text, GOAL_TEXT_MAX)) {
    return { id: v.id, kind: "goal", text: text(v.text, GOAL_TEXT_MAX), createdAt, dreamId: idOrNull(v.dreamId) };
  }
  return null;
}

function parseCards(v: unknown): SceneCard[] {
  const seen = new Set<string>();
  const out: SceneCard[] = [];
  for (const raw of Array.isArray(v) ? v : []) {
    const c = parseCard(raw);
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/** Stored 'vela.scenes.v2' value. Malformed reads as empty. */
export function parseScenes(raw: unknown): ScenesData {
  if (!isRecord(raw) || raw.version !== 2) return emptyScenes();
  const imported = Array.isArray(raw.importedProofIds) ? raw.importedProofIds.filter((x): x is string => typeof x === "string") : [];
  return { version: 2, cards: parseCards(raw.cards), importedProofIds: imported };
}

/** 1.0 'vela.board.v1' (an array of cards) → v2: unlinked, nothing imported. */
export function scenesFromV1(raw: unknown): ScenesData {
  return { version: 2, cards: parseCards(raw), importedProofIds: [] };
}

/** Cards the user added by hand (the free limit counts these). */
export function userSceneCount(data: ScenesData): number {
  return data.cards.filter((c) => c.kind === "goal" || c.proofId === null).length;
}

/**
 * Add a card for every proof photo not imported before. Returns the same
 * object when nothing changed. Never removes a card: proof photos are bounded
 * by the proofs themselves and do not count toward MAX_SCENES.
 */
export function syncProofPhotos(data: ScenesData, proofs: readonly ProofPhoto[]): ScenesData {
  const done = new Set(data.importedProofIds);
  const fresh = proofs.filter((p) => p.photoUri && !done.has(p.id));
  if (fresh.length === 0) return data;
  const cards: SceneCard[] = fresh
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      id: `scene-${p.id}`,
      kind: "photo",
      uri: p.photoUri!,
      caption: text(p.text, SCENE_CAPTION_MAX),
      createdAt: p.createdAt,
      dreamId: p.dreamId,
      proofId: p.id,
    }));
  return {
    version: 2,
    cards: [...cards, ...data.cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    importedProofIds: [...data.importedProofIds, ...fresh.map((p) => p.id)],
  };
}
