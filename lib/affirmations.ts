// The affirmation library — all original writing, keyed by focus area.
// The daily pick is deterministic from the local date and the user's chosen
// areas: same day, same line, on every open — it should feel like the day's
// weather, not a slot machine.

import type { FocusId } from "@/lib/focus";
import { mulberry32 } from "@/lib/story/rng";

export interface Affirmation {
  id: string;
  focus: FocusId;
  text: string;
}

const a = (focus: FocusId, n: number, text: string): Affirmation => ({
  id: `${focus}${n}`,
  focus,
  text,
});

export const AFFIRMATIONS: readonly Affirmation[] = [
  // love
  a("love", 1, "I am easy to love, and I let love be easy."),
  a("love", 2, "The love I want is also looking for me."),
  a("love", 3, "I bring warmth into every room I enter."),
  a("love", 4, "I am worthy of a love that feels like rest, not work."),
  a("love", 5, "I give affection freely because my well is full."),
  a("love", 6, "The right people recognize me without a performance."),
  a("love", 7, "My heart is open and my standards are intact — both at once."),
  a("love", 8, "I am already whole; love joins me, it doesn't complete me."),
  a("love", 9, "Every kindness I give circles back to me multiplied."),
  a("love", 10, "I release the loves that were lessons and keep the wisdom."),
  a("love", 11, "Being fully myself is the most magnetic thing I do."),
  a("love", 12, "I attract relationships where honesty is safe."),
  a("love", 13, "Today I let myself be seen, and being seen brings me closer."),
  a("love", 14, "I speak to myself like someone I'm in love with."),
  a("love", 15, "Connection finds me because I stay open to ordinary moments."),
  a("love", 16, "I am building a love that my younger self is applauding."),
  a("love", 17, "Tenderness is strength wearing its work clothes."),
  a("love", 18, "The way I love myself teaches everyone else the standard."),
  a("love", 19, "I trust the timing of the hearts headed toward mine."),
  a("love", 20, "Love is not scarce, and neither am I."),

  // abundance
  a("abundance", 1, "Money moves toward me like water moves downhill — naturally."),
  a("abundance", 2, "I am allowed to want more and grateful for what's here."),
  a("abundance", 3, "Every skill I sharpen raises my ceiling."),
  a("abundance", 4, "Wealth is a consequence of the value I create, and I create daily."),
  a("abundance", 5, "I make decisions from abundance, not from fear of the bill."),
  a("abundance", 6, "Opportunities know my address."),
  a("abundance", 7, "I charge what the work is worth and deliver more than I charge."),
  a("abundance", 8, "My relationship with money is calm, adult, and improving."),
  a("abundance", 9, "There is more than enough, and some of it has my name on it."),
  a("abundance", 10, "I plant seeds daily; some of them are already trees."),
  a("abundance", 11, "Enough is my floor now, not my ceiling."),
  a("abundance", 12, "I let money rest in my hands without anxiety squeezing it."),
  a("abundance", 13, "Generosity fits my budget because my budget keeps growing."),
  a("abundance", 14, "I am the kind of person good news looks for."),
  a("abundance", 15, "What I appreciate, appreciates."),
  a("abundance", 16, "I release survival math; I do abundance math now."),
  a("abundance", 17, "My income grows as quietly and steadily as my belief did."),
  a("abundance", 18, "I say yes to the good option, not just the survivable one."),
  a("abundance", 19, "Prosperity looks natural on me."),
  a("abundance", 20, "I built a life where rest is affordable."),

  // career
  a("career", 1, "My work asks for me by name."),
  a("career", 2, "I do fewer things, better, and it shows."),
  a("career", 3, "Rooms I used to knock on now hold a chair for me."),
  a("career", 4, "I trust my first draft enough to start and my craft enough to finish."),
  a("career", 5, "My competence has stopped surprising me."),
  a("career", 6, "I am building a body of work, not a pile of tasks."),
  a("career", 7, "The problems I solve are worth more every year."),
  a("career", 8, "I end my workday on purpose, mid-victory."),
  a("career", 9, "Doors are mostly unlocked; I walk like I know it."),
  a("career", 10, "I was not made for the shallow end."),
  a("career", 11, "My name travels well in rooms I'm not in."),
  a("career", 12, "Focus is my unfair advantage."),
  a("career", 13, "I decline what isn't mine so what's mine can find me free."),
  a("career", 14, "Every honest brick I lay becomes a wall others lean on."),
  a("career", 15, "I am paid well to be exactly this useful."),
  a("career", 16, "The imposter voice retired; the craftsman stayed."),
  a("career", 17, "I ship. That is the whole secret."),
  a("career", 18, "My ambition and my peace have signed a treaty."),
  a("career", 19, "I make difficult things fold."),
  a("career", 20, "Someday was a place; I moved."),

  // health
  a("health", 1, "My body is on my team, and I captain it kindly."),
  a("health", 2, "Energy is my baseline, not my bonus."),
  a("health", 3, "I answer my body before it has to shout."),
  a("health", 4, "Every walk, every glass of water, every early night — deposits."),
  a("health", 5, "Strong is a fact I carry lightly."),
  a("health", 6, "I move for the joy of it, and the mirror lost its gavel."),
  a("health", 7, "Rest is training too. I take it seriously."),
  a("health", 8, "My sleep is deep because my days are honest."),
  a("health", 9, "I feed myself like someone with plans."),
  a("health", 10, "Healing is happening in me right now, quietly, on schedule."),
  a("health", 11, "I am the brisk one now, the steady one."),
  a("health", 12, "My breath is an anchor I never leave home without."),
  a("health", 13, "Vitality stopped being a goal and became my address."),
  a("health", 14, "I keep promises to my body, and my body keeps them back."),
  a("health", 15, "Stairs are just stairs now."),
  a("health", 16, "I am gentle with the tired days and grateful for the strong ones."),
  a("health", 17, "The machine hums because the mechanic cares."),
  a("health", 18, "My appetite, my sleep, my breath — in rhythm, on my team."),
  a("health", 19, "I choose the long way back, on purpose, often."),
  a("health", 20, "Wellness looks ordinary on me now. That was the goal."),

  // confidence
  a("confidence", 1, "I say the actual thing, and my voice holds."),
  a("confidence", 2, "No is a full sentence. Yes means yes."),
  a("confidence", 3, "I belong everywhere my feet are."),
  a("confidence", 4, "I trust my first answer; I've earned that trust."),
  a("confidence", 5, "The loudest stranger's opinion weighs almost nothing now."),
  a("confidence", 6, "I walk into rooms without rehearsing the walk."),
  a("confidence", 7, "Small braveries, compounding daily — that's my whole method."),
  a("confidence", 8, "I ask for exactly what I want, in one sentence."),
  a("confidence", 9, "I repair mistakes without the ceremonial self-flogging."),
  a("confidence", 10, "My posture tells the truth before I do: I belong."),
  a("confidence", 11, "I keep the true part of criticism and hand back the rest."),
  a("confidence", 12, "Permission was never required. Motion was."),
  a("confidence", 13, "I take up exactly as much space as I need. No apology tax."),
  a("confidence", 14, "A hundred kept promises to myself built this voice."),
  a("confidence", 15, "I'd rather be fully myself than perfectly palatable."),
  a("confidence", 16, "Fear gets a seat, not the wheel."),
  a("confidence", 17, "I order the unpronounceable dish."),
  a("confidence", 18, "My presence doesn't beg; it lands."),
  a("confidence", 19, "I stopped auditioning for lives smaller than mine."),
  a("confidence", 20, "Certain? No. Willing? Completely. That's enough."),

  // peace
  a("peace", 1, "The urgency was never mine. I handed it back."),
  a("peace", 2, "I do one thing at a time, and the world keeps turning."),
  a("peace", 3, "There is a hallway between me and my thoughts now."),
  a("peace", 4, "My mornings have margins."),
  a("peace", 5, "Rest doesn't need to be earned. I take it like water."),
  a("peace", 6, "I leave gaps in the day and the gaps do quiet work."),
  a("peace", 7, "Other people's storms brush past me; I no longer audition for parts in them."),
  a("peace", 8, "Calm is a route I keep choosing, not a place I arrive."),
  a("peace", 9, "I meet chaos like a slow river meets a stone: around, over, on."),
  a("peace", 10, "My phone is a tool, not a tide."),
  a("peace", 11, "The pause is where my power lives."),
  a("peace", 12, "Whatever is unfinished has agreed to wait until morning."),
  a("peace", 13, "I breathe out longer than I breathe in, and the day softens."),
  a("peace", 14, "Nothing is on fire, and I've stopped scanning for smoke."),
  a("peace", 15, "Stillness is not empty; it is where I refill."),
  a("peace", 16, "I answer urgency with thoroughness, once, kindly."),
  a("peace", 17, "My nervous system is learning the new address: safe."),
  a("peace", 18, "Slow is a speed I'm allowed to move at."),
  a("peace", 19, "I protect my attention like the estate it is."),
  a("peace", 20, "Today has enough room in it. So do I."),
] as const;

export function affirmationsFor(focus: FocusId): readonly Affirmation[] {
  return AFFIRMATIONS.filter((x) => x.focus === focus);
}

/** Seed a PRNG from a local date key like "2026-07-31". */
function seedFromDateKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The day's affirmation: deterministic for (date, chosen areas). Draws from
 * the user's focus areas — all areas when none are chosen — and rotates the
 * area day by day so a two-area user isn't stuck alternating two moods.
 */
export function dailyAffirmation(
  key: string,
  focusAreas: readonly FocusId[]
): Affirmation {
  const areas: readonly FocusId[] =
    focusAreas.length > 0
      ? focusAreas
      : (["love", "abundance", "career", "health", "confidence", "peace"] as const);
  const rng = mulberry32(seedFromDateKey(key));
  const area = areas[Math.floor(rng() * areas.length)];
  const pool = affirmationsFor(area);
  return pool[Math.floor(rng() * pool.length)];
}
