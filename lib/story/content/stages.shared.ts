// SHARED STAGE BEATS — content writer A3.
// Seven stages × (opening ×2 dayparts, sensory, reflection, closing ×2 dayparts) × 5.
// Shared beats sit between focus beats from all six focus files, so they stay
// focus-agnostic: no partner, job, money or body assumptions, and no objects that
// a focus arrival is likely to name. Openings carry {name}; reflections carry
// {feeling} and one desire token, so every chapter has both. Morning closings
// point at the step chooser below the chapter; evening closings hand over to sleep.
// Stage VII closings never promise a step: a complete season offers none.
// Length: shared beats carry most of a chapter's length for every focus, so stage I
// beats run longest (a first chapter has no recall or cumulative lines to add).
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

import type { ContentStatus, Fragment, SharedStages } from "./types";

export const STATUS: ContentStatus = "final";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const SHARED_STAGES: SharedStages = {
  // I · The First Glimpse: the first morning inside it. Wonder, small details.
  1: {
    opening: {
      morning: [
        fr("sh1-op-m1", "Good morning, {name}. Before the day starts asking things of you, give it a few minutes somewhere else. You are going a little way ahead of here, to the first morning after the thing you wrote down came true. Leave the list where it is. It will wait for you."),
        fr("sh1-op-m2", "{name}, let the day wait a moment. Sit somewhere comfortable and let your breathing find its own pace, slower than the morning wants it to be. This chapter opens not far from here, on the first morning of the life you described. Nothing in it is in a hurry, so you need not be either."),
        fr("sh1-op-m3", "Here is a gentle way to begin, {name}. Before the messages and the lists, spend a few minutes inside a different morning. It looks like an ordinary one at first: a room, some light, the sound of a street outside. Then, slowly, you notice what has changed."),
        fr("sh1-op-m4", "Morning, {name}. Leave your phone face down, or let it read this to you. You are about to wake up somewhere else, with the same habits and the same face. One thing will be enormously different, and you get to discover it slowly, the way you would in real life."),
        fr("sh1-op-m5", "Start here, {name}, before the day gets its hands on you. Notice where the chair or the bed is holding you up, and let it. In a moment you will open your eyes in a life that has finally caught up with what you asked for. Take your time arriving."),
      ],
      evening: [
        fr("sh1-op-e1", "Close your eyes when you are ready, {name}. The day is finished, and you do not have to carry it any further. Where you are going, it is early morning, the first one of a life you have wanted for a long time. The light there is only just beginning."),
        fr("sh1-op-e2", "Let tonight go quiet, {name}. Put down whatever is still in your hands, the phone included, once this has started. For the next few minutes you will be somewhere it is morning. It is the first morning after it all came true, and you are about to wake up into it."),
        fr("sh1-op-e3", "Lower the lights a little, {name}, and let your jaw unclench. You are about to wake up, which is a strange thing to say at night. You are about to wake up inside the life you wrote down, on its very first morning, with nowhere you need to be."),
        fr("sh1-op-e4", "This is the end of your day and the start of a story, {name}. Get comfortable, and let your shoulders drop away from your ears. Somewhere ahead of you, on a morning you have not lived yet, you are just opening your eyes. Go and meet yourself there."),
        fr("sh1-op-e5", "Settle in, {name}. Nothing else needs you tonight. Let your hands rest wherever they land, and let the room around you go soft. The scene ahead begins a few seconds before you wake, on the first morning of the life you asked for."),
      ],
    },
    sensory: [
      fr("sh1-se1", "Light comes in at a low angle and lays a pale stripe across the ceiling. You watch it for a while, the way you might watch a fire. Outside, a bird repeats the same three notes, and a car door closes somewhere down the street. Every sound is ordinary. You listen to each one anyway, as if it were news."),
      fr("sh1-se2", "The pillow is cool on one side and warm on the other. You turn it over to the cool side, just for the pleasure of it, and press your cheek into it. Somewhere a radio is playing very low, too far away to make out the words. You lie there and let the start of the day take its time."),
      fr("sh1-se3", "The air is cool on your face and warm under the covers. You stay exactly where you are for one more minute, and then one more. Outside, someone is sweeping a step with slow, patient strokes. Each stroke sounds like the morning telling you there is no rush."),
      fr("sh1-se4", "Next door, someone is cooking something with butter in it, and the smell drifts in, warm and ordinary. A phone buzzes once in another room and stops. You notice that the sound does not make your chest tighten. It is only a sound, and you let it be one. Your hands stay open on the covers."),
      fr("sh1-se5", "There is a particular quiet that only happens early, before the day gets loud. The fridge hums. A floorboard settles. The curtain lifts a little where the window is open a crack, and the air coming through smells of wet pavement and cut grass. You breathe it in and feel more awake than coffee has ever made you."),
    ],
    reflection: [
      fr("sh1-re1", "You lie still and let it be true. For so long {desire.np} lived in the future tense, something you were always working toward. This morning it is simply here, in the room with you. You feel {feeling} in a way that needs no explanation to anyone, and you do not try to give one."),
      fr("sh1-re2", "Some part of you keeps checking, the way a hand checks a pocket for keys. Still here? Still here. It surprises you all over again that {desire.done}. Each time, the surprise softens into something steadier. The word for it is {feeling}. You say it once, quietly, to the ceiling."),
      fr("sh1-re3", "You think about the person who first wrote {desire.quote}: how carefully they chose the words, how far away it all seemed. You would like to tell them about this morning, every detail of it. You settle for letting yourself feel {feeling}, all the way through, for as long as it lasts."),
      fr("sh1-re4", "Nobody announces it. There is no ceremony, only a morning, and the words you once wrote, {desire.quote}, describing it exactly. You feel {feeling}. The largest changes, it turns out, arrive looking like small ones. A quiet room. A slow breath. A day that does not need to be survived."),
      fr("sh1-re5", "Here is the part you could never picture: how normal {desire.np} would feel from the inside. You thought it would feel like a shout. Instead you feel {feeling}, steady and clear, the way you feel in a place you know by heart. It fits you. It was always going to fit you."),
    ],
    closing: {
      morning: [
        fr("sh1-cl-m1", "When you are ready, come back to this morning. It is the same day you woke up to, with the same list waiting. One thing is different: you have seen where it leads. Just below, there is a step small enough to fit into today. Choose it before the day fills up."),
        fr("sh1-cl-m2", "Let the scene fade at its own pace. Keep one detail from it, the light or the quiet, and carry it into the first hour of your day. The step waiting below is small on purpose. Small steps, taken on ordinary mornings like this one, are how that morning gets built."),
        fr("sh1-cl-m3", "Take a slow breath and feel what is underneath you again. Today is an ordinary day, which is good news, because ordinary days are where the life you just glimpsed gets made. Pick one step below and give it a place in your morning, the way you would make room for a friend."),
        fr("sh1-cl-m4", "Before you go, notice how that scene felt in your chest. The feeling is worth more than any list, and it will be there when you need it. Take it with you, along with one small thing to do today. You will find the choices waiting just under this page."),
        fr("sh1-cl-m5", "Come back slowly, {name}. Stretch if you want to. The morning you visited is still there, a little further down the road. Today you get to cover one more piece of the distance between here and there. Choose your step, then go and have your day."),
      ],
      evening: [
        fr("sh1-cl-e1", "Let the morning stay where it is, waiting for you. You do not have to hold on to it. Let your breathing slow and your hands go heavy. Tonight you rest, and the life you saw keeps its place a little further on, patient as a light left on in a window."),
        fr("sh1-cl-e2", "That is enough for tonight, {name}. The first morning will be there whenever you come back to it, as many times as you like. Let the room around you return, the dark and the quiet of it, and let sleep come when it wants to. You do not need to chase it."),
        fr("sh1-cl-e3", "You can let go of the scene. Keep only the feeling, and let even that blur at the edges as you drift. There is nothing left to do today. Your step can be chosen in the morning, or here, before you sleep. Either way, it will keep until you are ready."),
        fr("sh1-cl-e4", "Set the chapter down in your mind, the way you would leave a book open on its face for later. Let your shoulders sink into whatever is holding you. Picture that early light one more time, warm on the ceiling, and then let it dim. Sleep well."),
        fr("sh1-cl-e5", "Stay a little longer if you like. There is no rush to leave a good morning, even an imagined one. When you are ready, let it go dark, let your breath lengthen, and rest. You have already started walking toward it. Tonight, you are allowed to simply sleep."),
      ],
    },
  },

  // II · The Night Before: anticipation and rehearsal. Nerves that settle.
  2: {
    opening: {
      morning: [
        fr("sh2-op-m1", "Good morning, {name}. This chapter happens at night, so let your own day wait a few minutes longer. It is the evening before something big in the life you are building, and you are getting ready for it. Come and sit in that quiet room for a while."),
        fr("sh2-op-m2", "{name}, find somewhere to sit before the day begins. The scene ahead is an evening, quiet and lamplit, with the curtains drawn. Tomorrow, in that story, is a day you have been moving toward for a long time. Tonight, in that story, you are almost ready."),
        fr("sh2-op-m3", "Here is a good use for the start of a morning, {name}: a rehearsal. In this chapter it is the night before a day that matters. You are putting your things in order without any rush at all. Watch how calmly you do it."),
        fr("sh2-op-m4", "Morning, {name}. Bring your tea or your coffee along if you like. You are about to spend a few minutes inside the evening before a big day. You are calmer in it than you might expect, and that calm is worth borrowing."),
        fr("sh2-op-m5", "Before you head into today, {name}, borrow a little calm from somewhere else. In this story it is the night before, and the lights are low. Everything that can be done is done. You are more ready than you feel, and you are about to find that out."),
      ],
      evening: [
        fr("sh2-op-e1", "Get comfortable, {name}. This chapter is an evening too, just like yours. It is the night before something you have worked toward. You are spending it the way you would like to spend every important night: unhurried, and kind to yourself."),
        fr("sh2-op-e2", "Let the day close behind you, {name}. In the scene you are entering, tomorrow is the day. You will not rush through tonight, though. You will get ready slowly, the way people do when they trust themselves, and then you will rest."),
        fr("sh2-op-e3", "Dim the room a little, {name}, and let your breathing settle. It is late evening in this story, and tomorrow the life you wrote down takes a real step forward. Notice how ready you already are. Notice how little there is left to do."),
        fr("sh2-op-e4", "You can stop for tonight, {name}. In a moment you will be on a different evening, the one before a day that matters. The nerves are there, humming away. So is something steadier underneath them, and that steadier thing is what this story is about."),
        fr("sh2-op-e5", "Minds like to rehearse at night, {name}. Tonight, give yours something good to rehearse. Somewhere ahead of you, the evening before a big day is unfolding in a quiet room. You are invited in, and you can stay as long as you like."),
      ],
    },
    sensory: [
      fr("sh2-se1", "A single lamp is on, and it makes a warm circle on the table. Outside, the street has gone quiet except for a bus sighing at the stop. You can hear a clock somewhere, or maybe your own pulse. Either way, it is steady. You listen to it for a while and let it slow you down."),
      fr("sh2-se2", "The window is open a crack, and the air coming in is cool and smells of rain on its way. Far off, a dog barks twice and settles. You pull a blanket around your shoulders and listen to the evening wind down. One sound at a time, it goes almost silent."),
      fr("sh2-se3", "The washing up is done and drying on the rack. The dark window shows you a faint reflection of the room, and of you in it. You look at that reflection a second longer than usual. The person in it looks tired in a good way, and ready, and steadier than you remember."),
      fr("sh2-se4", "The kitchen still smells of something warm you ate an hour ago. A car passes, and its headlights slide across the ceiling before the room goes dim again. You stretch until something in your back gives a small, satisfying click. Then you sit very still and enjoy having nothing left to do."),
      fr("sh2-se5", "Somewhere upstairs, a neighbour is playing the piano badly and happily, the same few bars over and over. You find you do not mind. The radiator clicks as it cools. Your hands are warm, and your breathing has slowed without you asking it to."),
    ],
    reflection: [
      fr("sh2-re1", "You notice the nerves and you let them stay. They are only what caring feels like the night before. Underneath them sits something steadier. Everything {desire.np} needed from you, you have given. You feel {feeling} in a place the nerves cannot reach, and you rest your attention there."),
      fr("sh2-re2", "You run through tomorrow once in your head, start to finish, and then you put it down. Too much rehearsing wears the edges off. You know enough, and you have known it for a while. The person who first wrote {desire.quote} would hardly believe how {feeling} you feel tonight."),
      fr("sh2-re3", "Readiness turns out to be quieter than you pictured. There is no drumroll. There is only a sense that whatever tomorrow brings, you will meet it as yourself. That is what all the small steps toward {desire.np} were building, all along. You feel {feeling}, and steady with it."),
      fr("sh2-re4", "There was a time when the night before anything big meant lying awake, rehearsing every way it could go wrong. Tonight your mind wanders somewhere kinder. It keeps returning to everything that led to {desire.np}, every small and unglamorous step. Each time it does, you feel {feeling}."),
      fr("sh2-re5", "Tomorrow you only have to be the person who got this far. That person is enough. It took exactly this person, doubts and all, to get this close to {desire.np}. You feel {feeling}, and a little sleepy, which is exactly right for the night before."),
    ],
    closing: {
      morning: [
        fr("sh2-cl-m1", "Come back to your morning. You just rehearsed a big day, so today is allowed to be a small one. There is a step waiting below that is exactly the right size. Choose it, and let it be the thing you get ready for today."),
        fr("sh2-cl-m2", "Let the evening scene go, {name}, and open your eyes to this one. Carry the calm of that quiet room into your day. Then pick one step below, the kind the person in that story would already have taken."),
        fr("sh2-cl-m3", "One breath for the night before, and one for today. The readiness you felt in that room is yours to use this morning. Find the step under this page that fits your hours. Then give it a time, so it has somewhere to live in your day."),
        fr("sh2-cl-m4", "This is how big days get built: on ordinary mornings, one piece at a time. Stretch, look around the room you are actually in, and choose one piece to carry today. The choices are just below. Pick the one that feels almost too easy."),
        fr("sh2-cl-m5", "Go gently into your day. You do not need to feel ready to take a small step. Readiness tends to arrive after you start, rarely before. The next step is waiting just below, whenever you are, and it is smaller than the nerves will tell you."),
      ],
      evening: [
        fr("sh2-cl-e1", "Let the lamp in that room go out, and let yours go out too when you are ready. Tomorrow in the story will take care of itself. Tonight your only job is rest, and you are good at it. Let the dark come in and settle around you."),
        fr("sh2-cl-e2", "Set down the rehearsal. You know your part. Let your breathing find the slow rhythm of someone who has checked what needed checking and has nothing left to do. Sleep is allowed to come. Let it find you."),
        fr("sh2-cl-e3", "There is nothing more to prepare tonight, {name}. Let your thoughts wander, and do not follow them. Big days are built on good sleep as much as anything else. Let this night be the first part of tomorrow, the quiet part that nobody sees."),
        fr("sh2-cl-e4", "In the story, you switch off the lamp and lie down, and the room goes dark and familiar. Do the same here. Let your hands go loose and your jaw go slack. Whatever tomorrow holds, it can wait until tomorrow. Tonight is only for rest."),
        fr("sh2-cl-e5", "Rest well. If your mind wants to run through it all once more, let it run through the best version. Let it go slowly, and fall asleep somewhere in the middle. You are allowed an easy night, tonight and any night you like."),
      ],
    },
  },

  // III · The Hard Day: something goes wrong and you handle it. Realistic, never catastrophic.
  3: {
    opening: {
      morning: [
        fr("sh3-op-m1", "Good morning, {name}. This chapter is a harder one, on purpose. Even inside the life you want, some days go sideways. Watch how you handle this one. It is worth seeing before your own day begins."),
        fr("sh3-op-m2", "{name}, before the day gets going, here is a different kind of story. Something goes wrong in it. Nobody is in danger and nothing is ruined. It is simply a bad day, and you get to watch the person who meets it."),
        fr("sh3-op-m3", "Sit for a few minutes, {name}. Today’s scene is a hard afternoon in the life you are building. It will not be perfect, and that is the point. The person in it has skills you are already starting to practise."),
        fr("sh3-op-m4", "Morning, {name}. A short story before your day, and this one has a bump in it. Let yourself feel the bump. Then watch what happens next, because what happens next is the reason this chapter exists."),
        fr("sh3-op-m5", "Here is something sturdy to carry into the morning, {name}. The life you want will still have days like this one. What changes is how you meet them. Listen closely, and borrow some of that steadiness for today. You may need less of it than you fear."),
      ],
      evening: [
        fr("sh3-op-e1", "Settle in, {name}. Tonight’s chapter has a hard day in it. You are safe here, and so is the person in the story. Stay with it to the end. The ending is the part you will want to keep."),
        fr("sh3-op-e2", "If your own day was difficult, {name}, this chapter may feel familiar. Something goes wrong in it too. Let your breath slow and come along anyway. You get to watch someone handle it well, and that someone is you, a little further on."),
        fr("sh3-op-e3", "Let the room go quiet, {name}. This is a story about a day that does not go to plan. There is no need to brace for it. Just notice how it unfolds, and how the person at the centre of it stays steady."),
        fr("sh3-op-e4", "Come and rest for a few minutes, {name}. Tonight’s scene is honest: even in the life you are building, things go wrong. What you do next is the interesting part. It is worth falling asleep to."),
        fr("sh3-op-e5", "The day is done, {name}, whatever it held. Get comfortable. In the story you are about to enter, an afternoon has just gone sideways. You are about to find out how much you have grown, and it is more than you think."),
      ],
    },
    sensory: [
      fr("sh3-se1", "Your jaw is tight. You only notice because your teeth ache a little. You unclench, roll your shoulders, and see the tea you made an hour ago going cold beside you. The light in the room has gone flat and grey, the colour of an afternoon that has lost its shape."),
      fr("sh3-se2", "Rain starts against the window, quick and hard, then settles into something steadier. You stretch, and your back reminds you how long you have been hunched over. The air through the gap smells of wet stone and cold leaves. It helps more than it should."),
      fr("sh3-se3", "Your heart is going a little fast. You put a hand flat on the table and feel the cool, solid surface under your palm. Five slow breaths. The fridge hums. Somewhere outside a child is laughing at something, and the world carries on."),
      fr("sh3-se4", "You splash cold water on your face and stay there for a second, dripping, looking at nothing. The towel is rough and smells of soap. When you look up, your reflection seems more tired than worried. Tired is something you can work with. Tired only needs a plan and an early night."),
      fr("sh3-se5", "You step outside for ten minutes. The air is colder than you expected, and it shocks you awake. A bus goes past, full of strangers having their own days, some of them probably worse than yours. By the time you come back in, your breathing has caught up with you."),
    ],
    reflection: [
      fr("sh3-re1", "It is still a bad day. You do not pretend otherwise. What is different is the floor underneath it. Even in the life where {desire.done}, days like this come. This one has edges you can see. You feel tired, and under that, {feeling}. Both of those are true at once."),
      fr("sh3-re2", "This is the part nobody puts in the picture of {desire.np}: the afternoons that go wrong anyway. Here you are, handling one. Imperfectly, and well enough. You notice you feel {feeling}, which is not a word you expected to use on a day like this."),
      fr("sh3-re3", "You think of the person who wrote {desire.quote} and how a day like this would have flattened them. You are bent a little, and annoyed, and still clear about what to do next. You feel {feeling} about that, quietly, without any fuss."),
      fr("sh3-re4", "Hard days used to feel like verdicts, a sign you were never cut out for this. This one feels more like weather. It came in, and it will blow over. You are still on the road toward {desire.np}. You feel {feeling}, a little bruised, and still entirely yourself."),
      fr("sh3-re5", "Steadiness, it turns out, is a skill, and you have been practising it without noticing. Every small step toward {desire.np} trained this exact part of you. You feel the day’s frustration, and you also feel {feeling}. Both are allowed. Neither one gets to run the evening."),
    ],
    closing: {
      morning: [
        fr("sh3-cl-m1", "Come back to your morning, {name}. If today goes sideways, you have just watched yourself handle worse. Keep that picture close. There is one step below, sized for a real day, including a hard one."),
        fr("sh3-cl-m2", "Open your eyes. The hard day in the story ended, the way hard days do. Yours will end too, if it comes. Choose a step below that you could still manage on a bad afternoon, and carry it lightly."),
        fr("sh3-cl-m3", "Take the steadiness with you. It is the most useful thing in this chapter. Your day might be easy or it might not. Either way, the step waiting below is small enough to fit. Pick it, give it a time, and then go."),
        fr("sh3-cl-m4", "Let the scene go and feel where you are: the seat under you, the air on your skin. Today you get to practise what the person in that story already knows. Start with one step from the choices just below."),
        fr("sh3-cl-m5", "That is the chapter. The story leaves some of it unfixed, which is honest. What it gives you is the next move, and the knowledge that you can make one. Make one next move today. The options are waiting under this page."),
      ],
      evening: [
        fr("sh3-cl-e1", "Whatever went wrong today, in the story or in your own life, it can stay outside the door tonight. Let your jaw go loose and your hands fall open. Hard days end. This one has. What is left is the quiet, and the quiet is yours."),
        fr("sh3-cl-e2", "Rest, {name}. You handled it, there and maybe here too. Tomorrow will have its own weather, and you will meet it rested. Let your breath slow until you stop counting it."),
        fr("sh3-cl-e3", "Put the day down gently, like a heavy bag at the end of a long walk. Feel how much lighter your arms are without it. You do not have to solve anything else tonight. Sleep is part of how you handle things. Let it do its work."),
        fr("sh3-cl-e4", "Let the story’s bad afternoon fade behind you. The problem is smaller than it was a few hours ago, and smaller still in the dark, where it can do nothing until morning. You are allowed to rest. You have already done the hard part."),
        fr("sh3-cl-e5", "This is where the hard day ends: in a quiet room, with you intact and a little wiser. That is all a hard day can ask of you. Let it go, one breath at a time, until there is nothing left of it but sleep."),
      ],
    },
  },

  // IV · Someone Notices: another person reflects the change back.
  4: {
    opening: {
      morning: [
        fr("sh4-op-m1", "Good morning, {name}. In this chapter, someone sees you clearly. It might make you blush. Let it. Before your day begins, it helps to remember that change shows on the outside, even on the days you feel it least."),
        fr("sh4-op-m2", "{name}, take a few minutes for this before you head out. Today’s scene is about being noticed. Someone in the story says what they see in you. This time, you get to hear it all the way through without brushing it off."),
        fr("sh4-op-m3", "Morning, {name}. Somewhere in this story, someone looks at you a beat longer than usual and says something true. Listen closely, the way you would to good news. Then take it into your day with you."),
        fr("sh4-op-m4", "Start here, {name}. You have been changing slowly, which makes you the last person to see it. In this chapter, somebody else gets there first, and they are kind enough to say so out loud. All you have to do is let them."),
        fr("sh4-op-m5", "A few quiet minutes before the day, {name}. This chapter has another person in it, someone who knows you well enough to notice when you are different. Let their words land before you decide what you think of them. They might be right."),
      ],
      evening: [
        fr("sh4-op-e1", "Let the evening settle, {name}. Tonight’s chapter has a witness in it: someone who sees what you have been building and says so. Lie back and let yourself be seen for a few minutes. Just listen."),
        fr("sh4-op-e2", "Get comfortable, {name}. In the scene you are entering, somebody notices the change in you before you have said a word about it. It is a small moment, a sentence or two. It stays with you for days."),
        fr("sh4-op-e3", "The day is over, {name}. Here is a gentler thing to end it with: a story in which someone tells you the truth about how far you have come. Let your breathing slow, and listen. They have been wanting to say it for a while."),
        fr("sh4-op-e4", "Close the day, {name}. For once, someone else has been keeping track of your progress, kindly and without you asking. Tonight they tell you what they have seen. All you have to do is listen, and maybe believe them."),
        fr("sh4-op-e5", "Let go of the day, {name}. This story is set somewhere ordinary, and in it, someone you trust says the thing you did not know you needed to hear. Let your breathing slow so you catch every word of it."),
      ],
    },
    sensory: [
      fr("sh4-se1", "Your cheeks go warm. You look down at your hands, then away, then back up. The world is a little loud around you. None of it is loud enough to cover what was just said, and you are glad."),
      fr("sh4-se2", "Somewhere close by, someone laughs at their own joke, and a door bangs shut. The air smells of rain and of someone else’s coffee. You notice you are fiddling with your sleeve. You make your hands be still while your face decides what it is doing."),
      fr("sh4-se3", "There is a pause before you answer, and you let it be a pause. A car goes by outside with its window down, music spilling out and fading. Your shoulders, you realise, have dropped. You are easier in your own skin than you used to be, and it is a relief to notice it."),
      fr("sh4-se4", "The light has the late-afternoon slant that makes everything look kinder. It lands on your hands and warms them. You find yourself smiling before you decide to, and the smile stays longer than you expect. You do not hurry to put it away."),
      fr("sh4-se5", "You become aware of your own voice. It sounds different, lower and slower, in less of a hurry to apologise. Outside, a pigeon complains loudly about something, and you laugh at it, which surprises you. Laughing comes easily to you these days."),
    ],
    reflection: [
      fr("sh4-re1", "The old reflex is right there, ready to call it luck. You let it pass. Hearing it from someone else makes {desire.np} more solid than any amount of hoping ever did. You feel {feeling}, and you do not explain it away."),
      fr("sh4-re2", "Change is hard to see from the inside. You live with yourself every day, so the small shifts blur together. It took someone else to hold up the before and after of {desire.np}. You let it in. You feel {feeling}, and a little shy."),
      fr("sh4-re3", "Being recognised lands differently from being praised. Praise passes. This stays. Someone saw the steady, unglamorous work behind {desire.np}, the part you assumed nobody noticed, and named it. You feel {feeling}, all the way down."),
      fr("sh4-re4", "For a long time you were the only witness to how hard you were trying. You kept going without an audience. And here is someone else who saw it too. The road toward {desire.np} feels lighter for it. You feel {feeling}, and less alone than you have in a while."),
      fr("sh4-re5", "They are describing someone you would once have admired from a distance. It takes a second to understand they mean you. The life where {desire.done} has changed how you carry yourself, and it shows. You feel {feeling}. For once, you decide to agree with them."),
    ],
    closing: {
      morning: [
        fr("sh4-cl-m1", "Bring that moment into your day, {name}. Someone saw you clearly, and it is still true in this room. Choose a step below that the person they described would take without a second thought. Then go and be that person for an hour."),
        fr("sh4-cl-m2", "Nobody’s permission is needed to keep going. Still, it is good to hear. Carry their words like a note folded in your pocket, and take them out whenever the day gets loud. Then pick one step below for today."),
        fr("sh4-cl-m3", "Today, try noticing someone else the way you were noticed. One sentence is enough, said plainly. Somewhere in the day, take the step waiting just below as well. Both are ways of making the change real."),
        fr("sh4-cl-m4", "Come back slowly. Let the warmth of being seen stay a while. The people around you today may notice more than you think. Give them something to see: one small step, chosen from the options under this page."),
        fr("sh4-cl-m5", "Here is the thing about being noticed: it means the change is already visible. Keep going in plain sight. There is a step below, ready for today, and it is smaller than you think. Choose it, and let someone catch you doing it."),
      ],
      evening: [
        fr("sh4-cl-e1", "Let their words be the last thing you think about tonight, {name}. Say them back to yourself once, slowly, the way they said them. Then let them go soft, and let sleep come while they are still warm."),
        fr("sh4-cl-e2", "Rest, and take what they said with you. There is nothing to prove by morning. Let your breath lengthen and let your eyes stay closed. You are allowed to believe them."),
        fr("sh4-cl-e3", "The story ends with someone who sees you. Let that be where you fall asleep. Your body can rest. Your mind can rest. Being seen is a kind of rest too, the kind you did not know you were missing until tonight."),
        fr("sh4-cl-e4", "Let the chapter close, {name}. Picture the person from the story, kind and a little amused, and let them fade into the dark. You are more than you were a year ago, and someone noticed. Sleep on that, and let it sink in."),
        fr("sh4-cl-e5", "Breathe out slowly, and let the noise of the day go with it. Someone noticed. That is enough of a gift for one night. Keep it close, somewhere warm, and let yourself sleep."),
      ],
    },
  },

  // V · The Threshold: the first sixty seconds after the news.
  5: {
    opening: {
      morning: [
        fr("sh5-op-m1", "Good morning, {name}. This chapter is short on time and long on feeling. It covers about one minute, the minute right after the news. Before you start your day, let yourself have it, slowly."),
        fr("sh5-op-m2", "{name}, give yourself a moment before the day. In this story, the news has just arrived. You have sixty seconds before anyone else knows, and you get to spend them however you like. There is no wrong way to spend them."),
        fr("sh5-op-m3", "Morning, {name}. You have probably pictured the news many times, usually in a rush. This chapter slows it right down: the first minute, second by second, as it lands. Give yourself the whole of it before the day begins."),
        fr("sh5-op-m4", "Before you head out, {name}, here is the moment you have been walking toward. It arrives the way real news does: in an ordinary place, at an ordinary time, while your hands are full of something else. Let it catch you a little off guard."),
        fr("sh5-op-m5", "Take a long breath, {name}. The chapter ahead is one minute long in story time. The news has just come in, and everything around you has gone very still. Let your day wait until the minute is over. It will not mind."),
      ],
      evening: [
        fr("sh5-op-e1", "Lie back, {name}. In this chapter the news arrives, and the story stays with you for the minute after it. Let that minute be slow. Let it be yours. Nobody else needs to know about it yet."),
        fr("sh5-op-e2", "Let tonight go still, {name}. Somewhere ahead of you there is a minute you will remember for the rest of your life. You are about to live inside it, slowly, with nothing to do except feel it. Let the room around you go quiet first."),
        fr("sh5-op-e3", "Get comfortable, {name}. This is the threshold: the moment just after you find out. Let your breathing slow, because in the story your heart is about to do the opposite. All you need to do is let it land."),
        fr("sh5-op-e4", "Set the day aside, {name}. The scene ahead is brief and bright. A few words arrive, and then there are sixty seconds in which you are the only person in the world who knows. Lie still, and let those seconds be long."),
        fr("sh5-op-e5", "This one is worth hearing slowly, {name}. Picture yourself somewhere ordinary, busy with something small, with no idea that the next minute is the one you have been waiting for. Let your breathing settle first. Then let it happen."),
      ],
    },
    sensory: [
      fr("sh5-se1", "Your heart is pounding so hard you can hear it in your ears. Your hands go strange and light, as if they belong to someone else. You sit down on the nearest thing without deciding to, and you stay there. The room seems to have gone very far away."),
      fr("sh5-se2", "Everything around you carries on, completely unaware. A tap drips. A car alarm starts and stops two streets over. You realise you have been holding your breath, and it comes out of you all at once, shaky and loud."),
      fr("sh5-se3", "You replay it in your head. Then again, slower, in case the words rearrange themselves. They stay exactly where they are. Somewhere a clock is ticking, absurdly normal, as if nothing has happened. You replay it once more, just because you can."),
      fr("sh5-se4", "Everything goes very sharp and very quiet. You notice ridiculous things: a crumb on the counter, the hum of a light, the exact blue of the sky through the window. You will remember these details for years without trying."),
      fr("sh5-se5", "Heat rushes up your neck and into your face. For a moment your whole body feels unreliable, light and loud at once. You press a hand to your chest and feel how fast everything is moving in there. It is the best kind of chaos you have ever felt."),
    ],
    reflection: [
      fr("sh5-re1", "The news is simple: {desire.done}. It takes a while for the sentence to reach the part of you that has been waiting. When it gets there, something in your chest lets go. You feel {feeling}, so much of it you have to close your eyes."),
      fr("sh5-re2", "You think of every night you wanted this without knowing whether it would come. Every small step. Every not today. All of it was leading to this minute, and to the fact that {desire.done}. You feel {feeling}, and you let yourself cry if you need to."),
      fr("sh5-re3", "Part of you wants to tell everyone at once. Another part wants one more minute, just for you. You choose the minute. You sit with {desire.quote} becoming real, and you feel {feeling} from somewhere very deep. You do not move. You do not need to."),
      fr("sh5-re4", "It feels stranger than you imagined, and better, mostly because it feels like you. Nobody handed you a different life. You walked into this one a step at a time, and the words {desire.quote} describe a fact. You feel {feeling}, right down to your hands."),
      fr("sh5-re5", "You say it out loud, quietly, to test it. It happened. The words sound strange in the air, so you say them again. A minute ago, you were still walking toward {desire.np}. You feel {feeling}. You are on the other side of it."),
    ],
    closing: {
      morning: [
        fr("sh5-cl-m1", "Come back to today, {name}, and bring that minute with you. It is waiting somewhere ahead, and every step shortens the distance. Pick one below and take it before the day gets too busy."),
        fr("sh5-cl-m2", "Open your eyes. The news has not reached this room yet, and that is fine. You know what it will feel like. Go and do one small thing today that the person in that minute would thank you for."),
        fr("sh5-cl-m3", "Let your heartbeat settle. Notice your hands, steady again. You just felt the end of the road. Today is somewhere in the middle of it, and the middle is where the steps are. Choose one below."),
        fr("sh5-cl-m4", "Before the day starts, let yourself feel grateful for something that has not happened yet. It feels odd. Do it anyway. Then pick a step from the options below and give it a time."),
        fr("sh5-cl-m5", "That minute is real enough to remember, which makes it real enough to work toward. Stretch, breathe, and step into your day. The next small move is waiting just below. It will not take long, and it is yours to make."),
      ],
      evening: [
        fr("sh5-cl-e1", "Let the minute go slowly, the way music fades at the end of a song. Your heart can settle. Your hands can rest. You have been to the threshold tonight. You can sleep knowing what waits there."),
        fr("sh5-cl-e2", "That is the moment, {name}. Keep the feeling and let the details blur. Let your breath grow long and even, as if you have just had good news and have all night to enjoy it. In a way, you have."),
        fr("sh5-cl-e3", "Lie still and let it echo. There is nothing to do with the news tonight except feel it. Tomorrow can have the phone calls. Tonight is for you and that one bright minute, and then for sleep."),
        fr("sh5-cl-e4", "Let the story go quiet again. Picture yourself a little later that day, sitting still with your hands in your lap, letting it all settle. Do the same with this day. Put it down gently. Let it be finished. Rest."),
        fr("sh5-cl-e5", "Sleep comes easier after good news. Let it come. You know what the threshold feels like. You can find your way back to it whenever you need to, on any night at all. Goodnight, {name}."),
      ],
    },
  },

  // VI · An Ordinary Day: integration. The dream has become normal life.
  6: {
    opening: {
      morning: [
        fr("sh6-op-m1", "Good morning, {name}. This is the most ordinary chapter in the season, and maybe the most important. Nothing big happens. It is a regular day in the life you wanted, and that is the whole point. Let it be slow."),
        fr("sh6-op-m2", "{name}, before your own day begins, here is another one. It is a day a little further on, so normal you would never think to write it down. Nothing in it is urgent. That is exactly what makes it worth hearing."),
        fr("sh6-op-m3", "Morning, {name}. No big news in this chapter, no turning point. Only the texture of a regular day, once the dream has stopped being a dream and become the place you live. Listen for the small things."),
        fr("sh6-op-m4", "Start the day with something gentle, {name}. The story ahead is about what happens after the big moments, when the thing you wanted becomes part of the furniture. Take your time with it. Nothing in it is in a hurry."),
        fr("sh6-op-m5", "Here is a slow one for the morning, {name}. It follows you through an ordinary day, the kind with errands and lunch and a bit of boredom, inside the life you are building. Nothing in it needs you to be brave. It only needs you to notice."),
      ],
      evening: [
        fr("sh6-op-e1", "Let the evening be easy, {name}. Tonight’s chapter is a regular day, start to finish, in the life you asked for. You may find it comforting how little happens. Let it wash over you like music from another room."),
        fr("sh6-op-e2", "Get comfortable, {name}. Big moments get all the attention. This chapter is about the mornings after them, when the good thing has quietly become normal and nobody remarks on it. It is a lovely place to fall asleep."),
        fr("sh6-op-e3", "Let the day close, {name}. In the scene ahead, nothing needs fixing and nothing needs celebrating. It is a quiet day, and you are living it without thinking about how you got there. Let it carry you for a while."),
        fr("sh6-op-e4", "Let your breathing slow, {name}. This chapter will not ask much of you. It is one ordinary day in a life where the hard part is behind you and the good part has become routine. Routine, here, is a gift."),
        fr("sh6-op-e5", "Settle in, {name}. You are about to spend a day inside the life you described, so settled you hardly notice yourself living it. That is what it looks like when something truly arrives: it stops being an event and becomes a home."),
      ],
    },
    sensory: [
      fr("sh6-se1", "Mid-morning light lies across the floor. Down the street, someone is mowing a small square of lawn. You make a sandwich and eat it at the counter, looking out at nothing much. It tastes fine. Fine is lovely."),
      fr("sh6-se2", "The bus is warm and smells faintly of wet umbrellas. You get a seat by the window and watch the shops slide past. Your thoughts drift, and nothing pulls them back. You let the ride take as long as it takes, and you are almost sorry when your stop comes."),
      fr("sh6-se3", "A clock ticks in another room, and somewhere a neighbour is laughing on the phone. A plant on the windowsill needs water, so you give it some. The afternoon goes slowly, in the good way, like a cat finding a patch of sun."),
      fr("sh6-se4", "You do the washing up with the window open. The water is too hot at first and then just right. Outside, the sky is the flat white of an afternoon that is in no hurry. Neither are you. You dry each cup properly and put it back where it lives."),
      fr("sh6-se5", "You post a letter, buy milk, and call someone back. It is all done by four, without any of it feeling like a task. The light goes amber on the walls, and you notice, with a small jolt, that you have not felt anxious once. Not once, all day."),
    ],
    reflection: [
      fr("sh6-re1", "There was a time when {desire.np} seemed like the answer to everything. Living with it, you know better. It answered some things and left the rest to you, the way real life does. You feel {feeling}, in the low, steady way that lasts."),
      fr("sh6-re2", "Somewhere along the way you stopped noticing it, which is the surprising part. The thing you wanted so badly is simply how your days go. When you do remember that {desire.done}, it comes back softly. You feel {feeling}, like sun coming out on a walk you were already enjoying."),
      fr("sh6-re3", "Underneath the words {desire.quote}, this is what you were asking for all along: days like this one. Unremarkable, unhurried, yours. You feel {feeling}, the way you feel in clothes that finally fit."),
      fr("sh6-re4", "No one is watching and nothing is at stake, and still the day feels good in your hands. The dream behind {desire.np} turned out to be made mostly of afternoons like this. You feel {feeling}, and you do not need it to be more."),
      fr("sh6-re5", "It used to take effort to imagine {desire.np}. These days it would take effort to imagine life without it. You catch yourself feeling {feeling} over something tiny, a good cup of tea or a clear inbox, and you let that be enough."),
    ],
    closing: {
      morning: [
        fr("sh6-cl-m1", "Come back to your own ordinary day, {name}. It is closer to that one than you think. Pick one small step below and slot it in between the errands. That is how ordinary days quietly add up."),
        fr("sh6-cl-m2", "Open your eyes. Today does not have to be special to count. Choose the step below that fits a normal day, and do it the way the person in that story does everything: without much fuss."),
        fr("sh6-cl-m3", "Let the chapter go, and keep its pace. Move through your morning a little slower than usual, as if you had all the time you need. Somewhere in it, between one thing and the next, take the step waiting just below."),
        fr("sh6-cl-m4", "Here is a quiet challenge for today: notice one thing that is already ordinary and good. Name it to yourself. Then take one step toward the rest. The options are under this page, and none of them is big."),
        fr("sh6-cl-m5", "That is a whole day, lived. Yours begins here. Bring that unhurried feeling into it, and give one small step a time and a place. The choices are waiting just below."),
      ],
      evening: [
        fr("sh6-cl-e1", "The ordinary day in the story ends the way good ordinary days do: dishes done, lights going off one by one. Let yours end the same way. Nothing left to do. Nothing left to fix. Let the dark come in, and rest."),
        fr("sh6-cl-e2", "Let the chapter fade, {name}. There is something deeply restful about a day with nothing in it to fix. Hold on to that feeling as you drift, and let sleep take the rest."),
        fr("sh6-cl-e3", "Lie back and feel how little you need to do. The story did not need a big ending, and neither does your evening. Let your breath slow until the day is gone, and all that is left is warmth."),
        fr("sh6-cl-e4", "Picture the end of that ordinary day, the last lamp switched off and the rooms settling. Let your own day settle the same way, slowly and completely, until there is nothing left but breathing and the dark."),
        fr("sh6-cl-e5", "Rest easy. The life you are building does not need you to hold it up tonight. It will still be there, ordinary and good, when you wake. Let your hands go loose and let the day finish without you."),
      ],
    },
  },

  // VII · Becoming: identity, looking back, gratitude.
  7: {
    opening: {
      morning: [
        fr("sh7-op-m1", "Good morning, {name}. This is the last chapter of the season. It looks back as much as forward. Before your day begins, take a few minutes to see who you have become along the way."),
        fr("sh7-op-m2", "{name}, find somewhere quiet for this one. The final chapter of a season belongs to the person at the centre of it. That person is you, a little further on. Let yourself look at them kindly. They have come a long way."),
        fr("sh7-op-m3", "Morning, {name}. At the start of this season you wrote down a wish. This chapter looks back along the whole path from there to here, and at the person who walked it."),
        fr("sh7-op-m4", "Before the day starts, {name}, sit with the end of something. This season of the story is closing. Notice what you are carrying out of it, and how much lighter it is than you feared. Some of it, you can finally put down."),
        fr("sh7-op-m5", "Here is a chapter to begin the day with, {name}: one about becoming. Nothing dramatic happens in it. You simply recognise yourself, maybe for the first time in a while."),
      ],
      evening: [
        fr("sh7-op-e1", "Settle in, {name}. This is the last chapter of the season, and it is a gentle one. Let your breathing slow. Tonight you look back at the whole way you have come."),
        fr("sh7-op-e2", "Let the day end here, {name}. The final chapter is about who you are on the other side of everything. Close your eyes if you like. You know this person better than you think. You have been becoming them for a while."),
        fr("sh7-op-e3", "Get comfortable, {name}. Every season ends with a chapter like this one: quiet, looking back, a little proud. Let your breathing slow, and let yourself have the whole of it without hurrying toward the end. The end will wait."),
        fr("sh7-op-e4", "Leave the day where it is, {name}. In the story you are about to enter, you find yourself somewhere familiar. You realise how much has changed, and that most of it changed in you. Let yourself notice it slowly."),
        fr("sh7-op-e5", "This is a chapter to fall asleep inside, {name}. It is about becoming, the slow kind that happens a day at a time until, one evening, you notice it. Let the room go dark around you first. Then come and look."),
      ],
    },
    sensory: [
      fr("sh7-se1", "The light is long and golden, the kind that comes near the end of a day and makes ordinary things glow. A breeze moves through the trees outside. You can smell the season turning, the faint sharpness that arrives every year around this time."),
      fr("sh7-se2", "Your phone offers you a photo from a year ago, unasked. You almost swipe it away, then stop. The person in it looks younger, more hurried, and braver than you remembered. You look for a long time and smile at them before you put the phone down."),
      fr("sh7-se3", "You are somewhere high enough to see a long way. The wind is cool on your face. From up here, the streets you have walked every day look small and possible, and the sky is enormous. You stay until your hands are cold, and you do not mind at all."),
      fr("sh7-se4", "Evening comes in slowly. The windows across the way light up one at a time, each one a life you will never know. Your own window is lit too. You sit by it, warm, and watch the last blue go out of the sky. Somewhere below, someone is laughing on their way home."),
      fr("sh7-se5", "It is quiet enough to hear the small sounds: your own breathing, a page turning, a clock you had forgotten was there. Your hands are warm around a cup. Your shoulders are low and easy, and they stay that way. There is nowhere else you need to be."),
    ],
    reflection: [
      fr("sh7-re1", "You think of the person who first wrote {desire.quote}. You would like to sit beside them for a minute. You would tell them about all of it: the hard day, the small steps, the people who noticed. You feel {feeling}, and very tender toward them."),
      fr("sh7-re2", "The path to {desire.np} was made of a hundred small steps, most of them taken on ordinary days with nobody watching. You took every one of them yourself. Some were brave, and most were simply stubborn. You feel {feeling}, and it feels earned."),
      fr("sh7-re3", "You used to picture {desire.np} as something to reach. Somewhere along the way it became part of who you are. You are someone who keeps small promises to yourself, even on the days nobody would know. You feel {feeling}, and you need no one to confirm it."),
      fr("sh7-re4", "Gratitude comes up quietly, the way warmth comes back into cold hands. For the people who helped. For the days that went wrong and taught you things. For the stubborn part of you that kept going toward {desire.np}. You feel {feeling}."),
      fr("sh7-re5", "The life where {desire.done} feels like a house you built and moved into, room by room. You know where everything is. You know how you got here, and what each room cost. You feel {feeling}, and steady, and entirely like yourself."),
    ],
    closing: {
      morning: [
        fr("sh7-cl-m1", "Come back to your morning, {name}, and bring the person from that chapter with you. They are not far away. Whatever you do today, do it the way they would: steadily, kindly, and without apology."),
        fr("sh7-cl-m2", "Open your eyes. A season is ending, and you are the reason it happened. Carry that into your day lightly, the way you would carry something precious that is also yours to use. Use it today, on something small."),
        fr("sh7-cl-m3", "Let the chapter go and look around the room you are in. This is where the next season begins: here, today, with you. Take one small, true thing into the morning and do it."),
        fr("sh7-cl-m4", "That is the end of the season’s story, and the start of whatever you write next. Stretch, breathe, and step into the day as the person who came this far. Stand a little taller than yesterday. You have reasons."),
        fr("sh7-cl-m5", "Before you go, say thank you, quietly, to the person who started this season. They did a brave thing without knowing how it would end. Go out into your day and give them something to be proud of."),
      ],
      evening: [
        fr("sh7-cl-e1", "Let the season close gently, {name}. You have nothing left to prove tonight. Let your breath slow and your hands rest. Let yourself fall asleep as the person you have become, and let that person sleep well. They deserve a long, deep night."),
        fr("sh7-cl-e2", "The story pauses here. Let the long light fade from it, and let the dark come in, soft and familiar. You can rest. You have come a long way, and every bit of it was yours."),
        fr("sh7-cl-e3", "Picture the whole season at once, every chapter, like lit windows in a row along a dark street. Then let them go out, one by one, until only the warmth is left. Sleep well, {name}. You walked the whole street."),
        fr("sh7-cl-e4", "Close your eyes on everything you have walked through. The hard day. The quiet day. The day someone noticed. It is all part of you, and none of it needs holding tonight. Let it settle where it belongs. Rest."),
        fr("sh7-cl-e5", "Let gratitude be the last thing you feel today: for the steps, for the people, for yourself. Then let even that go soft, and sleep the deep sleep of someone who kept going. Tomorrow can be the first page of whatever comes next."),
      ],
    },
  },
};
