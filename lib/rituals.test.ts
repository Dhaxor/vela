import { describe, expect, test } from "bun:test";
import type { Bridge, ChapterMeta, Dream, Proof } from "@/contexts/arc.types";
import { PHRASE_369_MAX } from "@/lib/journal";
import { IDENTITY_LINES, RITUAL_PROMPTS } from "@/lib/story/content";
import {
  dayOrder,
  dreamName,
  earnedLines,
  gratitudeDeck,
  gratitudeLines,
  gratitudePage,
  identityLineFor,
  nextStem,
  pagePreview,
  scriptPromptById,
  scriptPrompts,
  suggestions369,
} from "./rituals";

const DREAM: Dream = {
  id: "d1",
  focus: "career",
  desire: "my own design studio, with clients who trust my eye",
  feeling: "proud",
  label: null,
  createdAt: "2026-10-08T19:58:00.000Z",
  status: "active",
  statusChangedAt: "2026-10-08T19:58:00.000Z",
  season: 1,
  seasonStartedAt: "2026-10-08T19:58:00.000Z",
  constellations: [],
  usedIds: [],
  motifIds: [],
};

const CHAPTER = {
  id: "c5",
  dreamId: "d1",
  season: 1,
  number: 5,
  stage: 5,
  title: "Congratulations, Six Times",
  revision: 1,
  createdAt: "2026-10-20T12:00:00.000Z",
  revisedAt: null,
  wovenProofId: "p4",
  bridgeId: null,
  heardAt: "2026-10-20T21:00:00.000Z",
  savedForAt: null,
} as unknown as ChapterMeta;

const proof = (id: string, kind: Proof["kind"], text: string, createdAt: string): Proof =>
  ({ id, dreamId: "d1", bridgeId: null, kind, text, photoUri: null, createdAt, dateKey: createdAt.slice(0, 10), wovenInChapterId: null, starIndex: 1, season: 1, origin: "bridge" }) as Proof;

const PROOFS = [
  proof("p0", "did", "Bought the domain name.", "2026-10-08T20:00:00.000Z"),
  proof("p2", "learned", "Froze before calling the printer.", "2026-10-12T20:00:00.000Z"),
  proof("p4", "did", "Quoted my first real client.", "2026-10-20T11:40:00.000Z"),
];

const BRIDGE = { id: "b5", status: "open", text: "Sketch the sign that will hang above the studio." } as Bridge;

describe("dayOrder", () => {
  test("is a stable permutation per day and differs across days", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const a = dayOrder(items, "2026-10-21", "x");
    expect(dayOrder(items, "2026-10-21", "x")).toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(dayOrder(items, "2026-10-22", "x")).not.toEqual(a);
  });
});

describe("scriptPrompts", () => {
  const ctx = { dateKey: "2026-10-21", name: "Maya", dream: DREAM, chapter: CHAPTER, bridge: BRIDGE, proof: PROOFS[2] };

  test("leads with an arc-linked prompt and fills every token", () => {
    const list = scriptPrompts(ctx);
    expect(list[0].arc).toBe(true);
    expect(list.length).toBe(RITUAL_PROMPTS.scriptArc.length + RITUAL_PROMPTS.script.career.length);
    for (const p of list) {
      expect(p.text).not.toMatch(/[{}]/u);
      expect(p.dreamId).toBe("d1");
    }
    expect(list.map((p) => p.text).join(" ")).toContain("Chapter V");
  });

  test("alternates arc and focus prompts", () => {
    const list = scriptPrompts(ctx);
    expect(list.slice(0, 6).map((p) => p.arc)).toEqual([true, false, true, false, true, false]);
  });

  test("offers arc prompts only when their tokens fill", () => {
    const list = scriptPrompts({ ...ctx, chapter: null, bridge: null, proof: null });
    const arcIds = list.filter((p) => p.arc).map((p) => p.id);
    // With no heard chapter, bridge or proof only the desire/name prompts can fill (none in scriptArc today).
    for (const id of arcIds) {
      const src = RITUAL_PROMPTS.scriptArc.find((f) => f.id === id)!;
      expect(src.text).not.toMatch(/\{(chapter|stage|bridge|proof)\./u);
    }
    expect(list.some((p) => !p.arc)).toBe(true);
  });

  test("falls back to the profile focus with no dream, skipping desire prompts", () => {
    const list = scriptPrompts({ dateKey: "2026-10-21", name: "", dream: null, fallbackFocus: "health", chapter: null, bridge: null, proof: null });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => !p.arc && !/[{}]/u.test(p.text))).toBe(true);
  });

  test("a prompt by id fills from the context, or is null", () => {
    const p = scriptPromptById("sp-arc1", ctx)!;
    expect(p.text).toBe("Write the scene just after Chapter V ends.");
    expect(p.arc).toBe(true);
    expect(scriptPromptById("sp-ca4", ctx)!.arc).toBe(false);
    expect(scriptPromptById("sp-arc1", { ...ctx, chapter: null })).toBeNull();
    expect(scriptPromptById("nope", ctx)).toBeNull();
  });

  test("ignores a lapsed bridge", () => {
    const list = scriptPrompts({ ...ctx, bridge: { ...BRIDGE, status: "lapsed" } as Bridge });
    expect(list.some((p) => p.text.includes("Sketch the sign"))).toBe(false);
  });
});

