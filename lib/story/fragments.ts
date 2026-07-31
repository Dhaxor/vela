// The story library. All original writing — this is the product.
//
// A story is assembled beat by beat:
//   opening → arrival → sensory → living → witness → gratitude → closing
//
// Slot grammar rules (learned the hard way by every template system):
//   {name}    — safe anywhere.
//   {desire}  — the user's own words, any shape ("a loving partner",
//               "to open my bakery", "financial freedom"). Only ever placed
//               after a colon, an em-dash, or "…that {desire} is/was…" frames
//               that tolerate noun phrases and infinitives alike.
//   {feeling} — an adjective from the feeling chips ("you feel {feeling}").
//   {domain}  — the focus area's domain word ("love", "abundance", …).
//
// Beats `arrival` and `living` are focus-specific; the rest are shared.

import type { FocusId } from "@/lib/focus";

export type Beat =
  | "opening"
  | "arrival"
  | "sensory"
  | "living"
  | "witness"
  | "gratitude"
  | "closing";

export interface Fragment {
  id: string;
  beat: Beat;
  /** undefined = shared across all focus areas */
  focus?: FocusId;
  text: string;
}

const f = (id: string, beat: Beat, text: string, focus?: FocusId): Fragment => ({
  id,
  beat,
  text,
  ...(focus ? { focus } : {}),
});

