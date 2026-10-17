// THE PROOF-STAR SHARE CARD, as data (ELEVATE §0.6, §4 P4).
//
// A 1080×1920 story card: one proof star inside its season's figure, the day
// it was charted and what kind of proof it was. It is drawn in pure SVG by
// components/feature/proof/ShareStarCard from this model, captured with
// react-native-view-shot on iOS and rasterized in the browser on web.
//
// Privacy is the default: the dream (desire) is never on the card, and the
// user's sentence appears only when `includeSentence` is true.
//
// Pure and deterministic: no clock, no locale, no platform. Units are card
// pixels (the image is exported at exactly CARD_WIDTH × CARD_HEIGHT).
import type { ProofKind } from "@/contexts/arc.types";
import { FIGURE_STARS, edgeStep, isPointLit, type Figure } from "@/lib/sky/figures";
import { chartGeometry, fitFigure, type ChartGeometry } from "@/lib/sky/layout";
import { makeStarfield } from "@/lib/sky/starfield";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/** Card typography, in card pixels (the image is a fixed-size asset, not UI). */
export const CARD_TYPE = {
  eyebrow: { size: 30, tracking: 6 },
  title: { size: 84 },
  date: { size: 44 },
  meta: { size: 32 },
  sentence: { size: 50, lineHeight: 70 },
  mark: { size: 30, tracking: 10 },
} as const;

/** The sentence never takes more than this many lines; longer text ends in '…'. */
export const SENTENCE_MAX_LINES = 4;
/** Characters per sentence line (Newsreader Italic at 50px over ~840px, kept short so lines centre well). */
export const SENTENCE_LINE_CHARS = 32;

/** The statement each kind of proof makes, set large on the card. */
export const KIND_STATEMENT: Readonly<Record<ProofKind, string>> = {
  did: "I did it.",
  moved: "Something moved.",
  learned: "I learned something.",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export interface ShareCardInput {
  /** The season's figure (the Vela sail in Season 1). */
  readonly figure: Pick<Figure, "aspect" | "points" | "edges">;
  /** Stars lit in the season when the card is made (1..7). Never fewer than starIndex. */
  readonly lit: number;
  /** kinds[i] is the kind of star i + 1. */
  readonly kinds: readonly (ProofKind | null | undefined)[];
  /** The star being shared, 1..7. */
  readonly starIndex: number;
  readonly kind: ProofKind;
  /** LOCAL date the proof was charted, 'YYYY-MM-DD'. */
  readonly dateKey: string;
  /** The user's sentence. Only drawn when includeSentence is true. */
  readonly sentence?: string | null;
  /** Default false: the card keeps the user's words private unless they opt in. */
  readonly includeSentence?: boolean;
  readonly season: number;
  /** The Named Sky name, when the season has one. */
  readonly constellationName?: string | null;
  /** Seeds the backdrop stars and chart line-work (use the user's sky seed). */
  readonly seed: number;
}

export interface CardPoint {
  readonly x: number;
  readonly y: number;
}

export interface CardStar extends CardPoint {
  /** 1..7 (the anchor is separate). */
  readonly index: number;
  readonly lit: boolean;
  readonly kind: ProofKind | null;
  /** Outer radius of the star shape (lit) or the hollow ring (unlit). */
  readonly r: number;
  /** The star this card is about. */
  readonly highlighted: boolean;
}

export interface CardLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** Lit lines are solid; the course still to sail is dashed. */
  readonly lit: boolean;
}

export interface CardBackdropStar extends CardPoint {
  readonly r: number;
  readonly opacity: number;
}

export interface CardTextLine {
  readonly text: string;
  /** Baseline y; every text line is centred on CARD_WIDTH / 2. */
  readonly y: number;
}

