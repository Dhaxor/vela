// BRIDGE LIBRARY (A4). One concrete, observable step for TODAY, offered in
// three sizes at the end of every chapter. Per focus: one entry for every
// stage × tier (21, so each chapter can offer a stage-fitted trio), plus
// motif-tagged entries. Motif entries carry a stage too: the offer scorer
// (lib/futureMemory: stage +4, motif +2) then puts them in front of the
// generic entry at that stage and tier once their motif matched. Stage fit:
// I make it concrete · II prepare · III plan for the hard part · IV involve
// someone · V the bold ask · VI make it routine · VII look back and give back.
// Unflagged love bridges never assume a partner; career bridges that assume a
// boss or clients carry the matching motif. Ids are explicit per row and
// permanent: never derive them from row order.
// Plus 3 'Write my own' starters per focus and 6 learned-retry headers.
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

import type { BridgeEntry, BridgeLibrary, ContentStatus, FocusId, Fragment, MotifId, StageId } from "./types";

export const STATUS: ContentStatus = "final";

const fr = (id: string, text: string): Fragment => ({ id, text });

/** Compact row: [id, tier, stage, text, motif?]. */
type Row = readonly [string, BridgeEntry["tier"], StageId, string, MotifId?];

function rows(focus: FocusId, list: readonly Row[]): BridgeEntry[] {
  return list.map(([id, tier, stage, text, motif]) => ({ id, focus, tier, stage, text, ...(motif ? { motif } : {}) }));
}

const LOVE: readonly Row[] = [
  ["br-lo01", "2min", 1, "Send one honest line of appreciation to someone who matters to you."],
  ["br-lo02", "15min", 1, "Write ten specific details of the love you want, the small daily ones."],
  ["br-lo03", "brave", 1, "Say out loud, to one trusted person, what you are hoping for in love."],
  ["br-lo04", "2min", 2, "Choose one evening this week to keep free for the people you love."],
  ["br-lo05", "15min", 2, "Plan one small, specific outing with someone you care about, and send the invitation."],
  ["br-lo06", "brave", 2, "Ask someone you would like to know better to meet for a coffee."],
  ["br-lo07", "2min", 3, "Write the one thing you need to hear on a lonely day, and save it."],
  ["br-lo08", "15min", 3, "Call someone you have drifted from and simply ask how they are."],
  ["br-lo09", "brave", 3, "Apologise for one small thing you have been carrying, plainly and without excuses."],
  ["br-lo10", "2min", 4, "Tell someone one specific thing you love about them, today."],
  ["br-lo11", "15min", 4, "Ask a friend what makes you easy to love, and listen to the whole answer."],
  ["br-lo12", "brave", 4, "Share something true about yourself, usually kept hidden, with someone safe."],
  ["br-lo13", "2min", 5, "Reply yes to the next invitation you would normally decline."],
  ["br-lo14", "15min", 5, "Rewrite one profile, bio or message so it sounds like the real, warm you."],
  ["br-lo15", "brave", 5, "Make the first move you have been waiting for someone else to make."],
  ["br-lo16", "2min", 6, "Start one small daily ritual of connection, like a goodnight message, tonight."],
  ["br-lo17", "15min", 6, "Share a meal with someone today, phones away for the whole of it."],
  ["br-lo18", "brave", 6, "Name one boundary that would make closeness feel safer, and say it once."],
  ["br-lo19", "2min", 7, "Write down one way you love better than you did a year ago."],
  ["br-lo20", "15min", 7, "Write a short letter to someone who taught you what love looks like."],
  ["br-lo21", "brave", 7, "Do one generous thing for someone without telling anyone you did it."],
  ["br-lo22", "2min", 1, "Write three qualities of the person you love, or will love, and keep the note.", "partner"],
  ["br-lo23", "brave", 5, "Say yes to one date, or plan one for the person you already have.", "partner"],
  ["br-lo24", "15min", 2, "Sketch one detail of the day you want: a song, a toast or a table.", "wedding"],
  ["br-lo25", "15min", 6, "Write down one family tradition you want to start, and try a small version this week.", "family"],
  ["br-lo26", "brave", 3, "Send one short, kind message to the family member you miss, asking for nothing.", "family-repair"],
  ["br-lo27", "2min", 4, "Send a voice note to a friend you haven’t heard from in a while.", "friendship"],
];

