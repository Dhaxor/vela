// CAREER — focus content (A3).
// Seven stages × (arrival, living, 3 titles) + hand-tuned Chapter I scripts.
// Career covers employees, founders, freelancers, students and makers, so
// unflagged lines say 'the work' and 'someone you work with' and never assume a
// boss, a team, customers or an office. Lines about a manager or colleagues carry
// `requires: ['employer']`; lines about clients, customers or premises carry
// `requires: ['business']`. Arrival and living are picked independently, so
// every living line also reads after every arrival line of its stage.
// Chapter I: a default script, plus scripts for your own business or food
// venture, a new job or promotion, and creative work. Script text carries no
// flags: the script's `motifs` gate it.
// Grammar: a verb after {desire.np} is past tense or modal ('more clients' is plural).
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

const BUSINESS = { requires: ["business"] } as const;
const EMPLOYER = { requires: ["employer"] } as const;

export const CAREER: FocusContent = {
  focus: "career",
  stages: {
    // I · The First Glimpse
    1: {
      arrival: [
        fr("ca1-ar1", "You wake before the alarm and lie still, already thinking about the work. It is a good kind of thinking, the kind that arrives with ideas instead of dread. Today’s work is work you chose, and you can hardly wait to start it. It is true, every bit of it: {desire.done}."),
        fr("ca1-ar2", "An email is waiting with your name in the subject line. For the first time in years, it does not make your stomach turn. Someone wants your opinion. Your real one. You read it over coffee and already know what you will say. This is the morning you pictured when you wrote {desire.quote}."),
        fr("ca1-ar3", "Your bag is by the door with everything you need for the day. The laptop. The notebook with your good pen clipped to it. A lunch you actually packed. It looks like it belongs to someone who knows what they are doing. You stop and look at it, because {desire.done}."),
        fr("ca1-ar4", "You open your calendar and read the day like a menu. Every block on it is something you said yes to on purpose. There is even an hour in the afternoon marked, simply, think. You laugh out loud. Everything you hoped {desire.np} would give you is right there on one screen."),
        fr("ca1-ar5", "Your first booking of the day is already in the calendar, from someone who found you on their own. You read their message twice over breakfast. They chose you, by name. You run the whole thing yourself, start to finish, and it is real: {desire.done}.", BUSINESS),
        fr("ca1-ar6", "A message from your new team is waiting when you wake: a row of welcomes and an in-joke you will understand soon enough. You read it twice in bed, grinning at the ceiling. You have a team. It is official: {desire.done}.", EMPLOYER),
      ],
      living: [
        fr("ca1-li1", "You start a little early because you want to. The first task is one you would happily do for free. You lose yourself in it so completely that when you look up, an hour has gone, and you feel rested instead of drained."),
        fr("ca1-li2", "Somebody asks for help with a problem, and you know the answer straight away. You explain it simply and watch it land. They thank you and head off, and you sit there for a second, quietly astonished by how much you know."),
        fr("ca1-li3", "At lunch you eat outside and actually taste the food. Your mind keeps drifting back to the work, gently, the way it drifts to a good book you put down. You cannot wait to get back to it. You have not felt that about work in a long time."),
        fr("ca1-li4", "You finish something small and good before eleven: a page, a sketch, a fix, a plan. You look at it for a moment longer than you need to. It is yours, made with your hands and your head, and it is good. You let yourself enjoy that before moving on."),
        fr("ca1-li5", "The first person you work with today ends by saying they will be back, and they clearly mean it. You tell them you hope so. Afterwards you tidy something that is already tidy, just to have somewhere to put the joy.", BUSINESS),
        fr("ca1-li6", "In the morning meeting your manager turns to you and asks what you think. You tell them. Nobody looks surprised that you have a good idea, because here you have them all the time. You write down three actions and feel, very simply, that you belong.", EMPLOYER),
      ],
      titles: [ti("ca1-t1", "The Work You Chose"), ti("ca1-t2", "A Morning That Fits"), ti("ca1-t3", "Glad of the Alarm")],
    },

    // II · The Night Before
    2: {
      arrival: [
        fr("ca2-ar1", "Tomorrow is the big day, and the slides are finished. You click through them once more on the sofa, laptop warm on your knees, mouthing the opening line. It is good. It has been good for two days. You close the lid before you can start fiddling. Tomorrow belongs to {desire.np}."),
        fr("ca2-ar2", "Tomorrow is day one. You have gone over the plan so many times you could recite it. The route is worked out and the alarm is set. A new notebook sits on the table with nothing in it yet. You open it, write tomorrow’s date at the top, and under it the words {desire.quote}."),
        fr("ca2-ar3", "Tomorrow the thing you have been building goes out into the world. The last checks are done. You sit with your hands in your lap and look at it on the screen, finished. It is the strange mix of pride and letting go that comes with anything you make. It is all part of {desire.np}."),
        fr("ca2-ar4", "Tomorrow you have a big conversation, the kind you used to put off for months. Tonight you know exactly what you want to ask for and why it is fair. You have written it in three lines and learned them by heart. You say them once to the mirror. This is what {desire.np} asked of you."),
        fr("ca2-ar5", "Tomorrow you open for business, officially, under the name you chose. Everything is ready, down to {motif.detail}. You go over it all one last time with the lights low, touching things, naming them in your head. Everything about {desire.np} is in this one evening.", BUSINESS),
      ],
      living: [
        fr("ca2-li1", "You run through tomorrow once, start to finish, out loud to the empty kitchen. You stumble on one sentence, so you fix it. Then you make yourself stop. Over-rehearsing only sands the life out of things, and you have done enough. You make toast and eat it, absurdly calm."),
        fr("ca2-li2", "Someone sends a message wishing you luck, four words and a row of exclamation marks. You reply with something equally silly and feel the nerves loosen their grip. Then you switch your phone to silent and leave it alone, which is the bravest thing you do all evening."),
        fr("ca2-li3", "You pack your bag carefully, the way you would for someone you believe in. Charger, notes, water, the good pen. You add a snack, because the person you are turning into looks after themselves on big days. Then you zip it shut and leave it by the door."),
        fr("ca2-li4", "You write down the one thing you most want to remember tomorrow and tuck it into your pocket. It says: you belong in that room. You read it twice, and something settles. You are going in as yourself, and yourself is exactly who got you here."),
      ],
      titles: [ti("ca2-t1", "Ready Enough"), ti("ca2-t2", "Going In as Yourself"), ti("ca2-t3", "The Evening Before Day One")],
    },

    // III · The Hard Day
    3: {
      arrival: [
        fr("ca3-ar1", "An email lands at nine: the deadline has moved up two days, and nobody is apologising. You read it twice. Your stomach does the old drop, and for a moment the whole week looks impossible. Even though {desire.done}, mornings like this still come."),
        fr("ca3-ar2", "You find the mistake at four in the afternoon, and it is yours. A wrong figure, sent out to people who matter. Your face goes hot. For a second you want to close the laptop and disappear. The life where {desire.done} still has afternoons like this one."),
        fr("ca3-ar3", "The thing you made goes out into the world, and the response is quieter than you hoped. A few kind words. A lot of silence. You refresh the page more times than you would like to admit. This is the part of {desire.np} that nobody posts about."),
        fr("ca3-ar4", "The feedback comes back sharp. One comment gets under your skin, partly because it feels unfair and partly because a small piece of it is right. You read it twice in the corridor and feel about two inches tall. Some days, {desire.np} came with afternoons like this one."),
        fr("ca3-ar5", "A client writes at nine to say they are unhappy with the work. The message is polite and cold, and it ruins your coffee. You read it three times, looking for the worst version of what they mean. This, too, came with {desire.np}.", BUSINESS),
        fr("ca3-ar6", "Your manager asks for a quick word, and the quick word is about a project that has gone off the rails. Some of it is your fault. Some of it is not. You sit across the table, nodding, feeling the old urge to apologise for everything. You remind yourself that {desire.done}.", EMPLOYER),
      ],
      living: [
        fr("ca3-li1", "You close your eyes for three breaths, then open a blank page and write down what is actually true. What broke. What it affects. What you can do before the end of the day. The list is shorter than the panic. You start at the top."),
        fr("ca3-li2", "You face it head on instead of hiding. You talk to the people who need to know, keep it short, own your part without grovelling, and say what happens next. The reply, when it comes, is kinder than the version in your head."),
        fr("ca3-li3", "You ask for help, which used to feel like admitting defeat. Someone you trust looks at the problem with fresh eyes and spots what you missed in about a minute. You both laugh. By six it is handled, well enough to sleep on."),
        fr("ca3-li4", "You work on it steadily until it is good enough, and then you stop. No rewriting it at midnight. You shut the laptop, go for a short walk, and eat a proper dinner. Looking after yourself turns out to be part of the job."),
      ],
      titles: [ti("ca3-t1", "Fixed Enough"), ti("ca3-t2", "Shorter Than the Panic"), ti("ca3-t3", "A Bad Afternoon, Handled")],
    },

    // IV · Someone Notices
    4: {
      arrival: [
        fr("ca4-ar1", "Someone you used to work with gets in touch out of the blue. They have been following what you do, they say, and it is impressive. They want to recommend you for something. You read the message three times, slowly. Somewhere along the way, {desire.np} became something other people can see."),
        fr("ca4-ar2", "A friend asks what you do these days, and halfway through your answer you notice their face. They are listening closely. When you finish, they say you sound different talking about work. Happy, they say. You realise it is true, and that {desire.done}."),
        fr("ca4-ar3", "Someone newer than you asks how you got here. They are where you were a few years ago: hungry, unsure, trying to look like they know what they are doing. You recognise all of it. You think of the words {desire.quote} and how far away they once felt."),
        fr("ca4-ar4", "At a gathering, someone you have just met hears your name and their eyes widen. They know your work. They have seen it, and they liked it. You stand there holding a drink, trying hard to be casual, failing a little. You never pictured this part when you wrote {desire.quote}."),
        fr("ca4-ar5", "A client you have worked with for a year books you again. At the end of the email they add a line: they recommend you to everyone they know. You lean back and read it twice. One person at a time, word of mouth is building what you started when you wrote {desire.quote}.", BUSINESS),
        fr("ca4-ar6", "Your manager forwards you an email with a single line on top: thought you should see this. Underneath, someone senior has written about your work, by name, in detail. You read it with your hand over your mouth. Other people can see that {desire.done}.", EMPLOYER),
      ],
      living: [
        fr("ca4-li1", "This time you let it land. You say thank you and stop there, without adding a joke or a list of everything you could have done better. It feels strange, like wearing a new coat. By the end of the day, the coat fits."),
        fr("ca4-li2", "Later you send a message to someone who once opened a door for you, telling them what happened. You thank them properly this time. Passing the gratitude back up the line feels almost as good as the compliment did."),
        fr("ca4-li3", "Afterwards, alone, you allow yourself a small, private celebration. You put on a song you love and turn it up. You dance badly in the kitchen for exactly one song. Then you sit down and get on with the afternoon, grinning."),
        fr("ca4-li4", "You write what they said on a sticky note and put it at the edge of your screen. You will see it there on the hard days. It is a small thing. Some grey afternoon in the months ahead, it will matter more than you can guess."),
      ],
      titles: [ti("ca4-t1", "They Know Your Work"), ti("ca4-t2", "Let It Land"), ti("ca4-t3", "Seen From the Outside")],
    },

    // V · The Threshold
    5: {
      arrival: [
        fr("ca5-ar1", "The email arrives a little after four. It starts with the word congratulations, and you read that one word six times before you can make yourself read the rest. Your hands go cold, then hot. It is real: {desire.done}."),
        fr("ca5-ar2", "Your phone rings with a number you do not recognise. You almost let it go. You answer on the last ring, and a voice says your name, and then the words you have been waiting to hear. The sentence you wrote, {desire.quote}, has an answer."),
        fr("ca5-ar3", "You press publish. Then you sit there with your hands hovering over the keyboard. The first response comes in, then the second, then too many to count. It is out in the world with your name on it. It is done: {desire.done}."),
        fr("ca5-ar4", "Across the table, someone smiles, reaches out to shake your hand, and says the words. You shake it and say something you will not remember later. Your heart is going so hard you are sure they can hear it. It is official: {desire.done}."),
        fr("ca5-ar5", "The first payment from your first real client lands with a small, cheerful sound. You stare at the notification. Someone paid you for your work, under the name you chose. You laugh out loud at the screen. It is true: {desire.done}.", BUSINESS),
      ],
      living: [
        fr("ca5-li1", "You manage to stay composed for about ten seconds. Then a sound comes out of you, half laugh and half shout, and you cover your mouth with both hands. Your eyes are wet. You are grinning so hard your face aches."),
        fr("ca5-li2", "The first person you tell is the one who believed in you before you did. You can hardly get the words out. They make a noise down the phone that you will remember for the rest of your life."),
        fr("ca5-li3", "You sit very still and let it reach every part of you. The years of practice. The rejections. The evenings spent learning things nobody asked you to learn. All of it lands at once, in one minute. Your throat goes tight. You let it."),
        fr("ca5-li4", "You open your email signature and change it, letter by letter. The new words look strange and perfect in the little preview box. You read them three times and laugh at yourself for being so moved by a signature. You leave the window open, just to look."),
      ],
      titles: [ti("ca5-t1", "Congratulations, Six Times"), ti("ca5-t2", "The Answer"), ti("ca5-t3", "Out in the World")],
    },

    // VI · An Ordinary Day
    6: {
      arrival: [
        fr("ca6-ar1", "It is an ordinary working day. Emails, a meeting that runs over, lunch eaten while you read. You hardly think about how far you have come. You are too busy doing the work, which is exactly how you hoped {desire.np} would feel."),
        fr("ca6-ar2", "Somebody asks what you do, and you answer without the old apology in your voice. It is simply a fact about you, like where you grew up. Somewhere along the way, {desire.np} stopped being an ambition and became your job."),
        fr("ca6-ar3", "Today’s list has fourteen things on it and you get through eleven. The other three move to tomorrow without drama. You no longer measure your worth by the length of a list. This is what {desire.np} looked like on a regular day: busy, good, and nobody’s emergency."),
        fr("ca6-ar4", "The work has settled into routines: the first coffee, the inbox, the hour of real focus before lunch. They fit like a well-worn jacket, and you put them on without thinking. Some mornings it still catches you, softly, that {desire.done}."),
      ],
      living: [
        fr("ca6-li1", "In the afternoon you hit a slow patch and let it be slow. You make a tea, answer the easy emails, tidy a folder. Not every hour has to shine. The good hours come back on their own, the way they do when you stop chasing them."),
        fr("ca6-li2", "You finish on time and step out into the evening with the work done well enough. You leave it there instead of carrying it home in your head. You notice the sky, the shop windows, someone’s dog. Your evening is yours, and the work will keep."),
        fr("ca6-li3", "Someone sends a question you would once have panicked about. You answer it in two lines, accurately, and move on. Only later, rinsing your cup, do you notice how calm you were. Competence, it turns out, is mostly quiet."),
        fr("ca6-li4", "You spend an hour on the dull admin that keeps everything running: forms, files, a reply that is long overdue. It is boring, and you do it well. Even the boring parts feel like yours, which is something you never expected to say about work."),
      ],
      titles: [ti("ca6-t1", "Nobody’s Emergency"), ti("ca6-t2", "A Regular Working Day"), ti("ca6-t3", "Mostly Quiet")],
    },

    // VII · Becoming
    7: {
      arrival: [
        fr("ca7-ar1", "You scroll back through a year of work, project after project, and stop on the first one. It looks tentative. You can see the nerves in it. You can also see the exact place where you started trusting yourself. Everything after that point is part of {desire.np}."),
        fr("ca7-ar2", "Someone introduces you and uses a title you would once have been too shy to claim. You do not flinch. It is simply accurate. You think of the person who first wrote {desire.quote}, hoping nobody would laugh, and feel enormously fond of them."),
        fr("ca7-ar3", "You notice that you have become someone who finishes things. Drafts get sent. Ideas get started. You make the call instead of thinking about making it. That habit, more than talent or luck, is how {desire.done}."),
        fr("ca7-ar4", "You pass a piece of your old life: a café where you used to eat lunch alone, scrolling and wondering what was next. You stop for a second and look at it kindly. You are glad you were that person. They are the reason {desire.done}."),
      ],
      living: [
        fr("ca7-li1", "You make a list of what this work has taught you, and it runs to two pages. Very little of it is about skills. Patience. Asking early. Resting before you need to. Letting a first draft be bad. You read it back and recognise every lesson."),
        fr("ca7-li2", "You book a day off in the middle of a busy month and actually take it. Nothing falls apart. You spend it walking and reading and ignoring your inbox, and you come back the next morning hungry for the work again."),
        fr("ca7-li3", "At the end of the day you sit for a minute before shutting the laptop. You feel the full weight of being good at something, and of how long it took. You say thank you, out loud, to no one in particular. To all of it."),
        fr("ca7-li4", "In the margin of a notebook you catch yourself sketching the next thing: a bigger idea, a braver one. It does not frighten you the way new ideas used to. You know how you build things. One small step at a time, the same way you built this."),
      ],
      titles: [ti("ca7-t1", "Someone Who Finishes Things"), ti("ca7-t2", "The Way You Build"), ti("ca7-t3", "Fond of Who You Were")],
    },
  },

  chapterOne: [
    // Your own business or food venture: the first morning you open the door.
    {
      id: "ca-one-own",
      motifs: ["own-business", "food-venture"],
      title: ti("ca-one-own-t", "Your Name Above the Door"),
      opening: {
        morning: fr("ca-one-own-op-m", "Good morning, {name}. Let the day wait at the door. You are going to another door, a little further on, one with your name above it, and the key is already in your pocket."),
        evening: fr("ca-one-own-op-e", "Let the evening be still, {name}. Where you are going, it is early, the street outside is empty, and you are about to open up for the day."),
      },
      body: [
        { kind: "text", fragment: fr("ca-one-own-p1", "You are there before anyone else. The street is grey and quiet, the shutters along the row still down. You find the key, and it sticks for a second the way it always will, and then the door gives. Inside it smells of fresh paint, coffee and something that is entirely yours. It is true: {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("ca-one-own-p2", "You turn the lights on one bank at a time and watch the room appear. Everything is where you left it last night, which still feels like a small miracle. Your eye goes to {motif.detail}, and you smile at it like an old friend. You stand in the middle of it all and breathe.") },
        { kind: "text", fragment: fr("ca-one-own-p3", "The first person through the door is a stranger who has been meaning to come in for weeks. They look around slowly and say it is lovely. You thank them like it is the first compliment anyone has ever paid you, because in this place it is. On the way out, they hold the door for someone else.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("ca-one-own-p4", "You think of the person who wrote {desire.quote} and sketched this room on the back of an envelope. They were not sure anyone would ever walk into it. You feel {feeling}, so much it makes your hands shake. This is what {desire.np} felt like on the first morning: a door, and people walking through it.") },
      ],
      closing: {
        morning: fr("ca-one-own-cl-m", "Come back to your morning, {name}. Bring the sound of that door with you. Below are a few small steps toward it, each one a brick in that room. Choose one and give it a time today."),
        evening: fr("ca-one-own-cl-e", "Let the lights in that place go off one by one, {name}. Lock up in your mind. Choose a small step for tomorrow below, and then rest. The key will still be in your pocket in the morning."),
      },
    },
    // A new job or a promotion: the first morning in the role.
    {
      id: "ca-one-role",
      motifs: ["new-job", "promotion"],
      title: ti("ca-one-role-t", "They Were Expecting You"),
      opening: {
        morning: fr("ca-one-role-op-m", "Good morning, {name}. Let the day hold off a little. You are going to a morning just ahead of this one, the first morning of the role you wanted. You are almost ready to leave, and you are smiling about it."),
        evening: fr("ca-one-role-op-e", "Let today end, {name}. In the story you are entering, it is early, and there is a new route to learn. Your stomach is full of the good kind of nerves, the kind that means something matters."),
      },
      body: [
        { kind: "text", fragment: fr("ca-one-role-p1", "You wake before the alarm with a jolt of excitement you have not felt since you were small. Your clothes are on the chair where you left them. On the table is a badge with your name on it, and under your name, the title you wanted. You touch it once, lightly. It is true: {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("ca-one-role-p2", "The route in is new, and you take it slowly, noticing everything. The café on the corner. The crossing that beeps. The doors that open with a little sigh. Someone at the front desk says your name before you say it, and smiles, and points you toward the stairs. They were expecting you.") },
        { kind: "text", fragment: fr("ca-one-role-p3", "In the first meeting of the day, someone turns to you and asks what you think. You tell them. Your voice is steady, your idea is good, and you can see it land. Someone writes it down. Afterwards, at your new desk, you sit very still for a moment. You belong here, and for once you believe it.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("ca-one-role-p4", "You think of the person who wrote {desire.quote}, reading job descriptions at midnight and wondering if they were good enough to try. You feel {feeling}, so much it makes you laugh. This is what {desire.np} felt like on the first morning: a room that wanted you in it.") },
      ],
      closing: {
        morning: fr("ca-one-role-cl-m", "Come back to your morning, {name}. Keep the feeling of being expected. Below there are a few small steps toward that desk. Choose one, and give it a place in today."),
        evening: fr("ca-one-role-cl-e", "Let the new building go quiet behind you, {name}. Your work for today is done. Choose a small step for tomorrow below if you like, then sleep. That room will still want you in the morning."),
      },
    },
    // Creative work: the first morning the thing you make is out in the world.
    {
      id: "ca-one-maker",
      motifs: ["creative-work"],
      title: ti("ca-one-maker-t", "The Thing You Made"),
      opening: {
        morning: fr("ca-one-maker-op-m", "Good morning, {name}. Leave the day at the door for a few minutes. You are going to a morning just ahead of this one, where the thing you make is out in the world."),
        evening: fr("ca-one-maker-op-e", "Let the day go, {name}. Where you are going, it is early, the rooms are quiet, and the work you love is waiting for you like an old friend. You can hardly wait to get to it."),
      },
      body: [
        { kind: "text", fragment: fr("ca-one-maker-p1", "You wake early without meaning to, the way you do when something good is waiting. Your hands already want to get started. Across the room is the thing you made, finished and real, with your name on it. You look at it from the pillow for a long time. It is true: {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("ca-one-maker-p2", "You make coffee and take it straight to where you work. Your eye goes to {motif.detail}, and you smile at it like an old friend. You sit down. There is no voice in your head asking who you think you are. There is only the next line, the next note, the next mark, and you begin.") },
        { kind: "text", fragment: fr("ca-one-maker-p3", "Mid-morning, your phone buzzes with a message from a stranger. They found your work, they say, and it got them through a hard week. They wanted you to know. You read it twice, then put the phone face down and sit very still with your hand over your mouth. Somebody out there carries your work around with them.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("ca-one-maker-p4", "There was a time you made things in secret, half ashamed to call it work, and wrote {desire.quote} as if someone might laugh. Nobody is laughing. You feel {feeling}, so deeply it surprises you. This is what {desire.np} felt like on the first morning: like being allowed.") },
      ],
      closing: {
        morning: fr("ca-one-maker-cl-m", "Come back to your morning, {name}. Bring the quiet of that desk with you. Below are a few small steps toward it. Choose one, and give the thing you make a little time today."),
        evening: fr("ca-one-maker-cl-e", "Let the morning fade, {name}. The work will be there tomorrow, patient as ever. Choose a small step for it below if you like, and then sleep. Good ideas often arrive rested."),
      },
    },
    // Default: any career desire, no employer or business assumed.
    {
      id: "ca-one-default",
      motifs: [],
      title: ti("ca-one-default-t", "First Morning, Real Work"),
      opening: {
        morning: fr("ca-one-default-op-m", "Good morning, {name}. Before the inbox gets you, come and spend a few minutes in a working morning a little further down the road. It is the first one of its kind, and you are going to like it."),
        evening: fr("ca-one-default-op-e", "Let the work of today go, {name}. You are going somewhere it is early morning. For once, you are looking forward to the day ahead, and you can feel it before you even open your eyes."),
      },
      body: [
        { kind: "text", fragment: fr("ca-one-default-p1", "Your alarm goes off, and the strangest thing happens: you are glad. You lie there with your eyes open, picturing the first hour. Your chest feels busy and light at the same time, like the morning of a trip. Then you remember properly, all the way down, that {desire.done}.") },
        { kind: "weave" },
        { kind: "text", fragment: fr("ca-one-default-p2", "You get ready slowly. You pack your bag with care: the notebook, the charger, the good pen that writes the way you think. You look at it waiting by the door. It looks like it belongs to someone who knows what they are doing. It does. It belongs to you, and you grin at it on your way past.") },
        { kind: "text", fragment: fr("ca-one-default-p3", "The first task of the day is one you would happily do for free. You sit down with it and disappear. When you look up, an hour has gone, and you feel rested instead of drained. Someone asks you a question, and you know the answer, and you watch it land. You did not have to fake a single thing.") },
        { kind: "motif", part: "living" },
        { kind: "text", fragment: fr("ca-one-default-p4", "You think of the person who first wrote {desire.quote} at the end of a long day, half afraid to want it out loud. You feel {feeling}, steady and clear, and a little amazed. This is what you hoped {desire.np} would feel like: like using all of yourself, and having some left over.") },
      ],
      closing: {
        morning: fr("ca-one-default-cl-m", "Come back to your morning, {name}. Keep that gladness, and the hour that disappeared. Below there are a few small steps toward it. Choose one, and put it at the top of today’s list, where it cannot hide."),
        evening: fr("ca-one-default-cl-e", "Let the working day in the story finish without you, {name}. You do not have to do anything else tonight. Choose a small step for tomorrow below if you like, and then rest. That morning will keep, and so will you."),
      },
    },
  ],
};
