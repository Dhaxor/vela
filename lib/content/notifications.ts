// NOTIFICATION COPY (A4) for the rolling queue (lib/notifications, A6):
// 6 slots × 20. The first 11 of each slot (10 in 'ifthen') are NEUTRAL: no
// personal tokens ({desire.*}, {proof.quote}, {bridge.quote}, {ifthen.*}), so
// the default 'Keep my words off the Lock Screen' setting still gets variety.
// The rest quote the user's own words. A6 skips any template whose tokens have
// no value or whose filled title/body exceed 40/120 characters, so quote-heavy
// templates fall back to shorter ones for long desires.
// Tone: an invitation, never a debt. No guilt, loss, urgency or streak framing;
// 'quiet-return' welcomes, it never counts what was skipped. Slots fire at
// either ritual time, so no copy says 'tonight' or 'this morning'.
// Count tokens ({proofs.*}, {nights.*}) only exist from 2 up: always plural.
// In 'ledger', {proofs.*} counts this week's proofs.
// STYLE HEADER (binding for every content file; full guide: docs/CONTRACTS.md §7–§8)
// - Original prose only. Second person, present tense. Never 'I' in narration.
// - Template sentences ≤ 24 words (each {token} counts as one word). No parentheses,
//   abbreviations or '&'. Curly quotes only. At most one em dash per fragment.
// - No 'not X but Y'. Nothing from BANNED_PHRASES in lib/story/content/types.ts: no 'future self', no
//   moon or astrology, no weekdays, no health or money guarantees, no stock LLM words.
// - No gendered pronouns for other people. Never assume a body, gender or relationship:
//   a line that assumes a partner, child, boss or client declares `requires: [flag]`.
// - Only the tokens ALLOWED_TOKENS permits for this content kind. Never start a sentence
//   with a lowercase-valued token ({desire.np}, {desire.done}, {proof.done}, {feeling}…).
// - Ids are permanent once shipped: never rename, never reuse. Prefixes: CONTRACTS.md §7.2.
// - Self-check: bun test lib/story/content

import type { ContentStatus, NotificationLibrary, NotificationTemplate } from "@/lib/story/content/types";

export const STATUS: ContentStatus = "final";

const nt = (id: string, title: string, body: string): NotificationTemplate => ({ id, title, body });

