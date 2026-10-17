#!/usr/bin/env bun
// PERSONA SEEDER for web screenshots (docs/SHOTS.md).
//
// Builds each persona by driving the REAL pure code the app runs: the arc
// reducer (lib/store/arc applyArcAction, with checkArcInvariants after every
// step), lib/progress recordAct, lib/journal, lib/store/scenes and
// lib/store/profile. It mirrors what the providers do around those calls
// (markHeard records 'chapter-heard', a proof records 'proof', a saved page
// records 'ritual-saved'), then writes what the providers would have
// persisted: a localStorage snapshot, a map of storage key → JSON string, to
// scripts/shots/seeds/<persona>.json. scripts/shots/inject.mjs loads one.
//
// Deterministic: ids and engine seeds come from a PRNG seeded per story, and
// time comes from a simulated clock anchored on the still-mode instant
// (lib/clock STILL_DATE: Wednesday 21 October 2026, 21:04 local), so every
// still-mode screenshot is coherent and every run writes identical files.
// The timezone is pinned (SEED_TZ); inject.mjs gives the browser the same one.
//
//   bun scripts/shots/seed.ts                 write every persona + _manifest.json
//   bun scripts/shots/seed.ts maya-mid fresh  write only these (manifest is always rewritten)
//   bun scripts/shots/seed.ts --check         exit 1 when a committed seed is stale
//   bun scripts/shots/seed.ts --list          print the personas and their Today state
//
// Regenerate whenever the data model or the story content changes. Each
// persona asserts its own expectations (loop state, stars, stage, nights), so
// a model change that silently moves a persona fails here, loudly.

import fs from "node:fs";
import path from "node:path";

import {
  EMPTY_ARC_INDEX,
  type ArcSnapshot,
  type BridgeTier,
  type Chapter,
  type ChapterId,
  type DreamId,
  type IfThen,
  type LoopState,
  type ProofKind,
  type SaveProofInput,
  type SaveProofResult,
} from "@/contexts/arc.types";
import type { ProfileV2, RitualTime } from "@/contexts/user.types";
import { STILL_DATE, stillInstant } from "@/lib/clock";
import type { FocusId } from "@/lib/focus";
import { addJournalEntry, addRepetition, emptyJournal, emptySheet, type JournalData, type Sheet369, type Slot369 } from "@/lib/journal";
import { emptyProgress, localDateKey, recordAct, summarize, type LoopAct, type ProgressState } from "@/lib/progress";
import { STORAGE_KEYS, chapterStorageKey } from "@/lib/storageKeys";
import { applyArcAction, type ArcAction, type ArcResults, type ArcState } from "@/lib/store/arc";
import {
  chaptersOf,
  dreamOf,
  latestChapterOf,
  loopStateOf,
  offersFor,
  openBridgeOf,
  planLockedOf,
  proofsOf,
  seasonProgressOf,
  suggestConstellationNameOf,
  totalStarsOf,
  weavingOf,
} from "@/lib/store/arcSelectors";
import { checkArcInvariants } from "@/lib/store/invariants";
import { normalizeProfile } from "@/lib/store/profile";
import { SCENE_CAPTION_MAX, emptyScenes, syncProofPhotos, type ScenesData } from "@/lib/store/scenes";
import { RITUAL_PROMPTS } from "@/lib/story/content";
import { mulberry32 } from "@/lib/story/rng";
import { shapeDesire } from "@/lib/story/shaper";
import { hash32 } from "@/lib/story/text";

/* =========================================================================
 * Clock and timezone
 * ========================================================================= */

/** The seeds' timezone. inject.mjs overrides the browser's timezone to match. */
export const SEED_TZ = "Europe/London";
process.env.TZ = SEED_TZ;
if (new Date(2026, 9, 21, 21, 4).getTimezoneOffset() !== -60) {
  throw new Error(`seed.ts: could not pin TZ=${SEED_TZ} (this runtime ignores a runtime TZ change). Run: TZ=${SEED_TZ} bun scripts/shots/seed.ts`);
}

const SEEDS_DIR = path.join(import.meta.dir, "seeds");
const MANIFEST = "_manifest.json";

/** Local wall time `day` days from the still date (0 = 21 Oct 2026, -1 = 20 Oct …) at 'HH:mm'. */
function at(day: number, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(STILL_DATE.year, STILL_DATE.month - 1, STILL_DATE.day + day, h, m, 0, 0);
}

const ANCHOR = stillInstant();

/* =========================================================================
 * The simulated device
 * ========================================================================= */

interface Onboarding {
  readonly name: string;
  readonly focus: FocusId;
  readonly desire: string;
  readonly feeling: string;
  readonly ritual: RitualTime;
  readonly evening: string;
  readonly seed?: string;
}

interface ProofOpts {
  readonly origin?: SaveProofInput["origin"];
  readonly photoUri?: string;
}

/** One device's stores, advanced through the same pure transitions the providers apply. */
class Device {
  private readonly rng: () => number;
  private ids = 0;
  private t: Date = ANCHOR;
  arc: ArcState = { index: EMPTY_ARC_INDEX, texts: {} };
  progress: ProgressState = emptyProgress();
  journal: JournalData = emptyJournal();
  scenes: ScenesData = emptyScenes();
  profile: ProfileV2 | null = null;
  isPlus = false;
  /** 'vela.plus.v1' as PlusContext writes it ('1' / '0'), or null when never written. */
  plusFlag: "1" | "0" | null = null;

  /** Personas that share a story key share ids and chapter text for their common prefix. */
  constructor(story: string) {
    this.rng = mulberry32(hash32(`vela-shots:${story}`));
  }

  /** Move the clock to a local wall time relative to the still date. */
  when(day: number, hhmm: string): this {
    const next = at(day, hhmm);
    if (next.getTime() < this.t.getTime() && this.ids > 0) throw new Error(`clock went backwards to ${next.toString()}`);
    this.t = next;
    return this;
  }

  get now(): Date {
    return this.t;
  }

  /** Same shape as lib/store/ids newId ('mv9skmkt-6vrjrm'), but reproducible. */
  readonly newId = (): string => {
    this.ids += 1;
    return `${(this.t.getTime() + this.ids).toString(36)}-${Math.floor(this.rng() * 1e9).toString(36)}`;
  };

  private nextSeed(): number {
    return Math.floor(this.rng() * 0xffffffff) >>> 0;
  }

