// Content contract test — the writers' self-check (bun test lib/story/content).
// Owner: A2 (extends it with the golden matrix and the rendered-chapter lint).
//
// Always on: ids, tokens, banned phrases/patterns, sentence length, em dashes,
// sentence-initial tokens, structure. Pool-size targets switch on per file
// when its STATUS becomes 'final'.

import { describe, expect, test } from "bun:test";
import { FOCUS_AREAS } from "@/lib/focus";
import {
  ALLOWED_TOKENS,
  BANNED_IN_NOTIFICATIONS,
  BANNED_PATTERNS,
  BANNED_PHRASES,
  BRIDGES,
  BRIDGE_TIERS,
  CONTENT_STATUS,
  FOCUS_CONTENT,
  IDENTITY_LINES,
  MOTIFS,
  MOTIF_IDS,
  NOTIFICATIONS,
  NOTIFICATION_SLOTS,
  ONBOARDING_CHIPS,
  PERSONAL_TOKENS,
  POOL_TARGETS,
  PROOF_KINDS,
  RITUAL_PROMPTS,
  SHARED_STAGES,
  STAGE_IDS,
  TOKEN_REFERENCE,
  WEAVE,
  WEAVE_POSITIONS,
  WRITING_RULES,
  contentEntries,
  type ContentKind,
  type Token,
} from "./index";

const entries = contentEntries();
const PROSE: ReadonlySet<ContentKind> = new Set<ContentKind>([
  "beat", "weave", "seed", "notToday", "recall", "cumulative", "motifLine", "bridge", "reshape",
  "learnedRetry", "notification", "identityLine", "scriptPrompt", "arcPrompt", "frame369",
]);
/** Tokens whose value starts with a capital letter or a quote mark, so they may open a sentence. */
const SENTENCE_INITIAL_OK: ReadonlySet<string> = new Set([
  "{name}", "{desire.quote}", "{proof.quote}", "{bridge.quote}", "{proof.date}", "{chapter.numeral}",
  "{chapter.title}", "{stage.name}", "{ritual.time}", "{desire.done.i}",
]);

const tokensIn = (text: string): string[] => text.match(/\{[^{}]+\}/g) ?? [];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phraseRe = (p: string) => new RegExp(`(?<![\\p{L}\\p{N}'’])${escapeRe(p)}(?![\\p{L}\\p{N}'’])`, "iu");
const sentences = (text: string) =>
  text.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean);
const templateWords = (sentence: string) =>
  sentence.replace(/\{[^{}]+\}/g, "TOKEN").split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const isFinal = (file: keyof typeof CONTENT_STATUS) => CONTENT_STATUS[file] === "final";

describe("content contract: ids", () => {
  test("every content id is globally unique", () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const e of entries) {
      if (seen.has(e.id)) dupes.push(`${e.id} (${seen.get(e.id)} and ${e.file})`);
      else seen.set(e.id, e.file);
    }
    expect(dupes).toEqual([]);
  });

  test("ids are non-empty and whitespace-free", () => {
    expect(entries.filter((e) => !/^\S+$/u.test(e.id)).map((e) => e.id)).toEqual([]);
  });
});

describe("content contract: tokens", () => {
  test("every {token} exists in TOKEN_REFERENCE", () => {
    const known = new Set(Object.keys(TOKEN_REFERENCE));
    const bad = entries.flatMap((e) => tokensIn(e.text).filter((t) => !known.has(t)).map((t) => `${e.id}: ${t}`));
    expect(bad).toEqual([]);
  });

  test("every text uses only the tokens allowed for its kind", () => {
    const bad = entries.flatMap((e) => {
      const allowed = new Set<string>(ALLOWED_TOKENS[e.kind]);
      return tokensIn(e.text).filter((t) => !allowed.has(t)).map((t) => `${e.id} (${e.kind}): ${t}`);
    });
    expect(bad).toEqual([]);
  });

  test("no sentence starts with a lowercase-valued token", () => {
    const bad = entries
      .filter((e) => PROSE.has(e.kind))
      .flatMap((e) => sentences(e.text).filter((s) => {
        const first = s.match(/^\{[^{}]+\}/u)?.[0];
        return first !== undefined && !SENTENCE_INITIAL_OK.has(first);
      }).map((s) => `${e.id}: ${s}`));
    expect(bad).toEqual([]);
  });

  test("PERSONAL_TOKENS are exactly the tokens marked personal", () => {
    expect(PERSONAL_TOKENS).toContain("{desire.quote}" as Token);
    expect(PERSONAL_TOKENS).toContain("{proof.quote}" as Token);
    expect(PERSONAL_TOKENS).not.toContain("{name}" as Token);
  });
});

