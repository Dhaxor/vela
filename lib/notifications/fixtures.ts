// Test fixtures for lib/notifications/*.test.ts (never imported by app code).

import type { Bridge, ChapterMeta, Dream, Proof, SeasonProgress } from "@/contexts/arc.types";
import type { NotificationLibrary, NotificationTemplate, StageId } from "@/lib/story/content/types";
import type { NotificationDreamState, NotificationSnapshot } from "./types";

const nt = (id: string, title: string, body: string): NotificationTemplate => ({ id, title, body });

/** A small fixed library: two neutral ritual-chapter templates plus personal ones in most slots. */
export const TEST_LIBRARY: NotificationLibrary = {
  "ritual-chapter": [
    nt("rc1", "Chapter {chapter.numeral} is waiting", "Whenever you are ready, {name}."),
    nt("rc2", "{chapter.title}", "Your next chapter is here, {name}."),
    nt("rc3", "For {desire.quote}", "Chapter {chapter.numeral} is waiting."),
  ],
  "ritual-bridge": [
    nt("rb1", "Today’s bridge", "One small step is waiting, {name}."),
    nt("rb2", "Today’s bridge", "{bridge.quote}. You chose it."),
  ],
  ifthen: [
    nt("if1", "This is the moment", "The moment you planned for is here."),
    nt("if2", "It’s {ifthen.when}", "Time to {ifthen.then}."),
  ],
  "next-woven": [nt("nw1", "Chapter {chapter.numeral} is ready", "It begins with what you did.")],
  ledger: [
    nt("lg1", "Your week in stars", "{proofs.phrase} this week. Your ledger is ready."),
    nt("lg2", "Your week in stars", "This week’s Proof Ledger is ready."),
  ],
  "quiet-return": [
    nt("qr1", "Your sky kept your place", "Your story is here whenever you are."),
    nt("qr2", "{nights.phrase} so far", "Your story kept your place, {name}."),
  ],
};

export function dream(id: string, overrides: Partial<Dream> = {}): Dream {
  return {
    id,
    focus: "career",
    desire: "my own design studio.",
    feeling: "proud",
    label: null,
    createdAt: "2026-10-01T09:00:00.000Z",
    status: "active",
    statusChangedAt: "2026-10-01T09:00:00.000Z",
    season: 1,
    seasonStartedAt: "2026-10-01T09:00:00.000Z",
    constellations: [],
    usedIds: [],
    motifIds: [],
    ...overrides,
  };
}

export function chapter(id: string, dreamId: string, overrides: Partial<ChapterMeta> = {}): ChapterMeta {
  const stage = (overrides.stage ?? overrides.number ?? 2) as StageId;
  return {
    id,
    dreamId,
    season: 1,
    number: stage,
    stage,
    title: "The Studio Door",
    revision: 1,
    source: "engine",
    createdAt: "2026-10-14T09:00:00.000Z",
    revisedAt: null,
    wovenProofId: null,
    bridgeId: null,
    heardAt: null,
    savedForAt: null,
    ...overrides,
  };
}

export function bridge(id: string, dreamId: string, chapterId: string, overrides: Partial<Bridge> = {}): Bridge {
  return {
    id,
    dreamId,
    chapterId,
    season: 1,
    tier: "15min",
    libraryId: "br-ca01",
    text: "Send one piece of work to someone whose eye you trust.",
    ifThen: null,
    remindAt: null,
    status: "open",
    createdAt: "2026-10-14T21:00:00.000Z",
    resolvedAt: null,
    proofId: null,
    ...overrides,
  };
}

export function proof(id: string, dreamId: string, dateKey: string, overrides: Partial<Proof> = {}): Proof {
  return {
    id,
    dreamId,
    bridgeId: null,
    kind: "did",
    text: "Sent my portfolio to two studios.",
    photoUri: null,
    createdAt: `${dateKey}T12:00:00.000Z`,
    dateKey,
    wovenInChapterId: null,
    starIndex: 1,
    season: 1,
    origin: "bridge",
    ...overrides,
  };
}

export function season(dreamId: string, stars: number, overrides: Partial<SeasonProgress> = {}): SeasonProgress {
  return {
    dreamId,
    season: 1,
    stage: Math.min(stars + 1, 7) as StageId,
    stars,
    starsPerSeason: 7,
    complete: stars >= 7,
    constellationName: null,
    chaptersWritten: Math.min(stars + 1, 7),
    ...overrides,
  };
}

/** A dream waiting on an unheard Chapter II. */
export function dreamState(id: string, overrides: Partial<NotificationDreamState> = {}): NotificationDreamState {
  const latest = chapter(`c-${id}`, id);
  return {
    dream: dream(id),
    loop: { kind: "chapter-waiting", dreamId: id, chapterId: latest.id, heard: false },
    latestChapter: latest,
    openBridge: null,
    latestProof: null,
    season: season(id, 1),
    proofCount: 1,
    ...overrides,
  };
}

export function snapshot(overrides: Partial<NotificationSnapshot> = {}): NotificationSnapshot {
  return {
    enabled: true,
    lockScreenPrivate: true,
    pausedUntil: null,
    name: "Maya",
    ritual: "evening",
    ritualTimes: { morning: "08:00", evening: "21:00" },
    dreams: [dreamState("d1")],
    nightsShownUp: 5,
    lastActDateKey: null,
    proofDateKeys: [],
    ...overrides,
  };
}