export interface ShareCardModel {
  readonly width: typeof CARD_WIDTH;
  readonly height: typeof CARD_HEIGHT;
  readonly centerX: number;
  readonly figureBox: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly anchor: CardPoint & { readonly r: number };
  readonly stars: readonly CardStar[];
  readonly lines: readonly CardLine[];
  readonly backdrop: readonly CardBackdropStar[];
  readonly chart: ChartGeometry;
  /** The highlighted star (for its halo). */
  readonly focus: CardPoint & { readonly haloR: number };
  readonly eyebrow: CardTextLine;
  readonly title: CardTextLine;
  /** The kind glyph above the meta lines. */
  readonly glyph: CardPoint & { readonly r: number; readonly kind: ProofKind };
  /** '21 October 2026'. */
  readonly date: CardTextLine;
  /** 'The Studio · Season 1' or 'Season 1 · Star 4 of 7'. */
  readonly sky: CardTextLine;
  /** Empty unless the user chose to include their sentence. */
  readonly sentence: readonly CardTextLine[];
  /** The Vela mark (sail + star) box and the wordmark under it. */
  readonly mark: { readonly x: number; readonly y: number; readonly size: number; readonly word: CardTextLine };
  readonly fileName: string;
  readonly accessibilityLabel: string;
}

/* ------------------------------------------------------------------------- */
/* Text helpers (exported for tests and the sheet copy)                      */
/* ------------------------------------------------------------------------- */

/** '2026-10-21' → '21 October 2026'. '' for anything that isn't a real date key. */
export function formatCardDate(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dateKey ?? "");
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return "";
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return "";
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** One line, no typed quotes at the ends, whitespace collapsed. */
export function cleanSentence(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/gu, "")
    .trim();
}

/**
 * Greedy word wrap to `maxChars` per line, at most `maxLines` lines. Words
 * longer than a line are split. When text is left over, the last line ends
 * in '…' (trimmed to fit). Never drops a word silently from the middle.
 */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const width = Math.max(4, Math.floor(maxChars));
  const limit = Math.max(1, Math.floor(maxLines));
  const pieces: string[] = [];
  for (const word of cleanSentence(text).split(" ").filter(Boolean)) {
    if (word.length <= width) pieces.push(word);
    else for (let i = 0; i < word.length; i += width) pieces.push(word.slice(i, i + width));
  }
  const all: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (!current) current = piece;
    else if (current.length + 1 + piece.length <= width) current = `${current} ${piece}`;
    else {
      all.push(current);
      current = piece;
    }
  }
  if (current) all.push(current);
  if (all.length <= limit) return all;

  // Too long: keep `limit` lines and end the last one in an ellipsis that fits.
  const kept = all.slice(0, limit);
  let last = kept[limit - 1];
  if (last.length + 1 > width) {
    const space = last.lastIndexOf(" ");
    last = space > 0 ? last.slice(0, space) : last.slice(0, width - 1);
  }
  kept[limit - 1] = `${last.replace(/[\s,;:.!?—–-]+$/u, "")}…`;
  return kept;
}

/** Wrap a sentence for the card and put curly quotes around the whole of it. */
export function quoteLines(text: string, maxChars = SENTENCE_LINE_CHARS, maxLines = SENTENCE_MAX_LINES): string[] {
  const lines = wrapLines(text, maxChars - 1, maxLines);
  if (lines.length === 0) return [];
  lines[0] = `“${lines[0]}`;
  lines[lines.length - 1] = `${lines[lines.length - 1]}”`;
  return lines;
}

/** 'vela-proof-s1-4-2026-10-21.png' (file-system safe). */
export function cardFileName(season: number, starIndex: number, dateKey: string): string {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/u.test(dateKey) ? dateKey : "undated";
  return `vela-proof-s${Math.max(1, Math.floor(season))}-${clampStar(starIndex)}-${safeDate}.png`;
}

