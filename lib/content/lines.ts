// YOUR LINES (A4): first-person identity lines born from proof, kind × focus × 6.
// They lead the daily line once the user has a proof of that kind, so each one
// names who the person is becoming through what they DID ('did'), the partial
// step they took ('moved') or what a hard moment taught them ('learned').
// Token-free and short enough to carry in one breath. The 1.0 affirmation
// library (lib/affirmations.ts) is deliberately not grown.
// STYLE HEADER (binding for every content file; full guide: docs/CONTRACTS.md §7–§8)
// - Original prose only. First person is allowed here (and in 3·6·9 frames) only.
// - Template sentences ≤ 24 words (each {token} counts as one word). No parentheses,
//   abbreviations or '&'. Curly quotes only. At most one em dash per fragment.
// - No 'not X but Y'. Nothing from BANNED_PHRASES in lib/story/content/types.ts: no 'future self', no
//   moon or astrology, no weekdays, no health or money guarantees, no stock LLM words.
// - No gendered pronouns for other people. Never assume a body, gender or relationship.
// - Ids are permanent once shipped: never rename, never reuse. Prefixes: CONTRACTS.md §7.2.
// - Self-check: bun test lib/story/content

import type { ContentStatus, Fragment, IdentityLines } from "@/lib/story/content/types";

