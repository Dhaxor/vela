// RELEASE-BLOCKING: a 1.0.x LIFETIME owner updates to 1.1 and keeps every
// dream, proof, Scene and page, with every Plus feature open and no Plus
// offer anywhere. The data is lib/fixtures/v1/lifetime-owner.json (3 dreams,
// 8 proofs, 6 board cards with 2 photos, 4 journal pages, Plus cached),
// produced by 1.0.1's own code. The launch path is the providers': the arc
// through loadArcState (the real launch read, storage injected), the other
// stores through the same migrations their providers call. Entitlement itself:
// lib/purchase.lifetime.test.ts and contexts/PlusContext.lifetime.test.tsx.
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { V1RawStorage } from "@/contexts/arc.types";
import { BEDS, type BedId } from "@/lib/audio/types";
import { isBedLocked, resolveBed, suggestedBed, SUGGESTED_BEDS } from "@/lib/audio/soundscapes";
import { FOCUS_AREAS } from "@/lib/focus";
import { areaAllowance, tapArea } from "@/components/feature/plus/areas";
import { journalFromV1 } from "./journal";
import { checkArcInvariants } from "./migrate";
import { rebasePhotoUri, rebaseScenePhotos } from "./photos";
import { progressFromRitualV1 } from "./progress";
import {
  FREE_SCENES,
  canAddDream,
  canAddScene,
  canUseArea,
  canUseBed,
  plusNudgeEligible,
  softPlusNoteDue,
  wakeNeedsConfirm,
  type ReaderEndZone,
} from "./purchase";
import { STORAGE_KEYS, V1_KEYS, chapterStorageKey } from "./storageKeys";
import { applyArcAction } from "./store/arc";
import { loadArcState, type ArcLoadStorage } from "./store/arcLoad";
import { chaptersOf, latestChapterOf, loopStateOf, offersFor, planLockedOf, proofsOf, weavingOf } from "./store/arcSelectors";
import { canCreateDream } from "@/contexts/arc.types";
import { profileFromV1 } from "./store/profile";
import { MAX_SCENES, scenesFromV1, syncProofPhotos, userSceneCount } from "./store/scenes";

const FIXTURE = JSON.parse(fs.readFileSync(path.join(import.meta.dir, "fixtures", "v1", "lifetime-owner.json"), "utf8")) as { raw: V1RawStorage; plus: string };
const RAW = FIXTURE.raw;
const V1 = JSON.parse(RAW.stories!) as {
  intents: { id: string; focus: string }[];
  stories: { id: string; intentId: string }[];
  actions: { id: string; intentId: string; state: string; evidence?: string; evidenceKind?: string }[];
};
const BOARD = JSON.parse(RAW.board!) as { id: string; kind: string; uri?: string }[];
/** The first launch of 1.1: Sunday 18 October 2026, 21:00, a day after the last 1.0.1 ritual. */
const NOW = new Date(2026, 9, 18, 21, 0);
const IS_PLUS = true;

/** The phone after the update: 1.0.1's keys exactly as 1.0.1 wrote them. */
function phone() {
  const data = new Map<string, string>([
    [V1_KEYS.stories, RAW.stories!],
    [V1_KEYS.ritual, RAW.ritual!],
    [V1_KEYS.profile, RAW.profile!],
    [V1_KEYS.journal, RAW.journal!],
    [V1_KEYS.board, RAW.board!],
    [STORAGE_KEYS.plus, FIXTURE.plus],
  ]);
  const storage: ArcLoadStorage = {
    readKeys: async (keys) => keys.map((k) => data.get(k) ?? null),
    listKeys: async () => [...data.keys()],
    writeRaw: async (k, v) => {
      data.set(k, v);
      return true;
    },
  };
  return { data, storage };
}

/** Everything the providers load on that first launch. */
async function firstLaunch() {
  const { data, storage } = phone();
  const before = new Map(data);
  const warnings: string[] = [];
  const arc = await loadArcState(storage, {
    now: NOW,
    name: "Priya",
    resolvePhoto: (u) => u,
    onMigrationReport: (r) => warnings.push(...r.warnings),
    onWarning: (m) => warnings.push(m),
  });
  // ArcProvider's onLoaded: chapter keys, then the index.
  for (const id of arc.toWrite) data.set(chapterStorageKey(id), JSON.stringify(arc.texts[id]));
  data.set(STORAGE_KEYS.arcs, JSON.stringify(arc.index));
  const profile = profileFromV1(JSON.parse(RAW.profile!), NOW);
  const journal = journalFromV1(JSON.parse(RAW.journal!));
  const progress = progressFromRitualV1(JSON.parse(RAW.ritual!));
  const proofPhotos = arc.index.proofs.map((p) => ({ id: p.id, dreamId: p.dreamId, text: p.text, photoUri: p.photoUri, createdAt: p.createdAt }));
  const scenes = syncProofPhotos(scenesFromV1(JSON.parse(RAW.board!)), proofPhotos);
  return { data, before, warnings, arc, index: arc.index, profile, journal, progress, scenes };
}

