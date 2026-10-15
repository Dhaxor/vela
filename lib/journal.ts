// Journal domain rules — pure. Three practices:
//
//   script     — scripting a day inside the life you want, against a daily prompt
//   method369  — one intention written 3× in the morning, 6× at midday,
//                9× in the evening (the structure IS the method)
//   gratitude  — three lines, no ceremony
//
// UI and storage live elsewhere; everything here is testable arithmetic.

import { mulberry32 } from "@/lib/story/rng";

export type Slot369 = "morning" | "afternoon" | "evening";

export const SLOT_CAPS: Record<Slot369, number> = {
  morning: 3,
  afternoon: 6,
  evening: 9,
};

export const TOTAL_369 = 18;

/** Which block of the day a given hour belongs to. */
export function slotForHour(hour: number): Slot369 {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export interface Sheet369 {
  dateKey: string;
  phrase: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
}

export function emptySheet(dateKey: string, phrase: string): Sheet369 {
  return { dateKey, phrase, morning: [], afternoon: [], evening: [] };
}

export function progress369(sheet: Sheet369): {
  done: number;
  total: number;
  complete: boolean;
  bySlot: Record<Slot369, { done: number; cap: number }>;
} {
  const bySlot = {
    morning: { done: sheet.morning.length, cap: SLOT_CAPS.morning },
    afternoon: { done: sheet.afternoon.length, cap: SLOT_CAPS.afternoon },
    evening: { done: sheet.evening.length, cap: SLOT_CAPS.evening },
  };
  const done =
    Math.min(bySlot.morning.done, 3) +
    Math.min(bySlot.afternoon.done, 6) +
    Math.min(bySlot.evening.done, 9);
  return { done, total: TOTAL_369, complete: done >= TOTAL_369, bySlot };
}

/**
 * Add one repetition to a slot. The cap is structural — the method is 3/6/9,
 * not "as many as you like" — so overfilled slots reject rather than grow.
 */
export function addRepetition(sheet: Sheet369, slot: Slot369, text: string): Sheet369 | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (sheet[slot].length >= SLOT_CAPS[slot]) return null;
  return { ...sheet, [slot]: [...sheet[slot], trimmed] };
}

// ------------------------------------------------------------------ prompts

export interface Prompt {
  id: string;
  text: string;
}

/** Scripting prompts — original, one per day. */
export const SCRIPT_PROMPTS: readonly Prompt[] = [
  { id: "sp1", text: "It's tomorrow evening, and today went exactly as you hoped. Write what happened, in past tense, as if you're telling a friend." },
  { id: "sp2", text: "Describe an ordinary morning three months from now, after everything you're calling in has arrived." },
  { id: "sp3", text: "Write the phone call where you tell someone you love that it finally happened." },
  { id: "sp4", text: "It is one year from today. Write that day's diary entry." },
  { id: "sp5", text: "Describe the room you're sitting in when you realize the wanting is over." },
  { id: "sp6", text: "Write a thank-you note from the person you're becoming to the person you are today." },
  { id: "sp7", text: "List five small details of your achieved life — the kind only you would notice." },
  { id: "sp8", text: "Write the moment someone asks 'how did you do it?' — and your honest answer." },
  { id: "sp9", text: "Describe what you no longer worry about, and what fills that space now." },
  { id: "sp10", text: "Write tomorrow's to-do list as the person who already has what you want." },
  { id: "sp11", text: "Describe the first sixty seconds after the good news arrives." },
  { id: "sp12", text: "Write about a habit the person you're becoming keeps, and the first small piece of it you can start today." },
] as const;

/** Gratitude stems — three per day, deterministic. */
export const GRATITUDE_STEMS: readonly Prompt[] = [
  { id: "g1", text: "Something small that went right today…" },
  { id: "g2", text: "A person I'm glad exists…" },
  { id: "g3", text: "Something my body did for me today…" },
  { id: "g4", text: "A comfort I usually overlook…" },
  { id: "g5", text: "Something hard that taught me something…" },
  { id: "g6", text: "A sound, taste, or sight I enjoyed…" },
  { id: "g7", text: "Something I have that I once wished for…" },
  { id: "g8", text: "A door that is open to me right now…" },
  { id: "g9", text: "Something about today I'd relive…" },
] as const;

