// The shaper's verb table: about 170 verbs people actually use when they say
// what they want ('open my bakery', 'pay off my debt', 'find my person'),
// each with past, participle and gerund forms. Irregular and doubling forms
// are spelled out; everything else follows the regular rules below.
//
// `habitual` verbs describe an ongoing state or practice, so their completed
// clause stays in the present: 'you live by the sea', 'you earn enough'
// (never 'you lived by the sea', which reads as over).

export interface VerbForms {
  readonly base: string;
  readonly past: string;
  readonly participle: string;
  readonly gerund: string;
  readonly habitual: boolean;
}

function regularPast(base: string): string {
  if (base.endsWith("e")) return `${base}d`;
  if (/[^aeiou]y$/u.test(base)) return `${base.slice(0, -1)}ied`;
  return `${base}ed`;
}

function regularGerund(base: string): string {
  if (base.endsWith("ie")) return `${base.slice(0, -2)}ying`;
  if (/[^eoy]e$/u.test(base) && base !== "be") return `${base.slice(0, -1)}ing`;
  return `${base}ing`;
}

/** Forms of a verb that is not in the table (lowercase word after 'to', 'I'…). */
export function regularForms(base: string): VerbForms {
  const past = regularPast(base);
  return { base, past, participle: past, gerund: regularGerund(base), habitual: false };
}

type Spec = readonly [base: string, past?: string, participle?: string, gerund?: string];

// [base, past?, participle?, gerund?] — omitted forms are regular.
const IRREGULAR: readonly Spec[] = [
  ["be", "was", "been", "being"], ["have", "had", "had", "having"], ["do", "did", "done"],
  ["become", "became", "become"], ["begin", "began", "begun", "beginning"], ["break", "broke", "broken"],
  ["bring", "brought", "brought"], ["build", "built", "built"], ["buy", "bought", "bought"],
  ["catch", "caught", "caught"], ["choose", "chose", "chosen"], ["come", "came", "come"],
  ["draw", "drew", "drawn"], ["drive", "drove", "driven"], ["eat", "ate", "eaten"],
  ["fall", "fell", "fallen"], ["feel", "felt", "felt"], ["find", "found", "found"],
  ["fly", "flew", "flown"], ["forgive", "forgave", "forgiven"], ["get", "got", "got", "getting"],
  ["give", "gave", "given"], ["go", "went", "gone"], ["grow", "grew", "grown"],
  ["hear", "heard", "heard"], ["hold", "held", "held"], ["keep", "kept", "kept"],
  ["know", "knew", "known"], ["lead", "led", "led"], ["leave", "left", "left"],
  ["let", "let", "let", "letting"], ["lose", "lost", "lost"], ["make", "made", "made"],
  ["meet", "met", "met"], ["overcome", "overcame", "overcome"], ["pay", "paid", "paid"],
  ["put", "put", "put", "putting"], ["quit", "quit", "quit", "quitting"], ["read", "read", "read"],
  ["rebuild", "rebuilt", "rebuilt"], ["ride", "rode", "ridden"], ["rise", "rose", "risen"],
  ["run", "ran", "run", "running"], ["say", "said", "said"], ["see", "saw", "seen"],
  ["sell", "sold", "sold"], ["send", "sent", "sent"], ["set", "set", "set", "setting"],
  ["shine", "shone", "shone"], ["show", "showed", "shown"], ["sing", "sang", "sung"],
  ["sit", "sat", "sat", "sitting"], ["sleep", "slept", "slept"], ["speak", "spoke", "spoken"],
  ["spend", "spent", "spent"], ["stand", "stood", "stood"], ["swim", "swam", "swum", "swimming"],
  ["take", "took", "taken"], ["teach", "taught", "taught"], ["tell", "told", "told"],
  ["think", "thought", "thought"], ["throw", "threw", "thrown"], ["understand", "understood", "understood"],
  ["unwind", "unwound", "unwound"], ["wake", "woke", "woken"], ["wear", "wore", "worn"],
  ["win", "won", "won", "winning"], ["write", "wrote", "written"], ["hit", "hit", "hit", "hitting"],
  ["cut", "cut", "cut", "cutting"], ["fight", "fought", "fought"], ["seek", "sought", "sought"],
  // regular verbs whose final consonant doubles
  ["plan", "planned", "planned", "planning"], ["stop", "stopped", "stopped", "stopping"],
  ["shop", "shopped", "shopped", "shopping"], ["travel", "traveled", "traveled", "traveling"],
  ["commit", "committed", "committed", "committing"], ["step", "stepped", "stepped", "stepping"],
  ["ship", "shipped", "shipped", "shipping"], ["jog", "jogged", "jogged", "jogging"],
  ["chat", "chatted", "chatted", "chatting"], ["control", "controlled", "controlled", "controlling"],
  ["admit", "admitted", "admitted", "admitting"], ["drop", "dropped", "dropped", "dropping"],
];

