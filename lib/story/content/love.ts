// LOVE — focus content (A3).
// Seven stages × (arrival, living, 3 titles) + hand-tuned Chapter I scripts.
// Love here means being known: friends, family, chosen family, a partner, and
// the way you treat yourself. Unflagged lines never assume a partner, a family
// structure or that anyone lives with you. Lines that need a partner carry
// `requires: ['romance']`; lines that need family carry `requires: ['family']`.
// Arrival and living are picked independently, so every living line also reads
// after every arrival line of its stage, flagged or not.
// Chapter I: a default script for any love desire, plus scripts for partner and
// wedding, family and family repair, and friendship. Script text carries no
// flags: the script's `motifs` already gate it. Motif-tuned scripts have no
// motif slot, because the motif's own lines would repeat the scene they paint.
// Grammar: a verb after {desire.np} is past tense or modal ('close friends' is plural).
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

const ROMANCE = { requires: ["romance"] } as const;
const FAMILY = { requires: ["family"] } as const;

export const LOVE: FocusContent = {
  focus: "love",
  stages: {
    // I · The First Glimpse
    1: {
      arrival: [
        fr("lo1-ar1", "The first thing you see is a message sent just after midnight: a photo of a dog in a yellow raincoat, no caption. None needed. You laugh before you are properly awake. Being someone people send things to used to happen to other people. Lying here, it sinks in again that {desire.done}."),
        fr("lo1-ar2", "You wake slowly, and before anything else you remember that {desire.done}. It arrives the way a cold room warms once the heating clicks on, one corner at a time. You lie still and let it. Somewhere in your phone is a name you could call this minute, and they would be glad to hear from you."),
        fr("lo1-ar3", "On the calendar, in your own handwriting, there are plans for later: dinner at seven, a table for people who love you. You look at it the way you would look at a postcard from somewhere you always wanted to go. Not long ago, you could only write about {desire.np}."),
        fr("lo1-ar4", "On the fridge there is a photo that was not there a year ago. It is a cluster of faces squeezed into one frame, everyone laughing at something just out of shot. You are in the middle of it, eyes shut, mid-laugh. You stand there holding the milk and think of the words you once wrote: {desire.quote}."),
        fr("lo1-ar5", "A note is propped against the kettle in handwriting you already know by heart: gone for bread, back soon, do not move. You read it in your socks with a smile you cannot get rid of. Somebody went out in the cold for you. You hold the note a little longer than you need to, because {desire.done}.", ROMANCE),
        fr("lo1-ar6", "When you come into the kitchen, someone is already there, burning toast and blaming the toaster. They see you and hold up the evidence, completely unashamed. You lean in the doorway, laughing. It lands all over again that {desire.done}, burnt toast and all.", ROMANCE),
      ],
      living: [
        fr("lo1-li1", "You make breakfast slowly with a friend on speaker, the phone propped against the sugar jar. You do not plan what to say. You just talk, the way you can with people who know the worst of you and stayed anyway. They are still laughing at your story when the toast pops."),
        fr("lo1-li2", "Later you catch your reflection in the hall mirror and, out of habit, wait for the old criticism. It never comes. You look like someone who is loved and knows it. You straighten your collar, smile at nobody in particular, and get on with the morning."),
        fr("lo1-li3", "Your phone rings while you are still half dressed. It is someone you love, calling for no reason except to hear your voice. You sit on the edge of the bed and talk about nothing for ten minutes. They are the best ten minutes of the morning, and you both know it."),
        fr("lo1-li4", "You open the window and the street comes in: a bicycle bell, someone calling goodbye to someone else. You think about the people in your life, one by one. The list is longer than it used to be. Every name on it makes you warmer, and you take your time getting to the end."),
        fr("lo1-li5", "Someone comes up behind you at the window and rests their chin on your shoulder for a moment. It is what people do when they are completely at home with each other. Neither of you says a word. Outside, the street is waking up. You lean back into them, just slightly.", ROMANCE),
        fr("lo1-li6", "Over breakfast you plan the weekend together, arguing happily about nothing: which café, which walk, whether it will rain. They steal the last bite from your plate and you let them. In a small, glowing way you know this is what you used to hope for on lonely evenings.", ROMANCE),
      ],
      titles: [ti("lo1-t1", "Known by Morning"), ti("lo1-t2", "A Message Waiting"), ti("lo1-t3", "The Whole Table")],
    },

    // II · The Night Before
    2: {
      arrival: [
        fr("lo2-ar1", "Tomorrow, the people you love will all be in one room, and you are the one who invited them. The table is pushed against the wall to make space, and borrowed chairs are stacked by the door. This is what {desire.np} asked of you in the end: a little courage, and a lot of chairs."),
        fr("lo2-ar2", "Tomorrow you are going to say something true to someone who matters. You have known what you want to say for a long time. Tonight, at last, you know how. You say it once to the empty kitchen, quietly, and it sounds like you. It sounds like {desire.np}, said out loud."),
        fr("lo2-ar3", "A ticket for the morning train is propped against the fruit bowl. Tomorrow you will see someone you have missed for far too long. Ever since you wrote {desire.quote}, you have been heading toward a moment like this one. You keep picturing it, and it keeps getting better."),
        fr("lo2-ar4", "You are writing a card for tomorrow, and you have started it three times. The first two said too little. This one says what you mean. You read it back and your eyes sting. It is a strange, lovely thing, having this much to say to someone. It is all part of {desire.np}."),
        fr("lo2-ar5", "Tomorrow you meet the people who matter most to the person you love. You have already asked a hundred questions about them. Tonight you lie on the sofa together and ask a hundred more, and they laugh and answer every one. Somewhere in the middle of it, it hits you again that {desire.done}.", ROMANCE),
        fr("lo2-ar6", "Tomorrow is a big day for the two of you. Their shoes are lined up next to yours by the door, two pairs side by side, ready for the morning. You notice them on your way past and stop. It is such a small thing, and somehow it holds the whole of {desire.np}.", ROMANCE),
        fr("lo2-ar7", "Tomorrow your family arrives, all of them at once, for the first time in years. The sofa bed is made up with the good sheets. You have bought too much food, on purpose. You smooth a pillow you have already smoothed and think about how long you waited for {desire.np}.", FAMILY),
      ],
      living: [
        fr("lo2-li1", "You practise the hardest part out loud, the sentence you are most nervous about, and the first time it comes out wrong. You laugh at yourself and try again. The second time is better. The third time you stop, because it is true, and true is enough."),
        fr("lo2-li2", "A friend calls to ask how you are feeling about tomorrow. You admit you are nervous. They let you be nervous, and then they say they will be thinking of you all day. You feel the steadiness of that travel down the line and settle somewhere in your chest."),
        fr("lo2-li3", "You lay out what you need for the morning and notice you are doing it carefully, almost tenderly. It is the way you would get things ready for someone you love. Maybe that is the change. You are finally treating yourself like someone worth getting ready for."),
        fr("lo2-li4", "You write a short list of things you want to remember to say, then fold it into your coat pocket. You probably will not need it. Love has made you braver than you used to be, and brave people tend to remember what matters when it counts."),
        fr("lo2-li5", "Late in the evening they find you going over tomorrow for the fifth time. They take the list out of your hands and put it on the counter. Then they pull you into a slow, silly sway around the kitchen to no music at all. You let them. Tomorrow can wait.", ROMANCE),
        fr("lo2-li6", "You brush your teeth at the same sink, bumping elbows, talking through toothpaste about tomorrow. It is ridiculous and ordinary, and you would not change a second of it. When you finally turn out the light, they find your hand in the dark and hold it until you are both asleep.", ROMANCE),
      ],
      titles: [ti("lo2-t1", "Everything You Mean to Say"), ti("lo2-t2", "Ready to Be Known"), ti("lo2-t3", "Worth Getting Ready For")],
    },

    // III · The Hard Day
    3: {
      arrival: [
        fr("lo3-ar1", "It starts with a message that lands wrong. A plan falls through at the last minute, and the reason feels thin. The old ache rises fast, the one that says you always care more. You put the phone face down and do not reply yet. Love still has days like this, even though {desire.done}."),
        fr("lo3-ar2", "Someone you love says something sharp at the end of a long day, and it lands exactly where you are softest. The room goes quiet. You feel the familiar urge to say something sharper back, or to go silent for a week. Nobody warned you that {desire.np} would have days like this."),
        fr("lo3-ar3", "You find out you were left out of something, a dinner or a weekend away. It stings more than you would like to admit. You sit with your coat still on, holding the phone, feeling about twelve years old. It is a small thing. None of it undoes the fact that {desire.done}, and still it hurts."),
        fr("lo3-ar4", "A friend forgets something that mattered to you, then remembers a day late with a breezy message. It should not matter this much. It does. You go looking for the care in it and come up a little short. On paper, {desire.np} never had days like this."),
        fr("lo3-ar5", "You and the person you love are arguing about something that is not really the thing you are arguing about. You both know it. The dishes sit half washed in the sink. Voices rise, enough to make the room feel smaller. Even with {desire.np}, there are still nights like this one.", ROMANCE),
        fr("lo3-ar6", "They come home quiet and closed, and when you ask what is wrong, they say nothing. You know it is something. The old fear wakes at once, the one that says this is the beginning of the end. You notice it. You remind yourself that {desire.done}, and that a bad evening is only a bad evening.", ROMANCE),
        fr("lo3-ar7", "A visit that was going well tips over in a single sentence. The old subject comes up, the one that has never once ended well, and the room goes tight. You feel yourself shrinking to fourteen. You set your cup down carefully. Even though {desire.done}, some conversations still have teeth.", FAMILY),
      ],
      living: [
        fr("lo3-li1", "You wait until the heat goes out of it before you say anything. When you do, you keep it short and honest: what you felt, and that you would like to talk. No sarcasm, no punishing silence. Then you go and make yourself something warm to drink."),
        fr("lo3-li2", "Later, you talk. It is awkward at first. You listen properly, without preparing your reply while they speak, and you hear something you had missed. You say what you need in one clear sentence. Nothing is fully fixed. Something real has been said, though, and that is how repair begins."),
        fr("lo3-li3", "You call someone who knows you well and tell them the whole thing, the petty parts included. They listen all the way through, and then they make you laugh about one ridiculous detail. The hurt is still there afterwards, smaller, the right size to carry until morning."),
        fr("lo3-li4", "You do the thing you used to be terrible at: you ask for what you need, plainly, without apologising for needing it. Your voice wobbles. They hear you anyway. Afterwards you sit for a while, shaky and quietly pleased, knowing you handled it like someone who expects to be loved."),
        fr("lo3-li5", "Later, you and the person you love sit on the kitchen floor with your backs against the cupboards and talk it through. You say the truest thing you can find: that you are scared, and that you would rather understand than win. They listen. The problem is still there. You are on the same side of it.", ROMANCE),
        fr("lo3-li6", "You go to bed a little bruised, the thing only half talked through. You lie in the dark for a while. Then the person you love reaches across and touches your arm, just to say: still here. You take their hand. It is enough for tonight. The rest can wait until morning.", ROMANCE),
      ],
      titles: [ti("lo3-t1", "Still Here"), ti("lo3-t2", "The Soft Place"), ti("lo3-t3", "What Love Does Next")],
    },

    // IV · Someone Notices
    4: {
      arrival: [
        fr("lo4-ar1", "Your oldest friend watches you across the table for a long moment, then shakes their head and smiles. They say you seem different: easier, softer at the edges, like someone who has stopped bracing. You start to argue, then stop. They have known you longest. They can see that {desire.done}."),
        fr("lo4-ar2", "A neighbour stops you on the stairs and says you look happy these days, really happy. You laugh and thank them, and then you stand there after they have gone, holding your keys. It surprises you that it shows from the outside. So it shows on your face that {desire.done}."),
        fr("lo4-ar3", "Someone you have not seen in years runs into you and stops mid-sentence. You look well, they say, and then, more carefully, you look loved. The word catches you off guard. You think of everyone who made it true, and of the words {desire.quote}, and you have to look at your shoes."),
        fr("lo4-ar4", "In a group chat that is usually all jokes, someone writes something earnest about you. They say you have been a really good friend this year. Two people agree. A third sends a row of hearts. You read it at the bus stop and have to look up at the sky for a minute. This is part of {desire.np}."),
        fr("lo4-ar5", "Someone from your family watches you at the table, a little longer than usual. Afterwards, drying dishes beside you, they say you seem easier these days, easier to be near. Their voice catches on it. You keep drying the same plate for a long time. Neither of you needs to say why: {desire.done}.", FAMILY),
        fr("lo4-ar6", "A friend watches the two of you laughing at something only you find funny, and afterwards pulls you aside. They tell you they have never seen you like this, so easy in yourself. You look over at the person you love, still laughing, and know they are right. Anyone can see it: {desire.done}.", ROMANCE),
      ],
      living: [
        fr("lo4-li1", "This time you let the compliment land. You say thank you and leave it there, without shrinking it or turning it into a joke. It is harder than it sounds. It gets easier as the day goes on. By the end you are telling them about the year, the good parts and the hard ones."),
        fr("lo4-li2", "On the way home you replay what they said. You notice you have stopped waiting for the catch. For years, kindness made you suspicious. These days it mostly makes you feel lucky, and then, more quietly, like you deserve it."),
        fr("lo4-li3", "Later you find yourself asking someone about their life, really asking, and listening to the whole answer. Love has done that to you. It has made room. You used to spend conversations waiting to be found out. These days you spend them finding out about other people."),
        fr("lo4-li4", "That night you write the moment down so you will not lose it: what they said, where you were, the exact light. Under it you add one line of your own, a note to the person you were a year ago. It says: you were right to keep going."),
        fr("lo4-li5", "On the way home you tell the person you love what was said. They squeeze your hand and say they could have told you that months ago. You both laugh. You walk the rest of the way in comfortable silence, swinging your joined hands, like people with nowhere else to be.", ROMANCE),
        fr("lo4-li6", "That night the person you love says it too, almost in passing, while switching off the lamp. You are easier to be close to these days, they say, and you let them in. You lie awake for a few minutes afterwards, feeling the shape of it, smiling into the dark.", ROMANCE),
      ],
      titles: [ti("lo4-t1", "You Look Loved"), ti("lo4-t2", "The Word That Caught You"), ti("lo4-t3", "Kindness, Accepted")],
    },

    // V · The Threshold
    5: {
      arrival: [
        fr("lo5-ar1", "The reply arrives while you are washing up. Your hands are wet, so you read it with one finger, dripping on the counter. It says yes. Just that, and then a second message with three exclamation marks. You stand in the middle of the kitchen, dripping, while it sinks in that {desire.done}."),
        fr("lo5-ar2", "Your phone lights up with a name you were not sure you would ever see again. You open the message with your heart in your throat. It is long and kind, and the last line says they have missed you too. Sixty seconds ago, you were still hoping for {desire.np}."),
        fr("lo5-ar3", "Someone you love says the words you have been hoping to hear. They say them out loud, in an ordinary moment, halfway through a walk with their hands in their pockets. Then they look at you, waiting. For a second you cannot speak at all. Then it lands, the whole fact that {desire.done}."),
        fr("lo5-ar4", "The call comes on an ordinary afternoon. You see the name and answer it standing up, already half knowing. You hear the news, and then you hear yourself say oh, in a voice you do not recognise. The words you wrote, {desire.quote}, have stopped being a wish."),
        fr("lo5-ar5", "They ask you in the kitchen, in their socks, with flour on one sleeve. It is the question they have carried around for weeks, and they could not wait for a better moment. You laugh so hard you cry. Somewhere under the laughing, it lands that {desire.done}.", ROMANCE),
        fr("lo5-ar6", "You are waiting at the arrivals gate when you see them come through the doors, scanning the crowd. Then they find you. You watch it happen on their face, the exact second they see you. Something in you that has waited for years finally sits down, because {desire.done}.", ROMANCE),
      ],
      living: [
        fr("lo5-li1", "For the first few seconds you cannot do anything at all. You hold very still and let the first minute be yours. Then you hear yourself say the only thing that makes sense, one short, true sentence, and you say it before you can overthink it."),
        fr("lo5-li2", "A laugh bursts out of you, too loud, and your eyes fill at the same time. You press the back of your hand to your mouth. Your face cannot decide what it is doing, so it does everything at once, and you let it."),
        fr("lo5-li3", "The first person you want to tell is obvious, and you call them before you have thought about it. They pick up on the second ring. You try to say it calmly and fail completely. On the other end of the line, they start laughing and crying too."),
        fr("lo5-li4", "You look around as if everything might have changed. It has not. Same light, same sounds, same ordinary place. You are the only thing that is different, and you can feel it in every part of you, light and loud and new."),
        fr("lo5-li5", "The person you love is right there, and they understand before you say a word. They pull you in, and you hold on harder than you mean to. You can feel their heart going as fast as yours. Neither of you says anything for a long time.", ROMANCE),
        fr("lo5-li6", "The person you love takes your face in both hands and says your name, only your name. You both start laughing at nothing, the giddy kind of laugh that keeps setting itself off again. Later you will try to describe that laugh to someone, and fail completely.", ROMANCE),
      ],
      titles: [ti("lo5-t1", "The Reply"), ti("lo5-t2", "When the Answer Came"), ti("lo5-t3", "Sixty Seconds, Then Everything")],
    },

    // VI · An Ordinary Day
    6: {
      arrival: [
        fr("lo6-ar1", "Love has become ordinary in the best possible way. A standing call with your oldest friend. A group chat that never quite goes quiet. A spare key to someone’s place on your ring, in case of emergencies. Nobody makes speeches about it. It is simply true, these days, that {desire.done}."),
        fr("lo6-ar2", "Today is so ordinary you almost miss it. You buy the biscuits someone likes without being asked. You send a photo of a ridiculous dog to a person who will appreciate it. Small loves, taken for granted in the best way. This is what {desire.np} looked like once the first excitement settled."),
        fr("lo6-ar3", "You have dinner with people you love, and nobody dresses up. Someone brings dessert from the shop. Someone else arrives late, apologising, and nobody minds. This is how it goes these days: easy, regular, unremarkable. Somewhere along the way, {desire.np} stopped being a wish and became a habit."),
        fr("lo6-ar4", "You get a message asking if you are free on the weekend. You are, and you say so, and that is the whole exchange. No overthinking, no wondering if they only asked to be polite. Being wanted around has become a plain fact, because {desire.done}."),
        fr("lo6-ar5", "There is a list on the fridge in two kinds of handwriting: eggs, stamps, and one word neither of you can read. You add to it without thinking. It is the most ordinary object in your home. If you stop to look at it, it holds the whole story of {desire.np}.", ROMANCE),
        fr("lo6-ar6", "You wake up next to the same person you woke up next to yesterday and the day before. Nobody brings coffee. Somebody snores. You lie there for a minute, utterly unexcited and completely content, and think that this is what you meant when you wrote {desire.quote}.", ROMANCE),
      ],
      living: [
        fr("lo6-li1", "Midway through the afternoon your phone buzzes with a message from someone you love: a photo of something that made them think of you. You reply with a single word, and they reply with a single word, and that is the whole conversation. It is plenty."),
        fr("lo6-li2", "You remember a birthday without needing a reminder, and you send a card that will arrive on the right day. It is such a small competence. It used to be beyond you, back when love felt like a test you were failing. These days it feels like tending a garden you are glad to have."),
        fr("lo6-li3", "In the evening you cook too much on purpose and drop a portion round to a neighbour who has been unwell. They open the door in slippers and look so pleased you have to glance away. You head home slowly, warm all the way through, carrying the empty bowl."),
        fr("lo6-li4", "You spend an hour alone on purpose and enjoy your own company. You read with your feet tucked under you and a blanket over your knees. Strangely, being loved by other people has made you better company for yourself."),
        fr("lo6-li5", "You do the food shop together and argue amiably about which pasta is best. In the queue, they rest their head on your shoulder for a second, bored and fond. It is nothing at all. You stand very still until the queue moves, to make it last.", ROMANCE),
        fr("lo6-li6", "One of you cooks while the other reads the recipe aloud, badly, skipping the important steps. Something burns at the edges. You eat it anyway, plates on your knees, arguing cheerfully about whose fault it was.", ROMANCE),
      ],
      titles: [ti("lo6-t1", "Small Loves"), ti("lo6-t2", "An Ordinary Kind of Held"), ti("lo6-t3", "Wanted Around")],
    },

    // VII · Becoming
    7: {
      arrival: [
        fr("lo7-ar1", "You are someone people call when things go wrong. That still surprises you. Somewhere along the way you became a person who shows up, and who is shown up for. The words {desire.quote} looked lonely on the screen the night you typed them. These days they are full of company."),
        fr("lo7-ar2", "You look back over the year and see it clearly: the reaching out, the awkward first coffees, the hard conversations you stayed for. None of it was glamorous. All of it was brave in a small way. Every one of those moments led to {desire.np}, and you would do each of them again."),
        fr("lo7-ar3", "Love asked things of you. Patience. Honesty. The nerve to go first. You gave them a little at a time, and somewhere in the giving you became someone you are glad to be. It is still a quiet marvel to you that {desire.done}."),
        fr("lo7-ar4", "You find yourself telling someone younger what you learned. You have to let people see you, you tell them, and love grows in the small, repeated things. You hear yourself say it and recognise the voice. It belongs to someone who knows, from the inside, that {desire.done}."),
        fr("lo7-ar5", "You look at the person beside you and think about how many versions of you they have met. The nervous one, the tired one, the one who argued at the sink. They loved all of them. You are a different person for being loved like that. That is how you know that {desire.done}.", ROMANCE),
        fr("lo7-ar6", "On the anniversary of something small, you find the first message they ever sent you. It is so ordinary. You read it out loud, and they groan, and then they ask you to read it again. You think about everything that grew from that one sentence: {desire.np}, all of it.", ROMANCE),
      ],
      living: [
        fr("lo7-li1", "You write a letter you do not intend to send, to the version of you who first wrote this wish down. You tell them about the dinners and the phone calls and the hard day that ended in repair. You tell them it was worth being brave. Then you fold it up and keep it."),
        fr("lo7-li2", "That evening you look around a room full of people who know you, and you let yourself take it in. The noise, the warmth, someone’s laugh carrying over everything. You used to stand at the edge of rooms like this. Tonight you are somewhere near the middle."),
        fr("lo7-li3", "You catch yourself loving someone well without trying: noticing they are tired, making the tea, asking the right question at the right time. It feels effortless in a way that took years of effort. You keep that part to yourself. They never need to know what it cost."),
        fr("lo7-li4", "You spend a quiet hour being kind to yourself, the way you have learned to be kind to other people. You do not have to earn it first. That might be the biggest change of all, and you sit with it, warm and a little amazed, until the light goes."),
        fr("lo7-li5", "You and the person you love sit outside after dark with blankets round your shoulders, talking about where you might be in ten years. You notice you are unafraid of the question. The future used to feel like a test. Tonight it only feels like more of this.", ROMANCE),
        fr("lo7-li6", "They catch you looking at them and ask what you are thinking. You tell them the truth: that you are grateful. You had no idea a person could feel this much at home with another person. They say nothing. They lean their head against yours and stay there.", ROMANCE),
      ],
      titles: [ti("lo7-t1", "Somewhere Near the Middle"), ti("lo7-t2", "Someone Who Shows Up"), ti("lo7-t3", "What Love Asked of You")],
    },
  },

  chapterOne: [
    // Partner and wedding: the first morning in a shared life.
    {
      id: "lo-one-partner",
      motifs: ["partner", "wedding"],
      title: ti("lo-one-partner-t", "Two Cups"),
      opening: {
        morning: fr("lo-one-partner-op-m", "Good morning, {name}. Before the day begins, come and spend a few minutes somewhere else. It is a morning not far from here, in a bed that is warm on both sides. Let yourself wake up slowly there."),
        evening: fr("lo-one-partner-op-e", "Close your eyes, {name}, and let the day slide off you. Where you are going it is early morning, the light is grey and soft, and you are not waking up alone. Take your time getting there."),
      },
      body: [
        { kind: "text", fragment: fr("lo-one-partner-p1", "You surface slowly. There is a weight on the other side of the mattress and the sound of someone breathing, deep and even, still asleep. You open your eyes, and there they are: a shoulder, the back of a head, one hand tucked under the pillow. You lie very still so you can look a little longer, and let it settle over you that {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("lo-one-partner-p2", "Eventually you slip out to the kitchen. The floor is cold. You fill the kettle and take two cups down without thinking. Then you stop, holding them, because that small automatic gesture is the whole thing you used to wish for. You set them side by side on the counter and look at them for a second, two cups, one of them not yours.") },
        { kind: "text", fragment: fr("lo-one-partner-p3", "They wander in a few minutes later, one cheek still creased from the pillow, and lean against the doorframe watching you. You ask what they are looking at. They say: you. Only that. You laugh and tell them to stop, and they do not stop. The kettle roars between you, and neither of you moves to get it.") },
        { kind: "text", fragment: fr("lo-one-partner-p4", "You think of all the evenings you spent writing some version of {desire.quote}, hoping without quite letting yourself hope. You feel {feeling}, so completely it is almost funny. This is what {desire.np} felt like in the end: two cups, and someone looking at you like that.") },
      ],
      closing: {
        morning: fr("lo-one-partner-cl-m", "Come back gently, {name}. Carry that kitchen with you, the steam and the light and being looked at like that. Below are a few small steps toward it. Choose the one that fits today."),
        evening: fr("lo-one-partner-cl-e", "Let the kitchen go soft at the edges, {name}. Let your breath slow to match the breathing you woke beside. Choose a small step for tomorrow below, then sleep. That morning is waiting."),
      },
    },
    // Family and family repair: the first morning when it is easy between you.
    {
      id: "lo-one-family",
      motifs: ["family", "family-repair"],
      title: ti("lo-one-family-t", "The Call Before Breakfast"),
      opening: {
        morning: fr("lo-one-family-op-m", "Good morning, {name}. Give the day a few minutes to wait. You are going somewhere it is early and bright, and in a moment the phone is going to ring with a voice you love."),
        evening: fr("lo-one-family-op-e", "Let the evening settle, {name}. Where you are going, it is a bright, ordinary morning. The people who are yours are only a phone call away, and the phone is about to ring."),
      },
      body: [
        { kind: "text", fragment: fr("lo-one-family-p1", "The phone rings while you are still in your dressing gown. You see the name and smile before you answer. There is no knot in your stomach, no bracing for the old argument. Only a familiar voice saying good morning, asking what you are up to, in no hurry at all. You settle in by the window, and somewhere in the small talk it lands that {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("lo-one-family-p2", "You talk about nothing much. The weather where they are. A recipe that went wrong. A neighbour’s new fence, described in more detail than any fence deserves. Somewhere in the middle of it they laugh, properly, at something you said. You cannot remember the last time you heard that laugh aimed at you. It goes straight through you.") },
        { kind: "text", fragment: fr("lo-one-family-p3", "Before you hang up, they ask when you are coming over. They mean it. You pick a date, and they say they will make the thing you always liked. You can hear the care folded into that small promise. Afterwards you sit with the phone in your lap for a while, too full to move.") },
        { kind: "text", fragment: fr("lo-one-family-p4", "There was a time you wrote {desire.quote} and were not sure it could ever change. Some things take years, and some take one brave phone call. You feel {feeling}, a slow, deep kind of it. This is what you hoped {desire.np} would feel like: easy, at last, and ordinary enough to take for granted.") },
      ],
      closing: {
        morning: fr("lo-one-family-cl-m", "Come back slowly, {name}. Keep the sound of that laugh with you. Below there are a few small steps, each one a way of reaching toward that morning. Choose one, and give it a moment in your day."),
        evening: fr("lo-one-family-cl-e", "Let the call end, {name}, and let the morning fade. There is nothing left to mend tonight. Choose a small step for tomorrow below, then sleep, knowing that the warmth is real enough to work toward."),
      },
    },
    // Friendship and community: the first morning of being expected.
    {
      id: "lo-one-friends",
      motifs: ["friendship"],
      title: ti("lo-one-friends-t", "Two Coffees at the Door"),
      opening: {
        morning: fr("lo-one-friends-op-m", "Good morning, {name}. Leave the day for a moment. You are going somewhere just ahead of here, to a morning when your phone is already buzzing with people who want you around. Let the day wait while you go and see."),
        evening: fr("lo-one-friends-op-e", "Let the day go, {name}. In the story you are about to enter, it is morning. Later you have somewhere to be: a table full of people who are glad you exist. Go and wake up there."),
      },
      body: [
        { kind: "text", fragment: fr("lo-one-friends-p1", "You wake to your phone buzzing gently beside you. The group chat has been busy since seven. Someone has sent a photo of an absurd pastry. Someone else is asking who is bringing what for later. Your name comes up three times, casually, as if of course you will be there. Of course you will. Nobody has to say it anymore: {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("lo-one-friends-p2", "You make coffee and scroll back through the morning’s messages, laughing out loud at one of them in your empty kitchen. Someone has already answered your joke with three crying-laughing faces. There was a time when you watched groups like this from the outside, wondering how people found each other. You found each other slowly: one coffee, one awkward invitation, one yes at a time.") },
        { kind: "text", fragment: fr("lo-one-friends-p3", "Later the doorbell goes, earlier than planned. It is a friend holding two coffees, saying they were nearby and thought you could head over together. You grab your coat. On the way they tell you about their week, and you listen. You are fully, easily there for all of it, and it feels like the most natural thing in the world.") },
        { kind: "text", fragment: fr("lo-one-friends-p4", "When you typed {desire.quote}, you were not sure people like this existed, let alone that they would want you around. You feel {feeling}, and the warmth of it surprises you. This is what {desire.np} turned out to be, that first morning: being expected, and being glad to go.") },
      ],
      closing: {
        morning: fr("lo-one-friends-cl-m", "Come back to your morning, {name}. Bring that buzzing phone and those two coffees with you. Below are a few small steps toward that table. Pick one, and let today be the day you take it."),
        evening: fr("lo-one-friends-cl-e", "Let the morning fade, {name}, and let the warmth of it stay. Choose a small step for tomorrow below if you like, then rest. The table will still have a place for you."),
      },
    },
    // Default: any love desire, with no partner or family assumed.
    {
      id: "lo-one-default",
      motifs: [],
      title: ti("lo-one-default-t", "Thought Of"),
      opening: {
        morning: fr("lo-one-default-op-m", "Good morning, {name}. Before the day reaches for you, come somewhere else for a few minutes. It is morning there too, early and soft. It is the first morning of a life you once wrote down in a few careful words."),
        evening: fr("lo-one-default-op-e", "Let the day go, {name}. Close your eyes if you can. Where you are going it is early morning, and the light is still grey and gold. You are about to wake up inside a life you have wanted for a long time."),
      },
      body: [
        { kind: "text", fragment: fr("lo-one-default-p1", "You wake a minute before the alarm and lie still, listening. The rain stopped sometime in the night. Your phone glows beside you with a message sent at midnight: home safe, thought of you, sleep well. You read it three times, smiling into the pillow like a fool. Then you remember, slowly and all at once, that {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("lo-one-default-p2", "There was a time when mornings began with a small hollow feeling. You used to wonder whether anyone would notice if you went silent for a week. You reach for that feeling out of habit and find it gone. It has been gone for a while. In its place are names: the friend who always calls back, the one who knows your order without asking.") },
        { kind: "text", fragment: fr("lo-one-default-p3", "Over breakfast a voice note arrives from someone who loves you, rambling and warm and full of a story about their neighbour’s cat. You listen with your chin in your hand, smiling at the screen. You send one back, promising to see them on the weekend. It still surprises you a little. You are someone people make plans with.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("lo-one-default-p4", "Late one night you typed {desire.quote}, half hoping and half embarrassed to want so much. You feel {feeling}, all the way down, and you let it stay. This is what you hoped {desire.np} would feel like: quieter than you pictured, and warmer.") },
      ],
      closing: {
        morning: fr("lo-one-default-cl-m", "Come back slowly, {name}. Keep the message and the voice note and the warmth. Below there are a few small steps, each one a way of reaching toward the people in that morning. Choose one, and carry it into your day."),
        evening: fr("lo-one-default-cl-e", "Let the morning fade, {name}, and let the warmth stay. It will be there whenever you come back to it, and so will the people in it. Choose a small step for tomorrow below, then sleep, knowing you have already started toward it."),
      },
    },
  ],
};
