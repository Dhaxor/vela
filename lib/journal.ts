// Journal domain rules — pure. Three practices:
//
//   script     — future-self scripting against a daily prompt
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

/** Future-self scripting prompts — original, present-tense, one per day. */
export const SCRIPT_PROMPTS: readonly Prompt[] = [
  { id: "sp1", text: "It's tomorrow evening, and today went exactly as you hoped. Write what happened, in past tense, as if you're telling a friend." },
  { id: "sp2", text: "Describe an ordinary morning three months from now, after everything you're calling in has arrived." },
  { id: "sp3", text: "Write the phone call where you tell someone you love that it finally happened." },
  { id: "sp4", text: "Your future self kept a diary. Write today's entry from one year ahead." },
  { id: "sp5", text: "Describe the room you're sitting in when you realize the wanting is over." },
  { id: "sp6", text: "Write a thank-you note from the person you're becoming to the person you are today." },
  { id: "sp7", text: "List five small details of your achieved life — the kind only you would notice." },
  { id: "sp8", text: "Write the moment someone asks 'how did you do it?' — and your honest answer." },
  { id: "sp9", text: "Describe what you no longer worry about, and what fills that space now." },
  { id: "sp10", text: "Write tomorrow's to-do list as the person who already has what you want." },
  { id: "sp11", text: "Describe the first sixty seconds after the good news arrives." },
  { id: "sp12", text: "Write about a habit your future self keeps that today-you is starting right now." },
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
