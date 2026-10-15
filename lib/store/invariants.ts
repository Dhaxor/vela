// checkArcInvariants: the I1–I15 validator (contexts/arc.types.ts). Migration
// output, backup imports and every reducer test run through it. Returns
// human-readable violations; [] means valid. Pure.

import {
  ARC_SCHEMA_VERSION,
  STARS_PER_SEASON,
  stageForCompletedProofs,
  type ArcSnapshot,
  type CheckArcInvariants,
} from "@/contexts/arc.types";
import { STAGE_IDS } from "@/lib/story/content/types";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/u;

export const checkArcInvariants: CheckArcInvariants = (snapshot: ArcSnapshot) => {
  const out: string[] = [];
  const bad = (msg: string) => out.push(msg);
  const { index, chapters: texts } = snapshot;
  if (!index || index.schemaVersion !== ARC_SCHEMA_VERSION) return ["schemaVersion must be 2"];
  const arrays = ["dreams", "chapters", "bridges", "proofs"] as const;
  for (const k of arrays) if (!Array.isArray(index[k])) return [`index.${k} must be an array`];

  const dreams = new Map(index.dreams.map((d) => [d.id, d]));
  const metas = new Map(index.chapters.map((c) => [c.id, c]));
  const bridges = new Map(index.bridges.map((b) => [b.id, b]));
  const proofs = new Map(index.proofs.map((p) => [p.id, p]));
  for (const k of arrays) {
    const ids = index[k].map((r) => r.id);
    if (new Set(ids).size !== ids.length) bad(`duplicate ids in ${k}`);
  }
  for (const rows of [index.chapters, index.bridges, index.proofs]) {
    for (const r of rows) if (!dreams.has(r.dreamId)) bad(`${r.id}: unknown dream ${r.dreamId}`);
  }

  for (const dream of index.dreams) {
    const own = index.chapters.filter((c) => c.dreamId === dream.id);
    // I1
    if (own.length === 0) bad(`I1 dream ${dream.id} has no chapter`);
    if (!own.some((c) => c.season === dream.season)) bad(`I1 dream ${dream.id} has no chapter in its current season`);
    const seasons = new Set(own.map((c) => c.season));
    for (const season of seasons) {
      const inSeason = own.filter((c) => c.season === season).sort((a, b) => a.number - b.number);
      // I2
      inSeason.forEach((c, i) => {
        if (c.number !== c.stage) bad(`I2 chapter ${c.id}: number ${c.number} ≠ stage ${c.stage}`);
        if (!STAGE_IDS.includes(c.stage)) bad(`I2 chapter ${c.id}: stage out of range`);
        if (i > 0 && c.number !== inSeason[i - 1].number + 1) bad(`I2 chapter ${c.id}: numbers not consecutive`);
      });
      // I3: stage = min(loop proofs in the season at write time + 1, 7). Migrated text was staged by the same rule in migrate.
      for (const c of inSeason) {
        if (c.source === "migrated-v1") continue;
        const completed = index.proofs.filter(
          (p) => p.dreamId === dream.id && p.season === season && p.origin !== "onboarding" && p.createdAt <= c.createdAt
        ).length;
        const expected = stageForCompletedProofs(completed);
        if (c.stage !== expected) bad(`I3 chapter ${c.id}: stage ${c.stage}, proofs say ${expected}`);
      }
    }
    // I8 / I9
    const dreamProofs = index.proofs.filter((p) => p.dreamId === dream.id);
    for (const season of new Set(dreamProofs.map((p) => p.season))) {
      const inSeason = dreamProofs.filter((p) => p.season === season).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.starIndex - b.starIndex);
      if (inSeason.length > STARS_PER_SEASON) bad(`I8 dream ${dream.id} season ${season} has ${inSeason.length} stars`);
      inSeason.forEach((p, i) => {
        if (p.starIndex !== i + 1) bad(`I8 proof ${p.id}: starIndex ${p.starIndex}, expected ${i + 1}`);
      });
      if (season > dream.season) bad(`I8 proof in future season ${season}`);
      if (season < dream.season && inSeason.length !== STARS_PER_SEASON) bad(`I9 dream ${dream.id} left season ${season} incomplete`);
      if (inSeason.length === STARS_PER_SEASON && index.bridges.some((b) => b.dreamId === dream.id && b.season === season && b.status === "open")) {
        bad(`I9 complete season ${season} has an open bridge`);
      }
    }
    // I6
    const open = index.bridges.filter((b) => b.dreamId === dream.id && b.status === "open");
    if (open.length > 1) bad(`I6 dream ${dream.id} has ${open.length} open bridges`);
    const latest = [...own].sort((a, b) => a.season - b.season || a.number - b.number).at(-1);
    for (const b of open) if (b.chapterId !== latest?.id) bad(`I6 open bridge ${b.id} is not on the latest chapter`);
    // I13 / I12 are runtime rules; nothing static to check.
  }

  for (const c of index.chapters) {
    // I6: a chapter's bridge points back at it
    if (c.bridgeId) {
      const b = bridges.get(c.bridgeId);
      if (!b) bad(`I6 chapter ${c.id}: unknown bridge ${c.bridgeId}`);
      else if (b.chapterId !== c.id) bad(`I6 chapter ${c.id}: bridge ${b.id} belongs to ${b.chapterId}`);
    }
    // I4: woven both ways
    if (c.wovenProofId) {
      const p = proofs.get(c.wovenProofId);
      if (!p) bad(`I4 chapter ${c.id}: unknown woven proof`);
      else if (p.wovenInChapterId !== c.id) bad(`I4 chapter ${c.id}: proof ${p.id} says woven in ${p.wovenInChapterId}`);
    }
    // I15 + I10
    const text = texts?.[c.id];
    if (!text) {
      bad(`I15 chapter ${c.id} has no text`);
      continue;
    }
    if (text.revision < c.revision) bad(`I10 chapter ${c.id}: text revision ${text.revision} < ${c.revision}`);
    if (text.dreamId !== c.dreamId || text.season !== c.season || text.number !== c.number || text.stage !== c.stage) {
      bad(`I10 chapter ${c.id}: text and index disagree`);
    }
    if ((text.wovenProofId ?? null) !== (c.wovenProofId ?? null)) bad(`I10 chapter ${c.id}: woven proof differs`);
    const paragraphs = [text.opening.morning, ...text.body, text.closing.morning];
    const weaving = paragraphs.filter((p) => p.wovenProofId);
    if (c.wovenProofId && (weaving.length !== 1 || weaving[0].wovenProofId !== c.wovenProofId)) {
      bad(`I4 chapter ${c.id}: ${weaving.length} paragraphs carry the woven proof`);
    }
    if (!c.wovenProofId && weaving.length > 0) bad(`I4 chapter ${c.id}: paragraph weaves a proof the chapter does not`);
  }

  for (const b of index.bridges) {
    // Lapsed bridges may point at chapters 1.0 already deleted (rerolls).
    if (b.status !== "lapsed" && !metas.has(b.chapterId)) bad(`bridge ${b.id}: unknown chapter`);
    if (b.status === "crossed" || b.status === "learned") {
      const p = b.proofId ? proofs.get(b.proofId) : undefined;
      if (!p || p.bridgeId !== b.id) bad(`I7 bridge ${b.id}: proof not linked both ways`);
    } else if (b.proofId) bad(`I7 bridge ${b.id} (${b.status}) carries a proof`);
  }

  for (const p of index.proofs) {
    if (!DATE_KEY.test(p.dateKey)) bad(`I11 proof ${p.id}: bad dateKey`);
    if (p.bridgeId) {
      const b = bridges.get(p.bridgeId);
      if (!b || b.proofId !== p.id) bad(`I7 proof ${p.id}: bridge not linked both ways`);
    }
    if (p.wovenInChapterId) {
      const c = metas.get(p.wovenInChapterId);
      if (!c || c.wovenProofId !== p.id) bad(`I4 proof ${p.id}: chapter does not weave it`);
    } else if (!p.migratedFromV1) {
      // I5: only a season's 7th star waits unwoven, while that season's Chapter VII exists.
      const dream = dreams.get(p.dreamId);
      const hasVII = index.chapters.some((c) => c.dreamId === p.dreamId && c.season === p.season && c.stage === 7);
      if (p.starIndex !== STARS_PER_SEASON || !hasVII || dream?.season !== p.season) bad(`I5 proof ${p.id} is unwoven`);
    }
  }

  // I14
  const live = index.dreams.filter((d) => d.status !== "released");
  if (live.length === 0 && index.activeDreamId !== null) bad("I14 activeDreamId must be null");
  if (live.length > 0) {
    const active = index.activeDreamId ? dreams.get(index.activeDreamId) : undefined;
    if (!active || active.status === "released") bad("I14 activeDreamId must point at a non-released dream");
  }
  return out;
};
