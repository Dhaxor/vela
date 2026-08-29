import type { FocusId } from "./focus";

export type ActionState = "open" | "completed" | "reshaped";

export interface FutureAction {
  id: string;
  intentId: string;
  storyId: string;
  text: string;
  state: ActionState;
  createdAt: string;
  completedAt?: string;
  evidence?: string;
  evidenceKind?: EvidenceKind;
}

export type EvidenceKind = "did" | "moved" | "learned";

export interface ProofPoint {
  dateKey: string;
  count: number;
}

const ACTIONS: Record<FocusId, readonly string[]> = {
  love: [
    "Send one honest line of appreciation to someone who matters.",
    "Make ten undistracted minutes for a conversation you usually postpone.",
    "Name one boundary that would make closeness feel safer.",
  ],
  abundance: [
    "Move one small amount toward the future you described.",
    "Write down one resource you already have and one way to use it today.",
    "Take one five-minute step toward an opportunity you have been circling.",
  ],
  career: [
    "Create one visible piece of work, however small, before consuming advice.",
    "Send the message that could move this future one conversation closer.",
    "Protect twenty focused minutes for the skill your future self relies on.",
  ],
  health: [
    "Choose one action your body will thank you for tonight.",
    "Take a ten-minute walk without turning it into a performance.",
    "Prepare the next nourishing choice before you become tired or rushed.",
  ],
  confidence: [
    "Do one small thing before you feel fully ready, then record what happened.",
    "Say your preference once without explaining it away.",
    "Keep one promise to yourself that takes less than fifteen minutes.",
  ],
  peace: [
    "Remove one avoidable demand from the next hour.",
    "Sit for three quiet minutes and name what does not need solving today.",
    "Finish one open loop that has been quietly taking your attention.",
  ],
};

function hash(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function deriveFutureAction(input: {
  focus: FocusId;
  desire: string;
  chapter: number;
}): string {
  const pool = ACTIONS[input.focus];
  const index = hash(`${input.focus}|${input.desire}|${input.chapter}`) % pool.length;
  return pool[index];
}

export function sanitizeEvidence(value: string): string {
  return value.trim().replace(/\s+/gu, " ").slice(0, 240);
}

export function evidenceBridge(evidence?: string): string | undefined {
  const clean = evidence ? sanitizeEvidence(evidence) : "";
  if (!clean) return undefined;
  return `There is proof behind this memory now: ${clean}. It is small enough to be real, and real enough to change what comes next.`;
}

export function dateKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function proofConstellation(actions: readonly FutureAction[]): ProofPoint[] {
  const counts = new Map<string, number>();
  for (const action of actions) {
    if (!action.completedAt || !action.evidence) continue;
    const key = dateKey(action.completedAt);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, count]) => ({ dateKey: key, count }));
}

export function proofEnding(kind: EvidenceKind): string {
  if (kind === "learned") return "The lesson is now part of tomorrow's chapter.";
  if (kind === "moved") return "Movement counts. Tomorrow's chapter will begin from here.";
  return "You made the imagined future observable. Tomorrow's chapter will remember it.";
}
