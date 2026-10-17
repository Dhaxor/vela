// Leaving the foreground ends every ceremony hold and writes at once (iOS
// suspends JS timers in the background, so a hold's own expiry never fires).
import { describe, expect, test } from "bun:test";
import { ceremonyInProgress, holdForCeremony, releaseAllCeremonies, whenNoCeremony } from "./ceremony";
import { createPersistQueue } from "./persistQueue";

describe("releaseAllCeremonies", () => {
  test("a write held by Star Birth runs synchronously when the app goes to the background", () => {
    const release = holdForCeremony(60_000);
    const ran: string[] = [];
    whenNoCeremony(() => ran.push("proof + Chapter N+1"));
    expect(ceremonyInProgress()).toBe(true);
    expect(releaseAllCeremonies()).toBe(1);
    // No timer was needed: the write already started.
    expect(ran).toEqual(["proof + Chapter N+1"]);
    expect(ceremonyInProgress()).toBe(false);
    // The ceremony's own release later is a no-op (it never drives the count negative).
    release();
    const again = holdForCeremony(60_000);
    expect(ceremonyInProgress()).toBe(true);
    again();
    expect(ceremonyInProgress()).toBe(false);
  });

  test("several holds (Star Birth, then the Weave) all end", () => {
    holdForCeremony(60_000);
    holdForCeremony(60_000);
    const ran: number[] = [];
    whenNoCeremony(() => ran.push(1));
    releaseAllCeremonies();
    expect(ran).toEqual([1]);
    expect(ceremonyInProgress()).toBe(false);
  });

  test("a persist queue on the ceremony gate reaches storage on background, before any timer", async () => {
    const written: string[] = [];
    const queue = createPersistQueue({
      storage: {
        multiSet: async (entries) => void written.push(...entries.map(([k]) => k)),
        setItem: async (k) => void written.push(k),
        multiRemove: async () => {},
      },
      schedule: whenNoCeremony,
    });
    holdForCeremony(60_000);
    queue.enqueue({ items: [["vela.chapter.v2.c2", { id: "c2" }]], head: ["vela.arcs.v2", { proofs: 2 }] });
    releaseAllCeremonies();
    await queue.flush();
    expect(written).toEqual(["vela.chapter.v2.c2", "vela.arcs.v2"]);
  });

  test("with no ceremony running it is a harmless no-op", () => {
    expect(releaseAllCeremonies()).toBe(0);
    expect(ceremonyInProgress()).toBe(false);
  });
});
