// SHAPE CHECKS for arc data that crosses a trust boundary: a backup file the
// user picked, and the stored index read at launch. checkArcInvariants checks
// ids and links (I1–I15) and assumes every field already has its type; a
// hand-edited or damaged file with `constellations: {}` or a paragraph without
// text would pass it and then crash Today on every launch, with Settings (and
// so re-import) out of reach. These checks run first. Pure, never throw.
//
// They accept exactly what Vela writes (the reducer, migration, the engine)
// and nothing looser: every enum, every array, every nullable field. Unknown
// extra fields are allowed (a newer 1.1.x may add optional ones).

import { ARC_SCHEMA_VERSION } from "@/contexts/arc.types";
import { FOCUS_AREAS } from "@/lib/focus";

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNullStr = (v: unknown) => v === null || typeof v === "string";
const isNullId = (v: unknown) => v === null || isId(v);
const isInt = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const strArray = (v: unknown) => Array.isArray(v) && v.every(isStr);
const oneOf = (values: readonly string[]) => (v: unknown) => typeof v === "string" && values.includes(v);

const FOCUS = oneOf(FOCUS_AREAS.map((f) => f.id));
const DREAM_STATUS = oneOf(["active", "resting", "released"]);
const SOURCE = oneOf(["engine", "chapter-one", "migrated-v1"]);
const TIER = oneOf(["2min", "15min", "brave", "own"]);
const BRIDGE_STATUS = oneOf(["open", "crossed", "learned", "lapsed"]);
const KIND = oneOf(["did", "moved", "learned"]);
const ORIGIN = oneOf(["onboarding", "bridge", "not-today"]);
const SPAN_KIND = oneOf(["desire", "proof", "name"]);

type Rule = readonly [field: string, ok: (v: unknown) => boolean];

function check(row: unknown, label: string, rules: readonly Rule[], out: string[]): void {
  if (!isRec(row)) {
    out.push(`${label} is not an object`);
    return;
  }
  const name = isId(row.id) ? `${label} ${row.id}` : label;
  for (const [field, ok] of rules) if (!ok(row[field])) out.push(`${name}: bad ${field}`);
}

const DREAM: readonly Rule[] = [
  ["id", isId],
  ["focus", FOCUS],
  ["desire", isStr],
  ["feeling", isStr],
  ["label", isNullStr],
  ["createdAt", isStr],
  ["status", DREAM_STATUS],
  ["statusChangedAt", isStr],
  ["season", (v) => isInt(v, 1)],
  ["seasonStartedAt", isStr],
  ["constellations", (v) => Array.isArray(v) && v.every((c) => isRec(c) && isInt(c.season, 1) && isStr(c.name) && isStr(c.namedAt))],
  ["usedIds", strArray],
  ["motifIds", strArray],
];

const CHAPTER_META: readonly Rule[] = [
  ["id", isId],
  ["dreamId", isId],
  ["season", (v) => isInt(v, 1)],
  ["number", (v) => isInt(v, 1)],
  ["stage", (v) => isInt(v, 1, 7)],
  ["title", isStr],
  ["revision", (v) => isInt(v, 1)],
  ["source", SOURCE],
  ["createdAt", isStr],
  ["revisedAt", isNullStr],
  ["wovenProofId", isNullId],
  ["bridgeId", isNullId],
  ["heardAt", isNullStr],
  ["savedForAt", isNullStr],
];

const BRIDGE: readonly Rule[] = [
  ["id", isId],
  ["dreamId", isId],
  ["chapterId", isId],
  ["season", (v) => isInt(v, 1)],
  ["tier", TIER],
  ["libraryId", isNullStr],
  ["text", isStr],
  ["ifThen", (v) => v === null || (isRec(v) && isStr(v.when) && isStr(v.then))],
  ["remindAt", isNullStr],
  ["status", BRIDGE_STATUS],
  ["createdAt", isStr],
  ["resolvedAt", isNullStr],
  ["proofId", isNullId],
];