  /** One atomic arc action, exactly as ArcContext runs it; invariants checked after every step. */
  run<A extends ArcAction>(action: A): ArcResults[A["type"]] {
    const out = applyArcAction(this.arc, action, { now: this.t, isPlus: this.isPlus, name: this.profile?.name ?? "", newId: this.newId, seed: this.nextSeed() });
    this.arc = out.state;
    const problems = checkArcInvariants(this.snapshot());
    if (problems.length > 0) throw new Error(`invariants broken after ${action.type}: ${problems.join("; ")}`);
    return out.result;
  }

  snapshot(): ArcSnapshot {
    return { index: this.arc.index, chapters: this.arc.texts };
  }

  /** RitualContext.recordAct. */
  act(kind: LoopAct): this {
    this.progress = recordAct(this.progress, kind, this.t);
    return this;
  }

  /* ---------------------------------------------------------- the loop */

  /** First Light: UserContext.saveProfile, then arc.createDream (with the optional seed proof). */
  onboard(o: Onboarding): { dreamId: DreamId; chapterId: ChapterId } {
    const iso = this.t.toISOString();
    const profile = normalizeProfile({ version: 2, name: o.name, focusAreas: [o.focus], ritual: o.ritual, ritualTimes: { morning: "08:00", evening: o.evening } }, iso);
    if (!profile) throw new Error("profile rejected");
    this.profile = { ...profile, createdAt: iso };
    return this.dream(o);
  }

  /** arc.createDream (a later dream needs Plus while another is active). */
  dream(o: Pick<Onboarding, "focus" | "desire" | "feeling" | "seed">): { dreamId: DreamId; chapterId: ChapterId } {
    const chapter = this.run({ type: "CREATE_DREAM", input: { focus: o.focus, desire: o.desire, feeling: o.feeling, ...(o.seed ? { seedProof: { text: o.seed } } : {}) } });
    return { dreamId: chapter.dreamId, chapterId: chapter.id };
  }

  /** The reader passed 60%: arc.markHeard, which records 'chapter-heard' the first time. */
  hear(chapterId: ChapterId): this {
    if (this.run({ type: "MARK_HEARD", chapterId })) this.act("chapter-heard");
    return this;
  }

  /** The bridge chooser: pick the offer of this tier (or the suggested one) for the chapter. */
  choose(chapterId: ChapterId, tier: BridgeTier | "suggested", ifThen?: IfThen, remindAt?: Date): this {
    const offers = offersFor(this.arc.index, chapterId, this.isPlus);
    const pick = offers.find((o) => (tier === "suggested" ? o.suggested : o.tier === tier));
    if (!pick) throw new Error(`no ${tier} offer for chapter ${chapterId}`);
    this.run({ type: "CHOOSE_BRIDGE", input: { chapterId, choice: { tier: pick.tier, libraryId: pick.libraryId }, ...(ifThen ? { ifThen } : {}), ...(remindAt ? { remindAt: remindAt.toISOString() } : {}) } });
    return this;
  }

  /** The proof form (or the Not-today sheet): one call saves, resolves the bridge and weaves. Records 'proof'. */
  prove(dreamId: DreamId, kind: ProofKind, text: string, opts: ProofOpts = {}): SaveProofResult {
    const input: SaveProofInput = { dreamId, kind, text, ...(opts.origin ? { origin: opts.origin } : {}), ...(opts.photoUri ? { photoUri: opts.photoUri } : {}) };
    const action: Extract<ArcAction, { type: "SAVE_PROOF_AND_WEAVE" }> = { type: "SAVE_PROOF_AND_WEAVE", input };
    const result = this.run(action);
    this.act("proof");
    return result;
  }

  /** prove(), returning the chapter it wove (a persona step always expects one here). */
  weave(dreamId: DreamId, kind: ProofKind, text: string, opts: ProofOpts = {}): ChapterId {
    const r = this.prove(dreamId, kind, text, opts);
    if (!r.nextChapter) throw new Error(`proof '${text}' wove no chapter`);
    return r.nextChapter.id;
  }

  saveFor(chapterId: ChapterId, when: Date): this {
    this.run({ type: "SAVE_FOR_RITUAL", chapterId, at: when.toISOString() });
    return this;
  }

  /* ---------------------------------------------------------- rituals */

  /** 'Your lines': a line carried. */
  carry(): this {
    return this.act("line-carried");
  }

  /** JournalContext.addEntry + the 'ritual-saved' act the practice screens record. */
  page(kind: "script" | "gratitude", prompt: string, text: string, opts: { promptId?: string; dreamId?: string } = {}): this {
    const next = addJournalEntry(this.journal, {
      id: this.newId(),
      kind,
      dateKey: localDateKey(this.t),
      prompt,
      text: text.trim(),
      createdAt: this.t.toISOString(),
      ...(opts.promptId ? { promptId: opts.promptId } : {}),
      ...(opts.dreamId ? { dreamId: opts.dreamId } : {}),
    });
    if (next === this.journal) throw new Error("empty journal page");
    this.journal = next;
    return this.act("ritual-saved");
  }

  /** A scripting page answering a prompt from RITUAL_PROMPTS.script[focus]. */
  script(focus: FocusId, promptId: string, text: string, dreamId: DreamId): this {
    const prompt = RITUAL_PROMPTS.script[focus].find((p) => p.id === promptId);
    if (!prompt) throw new Error(`no script prompt ${promptId}`);
    return this.page("script", prompt.text, text, { promptId, dreamId });
  }

  /** A gratitude page: three stems from RITUAL_PROMPTS.gratitude, saved the way the 1.0 screen joins them. */
  gratitude(answers: ReadonlyArray<readonly [stemId: string, answer: string]>): this {
    const stems = answers.map(([id]) => {
      const stem = RITUAL_PROMPTS.gratitude.find((g) => g.id === id);
      if (!stem) throw new Error(`no gratitude stem ${id}`);
      return stem.text;
    });
    const text = answers.map(([, answer], i) => `${stems[i]} ${answer}`).join("\n");
    return this.page("gratitude", stems.join(" | "), text, { promptId: answers[0][0] });
  }

  /** JournalContext.setPhrase369: a fresh sheet for today with the carried phrase. */
  phrase369(phrase: string): this {
    this.journal = { ...this.journal, phrase369: phrase, sheet: emptySheet(localDateKey(this.t), phrase) };
    return this;
  }

  /** JournalContext.addRep × n (the phrase itself, as the screen writes it), each recording 'ritual-saved'. */
  reps(slot: Slot369, n: number): this {
    for (let i = 0; i < n; i += 1) {
      const sheet = this.journal.sheet as Sheet369;
      const next = addRepetition(sheet, slot, sheet.phrase);
      if (!next) throw new Error(`369 ${slot} slot is full`);
      this.journal = { ...this.journal, sheet: next };
      this.act("ritual-saved");
    }
    return this;
  }