const ABUNDANCE: readonly Row[] = [
  ["br-ab01", "2min", 1, "Write down the exact number that would make you feel safe, and look at it."],
  ["br-ab02", "15min", 1, "List every income and every bill on one page, without judging any of it."],
  ["br-ab03", "brave", 1, "Open the statement or app you have been avoiding and read it calmly."],
  ["br-ab04", "2min", 2, "Set up one automatic transfer to savings, however small, for your next payday."],
  ["br-ab05", "15min", 2, "Plan tomorrow’s spending in advance: what you will buy, and what you won’t."],
  ["br-ab06", "brave", 2, "Ask for a price, fee or rate you have been too shy to ask about."],
  ["br-ab07", "2min", 3, "Write one sentence about money that you are ready to stop believing."],
  ["br-ab08", "15min", 3, "Cancel one subscription or charge that no longer earns its place."],
  ["br-ab09", "brave", 3, "Call one company and ask, politely and directly, for a better rate or a payment plan."],
  ["br-ab10", "2min", 4, "Tell one person you trust about a money win this month, however small."],
  ["br-ab11", "15min", 4, "Ask someone who handles money well how they started, and take notes."],
  ["br-ab12", "brave", 4, "Have the honest money conversation you have been postponing."],
  ["br-ab13", "2min", 5, "Check one balance and say the number out loud, without flinching."],
  ["br-ab14", "15min", 5, "Research one way to earn a little extra from a skill you already have."],
  ["br-ab15", "brave", 5, "Send the invoice, pitch or price increase you have been holding back."],
  ["br-ab16", "2min", 6, "Move one small amount toward {desire.np} and name the transfer after it."],
  ["br-ab17", "15min", 6, "Set up a simple ten-minute money check at the same time each week."],
  ["br-ab18", "brave", 6, "Sell, return or give away one thing you no longer use."],
  ["br-ab19", "2min", 7, "Write down three things you can afford today that once felt out of reach."],
  ["br-ab20", "15min", 7, "Look back over your last three months of money and write what changed."],
  ["br-ab21", "brave", 7, "Give something, money or time, to a cause you care about, in proportion to what you have."],
  ["br-ab22", "15min", 1, "Write every debt on one page with its balance, and circle the smallest.", "debt-free"],
  ["br-ab23", "brave", 5, "Make one extra payment toward your smallest debt, however small the amount.", "debt-free"],
  ["br-ab24", "2min", 2, "Rename your savings account after what it is for.", "savings"],
  ["br-ab25", "2min", 1, "Picture the front door of {motif.place} and write down its colour.", "home"],
  ["br-ab26", "15min", 2, "Look at three homes you would love and write down what they have in common.", "home"],
  ["br-ab27", "15min", 6, "Price one trip you dream of, and open a fund with its name.", "travel"],
];

