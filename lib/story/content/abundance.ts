// ABUNDANCE — focus content (A3).
// Seven stages × (arrival, living, 3 titles) + hand-tuned Chapter I scripts.
// Abundance is never a promise of money. It is shown as ease, choice and
// generosity in concrete scenes: a bill paid without dread, a yes to a trip,
// a stranger’s coffee, a hard expense met with a plan. No figures, no wealth
// level, no car or property assumed: lines about a home of your own carry
// `requires: ['home']`, lines about clients carry `requires: ['business']`.
// Arrival and living are picked independently, so every living line also reads
// after every arrival line of its stage.
// Chapter I: a default script, plus scripts for a home or a move, and for debt
// and savings. Script text carries no flags: the script's `motifs` gate it.
// Grammar: a verb after {desire.np} is past tense or modal ('healthy finances' is plural).
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

import type { ContentStatus, FocusContent, Fragment, Title } from "./types";

export const STATUS: ContentStatus = "final";

const fr = (id: string, text: string, flags?: Pick<Fragment, "requires" | "excludes">): Fragment => ({ id, text, ...flags });
const ti = (id: string, text: string): Title => ({ id, text });

const HOME = { requires: ["home"] } as const;
const BUSINESS = { requires: ["business"] } as const;
const FAMILY = { requires: ["family"] } as const;