  /** ScenesContext.addPhoto / addGoal. */
  scene(card: { photo: string; caption: string } | { goal: string }, dreamId: DreamId | null): this {
    const createdAt = this.t.toISOString();
    const id = this.newId();
    const next =
      "photo" in card
        ? { id, kind: "photo" as const, uri: card.photo, caption: card.caption.slice(0, SCENE_CAPTION_MAX), createdAt, dreamId, proofId: null }
        : { id, kind: "goal" as const, text: card.goal, createdAt, dreamId };
    this.scenes = { ...this.scenes, cards: [next, ...this.scenes.cards] };
    return this;
  }

  /** Plus bought (PlusContext writes '1'); false is a lapsed subscription after a refresh ('0'). */
  plus(on: boolean): this {
    this.isPlus = on;
    this.plusFlag = on ? "1" : "0";
    return this;
  }

  /* ---------------------------------------------------------- output */

  /** ScenesContext adds every proof photo on load; the seed stores the synced list, so the app writes nothing on first render. */
  syncedScenes(): ScenesData {
    return syncProofPhotos(this.scenes, this.arc.index.dreams.flatMap((d) => proofsOf(this.arc.index, d.id)));
  }

  /** What the providers would have persisted: key → raw string, keys sorted. */
  storage(): Record<string, string> {
    const scenes = this.syncedScenes();
    const out: Record<string, string> = {};
    const put = (key: string, value: unknown, empty?: unknown) => {
      if (empty !== undefined && JSON.stringify(value) === JSON.stringify(empty)) return;
      out[key] = JSON.stringify(value);
    };
    if (this.profile) put(STORAGE_KEYS.profile, this.profile);
    if (this.arc.index.dreams.length > 0) {
      // I15 order does not matter here (one synchronous seed), but every chapter key the index names is present.
      for (const meta of this.arc.index.chapters) put(chapterStorageKey(meta.id), this.arc.texts[meta.id]);
      put(STORAGE_KEYS.arcs, this.arc.index);
    }
    put(STORAGE_KEYS.progress, this.progress, emptyProgress());
    put(STORAGE_KEYS.journal, this.journal, emptyJournal());
    put(STORAGE_KEYS.scenes, scenes, emptyScenes());
    if (this.plusFlag) out[STORAGE_KEYS.plus] = this.plusFlag;
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  }
}

/* =========================================================================
 * Pictures (web data URIs; on web the image picker hands back data/blob URIs too)
 * ========================================================================= */

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg.replace(/\s*\n\s*/g, " ").trim()).toString("base64")}`;

const GRAIN = `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.10"/></feComponentTransfer></filter>`;

/** Out-of-focus evening lights through a window: a believable phone photo, made of gradients and blur. */
function bokehPhoto(seed: string, palette: { sky: [string, string, string]; lights: string[] }): string {
  const rng = mulberry32(hash32(seed));
  const lights = Array.from({ length: 26 }, () => {
    const r = 18 + rng() * 74;
    const x = rng() * 900;
    const y = 120 + rng() * 980;
    const color = palette.lights[Math.floor(rng() * palette.lights.length)];
    const blur = rng() < 0.35 ? "near" : "far";
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="${color}" opacity="${(0.22 + rng() * 0.5).toFixed(2)}" filter="url(#${blur})"/>`;
  }).join("");
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="${palette.sky[0]}"/><stop offset="0.55" stop-color="${palette.sky[1]}"/><stop offset="1" stop-color="${palette.sky[2]}"/>
      </linearGradient>
      <radialGradient id="vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="rgb(0,0,0)" stop-opacity="0"/><stop offset="1" stop-color="rgb(0,0,0)" stop-opacity="0.55"/></radialGradient>
      <filter id="far" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id="near" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="frame" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5"/></filter>
      ${GRAIN}
    </defs>
    <rect width="900" height="1200" fill="url(#bg)"/>
    ${lights}
    <g fill="rgb(12,10,22)" opacity="0.78" filter="url(#frame)">
      <rect x="430" y="0" width="34" height="1200"/><rect x="0" y="560" width="900" height="30"/><rect x="0" y="1090" width="900" height="110"/>
    </g>
    <rect width="900" height="1200" fill="url(#vig)"/>
    <rect width="900" height="1200" filter="url(#grain)"/>
  </svg>`);
}

/** Pencil logo sketches on warm paper, lit from one side. */
function sketchPhoto(): string {
  const rng = mulberry32(hash32("sketch"));
  const marks = [
    [250, 330, 120],
    [640, 360, 96],
    [430, 760, 132],
  ]
    .map(([cx, cy, r]) => {
      const passes = Array.from({ length: 3 }, (_, i) => {
        const dx = (rng() - 0.5) * 8;
        const dy = (rng() - 0.5) * 8;
        return `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r + i * 3}" opacity="${(0.55 - i * 0.15).toFixed(2)}"/>`;
      }).join("");
      // A small sail inside each mark.
      const sail = `<path d="M${cx - r * 0.35} ${cy + r * 0.35} L${cx + r * 0.05} ${cy - r * 0.55} L${cx + r * 0.38} ${cy + r * 0.35} Z" opacity="0.7"/>`;
      return passes + sail;
    })
    .join("");
  const hatch = Array.from({ length: 14 }, (_, i) => `<line x1="${560 + i * 9}" y1="900" x2="${600 + i * 9}" y2="980" opacity="0.35"/>`).join("");
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgb(240,231,214)"/><stop offset="1" stop-color="rgb(214,200,176)"/></linearGradient>
      <radialGradient id="lamp" cx="0.22" cy="0.18" r="1.05"><stop offset="0" stop-color="rgb(255,236,200)" stop-opacity="0.55"/><stop offset="0.6" stop-color="rgb(0,0,0)" stop-opacity="0"/><stop offset="1" stop-color="rgb(30,20,12)" stop-opacity="0.5"/></radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="0.6"/></filter>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
      ${GRAIN}
    </defs>
    <rect width="900" height="1200" fill="url(#paper)"/>
    <g fill="none" stroke="rgb(58,50,46)" stroke-width="3" stroke-linecap="round" filter="url(#soft)">${marks}${hatch}</g>
    <g transform="rotate(-28 640 1040)">
      <rect x="380" y="1060" width="520" height="34" rx="6" fill="rgb(20,12,8)" opacity="0.35" filter="url(#shadow)"/>
      <rect x="380" y="1030" width="500" height="30" rx="5" fill="rgb(233,180,76)"/>
      <rect x="820" y="1030" width="60" height="30" fill="rgb(210,140,120)"/>
      <path d="M380 1030 L330 1045 L380 1060 Z" fill="rgb(222,196,160)"/><path d="M342 1041 L330 1045 L342 1049 Z" fill="rgb(50,44,40)"/>
    </g>
    <rect width="900" height="1200" fill="url(#lamp)"/>
    <rect width="900" height="1200" filter="url(#grain)"/>
  </svg>`);
}

/** Printed portfolio pages spread on a dark table. */
function portfolioPhoto(): string {
  const page = (x: number, y: number, rot: number, blocks: string) =>
    `<g transform="rotate(${rot} ${x + 170} ${y + 230})">
      <rect x="${x + 10}" y="${y + 18}" width="340" height="460" fill="rgb(0,0,0)" opacity="0.5" filter="url(#shadow)"/>
      <rect x="${x}" y="${y}" width="340" height="460" fill="rgb(244,238,228)"/>${blocks}
    </g>`;
  const blocksA = `<rect x="130" y="250" width="280" height="190" fill="rgb(58,42,79)"/><circle cx="270" cy="345" r="54" fill="rgb(233,180,76)"/><rect x="130" y="470" width="200" height="12" fill="rgb(120,110,100)"/><rect x="130" y="494" width="150" height="12" fill="rgb(160,150,140)"/>`;
  const blocksB = `<rect x="520" y="200" width="280" height="280" fill="rgb(198,120,96)"/><rect x="520" y="500" width="240" height="12" fill="rgb(120,110,100)"/><rect x="520" y="524" width="190" height="12" fill="rgb(160,150,140)"/>`;
  const blocksC = `<circle cx="450" cy="760" r="92" fill="none" stroke="rgb(40,34,32)" stroke-width="10"/><path d="M412 800 L450 712 L488 800 Z" fill="rgb(40,34,32)"/><rect x="340" y="900" width="220" height="12" fill="rgb(120,110,100)"/>`;
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs>
      <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgb(58,40,32)"/><stop offset="1" stop-color="rgb(30,20,18)"/></linearGradient>
      <radialGradient id="lamp" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="rgb(255,226,180)" stop-opacity="0.18"/><stop offset="1" stop-color="rgb(0,0,0)" stop-opacity="0.5"/></radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
      ${GRAIN}
    </defs>
    <rect width="900" height="1200" fill="url(#wood)"/>
    ${page(110, 150, -6, blocksA)}${page(470, 120, 5, blocksB)}${page(280, 560, -2, blocksC)}
    <rect width="900" height="1200" fill="url(#lamp)"/>
    <rect width="900" height="1200" filter="url(#grain)"/>
  </svg>`);
}

