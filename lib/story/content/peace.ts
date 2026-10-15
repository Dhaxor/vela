// PEACE — focus content (A4).
// Seven stages × (4 arrival, 4 living, 3 titles) + hand-tuned Chapter I scripts:
// a default plus scripts for the calm-mind motif and for a quiet home
// (home, relocation). Peace is shown as room: margins in the day, a phone in
// another room, a worry looked at and let go. Hard days stay hard; calm is how
// fast you come back, never a promise that nothing goes wrong.
// Editing notes from full-season reads:
// - Pool beats carry no {feeling}: the shared reflection always does.
// - Titles are drawn apart from the beats, so each must fit every variant of its stage.
// - Stop-desires shape to 'no longer overthinking everything': keep {desire.np} in
//   frames that survive that ('toward', 'measured in dinners'), else use {desire.quote}.
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

export const PEACE: FocusContent = {
  focus: "peace",
  stages: {
    // I · The First Glimpse: the first morning inside it.
    1: {
      arrival: [
        fr("pe1-ar1", "You wake slowly, with no jolt and no reach for the phone. The room is cool and grey, and the radiator is ticking. You lie there and listen to it for a while, because you can. Nothing is chasing you. It turns out to be this simple: {desire.done}."),
        fr("pe1-ar2", "The first thing you notice is the space in your head. The usual crowd of tasks and worries hasn’t turned up. There is room in there, like a house after the guests have gone home. You wrote {desire.quote}, and this is the room it made."),
        fr("pe1-ar3", "You make breakfast without checking anything first. The kettle takes its time and you let it. Steam fogs the window, toast browns, a spoon clinks against the cup. Your breathing has slowed to match the morning. It is real, {name}: {desire.done}."),
        fr("pe1-ar4", "You open the window and the air comes in cool, carrying birdsong and the far-off hush of traffic. Your shoulders are somewhere they have never been at this hour: down. The day ahead looks long and kind. You wrote {desire.quote}, and you have woken up inside it."),
      ],
      living: [
        fr("pe1-li1", "You leave your phone in the other room and drink your tea slowly, both hands around the mug. Outside, a cat picks its way along a wall. A delivery van idles and moves on. Twenty minutes pass and nothing is lost. You are entirely here, and in no hurry to be anywhere else."),
        fr("pe1-li2", "There is a message waiting that would once have flooded your whole morning. You read it, decide it can wait until ten, and put the phone face down. The decision costs nothing. Your chest stays soft. You go back to your breakfast and finish every bite."),
        fr("pe1-li3", "On the street you notice things: a tree just turning, the smell from the bakery, a small glove someone has propped on a railing. Your mind isn’t three hours ahead. It is right here on this pavement, enjoying the cold."),
        fr("pe1-li4", "Mid-morning, you do one thing at a time. You finish it, then start the next. The old static, that sense of fifty doors left open, has gone quiet. You catch yourself humming, {name}, and realise you haven’t done that in years."),
      ],
      titles: [ti("pe1-t1", "Nothing Chasing You"), ti("pe1-t2", "Room in Your Head"), ti("pe1-t3", "An Unhurried Start")],
    },
    // II · The Night Before: anticipation and rehearsal.
    2: {
      arrival: [
        fr("pe2-ar1", "Tomorrow is a big day, and for once you are not bracing for it. Tonight you tidy just enough: the dishes, the bag, the clothes on the chair. Then you stop. The rest can wait. The words you wrote, {desire.quote}, feel close tonight, like a light left on in the next room."),
        fr("pe2-ar2", "You write down every open loop in your head, all of it, on one page. It turns out to be eleven things, nowhere near a hundred. You circle two for tomorrow and let the others rest on the paper. Your chest loosens. One page at a time, you are walking toward {desire.np}."),
        fr("pe2-ar3", "You set the alarm later than you used to, then turn the phone face down and slide it into a drawer. The bedroom goes dim. Outside, the street is quiet except for one late bus. You wrote {desire.quote}, and tomorrow is the first page of it."),
        fr("pe2-ar4", "You lay out tomorrow on the kitchen table like a map: one early start, one hard hour, one long gap with nothing in it. For once the gaps are on purpose. Your jaw unclenches as you look at it. That is what the work toward {desire.np} has bought you, {name}: room."),
      ],
      living: [
        fr("pe2-li1", "You run a bath and read three pages of a book you love while the water cools around you. Nobody needs anything from you. The house ticks and settles. When you get out, the towel is warm from the radiator and the whole evening smells of soap."),
        fr("pe2-li2", "You message the people who need to know: you will be slower to reply for a while, and it is on purpose. Two of them send back hearts. One says they are jealous. You smile and put the phone away for the night."),
        fr("pe2-li3", "You picture tomorrow in pieces: waking without the alarm’s shove, the long breakfast, the walk with no headphones. You let each picture rest a moment before the next. Your breathing slows to meet them. It feels like reading a menu of things you are allowed."),
        fr("pe2-li4", "Before bed you sit by the window with the lamp off and watch the street lights hum. A fox crosses the road and is gone. You feel the day ending all the way through you. Tomorrow will be gentle, {name}. You made room for it."),
      ],
      titles: [ti("pe2-t1", "Room for Tomorrow"), ti("pe2-t2", "An Early, Easy Night"), ti("pe2-t3", "The Calm Before")],
    },
    // III · The Hard Day: calm tested, and found to hold.
    3: {
      arrival: [
        fr("pe3-ar1", "The call comes at nine with bad news of the practical kind: a mistake, a bill, a deadline moved. Your shoulders climb toward your ears. You notice them climbing. You put the phone down, breathe out longer than you breathed in, and decide what happens first. You have practised for mornings like this one."),
        fr("pe3-ar2", "You wake at three with your mind racing, the old spiral starting its loop. For a minute you ride it, heart thudding. Then you remember what you practised: hand on your chest, eyes on the dark ceiling, five things you can hear. The spiral slows. Even at three in the morning, you are on your way to {desire.np}."),
        fr("pe3-ar3", "The day fills up before breakfast is finished: a cancelled train, a forgotten appointment, three messages that all say urgent. The old you would have tried to answer everything at once. You sit down, pick the one that matters, and let the others wait an hour. This is what the work toward {desire.np} was for."),
        fr("pe3-ar4", "Someone you love is having a terrible week, and they call you twice before lunch. You listen. You help where you can. Then, gently, you notice where their worry ends and yours begins. You can care without sinking, {name}, and it took years to learn how."),
      ],
      living: [
        fr("pe3-li1", "You go outside for ten minutes with nothing in your hands. The air is cold and smells of wet leaves. You go to the end of the street and back, slowly, letting your breath find its way down. By the time you are home, the problem is the same size and you are bigger."),
        fr("pe3-li2", "You write the worry down in plain words so it stops circling: what happened, what you can do, what is out of your hands. On paper it is smaller and more specific. You do the first thing on the list and leave the rest for tomorrow."),
        fr("pe3-li3", "You cancel the evening plan without inventing an excuse, and your friend says of course, take care. You make something warm, eat it slowly, and go to bed early with the window open a crack. Under the tiredness, something holds steady, like a floor."),
        fr("pe3-li4", "By evening the day still isn’t fixed, and you let it stay unfixed. You wash up by hand, warm water to the wrist, one plate at a time. The rhythm settles you. Some days just have to be got through, {name}, and you are getting through this one gently."),
      ],
      titles: [ti("pe3-t1", "The Day That Tested It"), ti("pe3-t2", "Coming Back Faster"), ti("pe3-t3", "Bigger Than the Problem")],
    },
    // IV · Someone Notices: a witness reflects the change back.
    4: {
      arrival: [
        fr("pe4-ar1", "At lunch a friend stops mid-sentence and looks at you. “You’re so calm these days,” they say. “What happened?” You shrug, then tell them the truth: you stopped running. They are quiet for a moment. It is strange to hear your own life described back to you, and stranger still that it sounds true."),
        fr("pe4-ar2", "Your neighbour mentions that you seem to have more time lately, though your job and your bills are exactly the same. You know what changed. You stopped borrowing worry from next week. You thank them and carry the comment indoors like a warm loaf. You never told them a thing."),
        fr("pe4-ar3", "Someone you share meals with notices that you don’t check your phone at dinner anymore. They mention it lightly, with a soft face. You realise they have been waiting for this, the version of you who is fully at the table. It is everything you asked for, measured in dinners."),
        fr("pe4-ar4", "In a tense moment, a group turns to you without thinking, because you are the steady one these days. You never asked for the role. You just stopped panicking first. You speak slowly, and the room slows down with you, {name}. Calm, it turns out, is catching."),
      ],
      living: [
        fr("pe4-li1", "A friend who is struggling calls you, specifically you, because you seem to have found something. You listen more than you talk. At the end they say just hearing your voice helped. Afterwards you sit with the phone in your lap for a while, warm all the way through."),
        fr("pe4-li2", "The person at the corner shop asks if you have been on holiday. You haven’t. You laugh and say you have just been sleeping better and saying no more often. They nod slowly, as if you have handed over a recipe."),
        fr("pe4-li3", "Your oldest friend watches you let a delay go without a single sigh. The train is late, the platform is cold, and you are talking about a book. They shake their head, grinning. “Who are you?” they say. You know exactly who you are."),
        fr("pe4-li4", "In the photos from the weekend your face looks different: open, unguarded, the jaw loose. You don’t remember deciding to look like that. You simply were, all afternoon, without trying. You save one picture for harder days, {name}, as evidence."),
      ],
      titles: [ti("pe4-t1", "The Steady One"), ti("pe4-t2", "Calm Is Catching"), ti("pe4-t3", "What They Noticed")],
    },
    // V · The Threshold: the first sixty seconds after the news.
    5: {
      arrival: [
        fr("pe5-ar1", "The news arrives and, for once, your body doesn’t brace. You read it at the kitchen table. You read it again. Then you put the phone down very gently, as if it might spill. It is done. It is real, {name}: {desire.done}."),
        fr("pe5-ar2", "You hand in the last piece, close the laptop, and the silence afterwards is enormous. No next thing. No ping. You sit with your hands flat on the table and feel your heartbeat slowing, slowing. You wrote {desire.quote} for exactly this minute."),
        fr("pe5-ar3", "You realise it on an ordinary walk: the old tightness in your chest hasn’t visited for weeks. You stop on the path to check, the way you would pat a pocket for keys. Nothing. The space where it lived is just space. You wrote {desire.quote}, and here it is."),
        fr("pe5-ar4", "The moment comes quietly. A long wait ends, a door closes behind you, and the air changes. You stay very still for sixty seconds and let it be true. Your eyes sting, and you let them. Then you breathe out the longest breath of your life: {desire.done}."),
      ],
      living: [
        fr("pe5-li1", "The first thing you want is to tell someone, so you do. They pick up and you just say it, plainly, and hear them gasp and then laugh. For a minute neither of you can manage a full sentence. You lean on the kitchen counter, laughing and crying at once."),
        fr("pe5-li2", "You go outside without your coat because you can’t sit still. The cold air hits your face and it feels like being woken up kindly. A bird goes over. You watch it all the way out of sight, and something in you that has been clenched for years lets go."),
        fr("pe5-li3", "You write the date in your notebook with one line under it, so you will always know. Your hand is steadier than you expected. You read it back three times. Then you close the notebook and just sit, {name}, letting the quiet be the celebration."),
        fr("pe5-li4", "You put the kettle on because that is what you do, and you laugh at yourself for it. Even the biggest news gets a cup of tea. You hold the mug in both hands and watch the steam, and the minute stretches out, wide and slow and yours."),
      ],
      titles: [ti("pe5-t1", "The Longest Breath"), ti("pe5-t2", "Very Still"), ti("pe5-t3", "The Quiet After")],
    },
    // VI · An Ordinary Day: it has become normal.
    6: {
      arrival: [
        fr("pe6-ar1", "Today is a plain day and you are at ease inside it. Work, lunch, a few errands, an evening with nothing in it. The calm has stopped feeling like a holiday. It feels like your address. This is what you asked for when you wrote {desire.quote}, with the newness worn off."),
        fr("pe6-ar2", "Your calendar has white space in it, on purpose. Between commitments there are ten minutes for nothing, and you use them to look out of the window or refill your water. Nobody notices, and everything goes a little better. That is what {desire.np} looks like in an ordinary week."),
        fr("pe6-ar3", "The washing machine finishes and you hang the clothes on the rack one by one, thinking about nothing at all. The radio murmurs in the next room. It is the most ordinary half hour imaginable, and you are present for every minute. Since {desire.done}, even chores have room in them."),
        fr("pe6-ar4", "A message arrives marked urgent. You read it, and it isn’t. You reply calmly at a reasonable hour, and nobody minds. Most of the emergencies were never yours to carry. You carry your own things, {name}, and they fit in your hands."),
      ],
      living: [
        fr("pe6-li1", "At lunch you eat away from the screen, at an actual table, tasting the food. Someone joins you and you talk about nothing important for twenty minutes. It is lovely. You go back to the afternoon rested, as if you had taken a holiday small enough to fit in an hour."),
        fr("pe6-li2", "You take the long way home through the park, without headphones. You hear things you used to miss: a ball bouncing, two people debating a film, the wind getting into the trees. Your mind wanders off and comes back on its own, like a dog off the lead."),
        fr("pe6-li3", "The evening has nothing scheduled in it, and you don’t fill it. You cook slowly, eat by the window and read until your eyes get heavy. When you turn out the light, the day feels complete, like a sentence that ended where it meant to."),
        fr("pe6-li4", "Your phone buzzes three times during dinner and you don’t look. Later you check: nothing that couldn’t wait, nothing that needed you. You smile and put it on charge in the hallway, {name}, where it sleeps these days."),
      ],
      titles: [ti("pe6-t1", "White Space on Purpose"), ti("pe6-t2", "Room in the Day"), ti("pe6-t3", "Nothing Urgent")],
    },
    // VII · Becoming: identity, looking back, gratitude.
    7: {
      arrival: [
        fr("pe7-ar1", "You find an old to-do list in a coat pocket, three columns long, every item underlined twice. You remember the person who wrote it, always running, always behind. You fold it up with real kindness. That person set out toward {desire.np} carrying far too much."),
        fr("pe7-ar2", "You are someone who rests. The sentence would once have sounded lazy to you. Today it sounds wise. You have learned that the world keeps turning when you sit down, and that you are better company when you do. Along the way, {desire.np} became part of you."),
        fr("pe7-ar3", "Looking back, peace didn’t arrive in one grand moment. It came in small decisions: a phone left in another room, a no said gently, a walk taken in place of a worry. Most of them took less than a minute. They added up, {name}, to {desire.np}."),
        fr("pe7-ar4", "You think of the person who first decided to slow down. It was frightening, stepping off the treadmill while everyone else kept running. It felt like losing ground. They did it anyway, and everything in {desire.quote} was waiting on the other side."),
      ],
      living: [
        fr("pe7-li1", "Someone frazzled asks how you stay so calm. You tell them the unglamorous truth: you protect your mornings, you say no early, and you let things take the time they take. They write it down. You remember needing the same advice, and who gave it to you."),
        fr("pe7-li2", "You sit on the step with a cup of tea and watch the evening come in. The sky goes from blue to ink. Lights come on in other windows. You don’t reach for anything. You are exactly where you want to be, and that is the whole of it."),
        fr("pe7-li3", "At the end of the day you notice your breathing, slow and low, without having arranged it. Your body learned calm the way hands learn a song. You don’t have to think about it anymore. It plays on its own, {name}."),
        fr("pe7-li4", "Before sleep you open the window a crack and listen. Rain, a distant car, your own breath. You used to need noise to drown out your thoughts. These days you can listen to the quiet, and the quiet listens back."),
      ],
      titles: [ti("pe7-t1", "Enough for Today"), ti("pe7-t2", "At Home in the Quiet"), ti("pe7-t3", "The Calm You Built")],
    },
  },
  chapterOne: [
    {
      id: "pe-one-calm",
      motifs: ["calm-mind"],
      title: ti("pe-one-calm-t", "A Quiet Head"),
      opening: {
        morning: fr("pe-one-calm-op-m", "Good morning, {name}. Let your eyes rest on something still, or let them close. Breathe in, then out a little longer. This story is a morning where your mind is finally on your side."),
        evening: fr("pe-one-calm-op-e", "Settle in, {name}. Let your thoughts come and go like traffic in another street. Breathe out slowly, and let the dark carry you to a morning where your head is quiet."),
      },
      body: [
        { kind: "text", fragment: fr("pe-one-calm-p1", "You wake and wait for the spiral, out of old habit. It doesn’t start. Your thoughts arrive one at a time, politely, like guests who knocked first. The room is cool. A car passes. Your chest is soft. You wrote {desire.quote} on a night when your head wouldn’t stop. This is the morning those words were asking for.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("pe-one-calm-p2", "You make breakfast and notice that you are tasting it. Sunlight inches across the table. Butter, salt, the bitter edge of the coffee. A worry drifts past about something later in the week, and you look at it, and it drifts on. It doesn’t take the wheel. You finish your toast and rinse the plate.") },
        { kind: "text", fragment: fr("pe-one-calm-p3", "Later something small goes wrong: a delayed bus, a terse message. Your body starts its old routine, then stops halfway, as if it remembered it doesn’t need to. You breathe out. You deal with the thing. The whole episode takes four minutes, where it once took four hours. Then the day carries on, and so do you.") },
        { kind: "motif", part: "witness" },
        { kind: "text", fragment: fr("pe-one-calm-p4", "You feel {feeling}, {name}, and a little amazed at how spacious your own head can be. Every time you named a thought instead of following it is folded into this morning, and every slow breath on a bad night. They led you here, one quiet choice at a time: {desire.done}.") },
      ],
      closing: {
        morning: fr("pe-one-calm-cl-m", "Return slowly, at your own pace. Your mind can be this kind to you today, in small moments. Find one of them, {name}, and stay in it a little longer."),
        evening: fr("pe-one-calm-cl-e", "Let your thoughts go quiet with the room. There is nothing left to figure out tonight. Breathe out slowly, and let that calm morning wait for you on the other side of sleep."),
      },
    },
    {
      id: "pe-one-home",
      motifs: ["home", "relocation"],
      title: ti("pe-one-home-t", "A Window Onto Quiet"),
      opening: {
        morning: fr("pe-one-home-op-m", "Good morning, {name}. Let yourself arrive in this moment before the day does. Breathe slowly and let your hands rest open. Picture the place where you feel most at peace. It is morning there."),
        evening: fr("pe-one-home-op-e", "Let the evening settle over you, {name}. Breathe out the day. Let the dark of your room become the dark before dawn in the place you have longed for. You can almost hear its weather already."),
      },
      body: [
        { kind: "text", fragment: fr("pe-one-home-p1", "You wake to a different kind of quiet. The light comes in at a new angle, across a floor that is yours. Outside there is only weather and the occasional bird. You lie still and let it sink in, the way warmth sinks into cold hands. You wrote {desire.quote}. You are waking up inside it.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("pe-one-home-p2", "You move through the rooms slowly, touching things as you pass: the cool wall, the back of a chair, the window latch. The floor answers with small, familiar creaks. Everything is where you put it. Nothing is waiting to be fixed today. You make a hot drink and carry it to the spot where the light falls best, and you sit there until it goes cool.") },
        { kind: "text", fragment: fr("pe-one-home-p3", "You open the window and the air comes in clean, smelling of earth or salt or rain, whichever this place gives you. You can hear your own breathing. Somewhere a gate clicks shut. For a long while you just look out. There is nowhere else you need to be, and nobody waiting for a reply.") },
        { kind: "motif", part: "witness" },
        { kind: "text", fragment: fr("pe-one-home-p4", "You feel {feeling}, {name}, and settled, like a stone that has finally reached the riverbed. Every hard choice you made toward {desire.np} lives in this quiet morning: each no, each saving, the leap itself. The whole place seems to breathe with you.") },
      ],
      closing: {
        morning: fr("pe-one-home-cl-m", "Let the room come back around you. Take the quiet of that place into today. One small choice brings it a little closer, and it will be easy to find."),
        evening: fr("pe-one-home-cl-e", "Stay in that quiet place as you drift toward sleep. Hear the weather outside its windows. Nothing is needed from you tonight, {name}. Let the quiet hold you."),
      },
    },
    {
      id: "pe-one-default",
      motifs: [],
      title: ti("pe-one-default-t", "The Morning With Margins"),
      opening: {
        morning: fr("pe-one-default-op-m", "Good morning, {name}. Before the day starts asking for things, give yourself these few minutes. Let your breath slow and your shoulders drop. Imagine the first truly unhurried morning of your life. It starts like this."),
        evening: fr("pe-one-default-op-e", "Let the day go, {name}. Whatever is unfinished can stay unfinished until tomorrow. Get comfortable, breathe out slowly, and let the dark turn into the soft grey of an unhurried morning. Let it come slowly."),
      },
      body: [
        { kind: "text", fragment: fr("pe-one-default-p1", "You wake without the alarm and lie still, listening. A pigeon on the roof. Water moving in the pipes. A door somewhere, closing softly, and then nothing for a long time. Your mind doesn’t leap ahead to the day’s list. It stays here, in the warm bed and the grey light. You wrote {desire.quote}. This morning, it is simply how things are.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("pe-one-default-p2", "In the kitchen you fill the kettle and wait for it without doing anything else. You just watch the window steam up. The clock on the oven shows a time that doesn’t matter yet. The phone is charging in the hallway, and it can stay there. You make the tea properly, the way you like it, and drink it while it is hot, standing at the window in your socks.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("pe-one-default-p3", "The day ahead has room in it. There are things to do, the same things as always, and none of them is chasing you. You will do them one at a time, at a human pace. Lunch will be a real lunch, at a table. If something unexpected turns up, there will be space to meet it. You can feel that space like a deep breath.") },
        { kind: "text", fragment: fr("pe-one-default-p4", "You feel {feeling}, {name}, in a way that goes all the way down. Every no that kept your days from crowding is inside this morning. Every phone left in another room, every walk without headphones, every early night. Together they led here: {desire.done}. It feels like coming home.") },
      ],
      closing: {
        morning: fr("pe-one-default-cl-m", "Open your eyes slowly. Carry a little of that unhurried morning into this one. Today has one small choice that makes room, and you will know it when you see it."),
        evening: fr("pe-one-default-cl-e", "Stay in that slow morning as you drift. Nothing needs you tonight, {name}. The list can sleep too. Let your breathing lengthen and let the quiet carry you."),
      },
    },
  ],
};