export const ABUNDANCE: FocusContent = {
  focus: "abundance",
  stages: {
    // I · The First Glimpse
    1: {
      arrival: [
        fr("ab1-ar1", "You reach for your phone out of habit and stop halfway. There is nothing in it you need to brace for. You put it back down, face up, which feels strangely brave. The quiet where the worry used to live is still new enough to notice. It is real: {desire.done}."),
        fr("ab1-ar2", "You open the fridge, and it is full, properly full, with things you chose instead of things that were cheapest. You stand in the cold light for a second longer than you need to. It is only food, and it makes you absurdly happy. This is a part of {desire.np} nobody photographs."),
        fr("ab1-ar3", "On the way back from the corner shop you buy the good bread, the loaf you used to look at and walk past. You skip the sum in your head. You carry it home still warm, like a small, ridiculous trophy. Halfway up the street you remember that {desire.done}, and you grin at nobody."),
        fr("ab1-ar4", "For the first time in years, you wake up without doing sums in your head. No juggling which bill can wait. No quiet panic about the end of the month. There is only the ceiling, the light, and a fact you are still getting used to: {desire.done}."),
        fr("ab1-ar5", "You wake up in your own place, and the first thing you see is a crack in the ceiling that belongs to you. You could fix it. You could leave it. Either way, it is yours to decide. You lie there grinning at a crack in the plaster, because {desire.done}.", HOME),
      ],
      living: [
        fr("ab1-li1", "Over breakfast you look at the month ahead, and for once it looks like a map instead of a maze. Bills on their days. A little set aside. A little left over that does not have a job yet. You circle a date on the calendar and write two words next to it: something nice."),
        fr("ab1-li2", "A friend messages to ask if you want to come to a concert next month. You feel the old reflex to say you will see, which always meant no. This time you check the date, check the numbers, and say yes. Typing it feels like stretching a muscle you forgot you had."),
        fr("ab1-li3", "You put a little aside for someone else’s birthday, a present you have been wanting to give for ages. It does not feel like a sacrifice. It feels like the best part of having enough. You picture their face when they open it, and you smile into your cup."),
        fr("ab1-li4", "A bill comes in and you pay it on your phone in the time it takes a pan to heat. That is the whole event. Nobody claps. You put the phone down and crack an egg, and the morning carries on being exactly as gentle as it was before."),
      ],
      titles: [ti("ab1-t1", "Room in the Month"), ti("ab1-t2", "Enough, by Morning"), ti("ab1-t3", "Where the Worry Was")],
    },

    // II · The Night Before
    2: {
      arrival: [
        fr("ab2-ar1", "There is a folder on the table with everything in it: the forms, the copies, a pen that works. Tomorrow is the appointment that makes {desire.np} official on paper. You have checked the folder twice already. You put the kettle on instead of checking it a third time."),
        fr("ab2-ar2", "Tomorrow you are taking someone you love out for a proper dinner, your treat. It is the place where you once read the menu in the window and walked on. The table is booked. You keep picturing their face when you say you are paying. This dinner is part of what you meant by {desire.np}."),
        fr("ab2-ar3", "Your suitcase is open on the bed, half full. Tomorrow you leave for somewhere you have wanted to see for years. The whole trip is already paid for, with nothing waiting on a card when you get home. You fold a jumper and laugh at nothing. This, too, is part of {desire.np}."),
        fr("ab2-ar4", "Tomorrow you finally book the thing you have put off for years because of money. The page is saved and the dates are circled. Tonight you just sit with the knowledge that you can. Everything that led to {desire.np} is folded into that one small click."),
        fr("ab2-ar5", "Boxes are stacked in the hall, labelled in thick marker: kitchen, books, fragile. Tomorrow you get the keys. You walk through the old place one last time, saying a quiet goodbye. Your hand trails along the wall. You are already halfway to {desire.np}.", HOME),
      ],
      living: [
        fr("ab2-li1", "You run through tomorrow once, the way you would run through a recipe: what to bring, where to be, what to say. You know the steps. There was a time you would have lain awake doing worst-case sums. Tonight you write the plan on a sticky note and press it to the door."),
        fr("ab2-li2", "Someone calls to wish you luck for tomorrow. You hear yourself talking about money without shame for the first time, plainly, numbers and all. They tell you they are proud of you. You had no idea how much you needed someone to say it until they did."),
        fr("ab2-li3", "You set aside a little for tomorrow evening, a celebration fund. You decide in advance exactly what it is for: a good meal, something fizzy, and a tip that makes someone’s night. Planning the generosity is half the fun. You go to bed already smiling about the tip."),
        fr("ab2-li4", "Before bed you write down what tomorrow will make possible. Sleeping through the night. Saying yes more easily. Being able to help when someone you love is struggling. You read the list back twice, then fold it into your wallet, where you will find it again one day."),
      ],
      titles: [ti("ab2-t1", "What Tomorrow Makes Possible"), ti("ab2-t2", "Ready, With Room to Spare"), ti("ab2-t3", "One Night From It")],
    },

    // III · The Hard Day
    3: {
      arrival: [
        fr("ab3-ar1", "The washing machine dies mid-cycle, leaving a drum of soaked clothes and a puddle creeping across the floor. You stand in it in your socks and swear quietly. The repair, when you get a price, is more than you hoped. It stings, even though {desire.done}."),
        fr("ab3-ar2", "A bill arrives for twice what you expected. You read it three times, sure there must be a mistake. There is no mistake. Your stomach drops the old familiar way, and for a minute you are back in the life before {desire.np}, counting and recounting."),
        fr("ab3-ar3", "Someone you love asks to borrow money, and the amount makes you swallow. You want to help. You also remember exactly how hard it was to build what you have. Both feelings sit in your chest at once, and neither is wrong. Nobody mentioned this part when you wrote {desire.quote}."),
        fr("ab3-ar4", "Your phone slips from your pocket and lands face down on the pavement. You know before you turn it over. The screen is a web of cracks, and the repair will take a real bite out of the month. You stand there holding it, feeling sick, and very far from {desire.np}."),
        fr("ab3-ar5", "A client pays late, then later still, and the gap lands right where the month is tightest. You check your account twice, as if checking could change it. The old fear is fast and familiar. You remind yourself that {desire.done}, and that one late payment is a problem with a solution.", BUSINESS),
      ],
      living: [
        fr("ab3-li1", "You make a cup of tea and sit down with the real number instead of the one your fear invented. It is bad. It is also finite. You have a cushion for days exactly like this, and you use it. The whole thing takes four minutes, and then it is just a cost."),
        fr("ab3-li2", "You let yourself be annoyed for exactly ten minutes. You walk round the block and say a few choice words to a lamppost. Then you come back in and deal with it, one practical step after another. By evening, the problem has a plan and a date."),
        fr("ab3-li3", "You talk it through out loud with someone you trust, and halfway through explaining it, you hear how manageable it is. It will mean a quieter month. A treat or two will wait. That is a real cost, and you let it be one, without deciding it says anything about you."),
        fr("ab3-li4", "You write down three things: what happened, what it costs, and what you will do about it. On paper it shrinks to its real size. The old panic wanted you to think in years. You only have to think about this month, and this month has a plan."),
      ],
      titles: [ti("ab3-t1", "A Problem With Edges"), ti("ab3-t2", "Finite"), ti("ab3-t3", "The Cost of a Bad Day")],
    },

    // IV · Someone Notices
    4: {
      arrival: [
        fr("ab4-ar1", "Across the table, a friend watches you order without scanning the prices first. Afterwards they say you seem calmer about money these days and ask, a little shyly, how you did it. You realise the honest answer is a long list of small, boring decisions that added up to {desire.np}."),
        fr("ab4-ar2", "Someone you helped last month sends a message out of nowhere. They tell you what your help made possible: a deposit paid, a hard week survived, a little breathing room. You had almost forgotten. They had not. Being able to help like that was always part of {desire.np}."),
        fr("ab4-ar3", "A younger friend asks for advice about money, the way you once asked people you admired. You explain it simply: the cushion, the plan, the habit of looking. They type notes into their phone. It is strange to be the one asked. Somewhere along the way, {desire.np} turned you into someone with something to teach."),
        fr("ab4-ar4", "At a birthday dinner the bill arrives, and someone sighs about splitting it. You quietly cover the difference and change the subject. Later your oldest friend catches your eye and smiles: they saw. On the way out they say you seem lighter. It is easy to be generous since {desire.done}."),
        fr("ab4-ar5", "Someone in your family notices the shopping in your bag: the good coffee, the fruit you used to call a luxury. They make a gentle joke about it. Then, more quietly, they say they used to worry about you. They have stopped. You both know why: {desire.done}.", FAMILY),
      ],
      living: [
        fr("ab4-li1", "You resist the urge to make a joke of it. Instead you tell the truth: that it took years, that it was mostly boring, that you nearly gave up twice. Saying it out loud makes you prouder than any number on a screen ever has."),
        fr("ab4-li2", "On the way home you pass the shop where you once stood at the till, praying the card would go through. You go in, buy something small, and pay without a flicker. The person behind the counter has no idea what that moment means to you. You do."),
        fr("ab4-li3", "That evening you add a new line to your budget, a small one, labelled simply: other people. Coffees for friends, a train fare for someone stuck, coins for the collection tin. Being noticed has made you want to pass it on, quietly, without anyone keeping score."),
        fr("ab4-li4", "You write the conversation down that night so you will remember it. Under it you note how long it took to get here. Then you add one sentence for anyone who is where you used to be: small steps count, and slow is allowed."),
      ],
      titles: [ti("ab4-t1", "How Did You Do It"), ti("ab4-t2", "Passed On"), ti("ab4-t3", "Lighter, They Said")],
    },

    // V · The Threshold
    5: {
      arrival: [
        fr("ab5-ar1", "The email arrives while you are halfway through a sandwich. The subject line says one word: confirmed. You open it and read it and read it again, until the words blur. You put the sandwich down very carefully, as if it might break. It is done, and {desire.done}."),
        fr("ab5-ar2", "You press the button and watch the little wheel spin. Three seconds. Four. Then the screen changes, and there it is in plain grey letters: the final confirmation. You sit back in your chair and do not move for a long moment. The words you once wrote, {desire.quote}, have become a fact."),
        fr("ab5-ar3", "Across the desk, someone turns the last page toward you and points to the line. You sign your name. They smile and say congratulations, and you hear yourself laugh, a strange high laugh that does not sound like you. That signature means that {desire.done}."),
        fr("ab5-ar4", "You check the number once more, then again, then take a screenshot in case it disappears. It has crossed the line you drew for yourself years ago, the one that meant safe. You sit on the edge of the bed with the phone in both hands. It is real: {desire.done}."),
        fr("ab5-ar5", "The keys are heavier than you expected. Someone drops them into your palm, a whole ring of them, and says they are yours. You close your hand around them so tightly the edges bite. You are standing at your own front door, and {desire.done}.", HOME),
      ],
      living: [
        fr("ab5-li1", "For the first minute you tell no one. You sit with it, one hand over your mouth, letting years of worry come loose all at once. Your eyes fill and you let them. Some of it is joy. Some of it is the relief of finally putting something heavy down."),
        fr("ab5-li2", "You need air. The first breath of it comes in cold and smells of the street, completely ordinary. You take it like the first air you have ever had. Somewhere nearby, a delivery van beeps as it reverses, and you laugh at how normal everything sounds."),
        fr("ab5-li3", "You call the person who saw you through the worst of it. They answer, and you try to say it calmly, and your voice cracks on the second word. There is a pause. Then they are cheering down the line, and you are laughing so hard you have to hold on to something."),
        fr("ab5-li4", "You open the note on your phone where you kept the plan for years, the one full of numbers and crossings out. You scroll to the bottom and type one more line: done. Then you just look at it, that one small word at the end of all that work."),
      ],
      titles: [ti("ab5-t1", "Confirmed"), ti("ab5-t2", "The Line You Drew"), ti("ab5-t3", "One Small Word")],
    },

    // VI · An Ordinary Day
    6: {
      arrival: [
        fr("ab6-ar1", "Money has gone quiet. That is the best way to describe it. It still matters, and you still pay attention, yet it no longer shouts. Most days you hardly think about it at all, which is exactly how you hoped {desire.np} would feel."),
        fr("ab6-ar2", "Today has ordinary spending in it. You buy groceries without a running total. You pay for a train at the busy time without wincing. A little goes into savings on its own, the way it does every month. None of it is exciting. This, too, is what {desire.np} looked like in the end."),
        fr("ab6-ar3", "It is the middle of the month, the part that used to feel like the edge of a cliff. You only notice because you glance at the date on a receipt. Nothing is tight. Nothing needs juggling. You fold the receipt into your pocket and forget it, because {desire.done}."),
        fr("ab6-ar4", "A friend suggests a weekend away at the last minute, and you say yes before you have finished reading the message. You pack a bag that evening, humming. It still makes you smile, how simple a yes has become in the life where {desire.done}."),
        fr("ab6-ar5", "The heating comes on and you leave it on. The kitchen is full of your own mugs and a plant that is somehow still alive. A small repair needs doing, and you book someone without a second thought. Ordinary days like this are what you meant by {desire.np}.", HOME),
      ],
      living: [
        fr("ab6-li1", "At lunch you pay for the coffee of the person behind you in the queue, quietly, before they reach the till. You leave before they can thank you and step back into the afternoon, lighter than you were. Nobody will ever know. That is part of what makes it good."),
        fr("ab6-li2", "You set up a small monthly donation to a cause you care about. It takes three minutes and feels like signing your name to the kind of person you mean to be. Afterwards you forget all about it, and it carries on without you, month after month."),
        fr("ab6-li3", "In the afternoon you fix something that has been broken for ages, because the part costs what it costs and you can pay it. A cupboard door that finally closes properly. You open and shut it four times, grinning. Ease, it turns out, lives in tiny repairs."),
        fr("ab6-li4", "Your evening plans change at the last minute, and so does the cost. You shrug. The month can hold it. You cook something simple from what is in the fridge and eat it by the window. A changed plan no longer feels like a threat, and you enjoy noticing that."),
      ],
      titles: [ti("ab6-t1", "Money Gone Quiet"), ti("ab6-t2", "The Middle of the Month"), ti("ab6-t3", "Ease, in Small Repairs")],
    },

    // VII · Becoming
    7: {
      arrival: [
        fr("ab7-ar1", "Clearing a drawer, you find an old envelope with sums scribbled on the back in biro. Tiny columns, crossings out, a coffee ring on the worst month. You hold it for a long time. The person who wrote these was so scared and so stubborn. They are the reason {desire.done}."),
        fr("ab7-ar2", "Someone asks what changed, and you try to explain. There was no single big win. There were hundreds of small, dull decisions, made again and again until they became who you are. That is what {desire.np} turned out to be: a habit you grew into."),
        fr("ab7-ar3", "These days you give easily, and it surprises you every time. A round of drinks. A friend’s train fare home. Your time, too, because you have more of it. You think of the words {desire.quote}, and you realise the best part was always going to be this."),
        fr("ab7-ar4", "You sit down with the year’s numbers on a quiet evening and notice what is missing: the fear. You can look at every figure without flinching. It started with money and spread to everything else. Looking straight at things is what {desire.np} gave you, more than anything."),
      ],
      living: [
        fr("ab7-li1", "You make a list of everyone who helped you get here. The friend who let you sleep on their sofa. The person who explained interest to you over chips. The stranger whose article changed one habit. Then you write to two of them, just to say thank you."),
        fr("ab7-li2", "You spend an afternoon on something you could never have afforded once. What you notice most is the missing guilt. You enjoy it all the way through, with no running total in the back of your mind. You come home lighter than you left."),
        fr("ab7-li3", "At the end of the year you sit down and decide where your giving will go next. It has become one of your favourite evenings. You make tea, light a candle, and look at the list of people and places you want to help. Abundance, you have learned, is mostly room to choose."),
        fr("ab7-li4", "You catch yourself telling a story about the hard years, and you notice it has become a story. It has a beginning, a middle and an end, and you are telling it from somewhere safe. You stop for a second, a little moved, then finish it with a laugh."),
      ],
      titles: [ti("ab7-t1", "Room to Choose"), ti("ab7-t2", "The Habit You Grew Into"), ti("ab7-t3", "From Somewhere Safe")],
    },
  },

  chapterOne: [
    // A home of your own, or a move to a new place: the first morning there.
    {
      id: "ab-one-home",
      motifs: ["home", "relocation"],
      title: ti("ab-one-home-t", "Boxes in the Corner"),
      opening: {
        morning: fr("ab-one-home-op-m", "Good morning, {name}. Hold the day off for a few minutes. You are about to wake up somewhere new, somewhere the post will soon arrive with your name on it. Let yourself be a little lost when you wake. It is part of the joy."),
        evening: fr("ab-one-home-op-e", "Let the evening settle, {name}. Where you are going, it is the first morning in a new place. The light is coming in at an angle you have never seen before, and you are about to wake up in it."),
      },
      body: [
        { kind: "text", fragment: fr("ab-one-home-p1", "You wake up and, for a second, have no idea where you are. The window is in the wrong place. The light is a different colour. Then it comes back all at once, and you laugh out loud into the quiet. There are boxes in the corner with your handwriting on them. It is true: {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("ab-one-home-p2", "You wander through the rooms touching things. The cool wall. The window latch. A cupboard that sticks and will need a bit of sandpaper. Even the flaws are thrilling, because they are yours to fix or leave. You find the kettle in a box marked kitchen, urgent, and make the first cup here.") },
        { kind: "text", fragment: fr("ab-one-home-p3", "You drink it by the window and watch the street wake up. A neighbour you have not met yet is watering a plant on their step. A bus goes past with its lights still on. You learn the sounds of the place one by one, the way you learn a new song.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("ab-one-home-p4", "There was a time you wrote {desire.quote} and scrolled through photos of rooms that belonged to strangers. You feel {feeling}, so much that you have to set the cup down. This is what {desire.np} felt like on the first morning: like arriving, and being allowed to stay.") },
      ],
      closing: {
        morning: fr("ab-one-home-cl-m", "Come back gently, {name}. Take one detail from that new place with you: the light, the sticky cupboard, the street waking up. Below are a few small steps toward it. Choose one for today."),
        evening: fr("ab-one-home-cl-e", "Let the new rooms go dim, {name}. Picture yourself switching off the light there for the first time, then switch off yours. Choose a small step for tomorrow below, and rest. That door is closer than it feels."),
      },
    },
    // Debt and savings: the first morning the number stopped shouting.
    {
      id: "ab-one-clear",
      motifs: ["debt-free", "savings"],
      title: ti("ab-one-clear-t", "Steady as Furniture"),
      opening: {
        morning: fr("ab-one-clear-op-m", "Good morning, {name}. Give the day a minute. You are going to a morning just ahead of this one, where a certain number has finally stopped shouting at you."),
        evening: fr("ab-one-clear-op-e", "Close the day, {name}. In the story you are about to enter, it is morning. You have slept through the night without once waking up to do sums, and you are about to notice."),
      },
      body: [
        { kind: "text", fragment: fr("ab-one-clear-p1", "You wake up rested, which still feels like a trick. For years the first thought of every morning was a number. This morning the first thought is the light on the ceiling, and the second is breakfast. The number comes third, and it comes kindly. You smile at the ceiling, because {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("ab-one-clear-p2", "You make coffee and open the banking app on purpose, just to look. There it is. The figure that used to make your chest tighten sits calmly on the screen, steady as furniture. You look at it the way you would look at a view. Then you close the app and drink your coffee while it is hot. Hot coffee, it turns out, is one of the perks.") },
        { kind: "text", fragment: fr("ab-one-clear-p3", "A friend texts to ask if you want dinner at the new place on the corner. A year ago you would have invented a reason to stay in. This morning you just say yes. You even suggest pudding. Then you put a little aside for whoever needs it next, because you finally can.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("ab-one-clear-p4", "You think of every small payment, every no to something you wanted, every month you held the line after writing {desire.quote}. It all added up. You feel {feeling}, light in a way you had forgotten was possible. This is what {desire.np} felt like on the first morning: like being let out.") },
      ],
      closing: {
        morning: fr("ab-one-clear-cl-m", "Come back slowly, {name}. Keep that lightness with you. Below there is a small step toward it, the kind that adds up over months. Choose one, and give it a time today."),
        evening: fr("ab-one-clear-cl-e", "Let the morning go dark, {name}. Nothing needs counting tonight. Choose a step for tomorrow if you like, and then let yourself sleep straight through, the way you did in that story."),
      },
    },
    // Default: ease and choice, for any abundance desire.
    {
      id: "ab-one-default",
      motifs: [],
      title: ti("ab-one-default-t", "Before You Checked"),
      opening: {
        morning: fr("ab-one-default-op-m", "Good morning, {name}. Before you open anything, before the numbers and the news, come and spend a few minutes somewhere else. It is a morning a little further along than this one, and it is calm."),
        evening: fr("ab-one-default-op-e", "Let the day close, {name}. Close your eyes if you like. You are going somewhere it is early morning, and nothing in that morning is waiting to frighten you. Not one envelope, not one number."),
      },
      body: [
        { kind: "text", fragment: fr("ab-one-default-p1", "You wake up and lie there for a moment, listening to the street. Somebody is dragging a bin back in. A bird is making the same remark over and over. You notice an absence before you can name it: there is no sum running in your head. Then you remember, with a slow, spreading warmth, that {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("ab-one-default-p2", "In the kitchen, the kettle clicks off and you realise you have not reached for your banking app. You did not need to. You know roughly what is there, and roughly is enough. You pour the water and watch the steam lift, and the whole thing feels almost indecently calm.") },
        { kind: "text", fragment: fr("ab-one-default-p3", "On the counter is a letter that came yesterday, the kind you once left unopened for a week. You open it with a butter knife, read it, and add it to the pile. Then you text a friend about the trip in the spring. You tell them you are in, and you do not check anything first. It is a small yes. It feels enormous.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("ab-one-default-p4", "You think of the person who wrote {desire.quote}, doing sums at the table at midnight, trying to make the numbers lie down. You feel {feeling}, steady and warm. This is what you hoped {desire.np} would feel like: room to breathe, and room to say yes.") },
      ],
      closing: {
        morning: fr("ab-one-default-cl-m", "Come back to your morning, {name}. Bring that calm with you, and the yes. Below are a few small steps, each one a piece of the ease you just visited. Pick one for today, and let it be easy."),
        evening: fr("ab-one-default-cl-e", "Let the kitchen fade, {name}. There is nothing to calculate tonight. Choose a small step for tomorrow below, or leave it until morning. Then sleep the way you slept in that story: all the way through. Let the numbers rest too."),
      },
    },
  ],
};