const CAREER: readonly Row[] = [
  ["br-ca01", "2min", 1, "Open the file for your next piece of work and write its first line."],
  ["br-ca02", "15min", 1, "Write one paragraph describing the work you want, as if it already exists."],
  ["br-ca03", "brave", 1, "Tell one person in your field exactly what you are working toward."],
  ["br-ca04", "2min", 2, "Leave tomorrow’s first task where you will see it when you sit down."],
  ["br-ca05", "15min", 2, "Gather the three things you need for the next big step into one place."],
  ["br-ca06", "brave", 2, "Book the call, interview or meeting that moves {desire.np} closer."],
  ["br-ca07", "2min", 3, "Write down one thing that went wrong recently and what you will do next time."],
  ["br-ca08", "15min", 3, "Fix one small thing that has been quietly getting in the way of your work."],
  ["br-ca09", "brave", 3, "Ask for feedback on something you made, and listen without defending it."],
  ["br-ca10", "2min", 4, "Thank someone whose work helped yours, by name."],
  ["br-ca11", "15min", 4, "Update your portfolio or profile with your best recent work."],
  ["br-ca12", "brave", 4, "Show one finished piece to someone whose eye you trust."],
  ["br-ca13", "2min", 5, "Draft the first line of the application, pitch or proposal you keep postponing."],
  ["br-ca14", "15min", 5, "Finish and send one application, pitch or proposal today."],
  ["br-ca15", "brave", 5, "Ask directly for the role, rate or opportunity you want."],
  ["br-ca16", "2min", 6, "Block the first hour of tomorrow for your most important work."],
  ["br-ca17", "15min", 6, "Protect twenty focused minutes for the skill this work relies on."],
  ["br-ca18", "brave", 6, "Say no to one task that pulls you away from {desire.np}."],
  ["br-ca19", "2min", 7, "Write down one skill you have today that you didn’t have a year ago."],
  ["br-ca20", "15min", 7, "Write a short note to someone starting out, with the advice you needed."],
  ["br-ca21", "brave", 7, "Offer an hour of help to someone earlier on the same path."],
  ["br-ca22", "15min", 1, "Sketch the sign that will hang above {motif.place}.", "own-business"],
  ["br-ca23", "brave", 4, "Ask one potential customer what they would pay for what you make.", "own-business"],
  ["br-ca24", "15min", 2, "Make one recipe from the menu you dream of, and note what you would change.", "food-venture"],
  ["br-ca25", "2min", 6, "Make the smallest possible piece of work today: one line, one sketch, one bar.", "creative-work"],
  ["br-ca26", "brave", 5, "Share one piece of your work publicly, with your name on it.", "creative-work"],
  ["br-ca27", "15min", 4, "Write down three results you delivered recently, in numbers where you can.", "promotion"],
  ["br-ca28", "15min", 2, "Rewrite the top of your profile for the job you want next.", "new-job"],
  ["br-ca29", "brave", 6, "Raise your rate for the next new client, and quote it without apology.", "freelance"],
  ["br-ca30", "15min", 6, "Do one fifteen-minute study block with your phone in another room.", "study"],
];

const HEALTH: readonly Row[] = [
  ["br-he01", "2min", 1, "Drink a full glass of water, slowly, before your next meal."],
  ["br-he02", "15min", 1, "Spend fifteen minutes outside in daylight, moving in whatever way feels good."],
  ["br-he03", "brave", 1, "Book the check-up or appointment you have been putting off."],
  ["br-he04", "2min", 2, "Set out what you need for tomorrow’s movement or rest before bed."],
  ["br-he05", "15min", 2, "Prepare tomorrow’s lunch tonight, something that will leave you feeling good."],
  ["br-he06", "brave", 2, "Go to bed thirty minutes earlier tonight, phone charging outside the bedroom."],
  ["br-he07", "2min", 3, "Write down your gentle option for low days, the smallest version that still counts."],
  ["br-he08", "15min", 3, "Give yourself ten minutes of gentle movement or rest, whichever today asks for."],
  ["br-he09", "brave", 3, "Tell one person what you need when your energy is low, and ask for it."],
  ["br-he10", "2min", 4, "Ask a friend to join you for a walk, a swim or a class this week."],
  ["br-he11", "15min", 4, "Cook something nourishing for yourself and someone else, and eat it sitting down."],
  ["br-he12", "brave", 4, "Share your health goal with someone who will check in on you kindly."],
  ["br-he13", "2min", 5, "Write down how you want to feel at the end of this month, in one line."],
  ["br-he14", "15min", 5, "Try one new kind of movement or class you have been curious about."],
  ["br-he15", "brave", 5, "Book one class, event or session that stretches you a little, and put the date in your calendar."],
  ["br-he16", "2min", 6, "Put your phone on charge outside the bedroom tonight."],
  ["br-he17", "15min", 6, "Plan the week’s meals or movement in one fifteen-minute sitting."],
  ["br-he18", "brave", 6, "Remove one thing from your week that drains more energy than it gives."],
  ["br-he19", "2min", 7, "Write down three things your body did for you today."],
  ["br-he20", "15min", 7, "Look back at how you felt a month ago and write down what has changed."],
  ["br-he21", "brave", 7, "Choose the next health goal that excites you, and take its first step today."],
  ["br-he22", "15min", 1, "Head out for a fifteen-minute easy run, slow enough to hold a conversation.", "running"],
  ["br-he23", "brave", 5, "Sign up for a race, whatever the distance, and put the date in your calendar.", "running"],
  ["br-he24", "15min", 6, "Do one short strength session today, at a weight or level that feels easy.", "strength"],
  ["br-he25", "2min", 7, "Write down one small sign of progress you noticed this week.", "healing"],
  ["br-he26", "2min", 2, "Set a bedtime alarm for thirty minutes before you want to be asleep.", "sleep"],
  ["br-he27", "15min", 6, "Spend fifteen minutes making your bedroom darker, cooler and quieter tonight.", "sleep"],
];