const PHOTOS = {
  studioLights: () => bokehPhoto("studio-lights", { sky: ["rgb(20,17,42)", "rgb(50,36,74)", "rgb(104,64,60)"], lights: ["rgb(233,180,76)", "rgb(246,214,150)", "rgb(255,168,96)", "rgb(196,170,255)"] }),
  kitchenWindow: () => bokehPhoto("kitchen-window", { sky: ["rgb(36,26,40)", "rgb(92,58,52)", "rgb(160,104,70)"], lights: ["rgb(255,214,150)", "rgb(255,186,110)", "rgb(240,236,220)"] }),
  sketches: sketchPhoto,
  portfolio: portfolioPhoto,
};

/* =========================================================================
 * Personas
 * ========================================================================= */

const MAYA: Onboarding = {
  name: "Maya",
  focus: "career",
  desire: "my own design studio, with clients who trust my eye",
  feeling: "proud",
  ritual: "evening",
  evening: "21:00",
  seed: "Bought the domain name.",
};

/** If-then lines that fit the bridges the engine offers these chapters (Chapter I 15min: 'Sketch the sign…'; Chapter VI 15min: 'Protect twenty focused minutes…'). */
const IF_THEN: IfThen = { when: "9am", then: "open the sketchbook to a clean page" };
const IF_THEN_FOCUS: IfThen = { when: "after lunch", then: "put my phone in the other room" };

/** Honest, specific proof sentences (the gold lines in every later chapter). */
const PROOF = {
  portfolio: "Sent my portfolio to two studios I admire.",
  froze: "Froze before calling the printer. Next time I write my first question down.",
  call: "Booked a call with a studio lead.",
  quote: "Quoted my first real client: a logo for the bakery on Elm Street.",
  sketches: "Sent the bakery three logo sketches. They picked the second one.",
  account: "Opened a business account and set my day rate.",
} as const;

const PHRASE_369 = (desire: string) => `I am so proud that ${shapeDesire(desire).doneI}.`;

const SCRIPT_ROOM =
  "A long table under the window, scarred from other people's projects. My laptop, the good pencils in a jar, a stack of printed proofs with a coffee ring on the top one. A pinboard of marks I made for clients I like. My studio's name is on the door in small letters, and the kettle is always warm.";
const SCRIPT_PRICE =
  "“It's twelve hundred for the identity, with two rounds of changes.” I said it once, plainly, and stopped talking. The client nodded and asked when I could start. I wrote the date in my calendar in pen.";

interface Expect {
  readonly loop: LoopState["kind"];
  readonly heard?: boolean;
  readonly named?: boolean;
  readonly stars: number;
  readonly season: number;
  readonly stage: number;
  readonly nights: readonly [min: number, max: number];
  readonly dreams?: number;
  readonly planLocked?: number;
}

interface Persona {
  readonly id: string;
  readonly description: string;
  readonly build: () => Device;
  readonly expect: Expect | null;
}