const REGULAR: readonly string[] = [
  "open", "start", "launch", "own", "marry", "move", "visit", "publish", "finish", "complete",
  "graduate", "pass", "earn", "save", "invest", "retire", "land", "scale", "hire", "sign",
  "create", "design", "paint", "perform", "record", "release", "learn", "study", "coach", "help",
  "heal", "recover", "gain", "lift", "train", "walk", "rest", "cook", "bake", "love",
  "trust", "accept", "believe", "change", "improve", "practice", "master", "achieve", "reach", "double",
  "triple", "clear", "eliminate", "reduce", "afford", "provide", "support", "share", "connect", "attract",
  "reconnect", "repair", "restore", "ask", "apply", "interview", "negotiate", "close", "deliver", "expand",
  "relocate", "settle", "rent", "renovate", "decorate", "plant", "adopt", "raise", "welcome", "celebrate",
  "enjoy", "breathe", "meditate", "calm", "slow", "relax", "laugh", "smile", "dance", "explore",
  "discover", "decide", "express", "embrace", "care", "nurture", "protect", "maintain", "stay", "remain",
  "return", "host", "organize", "prepare", "cycle", "climb", "hike", "row", "compete", "qualify",
  "receive", "secure", "sail", "mentor", "volunteer", "donate", "exhibit", "film", "direct", "produce",
  "compose", "tour", "work", "exercise", "manage", "live", "play", "fix", "declutter", "simplify",
  "prioritize", "focus", "worry", "listen", "notice", "thrive", "flourish", "apologize", "reunite", "propose",
  "date", "attend", "join", "need", "pursue", "freelance", "budget", "network", "rebrand", "pivot",
  "journal", "downsize", "upgrade", "bloom", "blossom", "glow", "graduate", "certify", "launch", "stretch",
];

/** Verbs whose completed clause stays present ('you live by the sea'). */
const HABITUAL: ReadonlySet<string> = new Set([
  "be", "have", "own", "live", "feel", "earn", "love", "trust", "know", "believe", "enjoy",
  "wake", "sleep", "work", "exercise", "rest", "eat", "meditate", "manage", "lead", "thrive",
  "flourish", "stay", "remain", "breathe", "laugh", "smile", "relax", "care", "nurture",
  "protect", "maintain", "practice", "spend", "keep", "need", "shine",
]);

/**
 * Words that are verbs AND everyday nouns/adjectives. At the head of a desire
 * they only count as a verb when an object-like word follows ('love myself'
 * is a verb, 'love and a family' is a noun).
 */
export const AMBIGUOUS: ReadonlySet<string> = new Set([
  "love", "travel", "work", "run", "rest", "sleep", "calm", "change", "dream", "start", "smile",
  "laugh", "dance", "design", "plan", "practice", "walk", "swim", "cook", "share", "trust",
  "return", "release", "move", "help", "care", "support", "record", "play", "study", "need",
  "focus", "exercise", "film", "date", "cycle", "row", "tour", "show", "double", "triple",
  "clear", "slow", "ride", "set", "close", "fix", "rise", "fall", "hope", "wish", "drive", "fly",
]);

function build(): ReadonlyMap<string, VerbForms> {
  const map = new Map<string, VerbForms>();
  for (const [base, past, participle, gerund] of IRREGULAR) {
    const reg = regularForms(base);
    map.set(base, {
      base,
      past: past ?? reg.past,
      participle: participle ?? past ?? reg.participle,
      gerund: gerund ?? reg.gerund,
      habitual: HABITUAL.has(base),
    });
  }
  for (const base of REGULAR) {
    if (map.has(base)) continue;
    map.set(base, { ...regularForms(base), habitual: HABITUAL.has(base) });
  }
  return map;
}

/** base → forms. */
export const VERBS: ReadonlyMap<string, VerbForms> = build();

function index(pick: (v: VerbForms) => string): ReadonlyMap<string, VerbForms> {
  const m = new Map<string, VerbForms>();
  for (const v of VERBS.values()) if (!m.has(pick(v))) m.set(pick(v), v);
  return m;
}

const BY_PAST = index((v) => v.past);
const BY_PARTICIPLE = index((v) => v.participle);
const BY_GERUND = index((v) => v.gerund);

export function verbByBase(word: string): VerbForms | undefined {
  return VERBS.get(word.toLowerCase());
}

export function verbByPast(word: string): VerbForms | undefined {
  return BY_PAST.get(word.toLowerCase());
}

export function verbByParticiple(word: string): VerbForms | undefined {
  return BY_PARTICIPLE.get(word.toLowerCase());
}

export function verbByGerund(word: string): VerbForms | undefined {
  return BY_GERUND.get(word.toLowerCase());
}