const CONFIDENCE: readonly Row[] = [
  ["br-co01", "2min", 1, "Say your preference once today without explaining it away."],
  ["br-co02", "15min", 1, "Write a list of ten things you have done that took courage, however small."],
  ["br-co03", "brave", 1, "Wear the thing you have been saving for a braver day."],
  ["br-co04", "2min", 2, "Write the first sentence you will say tomorrow, and read it aloud three times."],
  ["br-co05", "15min", 2, "Rehearse the conversation or talk out loud, start to finish, once."],
  ["br-co06", "brave", 2, "Tell someone what you are about to do, so it becomes real."],
  ["br-co07", "2min", 3, "Write what you will say if your mind goes blank, and keep it handy."],
  ["br-co08", "15min", 3, "Replay a recent awkward moment and write down what you handled well."],
  ["br-co09", "brave", 3, "Ask for the thing you need, even if the answer might be no."],
  ["br-co10", "2min", 4, "Accept the next compliment with a simple thank you, nothing added."],
  ["br-co11", "15min", 4, "Ask two people you trust what they see as your strengths, and write them down."],
  ["br-co12", "brave", 4, "Speak first in the next group conversation, meeting or class you are part of."],
  ["br-co13", "2min", 5, "Send the message you have drafted and redrafted, exactly as it is."],
  ["br-co14", "15min", 5, "Apply, enter or volunteer for one thing that scares you a little."],
  ["br-co15", "brave", 5, "Ask the question, make the offer or pitch the idea you have been holding back."],
  ["br-co16", "2min", 6, "Make one small decision today without asking anyone else’s opinion."],
  ["br-co17", "15min", 6, "Keep one promise to yourself that takes less than fifteen minutes."],
  ["br-co18", "brave", 6, "Say no to one request that doesn’t fit, kindly and without a long explanation."],
  ["br-co19", "2min", 7, "Write down one thing you do easily today that once terrified you."],
  ["br-co20", "15min", 7, "Write a short letter to the version of you who first felt afraid."],
  ["br-co21", "brave", 7, "Encourage someone else to take their brave step, and offer to help."],
  ["br-co22", "2min", 2, "Take three slow breaths before your next conversation, and let your shoulders drop."],
  ["br-co23", "brave", 1, "Introduce yourself to one new person today, using your full name."],
  ["br-co24", "15min", 2, "Record yourself giving a two-minute talk, then watch it once, kindly.", "visibility"],
  ["br-co25", "brave", 5, "Post one piece of your work or thinking where people can see it.", "visibility"],
  ["br-co26", "2min", 4, "Write down one point you will make in your next meeting.", "work-confidence"],
  ["br-co27", "brave", 6, "Ask your manager for fifteen minutes to talk about your growth.", "work-confidence"],
];