function clampStar(n: number): number {
  return Math.max(1, Math.min(FIGURE_STARS, Math.floor(Number.isFinite(n) ? n : 1)));
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------------- */
/* Layout                                                                    */
/* ------------------------------------------------------------------------- */

/** Vertical rhythm of the card (baselines and boxes), in card pixels. */
export const CARD_LAYOUT = {
  eyebrowY: 206,
  titleY: 312,
  figureTop: 392,
  figureHeight: 748,
  figureSide: 72,
  figurePadding: 64,
  glyphY: 1222,
  dateY: 1310,
  skyY: 1360,
  sentenceTop: 1462,
  /** How far the kind/date block moves down when the card carries no sentence. */
  metaDropWithoutSentence: 110,
  markTop: 1724,
  markSize: 72,
  wordY: 1846,
} as const;

export function buildShareCard(input: ShareCardInput): ShareCardModel {
  const starIndex = clampStar(input.starIndex);
  const lit = Math.max(starIndex, Math.min(FIGURE_STARS, Math.floor(input.lit)));
  const L = CARD_LAYOUT;
  const centerX = CARD_WIDTH / 2;

  const figureBox = {
    x: L.figureSide,
    y: L.figureTop,
    width: CARD_WIDTH - L.figureSide * 2,
    height: L.figureHeight,
  };
  const pts = fitFigure(input.figure, figureBox.width, figureBox.height, L.figurePadding).map((p) => ({
    x: r1(figureBox.x + p.x),
    y: r1(figureBox.y + p.y),
  }));

  const lines: CardLine[] = input.figure.edges.map(([a, b]) => ({
    x1: pts[a].x,
    y1: pts[a].y,
    x2: pts[b].x,
    y2: pts[b].y,
    lit: edgeStep([a, b]) <= lit,
  }));

  const stars: CardStar[] = pts.slice(1).map((p, i) => {
    const index = i + 1;
    const on = isPointLit(index, lit);
    const highlighted = index === starIndex;
    return {
      index,
      x: p.x,
      y: p.y,
      lit: on,
      kind: on ? (highlighted ? input.kind : input.kinds[i] ?? null) : null,
      r: on ? (highlighted ? 30 : 17) : 7,
      highlighted,
    };
  });

  const focusPt = pts[starIndex];
  const backdrop = makeStarfield(input.seed >>> 0, 96).map((s) => ({
    x: r1(s.x * CARD_WIDTH),
    y: r1(s.y * CARD_HEIGHT),
    r: r1(s.r * 2.4),
    opacity: s.opacity,
  }));

  const sentence =
    input.includeSentence === true && cleanSentence(input.sentence)
      ? quoteLines(input.sentence ?? "").map((text, i) => ({ text, y: L.sentenceTop + i * CARD_TYPE.sentence.lineHeight }))
      : [];

  // Without a sentence, the kind and the day settle into the middle of the space it would take.
  const drop = sentence.length ? 0 : CARD_LAYOUT.metaDropWithoutSentence;
  const season = Math.max(1, Math.floor(input.season));
  const name = cleanSentence(input.constellationName);
  const date = formatCardDate(input.dateKey);
  const skyLine = name ? `${name} · Season ${season}` : `Season ${season} · Star ${starIndex} of ${FIGURE_STARS}`;
  const eyebrow = `Proof ${starIndex} · charted`.toUpperCase();

  const label = [
    `Proof card. Star ${starIndex} of ${FIGURE_STARS}`,
    name ? `in ${name}` : `in Season ${season}`,
    KIND_STATEMENT[input.kind].replace(/\.$/u, ""),
    date,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    centerX,
    figureBox,
    anchor: { ...pts[0], r: 34 },
    stars,
    lines,
    backdrop,
    chart: chartGeometry(CARD_WIDTH, CARD_HEIGHT, input.seed >>> 0),
    focus: { x: focusPt.x, y: focusPt.y, haloR: 120 },
    eyebrow: { text: eyebrow, y: L.eyebrowY },
    title: { text: KIND_STATEMENT[input.kind], y: L.titleY },
    glyph: { x: centerX, y: L.glyphY + drop, r: 30, kind: input.kind },
    date: { text: date, y: L.dateY + drop },
    sky: { text: skyLine, y: L.skyY + drop },
    sentence,
    mark: {
      x: centerX - L.markSize / 2,
      y: L.markTop,
      size: L.markSize,
      word: { text: "VELA", y: L.wordY },
    },
    fileName: cardFileName(season, starIndex, input.dateKey),
    accessibilityLabel: sentence.length ? `${label}. “${cleanSentence(input.sentence)}”` : label,
  };
}
