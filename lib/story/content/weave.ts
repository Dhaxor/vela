// PROOF WEAVE LIBRARY — content writer A3.
// Woven lines: 3 kinds × 3 positions × 6. Each is a STANDALONE paragraph that
// carries the 'Woven from your proof' tag, so it names the proof itself and makes
// sense without the paragraph before it. They sit inside an imagined scene and
// step out of it on purpose: the proof is the one real thing in the chapter.
//   did     a whole step: the root of what you are living in the scene
//   moved   a half step: direction, momentum, small things counting
//   learned a lesson: written down honestly, carried forward
//   arrival     right after the arrival beat: this grew from that
//   witness     after the living beat: someone asks, or you tell someone
//   preClosing  just before the closing: hold it, keep it, it already happened
// Seed lines weave the onboarding 'already done' proof into Chapter I (a morning
// scene). Not-today lines weave a learned proof that came from 'Not today', with
// no guilt. Recall lines open a chapter by citing an older proof by date.
// Cumulative lines only run at three proofs or more, so they are plural.
// {proof.done} and {desire.done} already start with 'you': 'the day {proof.done}'.
// STYLE HEADER (binding for every content file; full guide: docs/CONTRACTS.md §7–§8)
// - Original prose only. Second person, present tense. Never 'I' in narration.
// - Template sentences ≤ 24 words (each {token} counts as one word). No parentheses,
//   abbreviations or '&'. Curly quotes only. At most one em dash per fragment.
// - No 'not X but Y'. Nothing from BANNED_PHRASES in ./types.ts: no 'future self', no
//   moon or astrology, no weekdays, no health or money guarantees, no stock LLM words.
// - No gendered pronouns for other people. Never assume a body, gender or relationship:
//   a line that assumes a partner, child, boss or client declares `requires: [flag]`.
// - Only the tokens ALLOWED_TOKENS permits for this content kind. Never start a sentence
//   with a lowercase-valued token ({desire.np}, {desire.done}, {proof.done}, {feeling}…).
// - Ids are permanent once shipped: never rename, never reuse. Prefixes: CONTRACTS.md §7.2.
// - Self-check: bun test lib/story/content

import type { ContentStatus, Fragment, WeaveLibrary } from "./types";