const PEACE: readonly Row[] = [
  ["br-pe01", "2min", 1, "Sit for three quiet minutes and name what doesn’t need solving today."],
  ["br-pe02", "15min", 1, "Take a fifteen-minute walk with no headphones and notice five sounds."],
  ["br-pe03", "brave", 1, "Leave your phone in another room for the first hour after you wake tomorrow."],
  ["br-pe04", "2min", 2, "Write tomorrow’s one priority on a note, and let everything else be optional."],
  ["br-pe05", "15min", 2, "Write down every open loop in your head, then circle just two."],
  ["br-pe06", "brave", 2, "Clear tomorrow of one commitment that isn’t truly necessary."],
  ["br-pe07", "2min", 3, "Breathe in for four and out for six, ten times, before you react."],
  ["br-pe08", "15min", 3, "Finish one open loop that has been quietly taking your attention."],
  ["br-pe09", "brave", 3, "Tell someone honestly that you are overwhelmed, and ask for one specific kind of help."],
  ["br-pe10", "2min", 4, "Think of one calm person you know and write down one thing they do."],
  ["br-pe11", "15min", 4, "Spend fifteen unhurried minutes with someone, giving them your full attention."],
  ["br-pe12", "brave", 4, "Tell the people who need to know that you will reply more slowly, on purpose."],
  ["br-pe13", "2min", 5, "Turn off every notification you don’t truly need."],
  ["br-pe14", "15min", 5, "Book one block of free time in your calendar this week and guard it."],
  ["br-pe15", "brave", 5, "Say no to something big that doesn’t fit the calmer life you want."],
  ["br-pe16", "2min", 6, "Do one ordinary task slowly today, giving it your full attention."],
  ["br-pe17", "15min", 6, "Create a fifteen-minute wind-down routine and try it tonight."],
  ["br-pe18", "brave", 6, "Remove one avoidable demand from your week, and leave the space empty."],
  ["br-pe19", "2min", 7, "Write down one thing that used to stress you and no longer does."],
  ["br-pe20", "15min", 7, "Write a short note to the hurried version of you, thanking them for trying."],
  ["br-pe21", "brave", 7, "Help one stressed person by taking something small off their plate."],
  ["br-pe22", "2min", 3, "When a worry arrives today, write it down and close the notebook.", "calm-mind"],
  ["br-pe23", "15min", 1, "Do a fifteen-minute breathing or meditation session, then note how you feel.", "calm-mind"],
  ["br-pe24", "15min", 2, "Research one practical step toward the move: a visa, a neighbourhood or a job.", "relocation"],
  ["br-pe25", "brave", 5, "Visit, or plan a visit to, the place you want to live.", "relocation"],
];

export const BRIDGES: BridgeLibrary = {
  entries: [
    ...rows("love", LOVE),
    ...rows("abundance", ABUNDANCE),
    ...rows("career", CAREER),
    ...rows("health", HEALTH),
    ...rows("confidence", CONFIDENCE),
    ...rows("peace", PEACE),
  ],
  reshape: {
    love: [
      fr("rs-lo1", "Send one message today that brings you a little closer to {desire.np}."),
      fr("rs-lo2", "Make ten minutes of real, undistracted time for someone you love."),
      fr("rs-lo3", "Do one thing today that you would do if you already felt deeply loved."),
    ],
    abundance: [
      fr("rs-ab1", "Move one small amount toward {desire.np} before the day ends."),
      fr("rs-ab2", "Spend fifteen minutes on one money task you have been avoiding."),
      fr("rs-ab3", "Make one choice with money today that your calmest self would make."),
    ],
    career: [
      fr("rs-ca1", "Finish one visible piece of work, however small, and show it to someone."),
      fr("rs-ca2", "Spend fifteen focused minutes on the next step toward {desire.np}."),
      fr("rs-ca3", "Send one message that could open a door for you this week."),
    ],
    health: [
      fr("rs-he1", "Do one kind thing for your body today, sized to the energy you have."),
      fr("rs-he2", "Move for ten minutes today in whatever way feels good."),
      fr("rs-he3", "Set up tonight so that tomorrow’s healthy choice is the easy one."),
    ],
    confidence: [
      fr("rs-co1", "Say one sentence out loud today that you would usually keep to yourself."),
      fr("rs-co2", "Do one small thing before you feel ready, then write down what happened."),
      fr("rs-co3", "Ask for one thing you want today, plainly, in a single sentence."),
    ],
    peace: [
      fr("rs-pe1", "Set down one demand for an hour today, on purpose."),
      fr("rs-pe2", "Protect fifteen minutes today with nothing in them at all."),
      fr("rs-pe3", "Do one thing today that makes tomorrow morning calmer."),
    ],
  },
  learnedRetry: [
    fr("lr1", "Last time taught you something. Try the smallest piece of it today."),
    fr("lr2", "You wrote {proof.quote}. That counts. Here is a smaller door."),
    fr("lr3", "Any size of step is a step, {name}. Pick the one that fits today."),
    fr("lr4", "{bridge.quote} was a big ask. Try a piece of it, sized for today."),
    fr("lr5", "What you learned is already part of the story, {name}. Choose a gentler step."),
    fr("lr6", "Shrink it until it feels easy. Then do just that much."),
  ],
};
