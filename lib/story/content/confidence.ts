// CONFIDENCE — focus content (A4).
// Seven stages × (4 arrival, 4 living, 3 titles) + hand-tuned Chapter I scripts:
// a default plus scripts for the visibility and work-confidence motifs.
// Confidence here means voice, presence and boundaries, shown through small
// public moments: a sentence said once, a no said kindly, a recovery after a
// stumble. Fragments that assume a workplace declare `requires: ['employer']`.
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

const EMPLOYER = { requires: ["employer"] } as const;

export const CONFIDENCE: FocusContent = {
  focus: "confidence",
  stages: {
    // I · The First Glimpse: the first morning inside it.
    1: {
      arrival: [
        fr("co1-ar1", "You wake without the usual rehearsal running in your head. No script for the hard conversation, no list of ways the day could go wrong. Just the ceiling, a car door outside, and a calm you don’t have to argue for. You wrote {desire.quote}. So this is how it feels from the inside."),
        fr("co1-ar2", "In the bathroom mirror you meet your own eyes and don’t look away. Such a small thing. For years you checked your face for flaws before anyone else could find them. You wrote {desire.quote}, and this is what it looks like at seven in the morning."),
        fr("co1-ar3", "You choose what to wear in under a minute: the jacket you used to save for a braver version of yourself. It fits the version who is here. You put it on and stand differently without trying. It is true, and your body knew first: {desire.done}."),
        fr("co1-ar4", "Your phone lights up with a message you would once have answered with three apologies and a joke. Today you write one clear sentence and press send. Your heart stays exactly where it is. This is breakfast since {desire.done}: ordinary, and enormous."),
      ],
      living: [
        fr("co1-li1", "You call to book the appointment you have been avoiding, the one where you have to say exactly what you need. You say it in two sentences. They find a slot. You hang up and sit there for a moment, amazed at how small it was."),
        fr("co1-li2", "Your order comes out wrong in the coffee queue, and you hear yourself say, kindly and clearly, that it should have been oat milk. No apology, no shrinking. They fix it with a smile. The cup in your hand feels like a tiny proof of something bigger."),
        fr("co1-li3", "Someone asks your opinion on something you know well. You answer straight away, in full sentences, without the little laugh at the end that used to apologise for taking up air. They nod and write it down. Your hands rest easily on the table."),
        fr("co1-li4", "At lunch you sit in the middle of the table instead of at the edge. You tell a story and let it run its full length, pauses and all. People laugh in the right places. You feel {feeling}, {name}, and you had forgotten you were this funny."),
      ],
      titles: [ti("co1-t1", "The Jacket You Saved"), ti("co1-t2", "One Clear Sentence"), ti("co1-t3", "Taking Up Room")],
    },
    // II · The Night Before: anticipation and rehearsal.
    2: {
      arrival: [
        fr("co2-ar1", "Tomorrow you take the floor and say it. The notes are in your bag and the outfit hangs on the wardrobe door like someone waiting to go out. The opening line is learned. You read it once more and stop there. Everything that leads to {desire.np} is ready."),
        fr("co2-ar2", "The nerves arrive around eight, right on time. Your stomach flips and your mind offers its usual list of disasters. You listen for a minute, then put the kettle on. You don’t need a calm night to step toward {desire.np}. You only need to turn up."),
        fr("co2-ar3", "You practise to the bathroom tiles, then to the houseplant, then to the empty kitchen. Each time your voice gets steadier. By the third run you are adding jokes. You are ready for {desire.np} in the plain, unglamorous way that counts: you have done the work."),
        fr("co2-ar4", "A message arrives from someone who believes in you: go and be brilliant tomorrow. You read it twice. For once you don’t argue with it in your head. You reply that you are ready, and you notice you mean it. Tomorrow belongs to {desire.np}, {name}."),
      ],
      living: [
        fr("co2-li1", "You lay out what you need: the folder, the charger, the good pen. Each item goes into the bag with a small click of certainty. You close it, set it by the door, and something in your chest unclenches. The rest you can trust to yourself."),
        fr("co2-li2", "You picture the moment after you have spoken: a pause, a nod, someone writing something down. You let yourself feel it in advance, warm and real. Then you picture the question you are dreading and hear yourself answer it, slowly and well. You feel {feeling}."),
        fr("co2-li3", "Before bed you write three lines on a card. What you want them to know. What you want them to feel. What you will say if your mind goes blank. You read the last one twice. It is short and true, and it is enough."),
        fr("co2-li4", "You turn the lights down early and lie in the dark with a hand on your chest, feeling it rise and fall. Tomorrow will arrive whether you sleep or worry, so you choose sleep. The thought makes you smile, {name}. Even your nerves have started listening to you."),
      ],
      titles: [ti("co2-t1", "The Folder by the Door"), ti("co2-t2", "Practising to the Houseplant"), ti("co2-t3", "Nerves, Right on Time")],
    },
    // III · The Hard Day: a realistic stumble, handled steadily.
    3: {
      arrival: [
        fr("co3-ar1", "Halfway through your point, your mind goes blank. The room waits. Someone shifts in their chair. For three long seconds the old panic climbs your throat. Then you look at your card, take one breath and say you will come back to that. You keep going. Recovery is part of {desire.np} too."),
        fr("co3-ar2", "Someone talks over you, the way people sometimes do. Your face goes hot. You wait for a gap, then say evenly that you hadn’t finished. The room goes quiet. They apologise. Your voice shook a little, and you finished the thought anyway. That counts toward {desire.np} too."),
        fr("co3-ar3", "The message you were dreading arrives: a polite no. You read it at the counter and feel the familiar sink, the voice that says you should never have asked. You let the feeling land. Then you notice something new. You are proud you asked, and that pride belongs to {desire.np}."),
        fr("co3-ar4", "You said no to something yesterday, kindly and clearly, and today someone is cool with you because of it. The urge to take it back is loud. You make tea and let the discomfort sit beside you without obeying it. Boundaries cost something, {name}. You can afford them."),
      ],
      living: [
        fr("co3-li1", "On the way home you call a friend and tell them all of it, including the blank. They laugh kindly and tell you about the time they forgot their own name on stage. By the end of the call you are laughing too, and the day has shrunk back to its real size."),
        fr("co3-li2", "You replay the moment once in the shower and wince. Then you deliberately replay the recovery instead: the breath, the card, the next sentence. That is the part worth keeping. You turn off the water and say to the steamed-up mirror that you handled it. You did."),
        fr("co3-li3", "Before bed you write it down plainly: what went wrong, what you did next, what you would try differently. It fits on half a page. In your own handwriting it looks less like a disaster and more like practice. You feel {feeling}, a little bruised, still standing."),
        fr("co3-li4", "You send a short follow-up with the point you lost, written clearly, without apology. The reply comes back within the hour: thanks, really useful. You sit with that for a second. The hard moment didn’t get the last word, {name}. You did."),
      ],
      titles: [ti("co3-t1", "The Blank Moment"), ti("co3-t2", "The Polite No"), ti("co3-t3", "A Little Bruised, Still Standing")],
    },
    // IV · Someone Notices: a witness reflects the change back.
    4: {
      arrival: [
        fr("co4-ar1", "Afterwards, someone you respect catches you by the door. “You were really good in there,” they say. “Clear. Calm.” You thank them without adding a single disclaimer. Walking away, you realise they just described the person behind {desire.quote}."),
        fr("co4-ar2", "Your oldest friend watches you order for the table, send back the cold soup and ask the server a question without blushing. Afterwards they lean over and say you have changed, in the best way. You wrote {desire.quote} once, alone. Tonight someone read it on your face."),
        fr("co4-ar3", "Someone newer asks how you always seem so sure of yourself. You almost laugh. You tell them the truth: you are often unsure, and you speak anyway. They look at you as if you have handed them a key. You are handing on what {desire.np} taught you."),
        fr("co4-ar4", "At a party, a stranger says you have a lovely way of telling stories, that people lean in when you talk. You accept it without folding it up and handing it back. On the bus home you replay it and grin at your reflection. It is real, {name}: {desire.done}."),
      ],
      living: [
        fr("co4-li1", "A friend asks you to come along to a difficult conversation, because you are good at saying things clearly. You are moved and a little stunned. Once you would have been the one asking. You say yes, of course, and feel {feeling} on the walk there."),
        fr("co4-li2", "The group chat lights up with your name. Someone is quoting a thing you said last week, with three exclamation marks. You read it on the bus and put the phone in your pocket. Your face is warm. You let yourself enjoy being heard."),
        fr("co4-li3", "The person who used to speak for you in rooms like this sits back and lets you lead. You notice how they listen: fully, without waiting to step in. Afterwards they squeeze your shoulder and say nothing at all. They don’t need to."),
        fr("co4-li4", "On the way home you realise compliments have stopped embarrassing you. You used to deflect them like a goalkeeper. Today you just let them in, one by one, and keep them. Other people saw it before you did, {name}, and they were right."),
      ],
      titles: [ti("co4-t1", "Clear and Calm"), ti("co4-t2", "Read on Your Face"), ti("co4-t3", "Heard in the Room")],
    },
    // V · The Threshold: the first sixty seconds after the news.
    5: {
      arrival: [
        fr("co5-ar1", "The last sentence leaves your mouth and the room is silent for one long second. Then the applause starts, loose and real. Your hands are shaking, your face is hot, and you are smiling so hard it aches. This is the sound of {desire.np}, {name}."),
        fr("co5-ar2", "The email arrives while you are making toast. You read the first line, then read it again with your hand over your mouth. Yes. They said yes. You sit down on the kitchen floor, laughing, while the toast goes cold. It happened: {desire.done}."),
        fr("co5-ar3", "You press send on the thing you have been too afraid to share, and for sixty seconds nothing happens. Your heart pounds. Then the first reply arrives, then a second, warm and specific. You close your eyes and breathe out. Your words are out in the world. This is the first minute of {desire.np}."),
        fr("co5-ar4", "You walk out of the conversation you avoided for years, and the hallway looks brighter than when you went in. You said everything you meant to. Nobody fell apart, least of all you. Your whole body feels light. It is real, {name}: {desire.done}."),
      ],
      living: [
        fr("co5-li1", "You call the one person who knew how scared you were. They pick up and you can’t get the words out for laughing. When you finally do, they go quiet, then say they always knew. You lean your head against the window and let that sentence warm you through."),
        fr("co5-li2", "In the bathroom afterwards you grip the edge of the sink and look up. Flushed cheeks, bright eyes, a grin you can’t switch off. You nod at yourself once, like a teammate after a good game. It feels completely deserved."),
        fr("co5-li3", "You want to remember this minute exactly, so you take it in on purpose. Cold air on your face, a bus pulling away, the weight of the bag on your shoulder. Your pulse is slowing. You feel {feeling}, and somehow taller."),
        fr("co5-li4", "You open your notes and write down what you said while it is fresh, with the date above it. Your fingers aren’t quite steady. Underneath, you add one line for the person who started all this, {name}: you were right to try."),
      ],
      titles: [ti("co5-t1", "The Sound of Clapping"), ti("co5-t2", "Yes, in the First Line"), ti("co5-t3", "Sent")],
    },
    // VI · An Ordinary Day: it has become normal.
    6: {
      arrival: [
        fr("co6-ar1", "Today you speak up three times and don’t think about any of them afterwards. That is the whole change. It used to take a week of dread to say one sentence. Today the sentences arrive, you say them, and the day moves on. Since {desire.done}, it fits you like a worn-in coat."),
        fr("co6-ar2", "Before lunch you return the faulty kettle, ask the neighbour to turn the music down and query a wrong charge on a bill. Each one used to be a small mountain. Today they are errands, done kindly and without fuss. That is how a day goes since {desire.done}."),
        fr("co6-ar3", "In the afternoon you disagree with someone, and the sky stays where it is. You say your piece, they say theirs, and you find a middle you can both live with. Afterwards the proof of {desire.np} is simple. You aren’t replaying it. You are thinking about dinner."),
        fr("co6-ar4", "You wear what you like today without a second thought. Bright or plain, old or new, it is yours. Nobody is looking as hard as you once imagined, and the few who are look friendly. Since {desire.done}, getting dressed is just getting dressed."),
      ],
      living: [
        fr("co6-li1", "At the café, your name comes back spelled wrong on the cup and you correct it, laughing, and they laugh too. You remember when you would have answered to the wrong name for a year rather than say anything. You take your cup and feel {feeling}."),
        fr("co6-li2", "In a group conversation you notice someone quiet at the edge, trying to get a word in. You leave a gap and turn toward them. “What were you going to say?” They light up. You know exactly what that gap means, because someone once left one for you."),
        fr("co6-li3", "Your evening is your own because you said no to the thing you didn’t want. No excuse, no invented headache. You make dinner, read a chapter, call a friend. The time feels rich, the way time does when you chose it yourself."),
        fr("co6-li4", "You post a photo of something you made without writing a joke underneath to protect yourself. Just the picture and one honest sentence. Then you put the phone down and get on with your evening. Whatever happens next, {name}, you already said what you meant."),
      ],
      titles: [ti("co6-t1", "Worn In Like a Good Coat"), ti("co6-t2", "Just Errands"), ti("co6-t3", "The Gap You Leave")],
    },
    // VII · Becoming: identity, looking back, gratitude.
    7: {
      arrival: [
        fr("co7-ar1", "You find an old email draft you never sent, full of softeners and three different ways to say sorry for asking. You read it with real tenderness. That person was trying so hard. They walked the first stretch toward {desire.np} on borrowed courage, and it held."),
        fr("co7-ar2", "You are someone who says what you mean. You notice it the way you notice your own handwriting, as something that belongs to you. It didn’t start out that way. You built it one awkward sentence at a time, and the sentences added up to {desire.np}."),
        fr("co7-ar3", "Looking back, the brave moments were small: a hand raised, a door knocked on, a no said once. None of them felt like courage at the time. They felt like shaking. Still, they stacked up, {name}, into {desire.np}."),
        fr("co7-ar4", "Tonight you thank the version of you who was afraid and went anyway. The fear still visits. It just rides in the back seat these days, and you do the driving. That is the shape your courage took on the way to {desire.np}, and it fits you."),
      ],
      living: [
        fr("co7-li1", "Someone nervous asks for your advice before their first big talk. You tell them what you wish you had heard. The nerves mean you care, the pause is your friend, and nobody is counting your ums. They breathe out. You feel {feeling}, watching their shoulders drop."),
        fr("co7-li2", "You pass the building where you once sat silent through a whole year of meetings. You stop for a second and look up at the windows. There is no bitterness in it. You feel fond, the way you would toward an old friend who finally found their voice."),
        fr("co7-li3", "At the end of the day you write one line in your notebook, as you have for months: something you said that mattered. Tonight’s line is small. Leafing back through the pages, you watch a whole person forming, sentence by sentence, {name}. It is you."),
        fr("co7-li4", "Before sleep you say your name out loud in the dark, just to hear it. It sounds steady. It sounds like someone who belongs wherever they go. You smile into the pillow and let the dark hold you."),
      ],
      titles: [ti("co7-t1", "Borrowed Courage, Returned"), ti("co7-t2", "The Fear in the Back Seat"), ti("co7-t3", "Sentence by Sentence")],
    },
  },
  chapterOne: [
    {
      id: "co-one-visibility",
      motifs: ["visibility"],
      title: ti("co-one-visibility-t", "Your Voice, Unhurried"),
      opening: {
        morning: fr("co-one-visibility-op-m", "Good morning, {name}. Let your breath settle low in your belly, the way a speaker’s breath does. This story is about the morning you finally get to be heard."),
        evening: fr("co-one-visibility-op-e", "Settle in, {name}. Let the evening go soft at the edges. Somewhere ahead of you is a morning with a microphone in it, and you are ready for it. Let the dark carry you there."),
      },
      body: [
        { kind: "text", fragment: fr("co-one-visibility-p1", "You wake early, and the first thing you feel is excitement, clean and bright, with no dread folded inside it. Today you speak. Your outfit is already hanging on the door. You lie there and run your opening line once, and it sounds like you. You wrote {desire.quote} on a night when this felt impossible. Here is the morning it was pointing to.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("co-one-visibility-p2", "The room smells of coffee and carpet. People are finding their seats, chatting, scrolling. You wait at the side with your notes, and someone hands you a glass of water and wishes you luck. Your heart is going quick, the good kind of quick. When your name is called, you make your way to the front and let one full breath pass before you begin.") },
        { kind: "text", fragment: fr("co-one-visibility-p3", "The first sentence comes out steady. The second gets a laugh you didn’t plan. You let the pauses be pauses. Somewhere in the middle you stop thinking about yourself and start thinking about them, and the whole thing opens up. Faces nod. Someone near the back is writing as fast as they can.") },
        { kind: "motif", part: "witness" },
        { kind: "text", fragment: fr("co-one-visibility-p4", "Afterwards you feel {feeling}, {name}, and wide awake in every cell. You were seen, fully, and you are still in one piece. Better than that. Every small time you spoke up while it scared you is inside this hour. Each of them was a rehearsal for {desire.np}.") },
      ],
      closing: {
        morning: fr("co-one-visibility-cl-m", "Come back to the room. Somewhere in today is a small chance to be heard. Take it, even if your voice shakes, {name}. Especially then."),
        evening: fr("co-one-visibility-cl-e", "Stay with the warmth of that room as you rest. You have nothing to say tonight and nobody to convince. Let your voice rest too, {name}. It has good work ahead of it."),
      },
    },
    {
      id: "co-one-work",
      motifs: ["work-confidence"],
      title: ti("co-one-work-t", "Your Seat at the Table"),
      opening: {
        morning: fr("co-one-work-op-m", "Good morning, {name}. Sit up a little, let your shoulders drop, and breathe into the space between them. This is a working morning from the life you want, the one where you walk in knowing your worth."),
        evening: fr("co-one-work-op-e", "Let the working day leave your shoulders, {name}. It is over, and you did what you could. Breathe out, and let the dark open onto a better working morning, the kind you are heading toward."),
      },
      body: [
        { kind: "text", fragment: fr("co-one-work-p1", "You wake without the knot. You stretch, then lie still for one more minute, enjoying its absence. For months it sat under your ribs on working mornings, tightening as the clock crept toward nine. Today there is only the ordinary hum of a day ahead, and a cup of tea going cold on the bedside table. You wrote {desire.quote}. With a small jolt, you notice you are looking forward to work.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("co-one-work-p2", "The first email of the day is a tricky one. You read it once, decide what you think, and reply in four clear lines without a single apology. Then you move on. A colleague stops by to ask your view, and you give it straight, and they nod slowly.", EMPLOYER) },
        { kind: "text", fragment: fr("co-one-work-p3", "In the meeting you sit where you can see everyone. When the talk drifts toward a decision you disagree with, you say so calmly, with your reasons. The room takes it seriously. Someone says it is a good point. The plan shifts a little because of you, and nobody treats it as remarkable, which is the best part.", EMPLOYER) },
        { kind: "motif", part: "witness" },
        { kind: "text", fragment: fr("co-one-work-p4", "You feel {feeling}, {name}, and solid, like a building whose foundations are finally in. Nobody gave you permission for this. You stopped waiting for it. Every time you spoke up with a dry mouth went into this morning, and together they carried you toward {desire.np}.") },
      ],
      closing: {
        morning: fr("co-one-work-cl-m", "When you are ready, come back. Today has one moment where your voice belongs in the room. Notice it when it comes, {name}, and use it."),
        evening: fr("co-one-work-cl-e", "Let that steady morning stay with you as you rest. The emails can wait and so can the meetings. Your only work tonight is sleep, and you are good at it."),
      },
    },
    {
      id: "co-one-default",
      motifs: [],
      title: ti("co-one-default-t", "The First Unrehearsed Morning"),
      opening: {
        morning: fr("co-one-default-op-m", "Good morning, {name}. Sit comfortably and let your shoulders find their own height. For the next few minutes, picture a morning that starts without a rehearsal. It is closer than it looks."),
        evening: fr("co-one-default-op-e", "Let the day put itself down, {name}. Whatever was said today, and whatever wasn’t, can wait. Get comfortable, let your hands go heavy, and let the dark open onto an easier morning."),
      },
      body: [
        { kind: "text", fragment: fr("co-one-default-p1", "You wake and, for the first time in years, there is no script running in your head. No practice conversations, no list of ways it might go wrong. Just the ceiling, the pale light, a car door somewhere outside. The quiet feels like a room someone has tidied. Somewhere you wrote {desire.quote}. This morning is what it looks like.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("co-one-default-p2", "You get dressed in under a minute and choose the thing you used to save for a braver day. It turns out this is the braver day, and it fits. The kettle clicks off and you pour without looking at the clock. In the kitchen you answer a message you would once have drafted for an hour. One clear sentence. Send. Your heart stays exactly where it is.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("co-one-default-p3", "On the way out you say good morning first to the neighbour you usually nod at. They look up, surprised, and say it back with a real smile. On the bus you take the seat you want, instead of the one nobody else wants. Small things. Each one lands in you like a coin in a jar.") },
        { kind: "text", fragment: fr("co-one-default-p4", "You feel {feeling}, {name}, and a little astonished at how little it costs to be yourself in public. For years it felt expensive. This morning it is free. Every time you spoke up with your voice shaking is inside this ordinary minute. This is where they were heading: {desire.np}.") },
      ],
      closing: {
        morning: fr("co-one-default-cl-m", "Open your eyes when you are ready. That morning is made of small, brave sentences, and today has room for one of them. Say it plainly, {name}, and let it count."),
        evening: fr("co-one-default-cl-e", "Stay in that easy morning as you rest. You don’t have to prove anything tonight, to anyone. Let your jaw soften and your hands go heavy. The story will be here when you wake."),
      },
    },
  ],
};
