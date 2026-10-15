// HEALTH — focus content (A4).
// Seven stages × (4 arrival, 4 living, 3 titles) + hand-tuned Chapter I scripts:
// a default plus scripts for the running, sleep and healing motifs. Strength and
// the other motifs use the default script, whose motif slot carries their detail.
// Health shows energy, capability and care. It never promises a medical outcome,
// never mentions weight or size, and never assumes how a body moves unless the
// matched motif says so (the running script). Witnesses notice energy and habits,
// never looks.
// Editing notes from full-season reads:
// - Pool beats carry no {feeling}: the shared reflection always does, and a second
//   'you feel proud' in the same chapter reads as a tic.
// - Titles are drawn apart from the beats, so each must fit every variant of its stage.
// - {desire.done} may be an event ('you ran a half marathon') or a state ('you sleep
//   through the night again'): use it after a colon, never after a temporal 'since'.
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

export const HEALTH: FocusContent = {
  focus: "health",
  stages: {
    // I · The First Glimpse: the first morning inside it.
    1: {
      arrival: [
        fr("he1-ar1", "You wake a minute before the alarm and lie still, taking stock. Your body reports in, part by part, and the news is good. Your head is clear and the day ahead looks possible. You wrote {desire.quote}, and this is the morning it was about."),
        fr("he1-ar2", "The energy is there before the coffee. It sits in your hands and shoulders, patient, ready when you are. You keep waiting for the catch, the old fee the morning used to charge. It never comes. It is real, {name}: {desire.done}."),
        fr("he1-ar3", "You open the curtains and look at the whole day laid out: errands, work, the evening plan you said yes to. For once you aren’t rationing yourself across it, saving a little here to spend there. The words you wrote, {desire.quote}, have turned into an ordinary morning."),
        fr("he1-ar4", "You fill a glass at the tap and drink it slowly by the open window. Cold water, a pale sky, a bird fussing on the gutter. Your body feels like an ally this morning, quick to answer and easy to live in. This is what you meant, {name}, when you wrote {desire.quote}."),
      ],
      living: [
        fr("he1-li1", "Breakfast tastes like something today. You notice all of it: the warmth of the bowl, a pinch of salt, bread gone crisp at the edges. You eat sitting down, in no hurry, and hum while you rinse the plate. Nothing about the morning has to be earned."),
        fr("he1-li2", "A message arrives about a plan for tonight. The old you would have checked the tank first, counting what might be left by six. Today you type yes before you finish reading, and you mean it. There will be enough left for the evening. You know it like your own name."),
        fr("he1-li3", "By mid-afternoon you are bracing for the slump, the heavy hour that used to fold you in half. It doesn’t come. At four you notice its absence, the way you notice a tap that has finally stopped dripping, and you laugh out loud at nobody."),
        fr("he1-li4", "You take the long way home because the air is good and you have energy to spare. Shop windows, a dog tied up outside the bakery, someone trimming a hedge. Your pace is your own. You feel at home in your skin, {name}, and it shows in how you move."),
      ],
      titles: [ti("he1-t1", "The Morning Says Yes"), ti("he1-t2", "Enough for the Whole Day"), ti("he1-t3", "Waking Up Willing")],
    },
    // II · The Night Before: anticipation and rehearsal.
    2: {
      arrival: [
        fr("he2-ar1", "Tomorrow is the day your small mornings have been building toward. Your bag waits by the door, the water bottle filled, the alarm set for a sensible hour. You check it all once, then make yourself stop. Everything that leads to {desire.np} is already in place."),
        fr("he2-ar2", "The evening is calmer than you expected. You eat a proper dinner, slowly, and stop when you are comfortable. No cramming, no bargains with yourself. You wipe the counter and switch off the radio. Every early night on the way to {desire.np} was practice for this one."),
        fr("he2-ar3", "Everything you need for tomorrow waits on the chair: clothes folded, shoes beside them, laces loose. It looks like someone about to begin. You have shown up more times than you can count, {name}, on mornings far harder than this one. Tomorrow is one more of those mornings, only louder."),
        fr("he2-ar4", "You walk through tomorrow in your head once: waking, eating, the first easy minutes, the steady middle. Your shoulders drop as you picture it. You have rehearsed {desire.np} with every early night and every glass of water. The rehearsal is over. What is left is showing up."),
      ],
      living: [
        fr("he2-li1", "You run a bath, or a long hot shower, and let the warmth work on your shoulders. Afterwards the towel is rough and clean. You set water by the bed and plug your phone in across the room. Then you lie on top of the covers for a minute, heavy and warm, listening to the house settle."),
        fr("he2-li2", "A friend calls to wish you luck. You explain the plan in three sentences and hear how calm you sound. They tell you that you sound ready. After the call you sit for a moment in the hallway, phone in your lap, letting that word settle."),
        fr("he2-li3", "In bed, you do the breathing you practised: in for four, out for six, until tomorrow blurs at the edges. The nerves are there, fizzing lightly under your ribs. You let them stay. Nerves are only energy that hasn’t found its job yet, and tomorrow it will."),
        fr("he2-li4", "You write tomorrow’s first three moves on a sticky note: wake, water, out the door. You press it to the kettle where you can’t miss it. Then you turn out the light, {name}, and the dark feels friendly, like a room that knows your plans."),
      ],
      titles: [ti("he2-t1", "Ready by the Door"), ti("he2-t2", "The Early Night"), ti("he2-t3", "Rested for Tomorrow")],
    },
    // III · The Hard Day: a realistic setback, handled with care.
    3: {
      arrival: [
        fr("he3-ar1", "You wake heavy. The night was broken and your throat is scratchy, and the plan for today looks taller than it did yesterday. The old voice starts its speech about how this always happens. You let it talk while you fill a glass of water. You are still working toward {desire.np}, even on a slow morning."),
        fr("he3-ar2", "Halfway through the morning, a familiar ache returns, the one you hoped was behind you. The disappointment stings more than the ache does. You stop, sit down, and breathe into it until the worst of it passes. One rough day does not cancel weeks of steady work toward {desire.np}."),
        fr("he3-ar3", "The session you planned isn’t going to happen. A deadline swallowed the afternoon, the rain came in sideways, and by six you are running on fumes. Part of you wants to call the whole thing off. Instead, you look for the smallest version that still counts."),
        fr("he3-ar4", "Today your body asks for less. Every instinct says push through and punish the tiredness out of yourself. You choose differently. You cancel the extra plan, keep the one that matters, and tell the people involved without a long apology. Rest is part of {desire.np}, {name}, the part nobody photographs."),
      ],
      living: [
        fr("he3-li1", "You do the small version. Ten minutes instead of forty, once around the block instead of the full loop. It feels almost silly. Then you notice your breathing has evened out and your mood has lifted half a step. The silliness turns into something closer to respect."),
        fr("he3-li2", "You text the friend you were meant to see: rain check, still want to hear everything. They reply with a photo of their sofa and a thumbs up. No drama, no apology tour. You make soup from whatever is in the fridge and eat it with the radio on."),
        fr("he3-li3", "You write it down honestly in your notebook: slept badly, low energy, took the gentle option. Three short lines. In plain ink the day looks smaller and easier to forgive. You close the notebook, put the kettle on and let the evening be as slow as it wants."),
        fr("he3-li4", "The appointment runs forty minutes late and the waiting room is too warm. You read the same paragraph four times. When your name is called, you ask your two questions clearly and write the answers down. You walk home slowly with a plan in your pocket, which is more than you had this morning."),
      ],
      titles: [ti("he3-t1", "The Gentle Option"), ti("he3-t2", "Rest Is Part of It"), ti("he3-t3", "Slow Days Count Too")],
    },
    // IV · Someone Notices: a witness reflects the change back.
    4: {
      arrival: [
        fr("he4-ar1", "Your oldest friend looks at you across the café table and narrows their eyes. “Something’s different,” they say. “You look awake.” You laugh and wave it away, and they keep looking. You let them. This is what {desire.np} can look like from across a table."),
        fr("he4-ar2", "Your neighbour catches you at the front door, arms full of shopping, humming something. “Where do you get the energy these days?” they ask. You laugh and admit you don’t quite know. The work toward {desire.np} is showing, {name}, even on the doorstep."),
        fr("he4-ar3", "Someone at the table passes you the bread and remarks, half joking, that you have stopped saying you are tired. They are right. You used to open every conversation with it, like a password. That sentence left with the old habits, somewhere on the way to {desire.np}."),
        fr("he4-ar4", "The person who has watched you try for years says it plainly over the washing up: you seem at home in yourself. You keep drying the same plate for a while. Of everything {desire.np} has given you, that sentence might be the best."),
      ],
      living: [
        fr("he4-li1", "On the way to the station, a friend asks you to slow down, laughing, and you realise you are the quick one these days. For years you were the one asking. You match their pace and talk the whole way, and your breath never once runs short."),
        fr("he4-li2", "Your reflection catches you in a shop window. For a second you don’t recognise yourself: shoulders down, chin up, moving like someone with somewhere good to be. Then you do, and you grin at yourself all the way to the corner."),
        fr("he4-li3", "At the bakery, the person who serves you most mornings says you seem brighter lately, and asks what changed. You hear yourself explain without a joke or an apology. It sounds like a life you chose on purpose, {name}, because it is."),
        fr("he4-li4", "At a long lunch, someone you haven’t seen in a year says you look like yourself again, only more so. You don’t deflect it. You say thank you, that you have been taking care of yourself, and the sentence feels true in your mouth."),
      ],
      titles: [ti("he4-t1", "The Change Shows"), ti("he4-t2", "Someone Says It Plainly"), ti("he4-t3", "Seen From the Outside")],
    },
    // V · The Threshold: the first sixty seconds after the news.
    5: {
      arrival: [
        fr("he5-ar1", "It happens in an ordinary second, in a queue, with your keys still in your hand. You glance at the screen and there it is, plain as a bus time. You read it twice. Your hands go warm. Somewhere behind your ribs a door swings open: {desire.done}."),
        fr("he5-ar2", "Someone asks how you have been. You open your mouth to give the old answer, the tired one you could say in your sleep. It doesn’t come. A different one does, and it is true. You hear yourself say it and stop mid-sentence: {desire.done}."),
        fr("he5-ar3", "It arrives in the middle of an ordinary afternoon. You notice the old limit, the one you planned every day around, isn’t there. You stop. You check again. Still gone. Your eyes sting as the truth of it lands: {desire.done}."),
        fr("he5-ar4", "Your heart is quick, the good kind of quick. You lean against the nearest wall and laugh into your hands. The street carries on around you, buses and pigeons and someone’s radio. Inside, one thought keeps arriving, {name}: {desire.done}."),
      ],
      living: [
        fr("he5-li1", "The first person you call picks up on the second ring. You try to sound casual and give up halfway through the first sentence. They shout. You laugh until you have to lean on the wall. For a minute you are both just noise, celebrating across two kitchens."),
        fr("he5-li2", "You take one long breath, in through the nose and out through the mouth, the way you practised on the hard days. It steadies you. You want to keep this exact minute: the hum of the fridge, the cool wall at your back, your own pulse in your ears."),
        fr("he5-li3", "You open your notes and write the date with one sentence underneath, so you never have to wonder whether it happened. Your thumbs are shaking a little. You read it back. It is true, {name}, completely true, and it is written in your own words."),
        fr("he5-li4", "Some news needs your whole body, so you put on the song you saved for this and move to it in the kitchen. Badly. Joyfully. Nobody is watching, and you wouldn’t care if they were. The kettle boils and you let it."),
      ],
      titles: [ti("he5-t1", "When It Lands"), ti("he5-t2", "Sixty Seconds"), ti("he5-t3", "One Long Breath")],
    },
    // VI · An Ordinary Day: it has become normal.
    6: {
      arrival: [
        fr("he6-ar1", "Today is ordinary in every way. You wake at the usual time, eat the usual breakfast and get on with things. Your energy lasts from the first email to the last dish without a single negotiation. Nobody watching would guess it was ever otherwise."),
        fr("he6-ar2", "You forget to think about your body today. For a long time it ran in the background of every plan, a quiet sum of what you could manage. Today you think about the weather, a book, a friend’s news. At some point, {desire.np} stopped being a project."),
        fr("he6-ar3", "The day is made of small jobs: laundry, a long phone call, a pan of something slow on the hob. You do them all with energy to spare, and there is still some left at nine. The life you built around {desire.np} has become an ordinary fact."),
        fr("he6-ar4", "You pack your bag without the old contingencies: no emergency snacks for the crash, no excuse rehearsed for leaving early. Keys, water, a book. It weighs almost nothing. You barely notice, {name}, and that is exactly how you hoped {desire.np} would feel."),
      ],
      living: [
        fr("he6-li1", "At lunch you take your food outside and eat on a low wall in the sun. A pigeon eyes your crust. You give it a corner and watch the street go by. Afterwards you go back in with a clear head, as ready for the afternoon as you were for the morning."),
        fr("he6-li2", "After dinner there is still something left in you, so you spend it on what you love: the guitar, the sketchbook, the half-finished puzzle. An hour disappears. When you look up, the window is dark and you are tired in the earned way."),
        fr("he6-li3", "You go to bed when you said you would. No bargaining for one more episode, no scrolling in the blue glow. Clean sheets, a cool room, the window open a crack. Sleep arrives like a dependable friend and stays the whole night."),
        fr("he6-li4", "Someone invites you to something that would once have cost you two days of recovery. You say yes without doing the maths. You go, you enjoy it, you come home, and you wake the next morning ready for more. This is your ordinary, {name}."),
      ],
      titles: [ti("he6-t1", "Energy to Spare"), ti("he6-t2", "An Ordinary Kind of Strong"), ti("he6-t3", "Nothing to Negotiate")],
    },
    // VII · Becoming: identity, looking back, gratitude.
    7: {
      arrival: [
        fr("he7-ar1", "You find a note you wrote at the very beginning, folded in a drawer. The handwriting is tight and tired, a list of everything you couldn’t do yet. You read it slowly, then fold it again along its old creases. That person set out toward {desire.np} with almost nothing in the tank."),
        fr("he7-ar2", "You notice it while brushing your teeth: you have become someone who looks after yourself. The phrase used to sound like a leaflet. Today it sounds like a description. You drink the water, take the rest, keep the appointments. Somewhere along the way, {desire.np} became part of who you are."),
        fr("he7-ar3", "Tonight you thank your body the way you would thank a friend who stayed. For carrying you through the slow weeks, and for answering every small kindness you offered it. The two of you have come a long way since you wrote {desire.quote}."),
        fr("he7-ar4", "Looking back, you can count the decisions that mattered, and none of them were big. An early night. A glass of water. The appointment booked. The walk taken in the rain. Those small yeses added up to {desire.np}, {name}, one unremarkable day after another."),
      ],
      living: [
        fr("he7-li1", "You catch yourself giving someone the advice you needed back then: start smaller, rest more, be kind about the bad days. They nod as if it is news. It was news to you once, too, and you remember exactly who said it first."),
        fr("he7-li2", "You pass the bus stop where you once sat, too tired to stand, and promised yourself one small change. It is only a bus stop. You pause there anyway, warm and steady, and say a quiet thank you to the person who made that promise."),
        fr("he7-li3", "At the end of the day you take inventory, the way you did on that first good morning. Shoulders, belly, breath, mood. Everything answers. You have learned when to push and when to rest, and that knowledge belongs to you for good."),
        fr("he7-li4", "Before sleep, you write down what you want next and notice there is no fear in the handwriting. This wanting comes from strength, {name}, from a body and a life you trust. You close the notebook and turn out the light."),
      ],
      titles: [ti("he7-t1", "The Promise You Kept"), ti("he7-t2", "A Body You Trust"), ti("he7-t3", "Small Yeses, Added Up")],
    },
  },
  chapterOne: [
    {
      id: "he-one-running",
      motifs: ["running"],
      title: ti("he-one-running-t", "The Clean Cold Air"),
      opening: {
        morning: fr("he-one-running-op-m", "Morning, {name}. Sit tall or lie back, whichever your body prefers, and let your breath find its own pace. Then picture a pair of running shoes by a door, and follow them out into the cold."),
        evening: fr("he-one-running-op-e", "Let your body sink into wherever it is resting, {name}. The day is done with you. Breathe out longer than you breathe in, and let the dark thin into the grey of an early morning, cold air waiting outside."),
      },
      body: [
        { kind: "text", fragment: fr("he-one-running-p1", "Your eyes open before the alarm. Grey light, a cool room, your shoes waiting by the door where you left them last night. Your muscles feel loose and your chest feels roomy. You lie there grinning at the ceiling, because you know exactly what kind of morning this is. This is the morning behind the words you wrote: {desire.quote}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("he-one-running-p2", "Outside, the air has that clean bite that wakes your face up. You start easy, the way you learned to, and your body finds its rhythm without being asked. Breath, step, breath. A cyclist nods as they pass. The street is half asleep and you are entirely awake, moving like someone who belongs out here.") },
        { kind: "motif", part: "witness" },
        { kind: "text", fragment: fr("he-one-running-p3", "Back home, you stretch on the floor with the radio on, and your body answers every ask. The shower is hot. Breakfast is enormous and tastes like a reward you only had to earn once. You check the time and laugh. It is barely half past seven, and the best thing in the day is already done.") },
        { kind: "text", fragment: fr("he-one-running-p4", "You feel {feeling}, {name}, in a way no number on a watch could explain. It comes from keeping a promise to yourself in the cold, before anyone was watching. All those short runs on tired evenings built this morning, one at a time. They added up to {desire.np}.") },
      ],
      closing: {
        morning: fr("he-one-running-cl-m", "Come back to the room slowly. Today holds one step that belongs to that morning, small enough to take before lunch. Take it, and let your body remember the way."),
        evening: fr("he-one-running-cl-e", "Stay with that clean, tired feeling as your breathing slows. Your body has done enough for today. Let it rest the way it will rest after that run, {name}, deep and unbothered."),
      },
    },
    {
      id: "he-one-sleep",
      motifs: ["sleep"],
      title: ti("he-one-sleep-t", "A Whole Night Through"),
      opening: {
        morning: fr("he-one-sleep-op-m", "Good morning, {name}. However last night went, let this part be easy. Sit comfortably and let your shoulders drop. This story begins at the end of a night that held you from start to finish."),
        evening: fr("he-one-sleep-op-e", "Settle in, {name}. This is the right hour for this one. Let the pillow take the weight of your head and let your breathing lengthen. A little way ahead, there is a morning after a whole night’s sleep."),
      },
      body: [
        { kind: "text", fragment: fr("he-one-sleep-p1", "You wake and the room is already light. For a second you can’t make sense of it. No three o’clock ceiling. No checking the time and doing the sums. The night ran straight through, like a train with no stops, and you are rested all the way down. You wrote {desire.quote}, and here is the morning it meant.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("he-one-sleep-p2", "You stretch slowly and feel the difference everywhere. Your eyes are clear, your jaw is loose, and your thoughts arrive in a sensible order. The kettle sounds louder than usual, or maybe you are finally hearing it. Even the coffee tastes different when you aren’t drinking it to get through the day.") },
        { kind: "motif", part: "witness" },
        { kind: "text", fragment: fr("he-one-sleep-p3", "The day ahead looks entirely manageable. That conversation, that pile of washing, that long afternoon: none of it feels like a hill. You answer an email in one go, without reading it five times. You realise how many decisions the tiredness used to make for you. Today you make them yourself. At eleven you realise you haven’t yawned once. It is a strange, light kind of power.") },
        { kind: "text", fragment: fr("he-one-sleep-p4", "You feel {feeling}, {name}, and tender toward the version of you who lay awake so many nights. That version kept going anyway. Every early night and every phone left outside the bedroom is in this morning. This is {desire.np}, and it began with them.") },
      ],
      closing: {
        morning: fr("he-one-sleep-cl-m", "Let that rested feeling come back with you. Tonight’s sleep starts with something you do today, so the day holds one small thing for your evening. Carry it with you."),
        evening: fr("he-one-sleep-cl-e", "Let that morning stay in the room with you. There is nothing to solve tonight, {name}, nothing to plan. Your only job is to rest, and you already know how. Let sleep come and find you."),
      },
    },
    {
      id: "he-one-healing",
      motifs: ["healing"],
      title: ti("he-one-healing-t", "The First Good Morning"),
      opening: {
        morning: fr("he-one-healing-op-m", "Good morning, {name}. Be gentle with yourself as you settle. Let your breath be however it is, and let your body rest exactly where it is. This story is about the first truly good morning."),
        evening: fr("he-one-healing-op-e", "Let the evening hold you, {name}. There is nothing to get right. Let your breathing find its own pace, and let the dark soften into the early light of a good morning."),
      },
      body: [
        { kind: "text", fragment: fr("he-one-healing-p1", "You wake and wait, the way you have learned to, for the first report from your body. It comes back quiet. Unfinished, perhaps, and completely livable. Rain taps the window while you let the news sink in. You wrote {desire.quote} on a harder day than this. This is the morning that sentence was reaching for.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("he-one-healing-p2", "You take your time getting up, out of habit more than need, and your body comes with you without complaint. In the kitchen you make tea with steady hands and watch the steam curl off the cup. You drink it at the table and plan the day like someone with a whole life in front of them, which you are. The plan has a lunch in it, and a walk, and nothing to recover from afterwards.") },
        { kind: "text", fragment: fr("he-one-healing-p3", "Later you do small things that used to be out of reach. You carry the shopping home, sit through a whole film, laugh without bracing. Each one is ordinary. Each one is a private celebration. You don’t mention it to anyone, not even in passing. You just keep count, and smile.") },
        { kind: "motif", part: "witness" },
        { kind: "text", fragment: fr("he-one-healing-p4", "You feel {feeling}, {name}, and careful with it, the way you would carry something precious. The hard months are still part of your story. They taught you patience, and how to ask for help, and that healing keeps its own clock. Today the clock is kind.") },
      ],
      closing: {
        morning: fr("he-one-healing-cl-m", "Bring that good morning back with you, slowly. Let today hold one small, kind thing for your body. Nothing heroic. One step that feels like care."),
        evening: fr("he-one-healing-cl-e", "Stay with that good morning as you rest. Your body does its quiet work at night, the way bodies do. Let it, {name}. Breathe out, let your shoulders go, and let sleep do the rest."),
      },
    },
    {
      id: "he-one-default",
      motifs: [],
      title: ti("he-one-default-t", "The First Easy Morning"),
      opening: {
        morning: fr("he-one-default-op-m", "Good morning, {name}. Find a comfortable way to sit and let your breathing slow by itself. For the next few minutes you are going somewhere close: a morning a little way ahead, the first one where it is real."),
        evening: fr("he-one-default-op-e", "Let the day go quiet, {name}. Get comfortable and let your eyes close if they want to. Your room is dark, and somewhere close by it is early morning, the first one where it is real. Go there gently."),
      },
      body: [
        { kind: "text", fragment: fr("he-one-default-p1", "You wake a few minutes before the alarm and lie still, waiting for the usual weight to land. It doesn’t. Your head is clear, the way a window is clear after rain. Your breath goes all the way down and comes back easy, and nothing in you is bargaining with the day. You wrote it down once, {desire.quote}. This is the first morning it is simply true.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("he-one-default-p2", "You sit up and your body comes with you, willing, curious about what happens next. In the kitchen the tap runs cold, and you drink a full glass while the radiator ticks. There is energy in your hands and shoulders, the kind you used to borrow against tomorrow. Today there is nothing to pay back.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("he-one-default-p3", "You look at the day ahead: work, errands, an evening plan you would once have cancelled by noon. For the first time in a long while, you aren’t dividing yourself up to make it last. There is enough of you for all of it. You text yes to the evening before you can talk yourself out of it, then add a second message: you will bring dessert.") },
        { kind: "text", fragment: fr("he-one-default-p4", "You feel {feeling}, {name}, and a little astonished, like someone who walked into a room they built and found the lights already on. Every early night is in this morning, every glass of water, every gentle choice on a hard day. They added up, without fanfare, to {desire.np}.") },
      ],
      closing: {
        morning: fr("he-one-default-cl-m", "Hold on to this feeling as you open your eyes. That morning is built from small, ordinary choices, and today offers you one of them. Choose it, carry it with you, and let it count."),
        evening: fr("he-one-default-cl-e", "Stay in that morning as long as you like. There is nothing left to do tonight except rest, and rest is part of how you get there. Let your breathing lengthen, {name}. The story will keep."),
      },
    },
  ],
};
