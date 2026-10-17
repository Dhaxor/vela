import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { V1RawStorage } from "@/contexts/arc.types";
import {
  BACKUP_ERROR_COPY,
  backupFileName,
  buildBackup,
  parseBackup,
  planImport,
  resolveImport,
  resolveImportDetailed,
  serializeBackup,
  summarizeBackup,
  type BackupData,
} from "./backup";
import { applyArcAction, type ArcAction, type ArcState } from "./store/arc";
import { chaptersOf, offersFor, proofsOf } from "./store/arcSelectors";
import { emptyJournal, journalFromV1 } from "./journal";
import { migrateV1 } from "./migrate";
import { emptyProgress, recordAct } from "./progress";
import { checkArcInvariants } from "./store/invariants";
import { profileFromV1 } from "./store/profile";
import { emptyScenes, scenesFromV1 } from "./store/scenes";
import { EMPTY_ARC_INDEX } from "@/contexts/arc.types";

const NOW = new Date(2026, 9, 16, 9);
const raw = (name: string): V1RawStorage => JSON.parse(fs.readFileSync(path.join(import.meta.dir, "fixtures", "v1", `${name}.json`), "utf8")).raw;

/** A real device: the nine-proofs capture, migrated. */
function device(name: string): BackupData {
  const r = raw(name);
  return {
    arcs: migrateV1(r, { now: NOW, name: "Ana" }).snapshot,
    profile: profileFromV1(JSON.parse(r.profile ?? "null"), NOW),
    progress: recordAct(emptyProgress(), "proof", NOW),
    journal: r.journal ? journalFromV1(JSON.parse(r.journal)) : emptyJournal(),
    scenes: r.board ? scenesFromV1(JSON.parse(r.board)) : emptyScenes(),
  };
}

const EMPTY_DEVICE: BackupData = { arcs: { index: EMPTY_ARC_INDEX, chapters: {} }, profile: null, progress: null, journal: null, scenes: null };

describe("export → import round trip", () => {
  test("a backup file parses back to the same data", () => {
    const data = device("nine-proofs");
    const text = serializeBackup(buildBackup(data, NOW, "1.1.0"));
    const parsed = parseBackup(text, NOW);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.data.arcs).toEqual(data.arcs);
    expect(parsed.backup.data.profile).toEqual(data.profile);
    expect(parsed.backup.data.journal).toEqual(data.journal);
    expect(parsed.backup.data.scenes).toEqual(data.scenes);
    expect(parsed.backup.appVersion).toBe("1.1.0");
    expect(parsed.summary).toMatchObject({ dreams: 1, proofs: 9, pages: 2, scenes: 1, name: "Ana" });
  });

  test("the file name carries the LOCAL date", () => {
    expect(backupFileName(new Date(2026, 0, 2, 23, 30))).toBe("vela-backup-2026-01-02.json");
  });
});

describe("validation never applies a bad file", () => {
  test("refusals are typed and have copy", () => {
    const cases: [string, string][] = [
      ["not json", "not-json"],
      [JSON.stringify({ hello: 1 }), "not-a-backup"],
      [JSON.stringify({ kind: "vela-backup", version: 99, data: {} }), "newer-version"],
      [JSON.stringify({ kind: "vela-backup", version: 1, data: { arcs: { index: {}, chapters: {} } } }), "invalid-arcs"],
    ];
    for (const [text, error] of cases) {
      const r = parseBackup(text, NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toBe(error as typeof r.error);
        expect(BACKUP_ERROR_COPY[r.error].length).toBeGreaterThan(10);
      }
    }
  });

  test("a damaged arc (chapter text missing) is refused", () => {
    const data = device("reroll-heavy");
    const broken = { ...data, arcs: { ...data.arcs, chapters: {} } };
    const r = parseBackup(serializeBackup(buildBackup(broken, NOW, null)), NOW);
    expect(r.ok ? null : r.error).toBe("invalid-arcs");
  });

  test("other stores are sanitized, not trusted", () => {
    const data = device("nine-proofs");
    const file = JSON.parse(serializeBackup(buildBackup(data, NOW, null)));
    file.data.profile.rate = 7;
    file.data.scenes.cards.push({ id: "x", kind: "photo" });
    const r = parseBackup(JSON.stringify(file), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.data.profile?.rate).toBe(0.9);
      expect(r.backup.data.scenes?.cards.map((c) => c.id)).toEqual(data.scenes!.cards.map((c) => c.id));
    }
  });
});