describe("gratitude", () => {
  test("the day's deck holds all 48 stems, first three distinct", () => {
    const deck = gratitudeDeck("2026-10-21");
    expect(deck.length).toBe(RITUAL_PROMPTS.gratitude.length);
    expect(new Set(deck.slice(0, 3).map((s) => s.id)).size).toBe(3);
  });

  test("nextStem never repeats a stem already on the page", () => {
    const deck = gratitudeDeck("2026-10-21");
    let page = deck.slice(0, 3);
    for (let i = 0; i < 60; i += 1) {
      const slot = i % 3;
      const next = nextStem(deck, page, slot);
      expect(page.filter((s, j) => j !== slot).some((s) => s.id === next.id)).toBe(false);
      page = page.map((s, j) => (j === slot ? next : s));
    }
  });

  test("a saved page round-trips into stem + answer lines", () => {
    const stems = RITUAL_PROMPTS.gratitude.slice(0, 3);
    const page = gratitudePage(stems, ["The printer answered.", "", "  Dee, who forwarded it. "]);
    expect(page.text.split("\n").length).toBe(2);
    expect(page.promptId).toBe(stems[0].id);
    const lines = gratitudeLines({ prompt: page.prompt, text: page.text });
    expect(lines).toEqual([
      { stem: stems[0].text, answer: "The printer answered." },
      { stem: stems[2].text, answer: "Dee, who forwarded it." },
    ]);
    expect(pagePreview({ kind: "gratitude", prompt: page.prompt, text: page.text })).toBe("The printer answered. · Dee, who forwarded it.");
  });

  test("lines without a known stem are kept whole", () => {
    expect(gratitudeLines({ prompt: "", text: "Just a line" })).toEqual([{ stem: null, answer: "Just a line" }]);
  });
});

describe("suggestions369", () => {
  test("personal lines lead, all fit the phrase limit and carry no tokens", () => {
    const s = suggestions369(DREAM, "2026-10-21");
    expect(s.length).toBe(3);
    expect(s[0].personal).toBe(true);
    expect(s.some((x) => !x.personal)).toBe(true);
    for (const x of s) {
      expect(x.text.length).toBeLessThanOrEqual(PHRASE_369_MAX);
      expect(x.text).not.toMatch(/[{}]/u);
      expect(x.text.startsWith("I") || /^[A-Z]/u.test(x.text)).toBe(true);
    }
    expect(s.filter((x) => x.personal).every((x) => x.text.includes("design studio"))).toBe(true);
  });

  test("an unshapeable desire only gets token-free frames", () => {
    const s = suggestions369({ ...DREAM, desire: "!!" }, "2026-10-21");
    expect(s.every((x) => !x.personal)).toBe(true);
  });

  test("no dream and no focus → nothing", () => {
    expect(suggestions369(null, "2026-10-21")).toEqual([]);
  });
});

describe("Your lines", () => {
  test("today's line follows the newest proof's kind and the focus", () => {
    const line = identityLineFor(PROOFS, "career", "2026-10-21")!;
    expect(line.kind).toBe("did");
    expect(line.proof.id).toBe("p4");
    expect(IDENTITY_LINES.did.career.map((l) => l.id)).toContain(line.id);
    expect(identityLineFor(PROOFS, "career", "2026-10-21")!.id).toBe(line.id);
  });

  test("the line walks its pool one day at a time", () => {
    const a = identityLineFor(PROOFS, "career", "2026-10-21")!;
    const b = identityLineFor(PROOFS, "career", "2026-10-22")!;
    const pool = IDENTITY_LINES.did.career.map((l) => l.id);
    expect((pool.indexOf(b.id) - pool.indexOf(a.id) + pool.length) % pool.length).toBe(1);
  });

  test("no proof → no line", () => {
    expect(identityLineFor([], "career", "2026-10-21")).toBeNull();
  });

  test("earned lines group by the kinds proven, newest first", () => {
    expect(earnedLines(PROOFS, "career").map((g) => g.kind)).toEqual(["did", "learned"]);
  });
});

describe("dreamName", () => {
  test("label, then constellation, then the person's words", () => {
    expect(dreamName({ ...DREAM, label: "Studio" })).toBe("Studio");
    expect(dreamName({ ...DREAM, constellations: [{ season: 1, name: "The Studio", namedAt: "" }] })).toBe("The Studio");
    expect(dreamName(DREAM)).toBe("My own design studio…");
    expect(dreamName({ ...DREAM, desire: "a calm home." })).toBe("A calm home");
    expect(dreamName({ ...DREAM, desire: "debt free, finally and fully" }, 2)).toBe("Debt free…");
  });
});