/** Maya's single-dream season. mid/woven/sealed/eve/complete share the story key, so their common prefix is identical. */
function mayaSeason(variant: "mid" | "woven" | "sealed" | "eve" | "complete"): Device {
  const d = new Device("maya-season");
  // Thu 8 Oct: First Light, Chapter I weaves the seed, the first bridge with an if-then.
  d.when(-13, "20:58");
  const { dreamId, chapterId: ch1 } = d.onboard(MAYA);
  d.when(-13, "21:10").hear(ch1);
  d.when(-13, "21:12").choose(ch1, "15min", IF_THEN, at(-12, "09:00"));
  d.when(-12, "08:20").carry();
  // Sat 10 Oct: proof 1 (did) → Chapter II.
  d.when(-11, "12:35");
  const ch2 = d.weave(dreamId, "did", PROOF.portfolio);
  d.when(-11, "21:06").hear(ch2);
  d.when(-11, "21:09").choose(ch2, "brave");
  d.when(-10, "21:30").script("career", "sp-ca4", SCRIPT_ROOM, dreamId);
  // Mon 12 Oct: the brave bridge was too big; Not today → a learned proof → Chapter III (The Hard Day).
  d.when(-9, "18:40");
  d.scene({ photo: PHOTOS.studioLights(), caption: "Corner studio lights on the street I want to work on" }, dreamId);
  const ch3 = d.weave(dreamId, "learned", PROOF.froze, { origin: "not-today" });
  d.when(-9, "21:10").hear(ch3);
  d.when(-9, "21:12").choose(ch3, "2min");
  d.when(-8, "08:15").carry();
  // Wed 14 Oct is a rest night (nothing recorded): forgiving progress never calls it missed.
  d.when(-6, "21:40").gratitude([
    ["gs1", "The printer answered on the first ring."],
    ["gs2", "Dee, who forwarded my portfolio without being asked."],
    ["gs9", "Reading the bakery's reply on the bus."],
  ]);
  // Fri 16 Oct (Day 9): proof 3 (moved) → Chapter IV.
  d.when(-5, "13:15");
  const ch4 = d.weave(dreamId, "moved", PROOF.call);
  d.when(-5, "21:06").hear(ch4);
  d.when(-5, "21:10").choose(ch4, "15min");
  d.when(-4, "08:30").carry();
  const sketches = () => {
    d.when(-3, "19:20").scene({ photo: PHOTOS.sketches(), caption: "First sketches for the studio mark" }, dreamId);
    d.when(-3, "21:15").carry();
  };

  if (variant === "mid" || variant === "woven" || variant === "sealed") {
    sketches();
    d.when(-2, "08:10").carry();
    // Proof 4 (did) → Chapter V: yesterday (mid), or today at lunch (woven, sealed).
    if (variant === "mid") {
      d.when(-1, "12:40");
      const ch5 = d.weave(dreamId, "did", PROOF.quote);
      d.when(-1, "21:08").hear(ch5);
    } else {
      d.when(-1, "08:05").carry();
      d.when(0, "08:12").phrase369(PHRASE_369(MAYA.desire)).reps("morning", 3);
      d.when(0, "12:40");
      const ch5 = d.weave(dreamId, "did", PROOF.quote);
      if (variant === "sealed") {
        // 'Save for 21:00' from Today [C], then heard at the ritual: sealed for today [D].
        d.when(0, "12:41").saveFor(ch5, at(0, "21:00"));
        d.when(0, "13:05").reps("afternoon", 6);
        d.when(0, "21:01").hear(ch5);
      } else {
        d.when(0, "13:05").reps("afternoon", 6);
      }
      return d;
    }
    // Today (mid): the 3·6·9 page, 11 of 18 so far.
    d.when(0, "08:12").phrase369(PHRASE_369(MAYA.desire)).reps("morning", 3);
    d.when(0, "13:05").reps("afternoon", 6);
    d.when(0, "20:50").reps("evening", 2);
    return d;
  }

  // eve / complete: proof 4 came sooner, then one or two more.
  d.when(-4, "12:40");
  const ch5 = d.weave(dreamId, "did", PROOF.quote);
  d.when(-4, "21:08").hear(ch5);
  d.when(-4, "21:10").choose(ch5, "brave");
  sketches();
  if (variant === "eve") {
    // Proof 5 (did) yesterday → Chapter VI heard, a 15-minute bridge open: the next proof is star 7.
    d.when(-2, "08:10").carry();
    d.when(-1, "18:30");
    const ch6 = d.weave(dreamId, "did", PROOF.sketches);
    d.when(-1, "21:05").hear(ch6);
    d.when(-1, "21:07").choose(ch6, "15min", IF_THEN_FOCUS, at(0, "13:30"));
    return d;
  }
  d.when(-2, "13:10");
  const ch6 = d.weave(dreamId, "did", PROOF.sketches);
  d.when(-2, "21:05").hear(ch6);
  d.when(-2, "21:07").choose(ch6, "15min");
  // Proof 6 (moved) yesterday is star 7: Chapter VII (Becoming) is woven and heard; the season waits for its name.
  d.when(-1, "17:45");
  const ch7 = d.weave(dreamId, "moved", PROOF.account);
  d.when(-1, "21:12").hear(ch7);
  return d;
}

