// Photos survive app updates. iOS gives the app a new container path on every
// update (Apple TN2285): the files stay, every absolute URI stored before the
// update goes stale. Release-blocking for 1.0.1 upgraders, whose board photos
// were stored that way (review: data-safety-photo-uris-absolute).
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { EMPTY_ARC_INDEX, type ArcIndex, type Proof, type V1RawStorage } from "@/contexts/arc.types";
import { keepPhotoUri, ownPhotoFileName, rebaseIndexPhotos, rebasePhotoUri, rebaseScenePhotos } from "./photos";
import { parseScenes, scenesFromV1, syncProofPhotos } from "./store/scenes";

const OLD = "file:///var/mobile/Containers/Data/Application/AAAA-1111/Documents/";
const NEW = "file:///var/mobile/Containers/Data/Application/BBBB-2222/Documents/";
const raw = (name: string): V1RawStorage =>
  JSON.parse(fs.readFileSync(path.join(import.meta.dir, "fixtures", "v1", `${name}.json`), "utf8")).raw;

/** The files in the new install's Documents (contents survive an update; the path does not). */
const disk = (...names: string[]) => {
  const set = new Set(names);
  return (uri: string) => rebasePhotoUri(uri, NEW, (n) => set.has(n));
};

describe("rebasePhotoUri", () => {
  test("a proof photo from the old container points at the new one when its file is there", () => {
    expect(rebasePhotoUri(`${OLD}proof-mv9-abc.jpg`, NEW, () => true)).toBe(`${NEW}proof-mv9-abc.jpg`);
    // Paths.document without its trailing slash still joins correctly.
    expect(rebasePhotoUri(`${OLD}scene-x1.png`, NEW.slice(0, -1), () => true)).toBe(`${NEW}scene-x1.png`);
  });

  test("never invents a location: a missing file keeps its stored URI", () => {
    expect(rebasePhotoUri(`${OLD}proof-gone.jpg`, NEW, () => false)).toBe(`${OLD}proof-gone.jpg`);
  });

  test("leaves everything that is not a photo Vela copied alone", () => {
    const exists = () => true;
    for (const uri of [
      `${NEW}proof-current.jpg`, // already current
      "data:image/svg+xml;base64,PHN2Zz4=", // web picker
      "blob:http://localhost:8094/abc",
      "ph://ED7AC36B-A150-4C38-BB8C-B6D696F4F2ED/L0/001", // a photo-library reference
      `${OLD.replace("Documents/", "Library/Caches/ImagePicker/")}IMG_0001.jpg`, // 1.0's copy-failed fallback
    ]) {
      expect(rebasePhotoUri(uri, NEW, exists)).toBe(uri);
    }
  });

  test("own names: 1.1 proof-/scene-, 1.0 board- (any extension case)", () => {
    expect(ownPhotoFileName(`${OLD}board-mv9sq1ab-3f9k2a.JPG`)).toBe("board-mv9sq1ab-3f9k2a.JPG");
    expect(ownPhotoFileName(`${OLD}proof-a.heic?x=1`)).toBe("proof-a.heic");
    expect(ownPhotoFileName(`${OLD}IMG_0001.jpg`)).toBeNull();
    expect(ownPhotoFileName("data:image/png;base64,AAAA")).toBeNull();
  });

  test("a throwing existence check keeps the URI", () => {
    expect(rebasePhotoUri(`${OLD}proof-a.jpg`, NEW, () => {
      throw new Error("native");
    })).toBe(`${OLD}proof-a.jpg`);
  });
});

describe("the 1.0 board photo after the 1.1 update (v1 fixture with a board photo)", () => {
  test("migrated Scenes point at the 1.1 container, caption and order kept", () => {
    const board = JSON.parse(raw("board-photo").board!);
    const v1Uri: string = board[0].uri;
    expect(v1Uri.startsWith("file:///var/mobile/Containers/Data/Application/0A1B2C3D")).toBe(true);
    const migrated = scenesFromV1(board);
    // Before the fix, this URI was copied verbatim: an old container, a blank tile.
    expect(migrated.cards[0]).toMatchObject({ kind: "photo", uri: v1Uri });
    const rebased = rebaseScenePhotos(migrated, disk("board-mv9sq1ab-3f9k2a.jpg"));
    expect(rebased.cards[0]).toMatchObject({ kind: "photo", uri: `${NEW}board-mv9sq1ab-3f9k2a.jpg`, caption: "The corner studio on Elm" });
    expect(rebased.cards.map((c) => c.id)).toEqual(migrated.cards.map((c) => c.id));
    // Nothing to rebase (web, or already current): the very same object, so nothing is rewritten.
    expect(rebaseScenePhotos(rebased, disk("board-mv9sq1ab-3f9k2a.jpg"))).toBe(rebased);
    expect(rebaseScenePhotos(migrated, keepPhotoUri)).toBe(migrated);
  });
});

describe("1.1 photos across the next update (1.1 → 1.1.1)", () => {
  const proof = (id: string, photoUri: string | null): Proof => ({
    id, dreamId: "d", bridgeId: null, kind: "did", text: "Signed the lease.", photoUri, createdAt: "2026-10-16T20:00:00.000Z",
    dateKey: "2026-10-16", wovenInChapterId: null, starIndex: 1, season: 1, origin: "bridge",
  });

  test("proof photos in the arc index are rebased; proofs without a photo are untouched", () => {
    const index: ArcIndex = { ...EMPTY_ARC_INDEX, proofs: [proof("p1", `${OLD}proof-p1.jpg`), proof("p2", null)] };
    const next = rebaseIndexPhotos(index, disk("proof-p1.jpg"));
    expect(next.proofs[0].photoUri).toBe(`${NEW}proof-p1.jpg`);
    expect(next.proofs[1]).toBe(index.proofs[1]);
    expect(rebaseIndexPhotos(next, disk("proof-p1.jpg"))).toBe(next);
  });

  test("a stored Scenes card and the proof photo that syncs into Scenes both resolve", () => {
    const stored = parseScenes({
      version: 2,
      cards: [{ id: "scene-p1", kind: "photo", uri: `${OLD}proof-p1.jpg`, caption: "x", createdAt: "2026-10-10T20:00:00.000Z", dreamId: "d", proofId: "p1" }],
      importedProofIds: ["p1"],
    });
    const resolve = disk("proof-p1.jpg", "proof-p2.jpg");
    expect(rebaseScenePhotos(stored, resolve).cards[0]).toMatchObject({ uri: `${NEW}proof-p1.jpg` });
    // The arc rebases its proofs first, so a proof photo joins Scenes with the current URI.
    const index = rebaseIndexPhotos({ ...EMPTY_ARC_INDEX, proofs: [proof("p2", `${OLD}proof-p2.jpg`)] }, resolve);
    const synced = syncProofPhotos(stored, index.proofs);
    expect(synced.cards.find((c) => c.id === "scene-p2")).toMatchObject({ uri: `${NEW}proof-p2.jpg` });
  });
});