export const STATUS: ContentStatus = "final";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const WEAVE: WeaveLibrary = {
  woven: {
    did: {
      arrival: [
        fr("wv-d-ar1", "Some of this grew from something small. You can still see the day {proof.done}. Nobody else noticed. It counted anyway, and you can feel it under everything here."),
        fr("wv-d-ar2", "On {proof.date}, {proof.done}. It looked like an ordinary day. From here you can see what it really was: one of the stones all this is built on."),
        fr("wv-d-ar3", "Here is what nobody sees when they look at this life: {proof.quote}. You wrote that {proof.ago}, after you had done it. It is part of how you got here."),
        fr("wv-d-ar4", "The road here is made of steps, and you know exactly where one of them is. It is the day {proof.done}. You did it before you felt ready, which is how most real things get done."),
        fr("wv-d-ar5", "Some of this is luck, and some of it is you. The part that is you has a date on it: the day {proof.done}. You can still remember how your hands felt afterwards."),
        fr("wv-d-ar6", "This life has your fingerprints on it. One of the clearest is from {proof.date}, the day {proof.done}. Small, plain, and unmistakably yours. You would know it anywhere."),
      ],
      witness: [
        fr("wv-d-wi1", "Someone asks how you got here. You think for a second, then tell them about the day {proof.done}. They look surprised it was something so small. You are not."),
        fr("wv-d-wi2", "Later, someone who knows you well brings it up: {proof.quote}. They remember you telling them. They say that was when they knew you were serious. You had no idea anyone was watching."),
        fr("wv-d-wi3", "If anyone asked you to point to a day that mattered, you would point to {proof.date}. That was the day {proof.done}. Telling it, you feel {feeling} all over again."),
        fr("wv-d-wi4", "You catch yourself telling someone about it, a little shyly: the day {proof.done}. They listen closely. Afterwards they say they wish they had started something sooner. You realise you have become the example."),
        fr("wv-d-wi5", "In the middle of all this, you remember writing {proof.quote}. You almost laugh at how plain it looks. Plain things, it turns out, are what this life is built from."),
        fr("wv-d-wi6", "Someone asks what made the difference. You could give a long answer. You give the short one instead: one day, {proof.done}, and then you kept going."),
      ],
      preClosing: [
        fr("wv-d-pc1", "Before this scene ends, go back to the day {proof.done}. Hold it for a moment. It is the reason any of this feels possible, and it was already yours."),
        fr("wv-d-pc2", "Keep this sentence with you: {proof.quote}. You wrote it {proof.ago}. It is the truest line in this whole chapter, because it already happened."),
        fr("wv-d-pc3", "The story you just heard is imagined. The step underneath it is real. On {proof.date}, {proof.done}, and nothing can undo that."),
        fr("wv-d-pc4", "If you keep one thing from this chapter, keep the day {proof.done}. It is finished and real, and it is already yours."),
        fr("wv-d-pc5", "Think of the day {proof.done}, and feel it the way you would feel solid ground. Whatever comes next, that part is done, and it holds."),
        fr("wv-d-pc6", "Somewhere in your real life, {proof.ago}, you did something about this. You wrote it down: {proof.quote}. Let that be the last thing you think about before the story ends."),
      ],
    },
    moved: {
      arrival: [
        fr("wv-m-ar1", "Part of the way here was a half step, the day {proof.done}. Small enough to feel like nothing at the time. Big enough to point you here."),
        fr("wv-m-ar2", "You remember writing {proof.quote} and wondering whether it counted. It was only part of the way. From here you can see that part of the way was the way."),
        fr("wv-m-ar3", "Every road has a stretch where you move slowly. Yours includes the day {proof.done}. It was a small move, and it pointed in exactly the right direction."),
        fr("wv-m-ar4", "On {proof.date}, {proof.done}. It felt like barely anything: a nudge, a door left open a crack. That crack is where some of this got in."),
        fr("wv-m-ar5", "Some steps are half steps. You took one {proof.ago}: {proof.quote}. It was enough to change the direction you were facing, and direction is most of it."),
        fr("wv-m-ar6", "This arrived slowly, and you know why. You kept moving, even in small amounts. One of those small amounts was the day {proof.done}, and it mattered more than it looked."),
      ],
      witness: [
        fr("wv-m-wi1", "Someone asks how you kept going when progress was slow. You think of the day {proof.done}. It was a small thing, you tell them. They say small things are the hardest to keep doing."),
        fr("wv-m-wi2", "You mention, almost in passing, the time you wrote {proof.quote}. The person listening goes quiet for a moment. Then they tell you half steps are the ones most people never take."),
        fr("wv-m-wi3", "Someone who has watched you all along says they noticed the slow part too. The day {proof.done}, for instance. They saw it. It mattered more than you thought."),
        fr("wv-m-wi4", "When you tell the story, you include the in-between days. The day {proof.done} is one of them. It has no drama in it. People lean in anyway, because it sounds like their own lives."),
        fr("wv-m-wi5", "Someone impatient with their own progress asks how you did it. You give them yours: {proof.quote}. You tell them it counted. Hearing yourself say it, you finally believe it too."),
        fr("wv-m-wi6", "Somebody asks whether there was a turning point. You think of {proof.date}, when {proof.done}. It never felt like a turning point. It turned you anyway."),
      ],
      preClosing: [
        fr("wv-m-pc1", "Before you go, give some credit to the half steps. The day {proof.done} is one of them. It moved you. That is all a step ever has to do."),
        fr("wv-m-pc2", "Here is what is real underneath this story: {proof.quote}. Part of the way, written down {proof.ago}. Part of the way still counts as moving."),
        fr("wv-m-pc3", "Sit for a moment with the day {proof.done}. It was smaller than you wanted. It was also more than nothing, and more than nothing is how everything starts."),
        fr("wv-m-pc4", "You moved toward this {proof.ago}, and you wrote it down: {proof.quote}. Some distance is better than none. You have some, and it is yours to keep."),
        fr("wv-m-pc5", "Carry the half step with you: the day {proof.done}. Half steps add up quietly, in the background, until one day you look up and find yourself somewhere new."),
        fr("wv-m-pc6", "Whatever you do next, you start a little further along, because of the day {proof.done}. That is the whole point of a half step. It moves the starting line."),
      ],
    },
    learned: {
      arrival: [
        fr("wv-l-ar1", "Reality taught you something, and you kept it. You wrote it down on {proof.date}: {proof.quote}. Everything here was built with that lesson in mind."),
        fr("wv-l-ar2", "Some steps teach you instead of moving you. One of yours did, {proof.ago}: {proof.quote}. You listened, and this is what listening built."),
        fr("wv-l-ar3", "There was a day when it did not go to plan, and you wrote down what it showed you: {proof.quote}. You carried that into everything after. You can see it here."),
        fr("wv-l-ar4", "You learned something on {proof.date}, the hard way, the way that sticks: {proof.quote}. This life is arranged around that lesson in a hundred small ways."),
        fr("wv-l-ar5", "The honest days count too. On one of them you wrote {proof.quote}. That honesty is part of the ground under everything you see here."),
        fr("wv-l-ar6", "Some of the best decisions in this life came from a day that went sideways. You know the one: {proof.quote}. You paid attention, and it paid you back."),
      ],
      witness: [
        fr("wv-l-wi1", "Someone asks how you knew what to do. You tell them you learned it the hard way, and you quote yourself: {proof.quote}. They nod slowly, saving it for later."),
        fr("wv-l-wi2", "You hear yourself passing a lesson on to someone who needs it. It is yours, from {proof.date}: {proof.quote}. Giving it away makes it feel even more true."),
        fr("wv-l-wi3", "A friend says you seem wiser about all this. You laugh and tell them about the day you wrote {proof.quote}. Wisdom, you tell them, is mostly mistakes you bothered to write down."),
        fr("wv-l-wi4", "When someone asks for advice, you tell them the thing you wish you had known sooner. It came from your own notes: {proof.quote}. They thank you, and you quietly thank the person who wrote it."),
        fr("wv-l-wi5", "Someone notices how calmly you handle a setback. You know where that calm comes from. It comes from {proof.ago}, and from writing {proof.quote} instead of giving up."),
        fr("wv-l-wi6", "You find yourself telling the story of a day that went badly, and you tell it without shame. It ends with what you learned: {proof.quote}. That ending is the part people remember."),
      ],
      preClosing: [
        fr("wv-l-pc1", "Before this ends, hold on to the lesson you wrote down {proof.ago}: {proof.quote}. Lessons like that are how the next step gets easier."),
        fr("wv-l-pc2", "Some days teach instead of move. You had one, and you were honest about it: {proof.quote}. Honesty like that is a kind of progress too."),
        fr("wv-l-pc3", "Keep this close: {proof.quote}. You wrote it on {proof.date}, on a day that did not go to plan. It belongs in this story as much as any win."),
        fr("wv-l-pc4", "Part of this story was built from something that did not work. You looked at it, wrote down {proof.quote}, and kept going. That counts, and it always will."),
        fr("wv-l-pc5", "Let the lesson from {proof.date} settle in before you go: {proof.quote}. You learned it honestly. You will use it again, probably sooner than you think."),
        fr("wv-l-pc6", "There are no wasted days in this story. Even the one where {proof.done} gave you something to keep, and you kept it."),
      ],
    },
  },
  seed: [
    fr("wv-sd1", "And here is the part that makes this more than a daydream. Before you ever opened this story, {proof.done}. You had already started. This morning is simply where that road goes."),
    fr("wv-sd2", "You had already begun before any of this was written. On {proof.date}, {proof.done}. Everything in this morning grew from that one real thing."),
    fr("wv-sd3", "None of this came from nowhere. You wrote it yourself, in your own words: {proof.quote}. You had already done it. The story is only catching up with you."),
    fr("wv-sd4", "Remember the thing you had already done: {proof.quote}. It seemed small when you typed it. From inside this morning, it looks like the first brick of everything."),
    fr("wv-sd5", "Here is something true in the middle of all this imagining: {proof.done}. That really happened. Everything in this morning is built on top of it."),
    fr("wv-sd6", "Before you chose a single step, you had already taken one. {proof.quote}, you wrote, as if it were nothing. It was the beginning, and part of you knew."),
  ],
  notToday: [
    fr("wv-nt1", "There was a day you said not today, and you said it honestly. You wrote down why: {proof.quote}. In this story, that honesty is part of what holds everything up."),
    fr("wv-nt2", "Not every day is the day. You knew that {proof.ago}, and instead of pretending, you wrote {proof.quote}. That is how people keep going for years instead of weeks."),
    fr("wv-nt3", "Somewhere in your real life there is a day you paused. {proof.quote}, you wrote. Pausing with your eyes open still counts as moving. You can see it here."),
    fr("wv-nt4", "On {proof.date}, the step did not happen, and you did not hide from it. You named what got in the way: {proof.quote}. Naming it was a step of its own."),
    fr("wv-nt5", "You remember the day you said not today and wrote {proof.quote}. It was the right call for that day. The step waited for you, the way good things do."),
    fr("wv-nt6", "Even the days that said not today belong in this story. Yours taught you something real: {proof.quote}. You brought that lesson all the way here."),
  ],
  recall: [
    fr("wv-rc1", "On {proof.date} you wrote {proof.quote}. It is still holding you up."),
    fr("wv-rc2", "It was {proof.ago} that {proof.done}. You have carried it with you ever since."),
    fr("wv-rc3", "You have not forgotten {proof.date}. That was the day {proof.done}, and it is still part of the story."),
    fr("wv-rc4", "Remember {proof.date}, when {proof.done}. It still counts. It always will."),
    fr("wv-rc5", "You wrote {proof.quote} {proof.ago}. It is still true, and this chapter rests on it."),
    fr("wv-rc6", "Keep {proof.date} in mind. On that day, {proof.done}, and something shifted."),
    fr("wv-rc7", "You kept the words you wrote on {proof.date}: {proof.quote}. They belong in this, {name}."),
    fr("wv-rc8", "One of the steps behind you: on {proof.date}, {proof.done}. It is a good thing to stand on."),
    fr("wv-rc9", "{name}, remember {proof.quote}? You wrote that {proof.ago}. It mattered then, and it matters here."),
    fr("wv-rc10", "On {proof.date}, {proof.done}. Hold that close as this chapter opens."),
    fr("wv-rc11", "Here is a step from earlier in this story: {proof.quote}, written on {proof.date}. Look how far it has carried you."),
    fr("wv-rc12", "Something real sits underneath all this: {proof.ago}, {proof.done}."),
    fr("wv-rc13", "{proof.date} counts: you wrote {proof.quote}, and you meant it."),
    fr("wv-rc14", "Think back to {proof.date}: {proof.quote}. That one was yours."),
    fr("wv-rc15", "You can still picture the day {proof.done}. It is part of the ground here."),
    fr("wv-rc16", "The day {proof.done} has not gone anywhere."),
    fr("wv-rc17", "Somewhere in all this is the day {proof.done}. It still holds."),
    fr("wv-rc18", "Underneath this chapter is {proof.date}, and the words {proof.quote}."),
  ],
  cumulative: [
    fr("wv-cu1", "Reality has answered you {proofs.count} times so far, {name}."),
    fr("wv-cu2", "There are {proofs.count} stars in your sky for this, and every one is real."),
    fr("wv-cu3", "Count them if you like: {proofs.phrase}, all in your own words."),
    fr("wv-cu4", "You have taken {proofs.count} real steps toward this, {name}, and each one is in your sky."),
    fr("wv-cu5", "You have shown up for this {proofs.count} times. It shows."),
    fr("wv-cu6", "Your sky holds {proofs.phrase}. Small, true, and adding up."),
    fr("wv-cu7", "Look behind you: {proofs.phrase}. That is a pattern, and you made it."),
    fr("wv-cu8", "Already {proofs.count} stars, {name}, each one a day you acted."),
  ],
};