describe("lifetime-owner fixture (1.0.1's own output)", () => {
  test("3 dreams, 3 stories, 8 proofs, 6 board cards (2 photos), journal pages, Plus cached", () => {
    expect(V1.intents).toHaveLength(3);
    expect(V1.stories).toHaveLength(3);
    expect(V1.actions.filter((a) => a.state === "completed")).toHaveLength(8);
    expect(BOARD).toHaveLength(6);
    expect(BOARD.filter((c) => c.kind === "photo")).toHaveLength(2);
    expect(JSON.parse(RAW.journal!).entries.length).toBeGreaterThanOrEqual(2);
    expect(FIXTURE.plus).toBe("1");
  });
});

describe("(i) the first launch of 1.1 keeps all of it", () => {
  test("migrates cleanly: no warnings, invariants hold, 1.0.1 ids kept", async () => {
    const { arc, index, warnings } = await firstLaunch();
    expect(arc.read).toBe("absent"); // no v2 index yet: this launch migrates
    expect(warnings).toEqual([]);
    expect(checkArcInvariants({ index, chapters: arc.texts })).toEqual([]);
    expect(index.dreams.map((d) => d.id).sort()).toEqual(V1.intents.map((i) => i.id).sort());
    for (const story of V1.stories) expect(index.chapters.some((c) => c.id === story.id)).toBe(true);
    expect(index.activeDreamId).toBe(V1.intents[0].id);
  });

  test("every dream ACTIVE and weaving, none plan-locked", async () => {
    const { index } = await firstLaunch();
    expect(index.dreams.map((d) => d.status)).toEqual(["active", "active", "active"]);
    expect(weavingOf(index, IS_PLUS).sort()).toEqual(index.dreams.map((d) => d.id).sort());
    expect(planLockedOf(index, IS_PLUS)).toEqual([]);
    for (const d of index.dreams) {
      const loop = loopStateOf(index, d.id, NOW, IS_PLUS);
      expect(loop.kind).not.toBe("resting");
      // each dream's next step is open: a bridge to choose or one already open
      expect(["chapter-waiting", "bridge-open", "next-woven", "sealed"]).toContain(loop.kind);
    }
  });

  test("all 8 proofs, with the person's own words and kinds", async () => {
    const { index } = await firstLaunch();
    const proofs = index.dreams.flatMap((d) => proofsOf(index, d.id));
    expect(proofs).toHaveLength(8);
    const v1Proofs = V1.actions.filter((a) => a.state === "completed");
    for (const a of v1Proofs) {
      expect(proofs.some((p) => p.dreamId === a.intentId && p.kind === a.evidenceKind && p.text.replace(/\.$/, "") === a.evidence!.replace(/\.$/, ""))).toBe(true);
    }
  });

  test("the 1.0.1 keys are never written; Plus stays cached", async () => {
    const { data, before } = await firstLaunch();
    for (const k of [...Object.values(V1_KEYS), STORAGE_KEYS.plus]) expect(data.get(k)).toBe(before.get(k));
  });

  test("more than 3 board cards: all 6 kept as Scenes, in order, photos and goals", async () => {
    const { scenes } = await firstLaunch();
    expect(scenes.cards.map((c) => c.id)).toEqual(BOARD.map((c) => c.id));
    expect(scenes.cards.filter((c) => c.kind === "photo")).toHaveLength(2);
    expect(userSceneCount(scenes)).toBe(6);
    expect(userSceneCount(scenes)).toBeGreaterThan(FREE_SCENES);
    // ScenesContext's add gate with Plus (sceneLimit = Infinity): still room
    expect(userSceneCount(scenes) < Math.min(Number.POSITIVE_INFINITY, MAX_SCENES)).toBe(true);
    expect(canAddScene(userSceneCount(scenes), IS_PLUS)).toBe(true);
    expect(canAddScene(userSceneCount(scenes), false)).toBe(false); // control: the free gate would close
  });

  test("the board photos follow the app container to the 1.1 install (iOS moves it on update)", async () => {
    const { scenes } = await firstLaunch();
    const NEW_DOCS = "file:///var/mobile/Containers/Data/Application/9C0FFEE0-1111-4222-8333-944455556666/Documents";
    const onDisk = new Set(BOARD.filter((c) => c.uri).map((c) => c.uri!.split("/").pop()!));
    const rebased = rebaseScenePhotos(scenes, (u) => rebasePhotoUri(u, NEW_DOCS, (name) => onDisk.has(name)));
    for (const c of rebased.cards) if (c.kind === "photo") expect(c.uri.startsWith(`${NEW_DOCS}/board-`)).toBe(true);
  });

  test("journal pages, the 3·6·9 phrase, the profile and the nights shown up", async () => {
    const { journal, profile, progress } = await firstLaunch();
    const v1Journal = JSON.parse(RAW.journal!);
    expect(journal.entries.map((e) => e.id).sort()).toEqual(v1Journal.entries.map((e: { id: string }) => e.id).sort());
    expect(journal.phrase369).toBe(v1Journal.phrase369);
    expect(profile?.name).toBe("Priya");
    expect(profile?.focusAreas).toEqual(["career", "love"]);
    expect(progress.nightsShownUp).toBe(JSON.parse(RAW.ritual!).days.length);
  });

  test("Plus gates all open: dreams, beds, areas, Scenes", async () => {
    const { index, profile } = await firstLaunch();
    const active = index.dreams.filter((d) => d.status === "active").length;
    expect(canCreateDream(index.dreams, IS_PLUS)).toBe(true);
    expect(canAddDream(active, IS_PLUS)).toBe(true);
    for (const bed of Object.keys(BEDS) as BedId[]) {
      expect(canUseBed(bed, IS_PLUS)).toBe(true);
      expect(isBedLocked(bed, IS_PLUS)).toBe(false);
      expect(resolveBed(bed, IS_PLUS)).toBe(bed); // a chosen Plus bed is kept, never forced back to Night
    }
    for (const d of index.dreams) {
      expect(suggestedBed(d.focus, "evening", IS_PLUS)).toBe(SUGGESTED_BEDS[d.focus].evening);
    }
    for (const area of FOCUS_AREAS) expect(canUseArea(area.id, profile!.focusAreas, IS_PLUS)).toBe(true);
    expect(areaAllowance(profile!.focusAreas, IS_PLUS)).toBe(FOCUS_AREAS.length);
    expect(canAddScene(MAX_SCENES - 1, IS_PLUS)).toBe(true);
  });

  test("a 4th dream can begin (no plan-limit), and all four weave", async () => {
    const { arc } = await firstLaunch();
    const out = applyArcAction(
      { index: arc.index, texts: arc.texts },
      { type: "CREATE_DREAM", input: { focus: "abundance", desire: "a savings cushion that lets me breathe", feeling: "free" } },
      { now: NOW, isPlus: IS_PLUS, name: "Priya", newId: (() => { let n = 0; return () => `lt-${++n}`; })(), seed: 7 }
    );
    expect(out.state.index.dreams.filter((d) => d.status === "active")).toHaveLength(4);
    expect(planLockedOf(out.state.index, IS_PLUS)).toEqual([]);
  });

  test("Plus never mutates anything: the same data without Plus is only plan-locked, not lost", async () => {
    const { index } = await firstLaunch();
    expect(planLockedOf(index, false)).toHaveLength(2);
    expect(index.dreams.every((d) => d.status === "active")).toBe(true);
    for (const d of index.dreams) expect(chaptersOf(index, d.id).length).toBeGreaterThan(0);
  });
});