describe("merge or replace", () => {
  test("an empty device just takes the file", () => {
    const plan = planImport(EMPTY_DEVICE, device("nine-proofs"));
    expect(plan).toMatchObject({ needsChoice: false, recommended: "replace", nothingNew: false });
  });

  test("the same backup twice has nothing new", () => {
    const d = device("nine-proofs");
    expect(planImport(d, d)).toMatchObject({ needsChoice: true, nothingNew: true });
  });

  test("two devices: merge is recommended and keeps both sets of dreams, valid", () => {
    const here = device("reroll-heavy");
    const there = device("plus-two-dreams");
    const plan = planImport(here, there);
    expect(plan).toMatchObject({ needsChoice: true, recommended: "merge", nothingNew: false });
    const merged = resolveImport(here, there, "merge");
    expect(merged.arcs.index.dreams).toHaveLength(3);
    expect(checkArcInvariants(merged.arcs)).toEqual([]);
    expect(merged.arcs.index.activeDreamId).toBe(here.arcs.index.activeDreamId);
    expect(merged.profile).toEqual(here.profile);
  });

  test("merge adds pages and Scenes without duplicates; progress never goes down", () => {
    const here = device("nine-proofs");
    const later: BackupData = {
      ...here,
      journal: { ...here.journal!, entries: [{ ...here.journal!.entries[0], id: "new-page", createdAt: "2026-10-20T20:00:00.000Z" }, ...here.journal!.entries] },
      progress: { ...here.progress!, nightsShownUp: 40, days: ["2026-10-01", ...here.progress!.days] },
    };
    const merged = resolveImport(here, later, "merge");
    expect(merged.journal!.entries.map((e) => e.id)).toEqual(["new-page", ...here.journal!.entries.map((e) => e.id)]);
    expect(merged.scenes!.cards).toHaveLength(here.scenes!.cards.length);
    expect(merged.progress!.nightsShownUp).toBe(40);
    expect(merged.progress!.days).toContain("2026-10-01");
  });

  test("replace makes the file the truth", () => {
    const here = device("reroll-heavy");
    const there = device("nine-proofs");
    expect(resolveImport(here, there, "replace")).toBe(there);
  });
});

/* ------------------------------------------------------------------------
 * Newer work on a dream both sides share (review: data-safety-backup-merge-
 * drops-newer-dream-data): the iPad was restored from the phone, the phone
 * moved on, and the phone's new backup comes back to the iPad.
 * --------------------------------------------------------------------- */

/** A dream lived through the real reducer: deterministic ids (prefix + counter), one hour per action. */
function life(prefix = "r", from?: { state: ArcState; t: number; n: number }) {
  let t = from?.t ?? new Date(2026, 9, 1, 20).getTime();
  let n = from?.n ?? 0;
  let state: ArcState = from?.state ?? { index: EMPTY_ARC_INDEX, texts: {} };
  const run = (action: ArcAction) => {
    t += 3_600_000;
    state = applyArcAction(state, action, { now: new Date(t), isPlus: false, name: "Ana", newId: () => `${prefix}${++n}`, seed: n * 31 + 7 }).state;
  };
  if (!from) run({ type: "CREATE_DREAM", input: { focus: "career", desire: "my own design studio", feeling: "proud", seedProof: { text: "Bought the domain name." } } });
  const dreamId = state.index.activeDreamId!;
  const proof = (text: string) => {
    const latest = chaptersOf(state.index, dreamId).at(-1)!;
    const offer = offersFor(state.index, latest.id, false)[0];
    if (offer) run({ type: "CHOOSE_BRIDGE", input: { chapterId: latest.id, choice: { tier: offer.tier, libraryId: offer.libraryId } } });
    run({ type: "SAVE_PROOF_AND_WEAVE", input: { dreamId, kind: "did", text } });
  };
  const data = (): BackupData => ({ arcs: { index: state.index, chapters: state.texts }, profile: null, progress: null, journal: emptyJournal(), scenes: emptyScenes() });
  /** Another phone carrying on from this exact point, with its own ids. */
  const fork = (otherPrefix: string) => life(otherPrefix, { state, t, n });
  return { proof, data, dreamId, fork };
}