const PROOF: readonly Rule[] = [
  ["id", isId],
  ["dreamId", isId],
  ["bridgeId", isNullId],
  ["kind", KIND],
  ["text", isStr],
  ["photoUri", isNullStr],
  ["createdAt", isStr],
  ["dateKey", isStr],
  ["wovenInChapterId", isNullId],
  ["starIndex", (v) => isInt(v, 1)],
  ["season", (v) => isInt(v, 1)],
  ["origin", ORIGIN],
  ["migratedFromV1", (v) => v === undefined || v === true],
];

/** Offsets are not bounded by the text length: slicing past the end renders, it never throws. */
function isSpan(v: unknown): boolean {
  return (
    isRec(v) &&
    SPAN_KIND(v.kind) &&
    isInt(v.start, 0) &&
    isInt(v.end, 0) &&
    (v.start as number) <= (v.end as number) &&
    (v.proofId === undefined || isStr(v.proofId))
  );
}

function isParagraph(v: unknown): boolean {
  if (!isRec(v) || !isStr(v.key) || !isStr(v.fragmentId) || !isStr(v.beat) || !isStr(v.text)) return false;
  if (v.wovenProofId !== undefined && !isStr(v.wovenProofId)) return false;
  return Array.isArray(v.spans) && v.spans.every(isSpan);
}

const pairOf = (ok: (v: unknown) => boolean) => (v: unknown) => isRec(v) && ok(v.morning) && ok(v.evening);

const CHAPTER: readonly Rule[] = [
  ["id", isId],
  ["dreamId", isId],
  ["season", (v) => isInt(v, 1)],
  ["number", (v) => isInt(v, 1)],
  ["stage", (v) => isInt(v, 1, 7)],
  ["title", isStr],
  ["revision", (v) => isInt(v, 1)],
  ["writtenAt", isStr],
  ["source", SOURCE],
  ["wovenProofId", isNullId],
  ["opening", pairOf(isParagraph)],
  ["body", (v) => Array.isArray(v) && v.every(isParagraph)],
  ["closing", pairOf(isParagraph)],
  ["wordCount", pairOf(isNum)],
  ["engineVersion", isNum],
  ["usedIds", (v) => v === undefined || strArray(v)],
];

const MAX_REPORTED = 20;

/** Problems with a stored or imported arc index's field types; [] = well-formed. */
export function indexShapeProblems(raw: unknown): string[] {
  const out: string[] = [];
  if (!isRec(raw)) return ["index is not an object"];
  if (raw.schemaVersion !== ARC_SCHEMA_VERSION) return ["schemaVersion must be 2"];
  for (const key of ["dreams", "chapters", "bridges", "proofs"] as const) {
    if (!Array.isArray(raw[key])) return [`index.${key} must be an array`];
  }
  if (!isNullId(raw.activeDreamId)) out.push("bad activeDreamId");
  if (raw.migratedFromV1At !== undefined && !isNullStr(raw.migratedFromV1At)) out.push("bad migratedFromV1At");
  for (const d of raw.dreams as unknown[]) check(d, "dream", DREAM, out);
  for (const c of raw.chapters as unknown[]) check(c, "chapter", CHAPTER_META, out);
  for (const b of raw.bridges as unknown[]) check(b, "bridge", BRIDGE, out);
  for (const p of raw.proofs as unknown[]) check(p, "proof", PROOF, out);
  return out.slice(0, MAX_REPORTED);
}

/** Problems with one chapter text's field types; [] = well-formed. */
export function chapterShapeProblems(raw: unknown): string[] {
  const out: string[] = [];
  check(raw, "chapter text", CHAPTER, out);
  return out.slice(0, MAX_REPORTED);
}

/** Index plus every chapter text (the backup unit); [] = every field has its type. */
export function snapshotShapeProblems(raw: unknown): string[] {
  if (!isRec(raw) || !isRec(raw.chapters)) return ["missing arcs"];
  const out = indexShapeProblems(raw.index);
  for (const [id, text] of Object.entries(raw.chapters)) {
    for (const problem of chapterShapeProblems(text)) out.push(problem);
    if (isRec(text) && text.id !== id) out.push(`chapter text under ${id} carries id ${String(text.id)}`);
    if (out.length >= MAX_REPORTED) break;
  }
  return out.slice(0, MAX_REPORTED);
}
