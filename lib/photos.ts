// Photo persistence for proofs and Scenes. Picker URIs point into caches iOS
// may clear, so on native the file is copied into the app's document
// directory; on web the picker hands back a data or blob URI that is kept
// as-is. Native modules are required lazily (bun can load this file).
//
// CONTAINER PATHS MOVE. iOS gives the app a new data container (a new
// /Application/<UUID>/ segment) on every update and reinstall-from-backup
// (Apple TN2285): the files survive, but every absolute file:// URI stored
// before the update points at a container that no longer exists. 1.0.1 stored
// board photos that way ('…/Documents/board-<id>.jpg') and 1.1 stores proof
// and Scenes photos the same way. So a stored URI is never trusted as a
// location: every load (and every backup import) rebases a photo we wrote into
// the CURRENT document directory by its file name, when that file exists there
// (rebasePhotoUri). Screens keep reading plain URIs.

import type { ArcIndex, Proof } from "@/contexts/arc.types";
import type { SceneCard, ScenesData } from "./store/scenes";

/** File extension of a picked URI ('jpg' when unknown). */
export function photoExtension(uri: string): string {
  const path = uri.split("?")[0].split("#")[0];
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
  return /^[a-z0-9]{2,5}$/u.test(ext) ? ext : "jpg";
}

/** Names Vela gives the photos it copies: 1.1 'proof-<id>.jpg' / 'scene-<id>.jpg', 1.0 'board-<id>.jpg'. */
const OWN_PHOTO_NAME = /^(?:proof|scene|board)-[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,8}$/u;

/** The file name of a photo Vela copied into a document directory ('proof-abc.jpg'), or null for anything else. */
export function ownPhotoFileName(uri: string): string | null {
  if (typeof uri !== "string" || !uri.startsWith("file://")) return null;
  const path = uri.split("?")[0].split("#")[0];
  const name = path.slice(path.lastIndexOf("/") + 1);
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // keep the raw name
  }
  return OWN_PHOTO_NAME.test(decoded) ? decoded : null;
}

/**
 * Point a stored photo URI at the current document directory. Pure.
 * - data:, blob:, picker and other URIs pass through unchanged.
 * - A URI already inside `documentDir` is kept.
 * - A photo Vela wrote under an older container is rebased by file name, but
 *   only when `exists(name)` finds that file in `documentDir` now; otherwise
 *   the stored URI is kept untouched (never invent a location).
 */
export function rebasePhotoUri(uri: string, documentDir: string, exists: (name: string) => boolean): string {
  if (!documentDir || !uri.startsWith("file://")) return uri;
  const dir = documentDir.endsWith("/") ? documentDir : `${documentDir}/`;
  if (uri.startsWith(dir)) return uri;
  const name = ownPhotoFileName(uri);
  if (!name) return uri;
  try {
    return exists(name) ? `${dir}${name}` : uri;
  } catch {
    return uri;
  }
}

/** Rewrites one stored photo URI for this install (identity where nothing applies). */
export type PhotoUriResolver = (uri: string) => string;

export const keepPhotoUri: PhotoUriResolver = (uri) => uri;

/**
 * The resolver for this install: rebases into Paths.document on native, the
 * identity on web or when the file system is unavailable. Never throws.
 */
export function photoUriResolver(): PhotoUriResolver {
  /* eslint-disable @typescript-eslint/no-require-imports */
  try {
    const { Platform } = require("react-native") as typeof import("react-native");
    if (Platform.OS === "web") return keepPhotoUri;
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const dir = Paths.document.uri;
    if (!dir) return keepPhotoUri;
    const exists = (name: string) => new File(Paths.document, name).exists;
    return (uri) => rebasePhotoUri(uri, dir, exists);
  } catch {
    return keepPhotoUri;
  }
}

/** Proof photos rebased for this install. Returns the same index when nothing moved. */
export function rebaseIndexPhotos(index: ArcIndex, resolve: PhotoUriResolver): ArcIndex {
  let changed = false;
  const proofs = index.proofs.map((p): Proof => {
    if (!p.photoUri) return p;
    const uri = resolve(p.photoUri);
    if (uri === p.photoUri) return p;
    changed = true;
    return { ...p, photoUri: uri };
  });
  return changed ? { ...index, proofs } : index;
}

/** Scenes photo cards rebased for this install. Returns the same data when nothing moved. */
export function rebaseScenePhotos(data: ScenesData, resolve: PhotoUriResolver): ScenesData {
  let changed = false;
  const cards = data.cards.map((c): SceneCard => {
    if (c.kind !== "photo") return c;
    const uri = resolve(c.uri);
    if (uri === c.uri) return c;
    changed = true;
    return { ...c, uri };
  });
  return changed ? { ...data, cards } : data;
}

/** Copy a picked photo somewhere permanent. Falls back to the picker URI if the copy fails. */
export async function persistPhoto(pickedUri: string, name: string): Promise<string> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Platform } = require("react-native") as typeof import("react-native");
  if (Platform.OS === "web" || !pickedUri) return pickedUri;
  try {
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const dest = new File(Paths.document, `${name}.${photoExtension(pickedUri)}`);
    if (dest.exists) return dest.uri;
    await new File(pickedUri).copy(dest);
    return dest.uri;
  } catch {
    return pickedUri;
  }
}