/** A month in: Season 1 named 'The Studio', Season 2 Chapter I waiting, Plus, and a second dream. */
function mayaNamed(plus: boolean): Device {
  const d = new Device("maya-named");
  d.when(-32, "21:02");
  const { dreamId, chapterId: ch1 } = d.onboard(MAYA);
  d.when(-32, "21:14").hear(ch1);
  d.when(-32, "21:16").choose(ch1, "15min", IF_THEN, at(-31, "09:00"));
  for (const day of [-31, -30]) d.when(day, "08:20").carry();
  d.when(-29, "12:35");
  const ch2 = d.weave(dreamId, "did", PROOF.portfolio, { photoUri: PHOTOS.portfolio() });
  d.when(-29, "21:06").hear(ch2);
  d.when(-29, "21:09").choose(ch2, "brave");
  d.when(-28, "21:30").script("career", "sp-ca4", SCRIPT_ROOM, dreamId);
  d.when(-27, "08:15").carry();
  d.when(-25, "18:40");
  const ch3 = d.weave(dreamId, "learned", PROOF.froze, { origin: "not-today" });
  d.when(-25, "21:10").hear(ch3);
  d.when(-25, "21:12").choose(ch3, "2min");
  d.when(-24, "21:40").gratitude([
    ["gs1", "The printer answered on the first ring."],
    ["gs2", "Dee, who forwarded my portfolio without being asked."],
    ["gs9", "Reading the bakery's reply on the bus."],
  ]);
  for (const day of [-23, -22]) d.when(day, "08:10").carry();
  d.when(-21, "13:15");
  const ch4 = d.weave(dreamId, "moved", PROOF.call);
  d.when(-21, "21:06").hear(ch4);
  d.when(-21, "21:10").choose(ch4, "15min");
  d.when(-20, "19:20").scene({ photo: PHOTOS.studioLights(), caption: "Corner studio lights on the street I want to work on" }, dreamId);
  d.when(-20, "21:15").carry();
  for (const day of [-19, -18, -17]) d.when(day, "08:05").carry();
  d.when(-16, "12:40");
  const ch5 = d.weave(dreamId, "did", PROOF.quote);
  d.when(-16, "21:08").hear(ch5);
  d.when(-16, "21:10").choose(ch5, "brave");
  d.when(-15, "21:20").script("career", "sp-ca5", SCRIPT_PRICE, dreamId);
  // Wed 7 Oct: Vela Plus, and a second dream (no seed: Chapter I rolls without a woven proof).
  d.when(-14, "20:30").plus(true);
  const love = d.dream({ focus: "love", desire: "a calm home where friends drop by", feeling: "peaceful" });
  d.run({ type: "SET_ACTIVE_DREAM", dreamId });
  d.when(-14, "20:48").hear(love.chapterId);
  d.when(-14, "20:50").choose(love.chapterId, "15min");
  d.when(-14, "21:00").scene({ photo: PHOTOS.kitchenWindow(), caption: "The kitchen window at dusk, kettle on" }, love.dreamId);
  for (const day of [-13, -11]) d.when(day, "08:20").carry();
  d.when(-10, "19:05");
  const love2 = d.weave(love.dreamId, "did", "Invited two neighbors over for soup.");
  d.when(-10, "21:30").hear(love2);
  d.when(-10, "21:32").choose(love2, "2min");
  d.when(-9, "08:00").carry();
  d.when(-8, "13:10");
  const ch6 = d.weave(dreamId, "did", PROOF.sketches);
  d.when(-8, "21:05").hear(ch6);
  d.when(-8, "21:07").choose(ch6, "15min");
  d.when(-7, "21:40").gratitude([
    ["gs5", "Losing the first pitch. I know my rate now."],
    ["gs7", "A client who calls me by my studio's name."],
    ["gs8", "The shared workspace has a corner desk free in November."],
  ]);
  d.when(-6, "19:30").scene({ goal: "Ten clients who come back for a second project" }, dreamId);
  d.when(-5, "11:20");
  const love3 = d.weave(love.dreamId, "moved", "Cleared the hallway shelf so there is room for coats.");
  d.when(-5, "21:25").hear(love3);
  d.when(-5, "21:28").choose(love3, "15min");
  for (const day of [-4, -3]) d.when(day, "08:15").carry();
  d.when(-3, "19:40").scene({ photo: PHOTOS.sketches(), caption: "First sketches for the studio mark" }, dreamId);
  d.when(-2, "08:15").carry();
  // Tue 20 Oct: star 7 → Chapter VII heard → Named Sky 'The Studio' → Season 2 begins.
  d.when(-1, "17:45");
  const ch7 = d.weave(dreamId, "moved", PROOF.account);
  d.when(-1, "21:12").hear(ch7);
  const suggested = suggestConstellationNameOf(dreamOf(d.arc.index, dreamId)!);
  if (suggested !== "The Studio") throw new Error(`expected the suggested name 'The Studio', got '${suggested}'`);
  d.when(-1, "21:16").run({ type: "NAME_CONSTELLATION", dreamId, season: 1, name: suggested });
  d.when(-1, "21:18").run({ type: "BEGIN_NEXT_SEASON", dreamId });
  // Today: the 3·6·9 page, morning and afternoon done.
  d.when(0, "08:12").phrase369(PHRASE_369(MAYA.desire)).reps("morning", 3);
  d.when(0, "13:05").reps("afternoon", 6);
  if (!plus) d.when(0, "20:30").plus(false);
  return d;
}

/** Maya without the onboarding seed: six proofs carry her to Chapter VII, so the 7th is the last star and no chapter follows it. */
function mayaUnseededEve(): Device {
  const d = new Device("maya-unseeded");
  d.when(-13, "20:58");
  const { dreamId, chapterId: ch1 } = d.onboard({ ...MAYA, seed: undefined });
  d.when(-13, "21:10").hear(ch1);
  d.when(-13, "21:12").choose(ch1, "15min", IF_THEN, at(-12, "09:00"));
  const steps: [number, string, "did" | "moved" | "learned", string, BridgeTier][] = [
    [-11, "12:35", "did", PROOF.portfolio, "brave"],
    [-9, "18:40", "learned", PROOF.froze, "2min"],
    [-7, "13:15", "moved", PROOF.call, "15min"],
    [-5, "12:40", "did", PROOF.quote, "brave"],
    [-3, "13:10", "did", PROOF.sketches, "15min"],
    [-1, "17:45", "moved", PROOF.account, "15min"],
  ];
  for (const [day, time, kind, text, tier] of steps) {
    d.when(day, time);
    const ch = d.weave(dreamId, kind, text, kind === "learned" ? { origin: "not-today" } : undefined);
    d.when(day, "21:08").hear(ch);
    d.when(day, "21:10").choose(ch, tier);
  }
  return d;
}