const stars = (d: BackupData, dreamId: string) => proofsOf(d.arcs.index, dreamId).length;

describe("a dream both sides share", () => {
  test("the file carries the device's history further: not 'nothing new', and merge takes the longer history", () => {
    const phone = life();
    phone.proof("Sent my portfolio.");
    const ipad = phone.data(); // the iPad was restored from the phone here: 2 stars
    phone.proof("Called a studio lead.");
    phone.proof("Quoted a client.");
    phone.proof("Signed the lease.");
    const file = phone.data(); // 5 stars
    expect(stars(ipad, phone.dreamId)).toBe(2);
    expect(stars(file, phone.dreamId)).toBe(5);

    const plan = planImport(ipad, file);
    expect(plan).toMatchObject({ needsChoice: true, recommended: "merge", nothingNew: false, differs: true, dreamsUpdated: 1, dreamsDiverged: 0 });

    const merged = resolveImportDetailed(ipad, file, "merge");
    expect(merged.problems).toEqual([]);
    expect(merged).toMatchObject({ dreamsAdded: 0, dreamsUpdated: 1, dreamsKept: 0 });
    expect(stars(merged.data, phone.dreamId)).toBe(5);
    expect(chaptersOf(merged.data.arcs.index, phone.dreamId).length).toBe(chaptersOf(file.arcs.index, phone.dreamId).length);
    expect(checkArcInvariants(merged.data.arcs)).toEqual([]);
  });

  test("a new page alone no longer hides the newer stars", () => {
    const phone = life();
    phone.proof("Sent my portfolio.");
    const ipad = phone.data();
    phone.proof("Called a studio lead.");
    const later = phone.data();
    const file: BackupData = {
      ...later,
      journal: { ...emptyJournal(), entries: [{ id: "pg1", kind: "script", dateKey: "2026-10-03", prompt: "p", text: "A page.", createdAt: "2026-10-03T20:00:00.000Z" }] },
    };
    const merged = resolveImportDetailed(ipad, file, "merge");
    expect(stars(merged.data, phone.dreamId)).toBe(3);
    expect(merged.data.journal!.entries.map((e) => e.id)).toEqual(["pg1"]);
  });

  test("the device is ahead: nothing new (truthfully), but the file still differs, so Replace stays possible", () => {
    const phone = life();
    phone.proof("Sent my portfolio.");
    const old = phone.data();
    phone.proof("Called a studio lead.");
    const now = phone.data();
    expect(planImport(now, old)).toMatchObject({ nothingNew: true, differs: true, dreamsUpdated: 0, dreamsDiverged: 0 });
    expect(stars(resolveImportDetailed(now, old, "merge").data, phone.dreamId)).toBe(3);
    expect(stars(resolveImportDetailed(now, old, "replace").data, phone.dreamId)).toBe(2);
  });

  test("histories that went separate ways: merge keeps the device's and says so; Replace takes the file's", () => {
    const phone = life();
    phone.proof("Sent my portfolio.");
    const other = phone.fork("o");
    phone.proof("Called a studio lead.");
    other.proof("Painted the sign.");
    const device = phone.data();
    const file = other.data();
    expect(checkArcInvariants(file.arcs)).toEqual([]);
    expect(planImport(device, file)).toMatchObject({ nothingNew: false, dreamsUpdated: 0, dreamsDiverged: 1 });
    const merged = resolveImportDetailed(device, file, "merge");
    expect(merged).toMatchObject({ dreamsKept: 1, problems: [] });
    expect(merged.data.arcs.index.proofs.map((p) => p.text)).toContain("Called a studio lead.");
    const replaced = resolveImportDetailed(device, file, "replace");
    expect(replaced.data.arcs.index.proofs.map((p) => p.text)).toContain("Painted the sign.");
  });

  test("the same backup twice: nothing new and no difference", () => {
    const phone = life();
    phone.proof("Sent my portfolio.");
    const d = phone.data();
    expect(planImport(d, structuredClone(d))).toMatchObject({ nothingNew: true, differs: false });
  });

  test("a merge that would break the arc is reported, never swapped for 'keep mine'", () => {
    const here = device("reroll-heavy");
    const there = device("plus-two-dreams");
    const clashId = here.arcs.index.chapters[0].id;
    const firstThere = there.arcs.index.chapters[0].id;
    const clash: BackupData = {
      ...there,
      arcs: {
        index: { ...there.arcs.index, chapters: there.arcs.index.chapters.map((c) => (c.id === firstThere ? { ...c, id: clashId } : c)) },
        chapters: { ...there.arcs.chapters, [clashId]: { ...there.arcs.chapters[firstThere], id: clashId } },
      },
    };
    const r = resolveImportDetailed(here, clash, "merge");
    expect(r.problems.length).toBeGreaterThan(0);
  });
});