export const FRAGMENTS: readonly Fragment[] = [
  // ---------------------------------------------------------------- opening
  f("op1", "opening", "You wake before the alarm, and for once there is no bracing — just the quiet certainty that the day is already on your side."),
  f("op2", "opening", "Morning arrives softly, {name}. The light through the curtains lands on a life you no longer have to talk yourself into."),
  f("op3", "opening", "The first breath of the day comes easy. Somewhere between sleep and waking, you remember: it happened. It's real now."),
  f("op4", "opening", "You open your eyes in the middle of the life you used to rehearse at night, and it fits you like it was measured."),
  f("op5", "opening", "There's a particular stillness in the room this morning — the stillness of nothing being wrong and nothing being missing."),
  f("op6", "opening", "You stretch, and the old tightness isn't there. The body knows before the mind does: things are different now."),
  f("op7", "opening", "The day doesn't ask anything of you yet. It just waits, warm and unhurried, while you remember who you've become."),
  f("op8", "opening", "You wake up smiling at nothing in particular, which is to say: at everything."),
  f("op9", "opening", "No scramble, no dread, no list running before your feet touch the floor. Just morning, and you, and the life that answered."),
  f("op10", "opening", "Half-awake, you reach for the worry out of habit — and find it isn't where you left it. It hasn't been there for a while."),

  // ---------------------------------------------------------------- arrival
  // love
  f("ar-love1", "arrival", "There's warmth on the other side of the bed, and the sound of someone moving gently through your morning like they belong in it — because they do. What you asked for is simply here now: {desire}.", "love"),
  f("ar-love2", "arrival", "A cup appears at your elbow, made the way you like it without asking. Small proof, daily proof, that you are known. This is what it turned into: {desire}.", "love"),
  f("ar-love3", "arrival", "You catch yourself mid-laugh at something whispered across the kitchen, and realize you can't remember the last morning that started without this ease. It's true now: {desire}.", "love"),
  f("ar-love4", "arrival", "Love, it turns out, is mostly this: someone's keys next to yours in the bowl, someone's plans folded into your plans. The intention you once wrote — {desire} — reads like a description now.", "love"),
  f("ar-love5", "arrival", "You are not performing for anyone. You are simply loved, at room temperature, on an ordinary Tuesday. That was the whole ask: {desire}.", "love"),
  f("ar-love6", "arrival", "Your phone buzzes: a message that exists for no reason except that someone was thinking of you. You set it down slowly, savoring it. This is the life where {desire} is just how things are.", "love"),

  // abundance
  f("ar-ab1", "arrival", "You check the numbers with your coffee — not out of fear, just to watch them. They hold. They grow. What you once whispered — {desire} — is now arithmetic.", "abundance"),
  f("ar-ab2", "arrival", "A bill arrives and you pay it the way you'd brush a crumb from the table. That's the whole event. That's the miracle nobody claps for: {desire}, settled into routine.", "abundance"),
  f("ar-ab3", "arrival", "There is money moving toward you while you sleep now, {name}. You built that. The old prayer — {desire} — became a system.", "abundance"),
  f("ar-ab4", "arrival", "You say yes to the good option instead of the survivable one, and nothing flinches. Not the account, not you. This is what it feels like: {desire}.", "abundance"),
  f("ar-ab5", "arrival", "The fridge is full, the debts are quiet, and generosity fits in your budget like it was always meant to. Written once as a wish — {desire} — lived now as a Tuesday.", "abundance"),
  f("ar-ab6", "arrival", "You tip well. You book the trip. You breathe. Enough stopped being a ceiling and became a floor: {desire}.", "abundance"),

  // career
  f("ar-ca1", "arrival", "You open your calendar and every block on it is something you chose. The work asked for you by name today. This is the shape of it now: {desire}.", "career"),
  f("ar-ca2", "arrival", "The first task of the day is one you'd do for free — and they pay you well for it. Strange and wonderful, how the intention held: {desire}.", "career"),
  f("ar-ca3", "arrival", "Your name carries weight in rooms you used to knock on. You didn't force it; you built it, brick by honest brick, into {desire}.", "career"),
  f("ar-ca4", "arrival", "There's a message waiting: they loved it. Of course they did. You've stopped being surprised by your own competence — that was the real arrival: {desire}.", "career"),
  f("ar-ca5", "arrival", "You work from the deep end now, the place where your gifts actually get used. What you scribbled once as a someday — {desire} — is your job description.", "career"),
  f("ar-ca6", "arrival", "The imposter voice went quiet somewhere along the way. In its place: craft, and calm, and {desire} in plain daylight.", "career"),

  // health
  f("ar-he1", "arrival", "Your body wakes up willing. Stairs are just stairs, mornings are just mornings, and energy is no longer something you ration. This is it: {desire}.", "health"),
  f("ar-he2", "arrival", "You move through your routine and your body keeps up — then asks for more. Somewhere along the way, {desire} stopped being a goal and became a baseline.", "health"),
  f("ar-he3", "arrival", "The mirror stopped being a courtroom. You look, you nod, you get on with your day. Health turned quiet, the way you asked: {desire}.", "health"),
  f("ar-he4", "arrival", "You slept deep and woke clear, {name}. The machine hums. The vitality you wrote down — {desire} — is now just what living feels like.", "health"),
  f("ar-he5", "arrival", "Strong is no longer a performance; it's a fact you carry lightly, like keys in a pocket. The intention was {desire}, and here it is, wearing your shoes.", "health"),
  f("ar-he6", "arrival", "Your appetite, your sleep, your breath — all of it in rhythm, all of it on your team now. That was the wish: {desire}.", "health"),

  // confidence
  f("ar-co1", "arrival", "You say the thing in the meeting — the actual thing — and your voice doesn't shake. It hasn't in a while. This is what arrived when you weren't watching: {desire}.", "confidence"),
  f("ar-co2", "arrival", "You catch your reflection mid-stride and recognize the posture of someone who belongs everywhere they stand. It compounded quietly into {desire}.", "confidence"),
  f("ar-co3", "arrival", "No is a full sentence now, and yes means yes. The fog of second-guessing burned off, and underneath it was this: {desire}.", "confidence"),
  f("ar-co4", "arrival", "You walk into the room without rehearsing the walk. That's the whole trick nobody tells you about {desire} — it feels like nothing. It feels like you.", "confidence"),
  f("ar-co5", "arrival", "The opinion of the loudest stranger weighs exactly what it should now: almost nothing. In the space it used to take up: {desire}.", "confidence"),
  f("ar-co6", "arrival", "You trust your first answer, {name}. You've earned that trust with a hundred kept promises to yourself — and it grew into {desire}.", "confidence"),

  // peace
  f("ar-pe1", "arrival", "The morning has margins now. You sip slowly. Nothing is on fire, and — stranger still — you're not scanning for smoke. This is {desire}, in practice.", "peace"),
  f("ar-pe2", "arrival", "Your mind has stopped narrating disasters that never come. In the new quiet you can hear small things: the kettle, the birds, your own steadiness. It adds up to {desire}.", "peace"),
  f("ar-pe3", "arrival", "You do one thing at a time now, and the world — astonishingly — keeps turning. The wish was {desire}; the method turned out to be permission.", "peace"),
  f("ar-pe4", "arrival", "There's room between you and your thoughts these days, a hallway where there used to be a crowd. Down that hallway: {desire}.", "peace"),
  f("ar-pe5", "arrival", "The urgency was never yours, {name}. You handed it back. What you kept is this even breath, this unhurried morning: {desire}.", "peace"),
  f("ar-pe6", "arrival", "Rest stopped needing to be earned. You take it like water, when thirsty, without a hearing. That's the whole of it: {desire}.", "peace"),

  // ---------------------------------------------------------------- sensory
  f("se1", "sensory", "Steam curls off your cup. You actually watch it — the whole slow ribbon of it — because there is time now, and you are in it."),
  f("se2", "sensory", "Sunlight moves across the floor in a long gold bar, and you stand in it for a moment for no reason a calendar would accept."),
  f("se3", "sensory", "The air outside smells faintly of rain that already fell. Everything is rinsed, including — somehow — you."),
  f("se4", "sensory", "You notice your shoulders. They're down. They've been down all morning, hanging easy, like they finally got the memo."),
  f("se5", "sensory", "Music plays low from another room, one of those songs that used to make you ache for a life you now simply live."),
  f("se6", "sensory", "The floor is warm underfoot. Small mercy, noted. You're collecting them now the way you used to collect grievances."),
  f("se7", "sensory", "Somewhere a door closes gently, a kettle settles, a page turns. The house sounds like a held chord."),
  f("se8", "sensory", "You taste your food today — really taste it. Hunger without anxiety turns out to be one of {domain}'s quietest gifts."),
  f("se9", "sensory", "Evening light comes early through the window and pools on the table like something spilled and unhurried."),
  f("se10", "sensory", "Your own handwriting in the margin of today's list looks different lately. Rounder. Unclenched."),

  // ---------------------------------------------------------------- living
  // love
  f("li-love1", "living", "Midday, a hand finds the small of your back in passing — thirty seconds of nothing, the kind of nothing empires of {domain} are built on.", "love"),
  f("li-love2", "living", "You tell the story of your day and someone actually listens, leaning in, asking the second question. Being known, it turns out, is a daily bread.", "love"),
  f("li-love3", "living", "You plan something small for them without being asked, and notice how good generosity feels when it isn't a strategy.", "love"),
  f("li-love4", "living", "A disagreement comes and goes before lunch — handled with soft voices and full sentences. Even the conflict is safe now.", "love"),
  f("li-love5", "living", "You laugh so hard at lunch that strangers smile. Love turned your days porous; the good gets in everywhere.", "love"),
  f("li-love6", "living", "In a quiet moment you realize you no longer perform your worth to earn warmth. You just live, and the warmth stays.", "love"),

  // abundance
  f("li-ab1", "living", "In the afternoon you make a decision that used to require a spreadsheet and a sleepless night. It takes four minutes. Money answers to you now.", "abundance"),
  f("li-ab2", "living", "You pay for the person behind you, quietly, and walk out lighter. Overflow was always the point of {domain}.", "abundance"),
  f("li-ab3", "living", "An opportunity lands in your inbox — the paid kind, the aligned kind. They find you regularly now, like the address finally got listed.", "abundance"),
  f("li-ab4", "living", "You invest in the better tool, the better teacher, the better ingredient — the version of you that hesitated over small sums feels like an old photograph.", "abundance"),
  f("li-ab5", "living", "Someone asks your secret and you almost laugh: consistency, mostly. Belief, early. The numbers only followed a mind that had already moved.", "abundance"),
  f("li-ab6", "living", "You budget for joy now — an actual line item — and it never runs dry before the month does.", "abundance"),

  // career
  f("li-ca1", "living", "In the deep-focus hours your work sings. You look up and two hours are gone, spent like a good inheritance.", "career"),
  f("li-ca2", "living", "A younger colleague asks how you got here, and you give them the real map, the one with the dead ends marked honestly.", "career"),
  f("li-ca3", "living", "You decline a shiny thing that isn't yours to do, and the calendar breathes. Mastery is mostly subtraction, you've learned.", "career"),
  f("li-ca4", "living", "The difficult problem folds by mid-afternoon — not because it was easy, but because you've become the kind of person difficult problems fold for.", "career"),
  f("li-ca5", "living", "Your name comes up in a room you're not in, and the sentence it lives in is a good one. You feel it, somehow, like weather.", "career"),
  f("li-ca6", "living", "You end the workday on purpose, at a reasonable hour, mid-victory — and the work waits for you like a well-trained dog.", "career"),

  // health
  f("li-he1", "living", "You move for the joy of it at midday — not to punish a meal or bargain with a mirror. The body responds like a friend called by name.", "health"),
  f("li-he2", "living", "Water, sunlight, a real lunch away from screens. Radical acts, apparently. Your energy holds its line straight through the afternoon.", "health"),
  f("li-he3", "living", "You catch the flight of stairs without the old commentary. At the top: nothing. No gasping, no bargaining. Just the next thing.", "health"),
  f("li-he4", "living", "Someone matches your pace and you realize you're the brisk one now, the steady one, the one who suggests the long way back.", "health"),
  f("li-he5", "living", "Your afternoon slump forgot to show up again. You almost miss it, the way you'd miss a rude neighbor who finally moved.", "health"),
  f("li-he6", "living", "You stretch in the hallway because your body asked, and you've learned to answer it before it has to shout.", "health"),

  // confidence
  f("li-co1", "living", "You volunteer first in the afternoon meeting — not to be seen, but because you had something true to say. There's a difference, and you live on the far side of it now.", "confidence"),
  f("li-co2", "living", "A criticism lands nearby and you examine it like a coin: keep the true part, hand back the rest. Neither ruins your hour.", "confidence"),
  f("li-co3", "living", "You wear the thing, say the idea, order the unpronounceable dish. Small braveries — compounding daily, paying in {domain}.", "confidence"),
  f("li-co4", "living", "You ask for exactly what you want, in one sentence, without cushions. The asking took four seconds. The old you would have drafted it for a week.", "confidence"),
  f("li-co5", "living", "In the space where you used to seek permission, there's just motion now. Doors, it turns out, were mostly unlocked.", "confidence"),
  f("li-co6", "living", "You make a mistake at three o'clock and repair it by four, without the ceremonial self-flogging. Efficient, this new arrangement with yourself.", "confidence"),

  // peace
  f("li-pe1", "living", "The afternoon brings a small chaos, as afternoons do — and you meet it like a slow river meets a stone: around, over, on.", "peace"),
  f("li-pe2", "living", "You leave gaps in the day on purpose now, and the gaps do their quiet work: room to think, room to feel, room to be nobody for ten minutes.", "peace"),
  f("li-pe3", "living", "The phone stays face-down through lunch, and the world does not end. It never was ending. That was just the noise.", "peace"),
  f("li-pe4", "living", "You handle the urgent email in the unhurried way — thorough, kind, once — and file the panic it arrived in under 'not mine.'", "peace"),
  f("li-pe5", "living", "Walking back, you take the long way past the trees, because {domain} is not a destination — it's a route you keep choosing.", "peace"),
  f("li-pe6", "living", "Someone else's storm brushes past you in the hallway, and for once you don't audition for a part in it.", "peace"),

  // ---------------------------------------------------------------- witness
  f("wi1", "witness", "\"Something's different about you,\" they say, squinting, halfway between question and compliment. You just smile. Let them wonder a little longer."),
  f("wi2", "witness", "An old friend calls and hears it in your voice inside a minute. \"You sound... lighter.\" You are. It travels down phone lines now."),
  f("wi3", "witness", "You catch someone describing you to someone else — steady, glowing, sure — and realize with a start that they're being accurate."),
  f("wi4", "witness", "\"How do you do it?\" they ask, and mean it. You remember asking that exact question once, from the other side of the glass."),
  f("wi5", "witness", "The people who love you have stopped worrying about you, {name}. You can feel the difference in their hugs — lighter arms, longer holds."),
  f("wi6", "witness", "A stranger is kind to you for no reason, the third one this week. Either the world softened, or you stopped bracing at it. Maybe those are the same."),
  f("wi7", "witness", "Someone younger watches how you move through the day and quietly adjusts their own sails. You remember being them. You'd have loved proof like you."),
  f("wi8", "witness", "\"Whatever you're doing — keep doing it,\" says the one who knew you before. Eight words, and the whole journey flashes by."),

  // -------------------------------------------------------------- gratitude
  f("gr1", "gratitude", "Gratitude arrives on its own now, uninvited, mid-afternoon — for the ordinary furniture of a life you once begged the sky for."),
  f("gr2", "gratitude", "You think of the old you — the one who wanted this so hard it hurt — and send them the only message that crosses time: it worked. Hold on."),
  f("gr3", "gratitude", "Thank you, you say, to no one and everything, quietly, over the sink. The words feel structural now, like a beam that holds the day up."),
  f("gr4", "gratitude", "What you appreciate appreciates. You learned that late and now live off the interest."),
  f("gr5", "gratitude", "You keep a short list of things that went right today. It's getting embarrassingly long. You keep it anyway."),
  f("gr6", "gratitude", "Somewhere in the day you feel it land — that this was once the dream. This exact, ordinary, extraordinary Tuesday. You feel {feeling}, all the way through."),
  f("gr7", "gratitude", "You've stopped auditing your blessings for flaws. They pass. They always passed. The auditor retired."),
  f("gr8", "gratitude", "Grace, you've decided, is mostly attention. You pay it now like a standing order, and the returns are absurd."),

  // ---------------------------------------------------------------- closing
  f("cl1", "closing", "Night settles in without a fight. You review nothing, rehearse nothing. The day was enough, and so — it turns out — are you."),
  f("cl2", "closing", "You set tomorrow's one intention like a cup by the kettle, then let the day go completely. Sleep comes down like warm weather."),
  f("cl3", "closing", "In bed, you feel {feeling} — not as a peak, but as a place. You live here now. The address is permanent."),
  f("cl4", "closing", "The last thought before sleep isn't a worry; it's a small, private thanks. The dark is friendly. The morning is already on its way, and it's on your side."),
  f("cl5", "closing", "You close your eyes inside the answered life, {name}. Somewhere, the person you were is still walking toward this. Leave the light on for them."),
  f("cl6", "closing", "Sleep takes you gently, the way it takes people with nothing to flee. Tomorrow will rhyme with today. That's the whole plan now."),
  f("cl7", "closing", "The house exhales. You exhale. Whatever is still unfinished has agreed, in writing, to wait until morning."),
  f("cl8", "closing", "You drift off mid-gratitude, sentence unfinished, and it doesn't matter — the feeling files itself under 'home'."),
  f("cl9", "closing", "And as the day folds shut, one certainty stays lit like a pilot light: this is not a visit. This is where you live."),
  f("cl10", "closing", "The stars do their old work above the roof. You did yours below it. Even. Sleep now — the life you called is calling you back, always."),
] as const;

/** Titles are chosen like fragments — from a pool, avoiding repeats. */
export interface TitleTemplate {
  id: string;
  text: string;
}

export const TITLES: readonly TitleTemplate[] = [
  { id: "t1", text: "The Morning It Was Already True" },
  { id: "t2", text: "A Day Inside the Answer" },
  { id: "t3", text: "Where You Live Now" },
  { id: "t4", text: "The Ordinary Miracle of Tuesday" },
  { id: "t5", text: "Proof, at Room Temperature" },
  { id: "t6", text: "The Life That Said Yes" },
  { id: "t7", text: "After the Wanting" },
  { id: "t8", text: "The Quiet Arrival" },
  { id: "t9", text: "Everything, Settled Softly" },
  { id: "t10", text: "The Day the Dream Went Ordinary" },
] as const;

export function fragmentsFor(beat: Beat, focus: FocusId): readonly Fragment[] {
  return FRAGMENTS.filter(
    (fr) => fr.beat === beat && (fr.focus === undefined || fr.focus === focus)
  );
}