describe("content contract: style lint", () => {
  test("no banned phrases", () => {
    const res = BANNED_PHRASES.map((p) => [p, phraseRe(p)] as const);
    const bad = entries.flatMap((e) => res.filter(([, re]) => re.test(e.text)).map(([p]) => `${e.id}: "${p}"`));
    expect(bad).toEqual([]);
  });

  test("no guilt or streak framing in notifications", () => {
    const res = BANNED_IN_NOTIFICATIONS.map((p) => [p, phraseRe(p)] as const);
    const bad = entries
      .filter((e) => e.kind === "notification")
      .flatMap((e) => res.filter(([, re]) => re.test(e.text)).map(([p]) => `${e.id}: "${p}"`));
    expect(bad).toEqual([]);
  });

  test("no banned patterns", () => {
    const res = BANNED_PATTERNS.map((p) => [p.id, new RegExp(p.source, "iu")] as const);
    const bad = entries.flatMap((e) => res.filter(([, re]) => re.test(e.text)).map(([id]) => `${e.id}: ${id}`));
    expect(bad).toEqual([]);
  });

  test(`template sentences stay within ${WRITING_RULES.maxTemplateSentenceWords} words`, () => {
    const bad = entries
      .filter((e) => PROSE.has(e.kind))
      .flatMap((e) => sentences(e.text)
        .filter((s) => templateWords(s) > WRITING_RULES.maxTemplateSentenceWords)
        .map((s) => `${e.id}: ${templateWords(s)} words`));
    expect(bad).toEqual([]);
  });

  test("at most one em dash per text", () => {
    const bad = entries
      .filter((e) => (e.text.match(/—/gu) ?? []).length > WRITING_RULES.maxEmDashesPerFragment)
      .map((e) => e.id);
    expect(bad).toEqual([]);
  });

  test("titles are short, token-free Title Case", () => {
    const bad = entries
      .filter((e) => e.kind === "title")
      .filter((e) => e.text.split(/\s+/u).length > 6 || /[{}]/u.test(e.text) || !/^[A-Z]/u.test(e.text))
      .map((e) => e.id);
    expect(bad).toEqual([]);
  });

  test("bridges are imperative sentences ending with a period", () => {
    expect(BRIDGES.entries.filter((b) => !/^[A-Z].*\.$/u.test(b.text)).map((b) => b.id)).toEqual([]);
  });
});

describe("content contract: structure", () => {
  test("shared stages and every focus cover stages 1–7 with no empty pool", () => {
    for (const s of STAGE_IDS) {
      const sh = SHARED_STAGES[s];
      for (const pool of [sh.opening.morning, sh.opening.evening, sh.sensory, sh.reflection, sh.closing.morning, sh.closing.evening]) {
        expect(pool.length).toBeGreaterThan(0);
      }
      for (const area of FOCUS_AREAS) {
        const st = FOCUS_CONTENT[area.id].stages[s];
        expect(st.arrival.length).toBeGreaterThan(0);
        expect(st.living.length).toBeGreaterThan(0);
        expect(st.titles.length).toBeGreaterThan(0);
      }
    }
  });

  test("every focus has a default Chapter I script", () => {
    for (const area of FOCUS_AREAS) {
      expect(FOCUS_CONTENT[area.id].focus).toBe(area.id);
      expect(FOCUS_CONTENT[area.id].chapterOne.some((s) => s.motifs.length === 0)).toBe(true);
    }
  });

  test("every referenced motif id is defined in MOTIFS", () => {
    const defined = new Set(MOTIFS.map((m) => m.id));
    const refs = [
      ...BRIDGES.entries.flatMap((b) => (b.motif ? [b.motif] : [])),
      ...FOCUS_AREAS.flatMap((a) => FOCUS_CONTENT[a.id].chapterOne.flatMap((s) => s.motifs)),
    ];
    expect(refs.filter((id) => !defined.has(id))).toEqual([]);
    expect(MOTIFS.every((m) => MOTIF_IDS.includes(m.id))).toBe(true);
    expect(new Set(MOTIFS.map((m) => m.id)).size).toBe(MOTIFS.length);
  });

  test("motif keywords are lowercase and motif phrases have no final punctuation", () => {
    for (const m of MOTIFS) {
      expect(m.keywords.every((k) => k === k.toLowerCase() && k.trim() === k && k.length > 0)).toBe(true);
      for (const p of [m.place, ...m.details]) expect(/[.!?]$/u.test(p)).toBe(false);
    }
  });

  test("every focus can offer one bridge per tier", () => {
    for (const area of FOCUS_AREAS) {
      for (const tier of BRIDGE_TIERS) {
        expect(BRIDGES.entries.some((b) => b.focus === area.id && b.tier === tier && !b.motif)).toBe(true);
      }
    }
  });

  test("weave covers every kind × position, and every notification slot has a neutral template", () => {
    for (const k of PROOF_KINDS) for (const p of WEAVE_POSITIONS) expect(WEAVE.woven[k][p].length).toBeGreaterThan(0);
    const personal = new Set<string>(PERSONAL_TOKENS);
    for (const slot of NOTIFICATION_SLOTS) {
      const neutral = NOTIFICATIONS[slot].filter((t) => ![...tokensIn(t.title), ...tokensIn(t.body)].some((x) => personal.has(x)));
      expect(neutral.length).toBeGreaterThan(0);
    }
  });

  test("the six 1.0 feeling ids survive (they are testIDs)", () => {
    const ids = ONBOARDING_CHIPS.feelings.map((f) => f.id);
    for (const id of ["grateful", "peaceful", "alive", "proud", "free", "loved"]) expect(ids).toContain(id);
  });
});

