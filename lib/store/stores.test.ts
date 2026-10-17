// Profile v2, Scenes and the ceremony gate.
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { ceremonyInProgress, holdForCeremony, whenNoCeremony } from "./ceremony";
import { isHHmm, parseProfileV2, patchProfile, profileFromV1 } from "./profile";
import { emptyScenes, parseScenes, scenesFromV1, syncProofPhotos, userSceneCount, type ProofPhoto } from "./scenes";

const NOW = new Date(2026, 9, 16, 9);
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.join(import.meta.dir, "..", "fixtures", "v1", `${name}.json`), "utf8")).raw;

describe("profile v2", () => {
  test("a real 1.0 profile migrates with every 1.0 field kept and v2 defaults", () => {
    const v1 = JSON.parse(fixture("nine-proofs").profile);
    const p = profileFromV1(v1, NOW)!;
    expect(p).toMatchObject({ version: 2, name: v1.name, focusAreas: v1.focusAreas, ritual: v1.ritual, mood: v1.mood, createdAt: v1.createdAt });
    expect(p).toMatchObject({ pronunciation: null, ritualTimes: { morning: "08:00", evening: "21:00" }, remindersEnabled: true, lockScreenPrivate: true, voiceId: null, rate: 0.9, textSize: "S", bed: "night" });
  });

  test("bad values are clamped, never stored", () => {
    const p = parseProfileV2({ version: 2, name: "  Maya  ", rate: 2, textSize: "XL", bed: "jungle", ritualTimes: { morning: "25:00", evening: "21:30" }, focusAreas: ["love", "nope"] }, NOW)!;
    expect(p).toMatchObject({ name: "Maya", rate: 0.9, textSize: "S", bed: "night", ritualTimes: { morning: "08:00", evening: "21:30" }, focusAreas: ["love"] });
    expect(parseProfileV2({ version: 2, name: "" }, NOW)).toBeNull();
    expect(parseProfileV2({ name: "Maya" }, NOW)).toBeNull();
    expect([isHHmm("07:30"), isHHmm("7:30"), isHHmm("24:00")]).toEqual([true, false, false]);
  });

  test("patches keep valid fields and ignore invalid ones", () => {
    const p = profileFromV1({ name: "Maya", focusAreas: ["career"], ritual: "both" }, NOW)!;
    const q = patchProfile(p, { pronunciation: "MY-uh", rate: 0.8, textSize: "L", ritualTimes: { morning: "06:45", evening: "nope" } });
    expect(q).toMatchObject({ pronunciation: "MY-uh", rate: 0.8, textSize: "L", ritualTimes: { morning: "06:45", evening: "21:00" }, createdAt: p.createdAt });
    expect(patchProfile(p, { name: "   " })).toBe(p);
  });

  test("'Silence' is stored only when chosen, so other profiles keep their exact shape", () => {
    const p = profileFromV1({ name: "Maya", focusAreas: ["career"], ritual: "both" }, NOW)!;
    expect("bedOn" in p).toBe(false);
    const quiet = patchProfile(p, { bedOn: false });
    expect(quiet.bedOn).toBe(false);
    const on = patchProfile(quiet, { bed: "rain", bedOn: true });
    expect("bedOn" in on).toBe(false);
    expect(on.bed).toBe("rain");
  });
});

describe("scenes", () => {
  test("a real 1.0 board migrates, unlinked", () => {
    const s = scenesFromV1(JSON.parse(fixture("nine-proofs").board));
    expect(s.cards).toHaveLength(1);
    expect(s.cards[0]).toMatchObject({ kind: "goal", text: "Studio sign above the door", dreamId: null });
    expect(parseScenes(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  test("proof photos join once, never count toward the free limit, and stay removed when removed", () => {
    const proofs: ProofPhoto[] = [
      { id: "p1", dreamId: "d", text: "Signed the lease", photoUri: "file:///lease.jpg", createdAt: "2026-10-10T10:00:00.000Z" },
      { id: "p2", dreamId: "d", text: "No photo", photoUri: null, createdAt: "2026-10-11T10:00:00.000Z" },
    ];
    const a = syncProofPhotos(emptyScenes(), proofs);
    expect(a.cards).toHaveLength(1);
    expect(a.cards[0]).toMatchObject({ kind: "photo", proofId: "p1", dreamId: "d", caption: "Signed the lease" });
    expect(userSceneCount(a)).toBe(0);
    expect(syncProofPhotos(a, proofs)).toBe(a);
    const removed = { ...a, cards: [] };
    expect(syncProofPhotos(removed, proofs)).toBe(removed);
  });

  test("malformed cards are dropped", () => {
    expect(parseScenes({ version: 2, cards: [{ id: "x", kind: "photo" }, { id: "y", kind: "goal", text: "  " }, null], importedProofIds: [1, "p"] })).toEqual({ version: 2, cards: [], importedProofIds: ["p"] });
  });
});

describe("ceremony gate", () => {
  test("writes wait while a ceremony runs and go once it ends", async () => {
    const ran: string[] = [];
    const release = holdForCeremony();
    expect(ceremonyInProgress()).toBe(true);
    whenNoCeremony(() => ran.push("write"));
    await new Promise((r) => setTimeout(r, 10));
    expect(ran).toEqual([]);
    release();
    release(); // idempotent
    await new Promise((r) => setTimeout(r, 10));
    expect(ran).toEqual(["write"]);
    expect(ceremonyInProgress()).toBe(false);
  });

  test("a forgotten hold expires on its own", async () => {
    const ran: string[] = [];
    holdForCeremony(20);
    whenNoCeremony(() => ran.push("write"));
    expect(ran).toEqual([]);
    // Poll rather than sleep a fixed 60ms: under a loaded full-suite run the timers can land late.
    for (let waited = 0; ran.length === 0 && waited < 3000; waited += 10) await new Promise((r) => setTimeout(r, 10));
    expect(ran).toEqual(["write"]);
  });
});