export const PERSONAS: readonly Persona[] = [
  {
    id: "fresh",
    description: "Empty storage: the app starts First Light onboarding.",
    build: () => new Device("fresh"),
    expect: null,
  },
  {
    id: "maya-ch1",
    description: "Finished First Light last night at 21:02 (career, 'my own design studio, with clients who trust my eye', proud, evening 21:00, seed 'Bought the domain name.') and left before Chapter I reached 60%. Chapter I is written with the seed woven in gold, not yet heard. Today [A] 'Enter chapter'. (Onboarding the same day reads as [C]: the seed is a proof saved today.)",
    build: () => {
      const d = new Device("maya-ch1");
      d.when(-1, "21:02").onboard(MAYA);
      return d;
    },
    expect: { loop: "chapter-waiting", heard: false, stars: 1, season: 1, stage: 1, nights: [0, 0] },
  },
  {
    id: "maya-bridge",
    description: "Onboarded last night; Chapter I heard, then the 15-minute bridge 'Sketch the sign that will hang above the studio.' chosen with the if-then 'If it's 9am and I hesitate, then I open the sketchbook to a clean page.' Bridge open: Today [B] 'I crossed it' / 'Not today'.",
    build: () => {
      const d = new Device("maya-bridge");
      d.when(-1, "20:58");
      const { chapterId } = d.onboard(MAYA);
      d.when(-1, "21:10").hear(chapterId);
      d.when(-1, "21:12").choose(chapterId, "15min", IF_THEN, at(0, "09:00"));
      return d;
    },
    expect: { loop: "bridge-open", stars: 1, season: 1, stage: 1, nights: [1, 1] },
  },
  {
    id: "maya-mid",
    description: "Season 1 at Chapter V (Threshold), heard last night; its paragraph woven from yesterday's proof is gold. 5 proofs over 14 days (did, did, learned via Not today, moved, did), 13 nights with one rest night, a script page, a gratitude page, today's 3·6·9 at 11/18, 2 captioned Scenes. Free. Today [A] heard: 'Choose today's bridge'.",
    build: () => mayaSeason("mid"),
    expect: { loop: "chapter-waiting", heard: true, stars: 5, season: 1, stage: 5, nights: [12, 14] },
  },
  {
    id: "maya-woven",
    description: "maya-mid, except the 5th proof was logged today at 12:40: Chapter V is freshly woven and unheard. Today [C] 'Read now' / 'Save for 21:00'.",
    build: () => mayaSeason("woven"),
    expect: { loop: "next-woven", stars: 5, season: 1, stage: 5, nights: [12, 14] },
  },
  {
    id: "maya-sealed",
    description: "maya-woven, then 'Save for 21:00' (savedForAt today 21:00) and heard at 21:01. At the still clock (21:04) Today is [D] sealed for today; on a live clock before 21:00 it reads [D] 'sealed until 21:00'.",
    build: () => mayaSeason("sealed"),
    expect: { loop: "sealed", stars: 5, season: 1, stage: 5, nights: [12, 14] },
  },
  {
    id: "maya-eve",
    description: "Season 1 at Chapter VI (The Ordinary Day), heard last night, a 15-minute bridge open with an if-then ('after lunch' → 'put my phone in the other room'): the next proof is star 7 (Star Birth → Chapter VII → Named Sky). Today [B].",
    build: () => mayaSeason("eve"),
    expect: { loop: "bridge-open", stars: 6, season: 1, stage: 6, nights: [12, 14] },
  },
  {
    id: "maya-unseeded-eve",
    description: "Maya without the onboarding seed: six proofs in, Chapter VII (Becoming) heard last night and a 15-minute bridge open. The next proof is star 7 with no chapter after it: Star Birth → Named Sky → 'Begin Season 2' directly. Today [B].",
    build: mayaUnseededEve,
    expect: { loop: "bridge-open", stars: 6, season: 1, stage: 7, nights: [6, 8] },
  },
  {
    id: "maya-complete",
    description: "Season 1 complete: 7 stars, Chapter VII (Becoming) heard last night, constellation not named yet. Today shows the season-complete card (Named Sky).",
    build: () => mayaSeason("complete"),
    expect: { loop: "season-complete", named: false, stars: 7, season: 1, stage: 7, nights: [12, 14] },
  },
  {
    id: "maya-named",
    description: "A month in (~30 nights): Season 1 named 'The Studio' (7 stars) last night and Season 2 Chapter I waiting, Plus active, and a second dream (love, 'a calm home where friends drop by', 2 proofs, Chapter III heard, bridge open). A proof photo, 4 Scenes plus the proof photo, 4 journal pages, today's 3·6·9 at 9/18. Today [A] 'Enter chapter' with the ArcSwitcher.",
    build: () => mayaNamed(true),
    expect: { loop: "chapter-waiting", heard: false, stars: 0, season: 2, stage: 1, nights: [28, 32], dreams: 2, planLocked: 0 },
  },
  {
    id: "maya-lapsed",
    description: "maya-named after Plus lapsed ('vela.plus.v1' = '0'): nothing is mutated, but the love dream is plan-locked (readable, not weaving). Today shows 'Choose the dream that keeps weaving'.",
    build: () => mayaNamed(false),
    expect: { loop: "chapter-waiting", heard: false, stars: 0, season: 2, stage: 1, nights: [28, 32], dreams: 2, planLocked: 1 },
  },
];

/* =========================================================================
 * Manifest: what each persona is, for the screen builders
 * ========================================================================= */

function describe(d: Device) {
  const { index } = d.arc;
  const activeId = index.activeDreamId;
  const loop = loopStateOf(index, activeId, ANCHOR, d.isPlus);
  const summary = summarize(d.progress, totalStarsOf(index), ANCHOR);
  const dreams = index.dreams.map((dream) => {
    const season = seasonProgressOf(index, dream.id);
    const chapters = chaptersOf(index, dream.id);
    const latest = latestChapterOf(index, dream.id);
    const open = openBridgeOf(index, dream.id);
    return {
      id: dream.id,
      focus: dream.focus,
      desire: dream.desire,
      status: dream.status,
      weaving: weavingOf(index, d.isPlus).includes(dream.id),
      season: season?.season ?? null,
      stage: season?.stage ?? null,
      stars: season?.stars ?? 0,
      constellations: dream.constellations.map((c) => `${c.season}: ${c.name}`),
      loop: loopStateOf(index, dream.id, ANCHOR, d.isPlus),
      openBridge: open ? { id: open.id, tier: open.tier, text: open.text, ifThen: open.ifThen } : null,
      chapters: chapters.map((c) => ({
        id: c.id,
        label: `S${c.season} ${c.number}`,
        title: c.title,
        heard: c.heardAt !== null,
        woven: c.wovenProofId,
        latest: c.id === latest?.id,
      })),
      proofs: proofsOf(index, dream.id).map((p) => ({ id: p.id, star: `S${p.season}·${p.starIndex}`, kind: p.kind, origin: p.origin, dateKey: p.dateKey, text: p.text, photo: p.photoUri !== null })),
    };
  });
  const active = dreams.find((x) => x.id === activeId) ?? null;
  const latest = active ? active.chapters[active.chapters.length - 1] : null;
  const woven = active ? [...active.chapters].reverse().find((c) => c.woven) : null;
  const second = dreams.find((x) => x.id !== activeId) ?? null;
  const routes: Record<string, string> = { today: "/" };
  if (!d.profile) routes.onboarding = "/onboarding";
  if (active && latest) {
    Object.assign(routes, {
      reader: `/story/${latest.id}`,
      chapterOne: `/story/${active.chapters[0].id}`,
      ...(woven ? { woven: `/story/${woven.id}` } : {}),
      sky: `/sky/${active.id}`,
      evidence: `/evidence/${active.id}`,
      arc: "/arc",
      rituals: "/rituals",
      scenes: "/scenes",
      settings: "/settings",
      paywall: "/paywall",
      newDream: "/story/new",
      script: "/journal/script",
      m369: "/journal/method369",
      gratitude: "/journal/gratitude",
      affirmation: "/affirmation",
      affirmations: "/affirmations",
    });
    const lastProof = active.proofs[active.proofs.length - 1];
    // The finished Star Birth for the newest proof (an older proof shows the end state, no replay).
    if (lastProof) routes.born = `/evidence/${active.id}?born=${lastProof.id}`;
  }
  if (second) {
    const sl = second.chapters[second.chapters.length - 1];
    Object.assign(routes, { secondReader: `/story/${sl.id}`, secondSky: `/sky/${second.id}` });
  }
  if (d.journal.entries.length > 0) routes.journalEntry = `/journal/entry/${d.journal.entries[0].id}`;
  return {
    today: loop,
    chip: summary.chipLabel,
    week: summary.week.days.map((x) => x.state),
    plus: d.isPlus,
    planLocked: planLockedOf(index, d.isPlus),
    activeDreamId: activeId,
    profile: d.profile ? { name: d.profile.name, focusAreas: d.profile.focusAreas, ritual: d.profile.ritual, evening: d.profile.ritualTimes.evening } : null,
    routes,
    dreams,
    journal: d.journal.entries.map((e) => ({ id: e.id, kind: e.kind, dateKey: e.dateKey })),
    sheet369: d.journal.sheet ? { dateKey: d.journal.sheet.dateKey, done: d.journal.sheet.morning.length + d.journal.sheet.afternoon.length + d.journal.sheet.evening.length } : null,
    scenes: d.syncedScenes().cards.length,
  };
}