describe("nothing a user wrote is dropped by a merge", () => {
  test("600 pages and 250 Scenes on each side merge without truncation", () => {
    const page = (i: number, side: string) => ({
      id: `${side}${i}`, kind: "gratitude" as const, dateKey: "2026-01-01", prompt: "", text: `line ${i}`, createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
    });
    const card = (i: number, side: string) => ({ id: `${side}${i}`, kind: "goal" as const, text: `goal ${i}`, createdAt: new Date(2026, 0, 1, 0, i).toISOString(), dreamId: null });
    const side = (s: string): BackupData => ({
      ...EMPTY_DEVICE,
      journal: { ...emptyJournal(), entries: Array.from({ length: 600 }, (_, i) => page(i, s)) },
      scenes: { version: 2, cards: Array.from({ length: 250 }, (_, i) => card(i, s)), importedProofIds: [] },
    });
    const merged = resolveImport(side("a"), side("b"), "merge");
    expect(merged.journal!.entries).toHaveLength(1200);
    expect(merged.scenes!.cards).toHaveLength(500);
  });
});

describe("photos are references, and the summary says so", () => {
  test("device photos are counted once (a proof photo also shows in Scenes); web data URIs are not", () => {
    const d = device("nine-proofs");
    const p = d.arcs.index.proofs[0];
    const uri = "file:///var/mobile/Containers/Data/Application/AAAA/Documents/proof-x.jpg";
    const withPhotos: BackupData = {
      ...d,
      arcs: { ...d.arcs, index: { ...d.arcs.index, proofs: d.arcs.index.proofs.map((x) => (x.id === p.id ? { ...x, photoUri: uri } : x)) } },
      scenes: {
        version: 2,
        importedProofIds: [p.id],
        cards: [
          { id: `scene-${p.id}`, kind: "photo", uri, caption: "", createdAt: p.createdAt, dreamId: p.dreamId, proofId: p.id },
          { id: "s2", kind: "photo", uri: "file:///var/mobile/Containers/Data/Application/AAAA/Documents/scene-s2.jpg", caption: "", createdAt: p.createdAt, dreamId: null, proofId: null },
          { id: "s3", kind: "photo", uri: "data:image/svg+xml;base64,PHN2Zz4=", caption: "", createdAt: p.createdAt, dreamId: null, proofId: null },
        ],
      },
    };
    expect(summarizeBackup(withPhotos).devicePhotos).toBe(2);
    expect(summarizeBackup(d).devicePhotos).toBe(0);
  });
});

describe("parseBackup never throws", () => {
  test("hostile top-level shapes come back typed", () => {
    const texts = ["null", "[]", '"x"', "1", JSON.stringify({ kind: "vela-backup", version: 1, data: { arcs: { index: null, chapters: [] } } })];
    for (const text of texts) {
      expect(() => parseBackup(text, NOW)).not.toThrow();
      expect(parseBackup(text, NOW).ok).toBe(false);
    }
  });
});
