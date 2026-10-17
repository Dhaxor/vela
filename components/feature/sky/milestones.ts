// Gentle lifetime milestones (ELEVATE P4): copy only, never a badge, never a
// score. Counted across every dream and season; stars never go away, so a
// milestone, once reached, stays reached. On the day the count lands on a
// milestone the line says so; between milestones it remembers the last one.
export interface Milestone {
  readonly stars: number;
  /** Said when the count is exactly this milestone. */
  readonly line: string;
  /** Said after it, until the next one: `${Count} stars. ${since}` */
  readonly since: string;
}

export const MILESTONES: readonly Milestone[] = [
  { stars: 3, line: "Three stars. The shape is starting to show.", since: "The shape began to show at three." },
  { stars: 12, line: "Twelve stars. This is a sky of your own now.", since: "It became a sky of your own at twelve." },
  { stars: 30, line: "Thirty stars, each one an ordinary day you showed up for.", since: "Each one an ordinary day you showed up for." },
];

const WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
] as const;

/** 'Nine', 'Twenty', then digits ('24'). */
export function countWord(n: number): string {
  const i = Math.max(0, Math.floor(n));
  return i < WORDS.length ? WORDS[i] : String(i);
}

/** The highest milestone reached, or null below the first. */
export function milestoneFor(totalStars: number): Milestone | null {
  let best: Milestone | null = null;
  for (const m of MILESTONES) if (totalStars >= m.stars) best = m;
  return best;
}

/** What to say under the sky. */
export function skyLine(totalStars: number): string {
  const n = Math.max(0, Math.floor(totalStars));
  const m = milestoneFor(n);
  if (m && m.stars === n) return m.line;
  if (m) return `${countWord(n)} stars. ${m.since}`;
  if (n === 0) return "Every real step you take becomes a star here.";
  return n === 1 ? "One star so far. It is something you did." : `${countWord(n)} stars so far. Each is something you did.`;
}