function verify(p: Persona, d: Device): string[] {
  const e = p.expect;
  if (!e) return d.arc.index.dreams.length === 0 && !d.profile ? [] : ["fresh must be empty"];
  const { index } = d.arc;
  const problems: string[] = [];
  const loop = loopStateOf(index, index.activeDreamId, ANCHOR, d.isPlus);
  if (loop.kind !== e.loop) problems.push(`loop ${loop.kind} ≠ ${e.loop}`);
  if (e.heard !== undefined && loop.kind === "chapter-waiting" && loop.heard !== e.heard) problems.push(`heard ${loop.heard} ≠ ${e.heard}`);
  if (e.named !== undefined && loop.kind === "season-complete" && loop.named !== e.named) problems.push(`named ${loop.named} ≠ ${e.named}`);
  const season = index.activeDreamId ? seasonProgressOf(index, index.activeDreamId) : undefined;
  if (season?.stars !== e.stars) problems.push(`stars ${season?.stars} ≠ ${e.stars}`);
  if (season?.season !== e.season) problems.push(`season ${season?.season} ≠ ${e.season}`);
  if (season?.stage !== e.stage) problems.push(`stage ${season?.stage} ≠ ${e.stage}`);
  const nights = d.progress.nightsShownUp;
  if (nights < e.nights[0] || nights > e.nights[1]) problems.push(`nights ${nights} ∉ [${e.nights.join(", ")}]`);
  if (e.dreams !== undefined && index.dreams.length !== e.dreams) problems.push(`dreams ${index.dreams.length} ≠ ${e.dreams}`);
  if (e.planLocked !== undefined && planLockedOf(index, d.isPlus).length !== e.planLocked) problems.push(`planLocked ≠ ${e.planLocked}`);
  // Every chapter the index names has its text, and every text is non-empty in both dayparts.
  for (const meta of index.chapters) {
    const text: Chapter | undefined = d.arc.texts[meta.id];
    if (!text || text.wordCount.morning < 100 || text.wordCount.evening < 100) problems.push(`chapter ${meta.id} text missing or short`);
  }
  // Nothing dated after the still instant except an explicit future (savedForAt, remindAt).
  for (const p2 of index.proofs) if (Date.parse(p2.createdAt) > ANCHOR.getTime()) problems.push(`proof ${p2.id} is in the future`);
  if (d.progress.days.some((k) => k > localDateKey(ANCHOR))) problems.push("a progress day is in the future");
  return problems;
}

/* =========================================================================
 * Main
 * ========================================================================= */

interface Built {
  readonly persona: Persona;
  readonly storage: Record<string, string>;
  readonly meta: ReturnType<typeof describe>;
}

export function buildAll(): Built[] {
  return PERSONAS.map((persona) => {
    const device = persona.build();
    const problems = verify(persona, device);
    if (problems.length > 0) throw new Error(`persona '${persona.id}' drifted: ${problems.join("; ")}`);
    return { persona, storage: device.storage(), meta: describe(device) };
  });
}

function manifestOf(built: readonly Built[]) {
  return {
    note: "Generated by `bun scripts/shots/seed.ts`. Do not edit by hand. Each <persona>.json is a localStorage snapshot (key → raw string); load it with scripts/shots/inject.mjs.",
    anchor: { local: "2026-10-21T21:04", iso: ANCHOR.toISOString(), dateKey: localDateKey(ANCHOR) },
    timezone: SEED_TZ,
    personas: Object.fromEntries(built.map((b) => [b.persona.id, { description: b.persona.description, keys: Object.keys(b.storage).length, bytes: JSON.stringify(b.storage).length, ...b.meta }])),
  };
}

const fileText = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function main(argv: readonly string[]): number {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const only = argv.filter((a) => !a.startsWith("--"));
  const unknown = only.filter((id) => !PERSONAS.some((p) => p.id === id));
  if (unknown.length > 0) {
    console.error(`unknown persona(s): ${unknown.join(", ")}. Known: ${PERSONAS.map((p) => p.id).join(", ")}`);
    return 2;
  }
  const built = buildAll();
  const manifest = manifestOf(built);
  const files: [string, string][] = [
    ...built.filter((b) => only.length === 0 || only.includes(b.persona.id)).map((b) => [`${b.persona.id}.json`, fileText(b.storage)] as [string, string]),
    [MANIFEST, fileText(manifest)],
  ];

  if (flags.has("--list")) {
    for (const b of built) {
      const t = b.meta.today;
      const state = t.kind === "chapter-waiting" ? `${t.kind}(${t.heard ? "heard" : "unheard"})` : t.kind;
      console.log(`${b.persona.id.padEnd(14)} ${state.padEnd(26)} ${b.meta.chip.padEnd(20)} ${b.persona.description}`);
    }
    return 0;
  }

  if (flags.has("--check")) {
    const stale = files.filter(([name, text]) => {
      const file = path.join(SEEDS_DIR, name);
      return !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text;
    });
    if (stale.length > 0) {
      console.error(`stale seeds: ${stale.map(([n]) => n).join(", ")}. Run: bun scripts/shots/seed.ts`);
      return 1;
    }
    console.log(`seeds up to date (${files.length} files)`);
    return 0;
  }

  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  for (const [name, text] of files) fs.writeFileSync(path.join(SEEDS_DIR, name), text);
  for (const b of built) {
    if (only.length > 0 && !only.includes(b.persona.id)) continue;
    const t = b.meta.today;
    const state = t.kind === "chapter-waiting" ? `${t.kind}(${t.heard ? "heard" : "unheard"})` : t.kind;
    console.log(`wrote ${`${b.persona.id}.json`.padEnd(20)} ${String(Object.keys(b.storage).length).padStart(2)} keys  ${state.padEnd(26)} ${b.meta.chip}`);
  }
  console.log(`wrote ${MANIFEST}`);
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