describe("(j) nothing offers Plus to a Plus member", () => {
  test("the Star Birth nudge (useProofAsks), at any proof count", () => {
    for (let n = 0; n <= 60; n++) expect(plusNudgeEligible(true, n)).toBe(false);
    expect(plusNudgeEligible(false, 2)).toBe(true); // control
  });

  test("the reader's soft Plus note, on any chapter, zone or reread", () => {
    const zones: ReaderEndZone[] = ["choose", "open", "season-complete", "crossed", "resting", "none"];
    for (const zone of zones) for (let chapterNumber = 1; chapterNumber <= 7; chapterNumber++) for (const isLatest of [true, false]) {
      expect(softPlusNoteDue({ isPlus: true, chapterNumber, isLatest, zone })).toBe(false);
    }
    expect(softPlusNoteDue({ isPlus: false, chapterNumber: 3, isLatest: true, zone: "open" })).toBe(true); // control
  });

  test("waking a dream never asks 'on the free plan…'", () => {
    expect(wakeNeedsConfirm(true, { id: "other" })).toBe(false);
    expect(wakeNeedsConfirm(false, { id: "other" })).toBe(true); // control
    expect(wakeNeedsConfirm(false, undefined)).toBe(false);
  });

  test("Today's 'About Vela Plus' (plan-locked) and the bridge chooser: never locked, on any day", async () => {
    const { index } = await firstLaunch();
    for (let day = 0; day < 14; day++) {
      const at = new Date(NOW.getTime() + day * 86_400_000);
      for (const d of index.dreams) {
        const loop = loopStateOf(index, d.id, at, IS_PLUS);
        expect(loop.kind === "resting" && loop.reason === "plan-locked").toBe(false);
        const latest = latestChapterOf(index, d.id)!;
        if (loop.kind === "chapter-waiting") expect(offersFor(index, latest.id, IS_PLUS)).toHaveLength(3);
      }
    }
  });

  test("Settings > Your areas never answers a tap with Plus", async () => {
    const { profile } = await firstLaunch();
    const allowance = areaAllowance(profile!.focusAreas, IS_PLUS);
    let areas = [...profile!.focusAreas];
    for (const area of FOCUS_AREAS.map((a) => a.id)) {
      if (areas.includes(area)) continue;
      const tap = tapArea(areas, area, allowance);
      expect(tap.kind).toBe("save");
      if (tap.kind === "save") areas = tap.areas;
    }
    expect(areas).toHaveLength(FOCUS_AREAS.length);
  });

  // Every screen, hook and provider that reads Plus, audited for a Plus member.
  // A new reader of isPlus fails here until it is checked and listed.
  const AUDITED: Record<string, string> = {
    "app/(tabs)/arc.tsx": "ghost plate: arc.canCreateDream (tested above); DreamMenu copy only when !isPlus",
    "app/affirmations.tsx": "area tabs and 'See Vela Plus': canUseArea (tested above)",
    "app/paywall.tsx": "a Plus member sees the thank-you state: no plans, no buy, no restore; Manage only per plusStatusCopy",
    "app/scenes.tsx": "the free-limit line renders only when !isPlus; adding is gated by ScenesContext canAddScene",
    "app/settings.tsx": "areas (areaAllowance/tapArea), bed (resolveBed, BedPicker isBedLocked), status row (plusStatusCopy)",
    "app/story/[id].tsx": "bed lock (isBedLocked/canUseBed) and the soft Plus note (softPlusNoteDue)",
    "components/feature/arc/DreamMenu.tsx": "rest/release copy about freeing the one weaving dream only when !isPlus",
    "components/feature/plus/usePlusActions.ts": "buy/restore; waits for isPlus after a purchase",
    "components/feature/proof/useProofAsks.ts": "the Star Birth nudge: plusNudgeEligible",
    "components/feature/settings/BedPicker.tsx": "isBedLocked",
    "components/feature/sky/useWakeDream.ts": "wakeNeedsConfirm",
    "components/feature/today/LoopCard.tsx": "wakeNeedsConfirm; 'About Vela Plus' only for loopState plan-locked",
    "contexts/ArcContext.tsx": "weavingOf / planLockedOf / canCreateDream / offersFor / loopStateOf (tested above)",
    "contexts/PlusContext.tsx": "the entitlement (contexts/PlusContext.lifetime.test.tsx)",
    "contexts/ScenesContext.tsx": "sceneLimit: Infinity with Plus",
    "contexts/arc.types.ts": "weavingDreamIds / canCreateDream (tested above)",
    "lib/audio/soundscapes.ts": "isBedLocked / resolveBed / suggestedBed (tested above)",
    "lib/purchase.ts": "the gates themselves (tested above and in lib/purchase.lifetime.test.ts)",
    "lib/store/arc.ts": "plan-limit and dream-not-weaving only without Plus; setActiveDream rests others only without Plus",
    "lib/store/arcSelectors.ts": "weavingOf / planLockedOf / isWeaving / loopStateOf / offersFor (tested above)",
    "components/feature/plus/areas.ts": "areaAllowance (tested above)",
    "components/feature/plus/price.ts": "names usePlus().reloadPrices in a comment; no gate",
  };

  test("every file that reads isPlus / usePlus is audited", () => {
    const root = path.join(import.meta.dir, "..");
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== "node_modules" && e.name !== "fixtures" && !e.name.startsWith(".")) walk(p);
        } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          if (/\bisPlus\b|\busePlus\(/.test(fs.readFileSync(p, "utf8"))) found.push(path.relative(root, p).split(path.sep).join("/"));
        }
      }
    };
    for (const dir of ["app", "components", "contexts", "lib"]) walk(path.join(root, dir));
    const unaudited = found.filter((f) => !(f in AUDITED));
    expect(unaudited).toEqual([]);
    // and the list stays honest: nothing listed that no longer reads Plus
    expect(Object.keys(AUDITED).filter((f) => !found.includes(f))).toEqual([]);
  });
});