describe("content contract: pool targets (files marked 'final' only)", () => {
  test("final files meet POOL_TARGETS and contain no placeholder text", () => {
    const problems: string[] = [];
    const need = (ok: boolean, msg: string) => { if (!ok) problems.push(msg); };
    const T = POOL_TARGETS;

    for (const e of entries) {
      if (isFinal(e.file) && /placeholder/iu.test(e.text)) problems.push(`${e.id}: placeholder text in a final file`);
    }
    if (isFinal("stages.shared")) {
      for (const s of STAGE_IDS) {
        const sh = SHARED_STAGES[s];
        need(sh.opening.morning.length >= T.shared.openingPerDaypart && sh.opening.evening.length >= T.shared.openingPerDaypart, `shared ${s} opening`);
        need(sh.sensory.length >= T.shared.sensory, `shared ${s} sensory`);
        need(sh.reflection.length >= T.shared.reflection, `shared ${s} reflection`);
        need(sh.closing.morning.length >= T.shared.closingPerDaypart && sh.closing.evening.length >= T.shared.closingPerDaypart, `shared ${s} closing`);
      }
    }
    for (const area of FOCUS_AREAS) {
      if (!isFinal(area.id)) continue;
      for (const s of STAGE_IDS) {
        const st = FOCUS_CONTENT[area.id].stages[s];
        need(st.arrival.length >= T.focus.arrival, `${area.id} ${s} arrival`);
        need(st.living.length >= T.focus.living, `${area.id} ${s} living`);
        need(st.titles.length === T.focus.titles, `${area.id} ${s} titles`);
      }
    }
    if (isFinal("weave")) {
      for (const k of PROOF_KINDS) for (const p of WEAVE_POSITIONS) need(WEAVE.woven[k][p].length >= T.weave.perKindPosition, `weave ${k} ${p}`);
      need(WEAVE.seed.length >= T.weave.seed, "weave seed");
      need(WEAVE.notToday.length >= T.weave.notToday, "weave notToday");
      need(WEAVE.recall.length >= T.weave.recall, "weave recall");
      need(WEAVE.cumulative.length >= T.weave.cumulative, "weave cumulative");
    }
    if (isFinal("bridges")) {
      for (const area of FOCUS_AREAS) {
        const mine = BRIDGES.entries.filter((b) => b.focus === area.id);
        need(mine.length >= T.bridges.perFocus, `bridges ${area.id} count`);
        for (const tier of BRIDGE_TIERS) need(mine.filter((b) => b.tier === tier).length >= T.bridges.minPerTierPerFocus, `bridges ${area.id} ${tier}`);
        need(BRIDGES.reshape[area.id].length >= T.bridges.reshapePerFocus, `reshape ${area.id}`);
      }
      need(BRIDGES.learnedRetry.length >= T.bridges.learnedRetry, "learnedRetry");
    }
    if (isFinal("motifs")) {
      need(MOTIFS.length === T.motifs.archetypes, "motif count");
      for (const m of MOTIFS) {
        need(m.details.length >= T.motifs.details && m.living.length >= T.motifs.living && m.witness.length >= T.motifs.witness, `motif ${m.id}`);
      }
    }
    if (isFinal("notifications")) {
      const personal = new Set<string>(PERSONAL_TOKENS);
      for (const slot of NOTIFICATION_SLOTS) {
        const tpls = NOTIFICATIONS[slot];
        need(tpls.length >= T.notifications.perSlot, `notifications ${slot}`);
        need(tpls.filter((t) => ![...tokensIn(t.title), ...tokensIn(t.body)].some((x) => personal.has(x))).length >= T.notifications.neutralPerSlot, `neutral ${slot}`);
      }
    }
    if (isFinal("lines")) {
      for (const k of PROOF_KINDS) for (const area of FOCUS_AREAS) need(IDENTITY_LINES[k][area.id].length >= T.lines.perKindFocus, `lines ${k} ${area.id}`);
    }
    if (isFinal("prompts")) {
      for (const area of FOCUS_AREAS) {
        need(RITUAL_PROMPTS.script[area.id].length >= T.prompts.scriptPerFocus, `script ${area.id}`);
        need(RITUAL_PROMPTS.frames369[area.id].length >= T.prompts.frames369PerFocus, `369 ${area.id}`);
      }
      need(RITUAL_PROMPTS.scriptArc.length >= T.prompts.scriptArc, "scriptArc");
      need(RITUAL_PROMPTS.gratitude.length >= T.prompts.gratitude, "gratitude");
    }
    if (isFinal("chips")) {
      for (const area of FOCUS_AREAS) need(ONBOARDING_CHIPS.desires[area.id].length >= T.chips.desiresPerFocus, `chips ${area.id}`);
      need(ONBOARDING_CHIPS.feelings.length >= T.chips.feelings, "feelings");
    }
    expect(problems).toEqual([]);
  });
});