export const NOTIFICATIONS: NotificationLibrary = {
  // At ritual time, an unheard chapter is waiting.
  "ritual-chapter": [
    nt("nt-rc1", "Chapter {chapter.numeral} is waiting", "{chapter.title} is ready for you, {name}. A few quiet minutes, whenever you like."),
    nt("nt-rc2", "Your chapter is ready", "Find somewhere comfortable, {name}. Chapter {chapter.numeral} begins when you press play."),
    nt("nt-rc3", "{stage.name}", "Chapter {chapter.numeral} of your season is here. Settle in when you’re ready."),
    nt("nt-rc4", "It’s {ritual.time}, {name}", "Your chapter is ready, and so is the quiet. Press play whenever you like."),
    nt("nt-rc5", "The next part of your story", "Chapter {chapter.numeral} picks up where you left off. It’s ready when you are."),
    nt("nt-rc6", "Press play, {name}", "{chapter.title} is waiting. Headphones optional, eyes closed recommended."),
    nt("nt-rc7", "Chapter {chapter.numeral} · {stage.name}", "Your next scene is written and waiting. Step into it whenever you’re ready."),
    nt("nt-rc8", "Your story kept going", "Chapter {chapter.numeral} is here, {name}. Find a quiet corner and listen."),
    nt("nt-rc9", "A few minutes, just for you", "{chapter.title}. Chapter {chapter.numeral} of your season, ready when you are."),
    nt("nt-rc10", "Ready for Chapter {chapter.numeral}?", "You’ve shown up for {nights.phrase}. Here is the next scene, {name}."),
    nt("nt-rc11", "Your scene is set", "Dim the lights if you like. Chapter {chapter.numeral} is ready to be heard."),
    nt("nt-rc12", "Chapter {chapter.numeral} is ready", "You wrote {desire.quote}. The next scene is waiting for you, {name}."),
    nt("nt-rc13", "Your story, in your words", "{desire.quote} continues in Chapter {chapter.numeral}. Press play when you’re ready."),
    nt("nt-rc14", "{chapter.title}", "A few minutes with the life you described: {desire.quote}."),
    nt("nt-rc15", "Step back into the story", "Chapter {chapter.numeral} takes you a little closer to {desire.np}."),
    nt("nt-rc16", "It begins with you", "You wrote {proof.quote} {proof.ago}. Chapter {chapter.numeral} is ready."),
    nt("nt-rc17", "{name}, your chapter", "The life in {desire.quote} has a new scene. Chapter {chapter.numeral} is ready."),
    nt("nt-rc18", "Ready when you are", "{chapter.title}: the next scene of {desire.quote}. A few quiet minutes, {name}."),
    nt("nt-rc19", "Your next scene", "One more chapter of {desire.np}, written for you. Press play when you’re settled."),
    nt("nt-rc20", "Back inside it", "Chapter {chapter.numeral} of {desire.quote} is waiting, {name}."),
  ],
  // At ritual time, today's bridge is still open.
  "ritual-bridge": [
    nt("nt-rb1", "Your bridge is waiting", "One small step, then one sentence about it. Your next chapter grows from that, {name}."),
    nt("nt-rb2", "One step, any size", "Did you cross today’s bridge? Tell Vela in one sentence. A smaller step counts too."),
    nt("nt-rb3", "How did it go, {name}?", "Crossed it, moved toward it, or learned something? Each one becomes a star."),
    nt("nt-rb4", "Your next chapter is listening", "Whatever you did today, write it in one line. The next chapter is woven from it."),
    nt("nt-rb5", "A star is waiting", "Log what you did today, {name}, even if it was small. It becomes part of your sky."),
    nt("nt-rb6", "Not today? That counts too", "If the bridge didn’t happen, tell Vela what you learned. It still becomes a star."),
    nt("nt-rb7", "It’s {ritual.time}", "Time to look back at today’s bridge, {name}. One honest sentence is enough."),
    nt("nt-rb8", "Small steps make stars", "You have {proofs.phrase} so far. Add today’s, however it went."),
    nt("nt-rb9", "Close the loop, {name}", "Write one line about today’s step. Your story picks up from there."),
    nt("nt-rb10", "One line, one star", "However today went, there’s a star in it, {name}. Tap to tell Vela."),
    nt("nt-rb11", "Your sky has room for one more", "Tell Vela what you did toward your dream today. One line is plenty."),
    nt("nt-rb12", "Today’s bridge", "{bridge.quote}. Did it happen? One sentence turns it into a star, {name}."),
    nt("nt-rb13", "Did you cross it?", "You chose {bridge.quote}. Tell Vela how it went, in your own words."),
    nt("nt-rb14", "One step closer", "A step toward {desire.np} is waiting to be counted. How did today go, {name}?"),
    nt("nt-rb15", "Your bridge, in your words", "{bridge.quote}. Crossed, started or learned from? Each one counts."),
    nt("nt-rb16", "{name}, how did it go?", "Today’s bridge was {bridge.quote}. Even half of it is a star."),
    nt("nt-rb17", "Toward {desire.quote}", "Today’s small step is waiting for its sentence. Tell Vela what happened."),
    nt("nt-rb18", "Your next scene starts here", "Write what happened with {bridge.quote}. Your next chapter grows from it."),
    nt("nt-rb19", "Your thread continues", "You wrote {proof.quote} {proof.ago}. What did today bring?"),
    nt("nt-rb20", "A step toward it", "Every bridge brings {desire.np} a little closer. Tell Vela how this one went."),
  ],
  // At the bridge's remindAt: the if-then cue the user set.
  ifthen: [
    nt("nt-if1", "This is the moment you planned", "You set this reminder for today’s bridge. Make the first move, {name}. Just the first one."),
    nt("nt-if2", "Your cue, {name}", "This is when you said you’d start. Open the bridge and take the first small move."),
    nt("nt-if3", "Right on time", "You planned this minute for your bridge. Thirty seconds of starting is enough to count."),
    nt("nt-if4", "The first move is small", "You decided this earlier. Do the first tiny part of it, and let the rest follow."),
    nt("nt-if5", "Here’s your nudge", "As promised, a gentle tap on the shoulder. Today’s bridge starts with one small move."),
    nt("nt-if6", "It’s time, gently", "The plan you made for your bridge begins about here. Start smaller than you think."),
    nt("nt-if7", "You asked for this reminder", "So here it is, {name}. One small move toward today’s bridge, then see how you feel."),
    nt("nt-if8", "Starting is the whole trick", "Your bridge is waiting for its first minute. Give it that, and you’ve begun."),
    nt("nt-if9", "A kind reminder", "This is the cue you chose. Begin the bridge, or begin a smaller piece of it."),
    nt("nt-if10", "This minute is yours", "You set it aside for your bridge, {name}. Take the first step while it’s easy."),
    nt("nt-if11", "It’s {ifthen.when}", "First move: {ifthen.then}. That’s all, {name}. The rest can follow."),
    nt("nt-if12", "You said {ifthen.when}", "Here it is. First move: {ifthen.then}."),
    nt("nt-if13", "Your cue: {ifthen.when}", "If you hesitate, {ifthen.then}. Just that one move."),
    nt("nt-if14", "Today’s bridge", "{bridge.quote}. It starts with this: {ifthen.then}."),
    nt("nt-if15", "The moment you chose", "It’s {ifthen.when}. You said you would {ifthen.then}. Small and doable."),
    nt("nt-if16", "{name}, it’s time", "Your first move: {ifthen.then}. It’s a step toward {desire.np}."),
    nt("nt-if17", "Just the first move", "Nothing more than this: {ifthen.then}. Then decide what’s next."),
    nt("nt-if18", "You made a plan", "When it’s {ifthen.when} and you hesitate, you {ifthen.then}. This is that moment."),
    nt("nt-if19", "One move toward it", "First move: {ifthen.then}. You planned it, {name}. It’s yours to take."),
    nt("nt-if20", "Your bridge, right on cue", "{bridge.quote} begins with one move: {ifthen.then}."),
  ],
  // A chapter woven from today's proof, saved for ritual time.
  "next-woven": [
    nt("nt-nw1", "Chapter {chapter.numeral} is ready", "It begins with what you did. Whenever you are ready, {name}."),
    nt("nt-nw2", "You changed the story", "Your proof is woven into Chapter {chapter.numeral}. Come and hear it, {name}."),
    nt("nt-nw3", "Woven from your proof", "Chapter {chapter.numeral} was written from what you did {proof.ago}. It’s waiting for you."),
    nt("nt-nw4", "{chapter.title}", "A new chapter, built from your own step. Listen for your words in gold."),
    nt("nt-nw5", "Your words are in it", "Chapter {chapter.numeral} carries a line you wrote. Find it, {name}."),
    nt("nt-nw6", "Saved for {ritual.time}", "As promised, Chapter {chapter.numeral} is here. It starts with you."),
    nt("nt-nw7", "The next scene is yours", "What you did became Chapter {chapter.numeral}. Press play when you’re settled."),
    nt("nt-nw8", "A chapter with you in it", "{chapter.title} is woven from your proof. Settle in, {name}."),
    nt("nt-nw9", "Here’s what your step became", "Chapter {chapter.numeral}: {stage.name}. Your proof is inside, glowing gold."),
    nt("nt-nw10", "Your step became a chapter", "Chapter {chapter.numeral} is ready, and it starts where you left off."),
    nt("nt-nw11", "Star by star", "Your sky holds {proofs.phrase}. The newest one opens Chapter {chapter.numeral}."),
    nt("nt-nw12", "Chapter {chapter.numeral} remembers", "You wrote {proof.quote}. It’s part of the story, in gold."),
    nt("nt-nw13", "It begins with your words", "{proof.quote}. That’s how Chapter {chapter.numeral} starts. Ready when you are."),
    nt("nt-nw14", "Woven in gold", "{proof.quote} is part of {chapter.title}. Come and hear it, {name}."),
    nt("nt-nw15", "Your proof, your chapter", "You wrote {proof.quote} {proof.ago}. Chapter {chapter.numeral} was built from it."),
    nt("nt-nw16", "A step closer, in writing", "Chapter {chapter.numeral} brings {desire.np} a little closer. Your proof is inside."),
    nt("nt-nw17", "Listen for your sentence", "Somewhere in Chapter {chapter.numeral} is {proof.quote}. It glows gold."),
    nt("nt-nw18", "From your words to the story", "{proof.quote} became the start of {chapter.title}."),
    nt("nt-nw19", "The story heard you", "You wrote {proof.quote}, and the story answered. Chapter {chapter.numeral} is ready."),
    nt("nt-nw20", "Ready, {name}", "Chapter {chapter.numeral} of {desire.quote} is woven from your proof."),
  ],
  // The weekly Proof Ledger is ready ({proofs.*} = this week's proofs).
  ledger: [
    nt("nt-lg1", "Your week in stars", "This week’s Proof Ledger is ready, {name}. Come and see what you did."),
    nt("nt-lg2", "This week: {proofs.phrase}", "Your Proof Ledger is ready. Every one of them was real."),
    nt("nt-lg3", "Look what you did", "Your week, written in your own words. The Proof Ledger is ready, {name}."),
    nt("nt-lg4", "A week of proof", "You added {proofs.phrase} to your sky this week. Take a minute to look back."),
    nt("nt-lg5", "The ledger is in", "Did, moved, learned: your week, counted kindly. Open it when you like."),
    nt("nt-lg6", "Before the new week", "Look back at {proofs.phrase} from this week, then choose next week’s first bridge."),
    nt("nt-lg7", "Your week, remembered", "Vela kept every step you logged this week. The ledger is ready, {name}."),
    nt("nt-lg8", "Stars from this week", "This week gave your sky {proofs.phrase}. Come and see them together."),
    nt("nt-lg9", "A quiet look back", "Five minutes with your week’s proofs is a lovely way to begin the next one."),
    nt("nt-lg10", "Every step counted", "Small or brave, every proof from this week is in your ledger, {name}."),
    nt("nt-lg11", "{name}, your ledger", "This week you logged {proofs.phrase}. The ledger is ready to read."),
    nt("nt-lg12", "Your sentence of the week", "This week you wrote {proof.quote}. See it beside the rest in your ledger."),
    nt("nt-lg13", "This week, toward it", "This week moved you toward {desire.np}. Your ledger shows every step."),
    nt("nt-lg14", "Proof, in your own words", "{proof.quote}, and everything else you did this week. Your ledger is ready."),
    nt("nt-lg15", "Steps toward {desire.quote}", "This week you added {proofs.phrase}. Each one is in your ledger, {name}."),
    nt("nt-lg16", "What the week held", "{proof.quote} was one of them. Open your ledger to see the whole week."),
    nt("nt-lg17", "For the life you described", "This week brought {proofs.phrase} toward {desire.quote}. Take a look."),
    nt("nt-lg18", "Real steps, real week", "Every step this week moved toward {desire.np}. See them all in your ledger."),
    nt("nt-lg19", "Your week, quoted", "Your ledger quotes you back, starting with {proof.quote}."),
    nt("nt-lg20", "{name}, look back", "You wrote {proof.quote} {proof.ago}. Your whole week is in the ledger."),
  ],
  // After several quiet days. A welcome, never a reckoning.
  "quiet-return": [
    nt("nt-qr1", "Your sky kept your place", "Nothing to catch up on, {name}. Your story is right where you left it."),
    nt("nt-qr2", "Welcome back, whenever", "Rest is part of it. Your next chapter waits, unhurried."),
    nt("nt-qr3", "Still here, still yours", "Your chapters and stars are safe. Come back for three quiet minutes when you like."),
    nt("nt-qr4", "No rush at all", "Life gets full. When you have a moment, your story is ready to pick up again."),
    nt("nt-qr5", "Hello, {name}", "Just a soft hello. Your sky is still lit, and nothing has been taken away."),
    nt("nt-qr6", "Your story is patient", "Chapter {chapter.numeral} is where you left it. Step back in whenever you’re ready."),
    nt("nt-qr7", "One small step is enough", "If today has room for one tiny bridge, it counts as a star."),
    nt("nt-qr8", "Pick up where you left off", "{chapter.title} is waiting, {name}. No catching up, just the next scene."),
    nt("nt-qr9", "Quiet days are rest", "You’ve shown up for {nights.phrase} so far. Your sky remembers every one."),
    nt("nt-qr10", "Your sky, glowing", "Every star you made is still there, {name}. Come and look whenever you like."),
    nt("nt-qr11", "A gentle hello", "Three quiet minutes with your story might be just the thing today."),
    nt("nt-qr12", "Your words are still here", "You wrote {desire.quote}. It’s still the story, and it’s still yours."),
    nt("nt-qr13", "Still on its way", "{desire.quote} is waiting for its next chapter. Come back when you can, {name}."),
    nt("nt-qr14", "Your last step", "You wrote {proof.quote} {proof.ago}. That still counts, and so will the next one."),
    nt("nt-qr15", "Remember this one?", "{proof.quote}. You did that. Your story is ready for the next part."),
    nt("nt-qr16", "The life you described", "{desire.quote} hasn’t gone anywhere. One small step, whenever you’re ready."),
    nt("nt-qr17", "Your bridge can wait", "{bridge.quote} is open, no pressure. Or choose a smaller step today."),
    nt("nt-qr18", "A smaller step, maybe?", "If {bridge.quote} feels big, try a two-minute piece of it."),
    nt("nt-qr19", "Back to your story", "Your next scene of {desire.quote} is ready, {name}. No catching up needed."),
    nt("nt-qr20", "Your sky remembers", "Your sky holds {proofs.phrase} toward {desire.np}. Every one still shines."),
  ],
};