export const STATUS: ContentStatus = "final";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const IDENTITY_LINES: IdentityLines = {
  did: {
    love: [
      fr("yl-d-lo1", "I am someone who says the warm thing out loud."),
      fr("yl-d-lo2", "I show up for the people I love, in small ways, on ordinary days."),
      fr("yl-d-lo3", "I reach out first, and I don’t keep score."),
      fr("yl-d-lo4", "I make room in my life for love, and I mean it."),
      fr("yl-d-lo5", "I am someone who makes the plan, sends the message and turns up."),
      fr("yl-d-lo6", "Love is something I do, with my time and my attention."),
    ],
    abundance: [
      fr("yl-d-ab1", "I am someone who looks at the numbers and stays calm."),
      fr("yl-d-ab2", "I take care of my money the way I take care of things I love."),
      fr("yl-d-ab3", "I ask for what my work is worth."),
      fr("yl-d-ab4", "I make one good money decision at a time, and they add up."),
      fr("yl-d-ab5", "I pay myself first, before anything else gets a say."),
      fr("yl-d-ab6", "I open the envelope, read the statement and handle it."),
    ],
    career: [
      fr("yl-d-ca1", "I am someone who ships before I’m ready."),
      fr("yl-d-ca2", "I finish things, and I put my name on them."),
      fr("yl-d-ca3", "I do the work on the days nobody is watching."),
      fr("yl-d-ca4", "I am someone who sends the email, makes the call and asks the question."),
      fr("yl-d-ca5", "My work is out in the world because I let it go."),
      fr("yl-d-ca6", "I start before I feel ready, and I get ready by starting."),
    ],
    health: [
      fr("yl-d-he1", "I keep the small promises I make to my body."),
      fr("yl-d-he2", "I am someone who goes to bed when I said I would."),
      fr("yl-d-he3", "I move because it feels good, and my body answers."),
      fr("yl-d-he4", "I book the appointment, drink the water and take the rest."),
      fr("yl-d-he5", "I treat my body like someone I love."),
      fr("yl-d-he6", "I am someone who chooses energy, one ordinary choice at a time."),
    ],
    confidence: [
      fr("yl-d-co1", "I act before the doubt finishes talking."),
      fr("yl-d-co2", "I say what I mean, once, and let it stand."),
      fr("yl-d-co3", "I am someone who takes up room without apologising."),
      fr("yl-d-co4", "My voice shakes sometimes, and I use it anyway."),
      fr("yl-d-co5", "I ask for what I want, plainly."),
      fr("yl-d-co6", "I do brave things in small sizes, every day."),
    ],
    peace: [
      fr("yl-d-pe1", "I am someone who makes room to breathe."),
      fr("yl-d-pe2", "I protect my mornings, and my mornings protect me."),
      fr("yl-d-pe3", "I say no early, and I say it kindly."),
      fr("yl-d-pe4", "I put the phone down and come back to the room I’m in."),
      fr("yl-d-pe5", "I choose the slower way, and the day goes better for it."),
      fr("yl-d-pe6", "I finish what matters and let the rest wait."),
    ],
  },
  moved: {
    love: [
      fr("yl-m-lo1", "I move toward connection one honest step at a time."),
      fr("yl-m-lo2", "A short message still counts, so I send it."),
      fr("yl-m-lo3", "I am letting people in, a little more each week."),
      fr("yl-m-lo4", "Half a conversation is a beginning, and I began."),
      fr("yl-m-lo5", "Every small kindness I give is love on its way somewhere."),
      fr("yl-m-lo6", "I don’t wait for perfect timing to care about someone."),
    ],
    abundance: [
      fr("yl-m-ab1", "Small amounts add up when I keep moving them."),
      fr("yl-m-ab2", "I am building my safety one transfer at a time."),
      fr("yl-m-ab3", "Slow progress with money is still progress, and I count it."),
      fr("yl-m-ab4", "Every bill I face is one less thing hiding in the dark."),
      fr("yl-m-ab5", "I am someone who walks toward my money, eyes open."),
      fr("yl-m-ab6", "A little set aside today is a little freedom later."),
    ],
    career: [
      fr("yl-m-ca1", "A rough draft still moves the work forward."),
      fr("yl-m-ca2", "I make progress on the hard thing, even when it is a little."),
      fr("yl-m-ca3", "Twenty minutes on the right thing beats a day on the wrong one."),
      fr("yl-m-ca4", "Unfinished is a stage, and I am moving through it."),
      fr("yl-m-ca5", "Every page I write is a page that exists."),
      fr("yl-m-ca6", "I keep the work moving, even when it moves slowly."),
    ],
    health: [
      fr("yl-m-he1", "Some movement counts, every single time."),
      fr("yl-m-he2", "Ten minutes of care is real care, and I take it."),
      fr("yl-m-he3", "I am someone who chooses the small version over nothing at all."),
      fr("yl-m-he4", "My energy is building slowly, and I am patient with it."),
      fr("yl-m-he5", "Every early night is a gift I give the next morning."),
      fr("yl-m-he6", "I am getting a little steadier, week by week."),
    ],
    confidence: [
      fr("yl-m-co1", "I can take a half step and call it progress."),
      fr("yl-m-co2", "I spoke up once today, and the next time will be easier."),
      fr("yl-m-co3", "I am braver than I was last month."),
      fr("yl-m-co4", "Every small yes to myself makes the next one easier."),
      fr("yl-m-co5", "I don’t have to be fearless to keep going."),
      fr("yl-m-co6", "My courage grows each time I spend a little of it."),
    ],
    peace: [
      fr("yl-m-pe1", "Each thing I set down makes the day lighter."),
      fr("yl-m-pe2", "Five calm minutes count, and I took them."),
      fr("yl-m-pe3", "I am slowing down a little more each week."),
      fr("yl-m-pe4", "I noticed the rush and chose to let it pass me by."),
      fr("yl-m-pe5", "Every breath I take on purpose is practice."),
      fr("yl-m-pe6", "My calm is a muscle, and I am building it."),
    ],
  },
  learned: {
    love: [
      fr("yl-l-lo1", "I learn what closeness needs, and I keep learning."),
      fr("yl-l-lo2", "Some doors stay closed, and I keep my heart open anyway."),
      fr("yl-l-lo3", "I know more about what I need from love than I did before."),
      fr("yl-l-lo4", "A hard conversation taught me something, and I am grateful for it."),
      fr("yl-l-lo5", "I can be disappointed and still be loving."),
      fr("yl-l-lo6", "Every connection teaches me how to love better, including the ones that end."),
    ],
    abundance: [
      fr("yl-l-ab1", "Every money lesson makes my next choice clearer."),
      fr("yl-l-ab2", "A mistake with money is information, and I use it."),
      fr("yl-l-ab3", "I learn what works for my money by paying attention to it."),
      fr("yl-l-ab4", "I know my numbers better today than I did yesterday."),
      fr("yl-l-ab5", "A money setback is one chapter, and I write the next one."),
      fr("yl-l-ab6", "I am someone who learns from money instead of hiding from it."),
    ],
    career: [
      fr("yl-l-ca1", "What didn’t work taught me what will."),
      fr("yl-l-ca2", "Every no teaches me something about the right yes."),
      fr("yl-l-ca3", "I treat feedback as a gift, even when it stings."),
      fr("yl-l-ca4", "My first attempt is how I find my better second one."),
      fr("yl-l-ca5", "I learn fast because I start early."),
      fr("yl-l-ca6", "Hard days at work make me better at the work."),
    ],
    health: [
      fr("yl-l-he1", "I listen to my body and adjust."),
      fr("yl-l-he2", "Rest is part of the plan, and I trust it."),
      fr("yl-l-he3", "A low day showed me what my body needs, and I gave it."),
      fr("yl-l-he4", "I am learning my own rhythm, and I respect it."),
      fr("yl-l-he5", "Slowing down is wisdom, and I choose it when I need it."),
      fr("yl-l-he6", "The gentle option is still a choice for my health."),
    ],
    confidence: [
      fr("yl-l-co1", "Trying and learning is how my courage grows."),
      fr("yl-l-co2", "I stumbled, I recovered, and I know I can do it again."),
      fr("yl-l-co3", "An awkward moment is practice, and I practised."),
      fr("yl-l-co4", "I can hear a no and keep my sense of who I am."),
      fr("yl-l-co5", "A mistake in public taught me I can live through one."),
      fr("yl-l-co6", "Every brave attempt teaches me something, whatever the outcome."),
    ],
    peace: [
      fr("yl-l-pe1", "I notice what drains me, and I choose again."),
      fr("yl-l-pe2", "A hard day showed me where my limits are, and I honour them."),
      fr("yl-l-pe3", "I learn calm by practising it on the difficult days."),
      fr("yl-l-pe4", "When I lose my calm, I know the way back."),
      fr("yl-l-pe5", "I am learning which worries are mine to carry."),
      fr("yl-l-pe6", "Overwhelm is a signal, and I listen to it."),
    ],
  },
};