function seedFrom(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The day's scripting prompt — same all day, different tomorrow. */
export function dailyPrompt(dateKey: string): Prompt {
  const rng = mulberry32(seedFrom(`prompt:${dateKey}`));
  return SCRIPT_PROMPTS[Math.floor(rng() * SCRIPT_PROMPTS.length)];
}

/** Three distinct gratitude stems for the day. */
export function dailyGratitudeStems(dateKey: string): Prompt[] {
  const rng = mulberry32(seedFrom(`gratitude:${dateKey}`));
  const pool = [...GRATITUDE_STEMS];
  const picked: Prompt[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// ------------------------------------------------------------- storage v2
//
// 'vela.journal.v2': every entry keeps a stable id so a past page can be
// opened (/journal/entry/[id]); an entry may name the prompt and the dream it
// answered. Migrated once from 'vela.journal.v1', which stays untouched.

export type EntryKind = "script" | "gratitude";

export interface JournalEntry {
  id: string;
  kind: EntryKind;
  /** LOCAL date it was written. */
  dateKey: string;
  /** The prompt (script) or stems (gratitude, joined) the entry answered. */
  prompt: string;
  text: string;
  createdAt: string;
  /** Content id of the prompt ('sp-ca4', 'gs12'), when known. */
  promptId?: string;
  /** The dream an arc-linked prompt was about. */
  dreamId?: string;
}

export interface JournalData {
  version: 2;
  /** Newest first. */
  entries: JournalEntry[];
  /** Today's (or the most recent) 3·6·9 sheet. */
  sheet: Sheet369 | null;
  /** The 3·6·9 phrase carried between days. */
  phrase369: string;
}

export const MAX_ENTRIES = 500;
export const ENTRY_TEXT_MAX = 4000;
export const PHRASE_369_MAX = 80;

export function emptyJournal(): JournalData {
  return { version: 2, entries: [], sheet: null, phrase369: "" };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function parseSheet(v: unknown): Sheet369 | null {
  if (!isRecord(v) || typeof v.dateKey !== "string" || typeof v.phrase !== "string") return null;
  return { dateKey: v.dateKey, phrase: v.phrase, morning: strings(v.morning), afternoon: strings(v.afternoon), evening: strings(v.evening) };
}

function parseEntry(v: unknown, index: number): JournalEntry | null {
  if (!isRecord(v) || (v.kind !== "script" && v.kind !== "gratitude") || typeof v.text !== "string" || !v.text.trim()) return null;
  const createdAt = typeof v.createdAt === "string" && Number.isFinite(Date.parse(v.createdAt)) ? v.createdAt : new Date(0).toISOString();
  return {
    // 1.0 entries already carry ids; anything without one gets a stable derived id.
    id: typeof v.id === "string" && v.id ? v.id : `j-${seedFrom(`${createdAt}|${index}|${v.text}`).toString(36)}`,
    kind: v.kind,
    dateKey: typeof v.dateKey === "string" ? v.dateKey : createdAt.slice(0, 10),
    prompt: typeof v.prompt === "string" ? v.prompt : "",
    text: v.text,
    createdAt,
    ...(typeof v.promptId === "string" ? { promptId: v.promptId } : {}),
    ...(typeof v.dreamId === "string" ? { dreamId: v.dreamId } : {}),
  };
}

function parseJournalShape(v: unknown): JournalData {
  if (!isRecord(v)) return emptyJournal();
  const seen = new Set<string>();
  const entries: JournalEntry[] = [];
  (Array.isArray(v.entries) ? v.entries : []).forEach((raw, i) => {
    const e = parseEntry(raw, i);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      entries.push(e);
    }
  });
  return {
    version: 2,
    entries: entries.slice(0, MAX_ENTRIES),
    sheet: parseSheet(v.sheet),
    phrase369: typeof v.phrase369 === "string" ? v.phrase369.slice(0, PHRASE_369_MAX) : "",
  };
}

/** Stored 'vela.journal.v2' value. Anything malformed reads as empty. */
export function parseJournal(raw: unknown): JournalData {
  return isRecord(raw) && raw.version === 2 ? parseJournalShape(raw) : emptyJournal();
}

/** 1.0 'vela.journal.v1' ({entries, sheet, phrase369}) → v2, keeping ids. */
export function journalFromV1(raw: unknown): JournalData {
  return parseJournalShape(raw);
}

/** Prepend a new entry (trimmed, capped). */
export function addJournalEntry(data: JournalData, entry: JournalEntry): JournalData {
  const text = entry.text.trim().slice(0, ENTRY_TEXT_MAX);
  if (!text) return data;
  return { ...data, entries: [{ ...entry, text }, ...data.entries.filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES) };
}
