// Keeping the field you type in on screen (pure part; the hook is in
// ./useKeyboardReveal). On iOS the keyboard covers the bottom of the window
// and a screen's Dock rides on top of it, so a field low on the page can end
// up under both while the user types. The visible band is what is left: from
// the top of the scroll view down to whichever comes first of the keyboard,
// the dock and the scroll view's own bottom. revealDelta says how far to
// scroll so the focused field sits inside that band.
//
// No React Native here, so bun can test it.

/** A vertical span in window points. */
export interface Span {
  readonly y: number;
  readonly height: number;
}

/** The part of the scroll view nothing covers, in window points. */
export interface Band {
  readonly top: number;
  readonly bottom: number;
}

/**
 * Which end of a field taller than the band to show: its start when it takes
 * focus (the caret is there), its end while typing makes it grow.
 */
export type RevealPrefer = "start" | "end";

/** Room kept between the field and the band's edges (the field's border, a little air). */
export const REVEAL_MARGIN = 16;

/**
 * How far to scroll (+ moves the content up) so `field` sits fully inside
 * `band`, keeping `margin` from either edge. 0 when it already does. A field
 * that fits the band only with less air is centred in it (all of it seen);
 * one taller than the band shows the end `prefer` names.
 */
export function revealDelta(field: Span, band: Band, opts: { margin?: number; prefer?: RevealPrefer } = {}): number {
  const margin = opts.margin ?? REVEAL_MARGIN;
  const lo = band.top + margin;
  const hi = band.bottom - margin;
  if (!(hi > lo) || !Number.isFinite(field.y) || !(field.height >= 0)) return 0;
  const top = field.y;
  const bottom = field.y + field.height;
  const room = band.bottom - band.top;
  if (bottom - top > hi - lo && bottom - top <= room) {
    if (top >= band.top && bottom <= band.bottom) return 0;
    return top - (band.top + (room - field.height) / 2);
  }
  if (bottom - top > hi - lo) return opts.prefer === "end" ? bottom - hi : top - lo;
  if (bottom > hi) return bottom - hi;
  if (top < lo) return top - lo;
  return 0;
}

/** Room under the last line of text (its descenders and the input's own padding). */
export const TEXT_SLACK = 12;

/**
 * What must be seen of the focused field: all of it on focus; while writing
 * ('end' with the text's height), the text so far, so a page taller than its
 * words keeps its empty end out of the way instead of pushing the words up.
 */
export function revealSpan(field: Span, prefer: RevealPrefer, extent?: number): Span {
  if (prefer !== "end" || !extent || !(extent > 0)) return field;
  return { y: field.y, height: Math.min(field.height, extent + TEXT_SLACK) };
}

/** A scroll offset the content can reach: 0 … contentHeight − viewportHeight. */
export function clampOffset(target: number, contentHeight: number, viewportHeight: number): number {
  const max = Math.max(0, contentHeight - viewportHeight);
  return Math.max(0, Math.min(target, max));
}

/** The bottom of the band: the keyboard's top, a dock riding on it, or the scroll view's own bottom, whichever is highest. */
export function bandBottom(keyboardTop: number, viewBottom: number, coverTop: number | null): number {
  return Math.min(keyboardTop, viewBottom, coverTop ?? Number.POSITIVE_INFINITY);
}

/**
 * The places a focused field can live (the focused screen's scroll view, each
 * open sheet), newest last. Only the newest moves its content: a sheet's
 * fields render inside the screen under it, and that screen must leave them be.
 */
export class HostStack<H> {
  private hosts: H[] = [];

  /** `host` becomes the newest (moved to the end if it was already in). */
  push(host: H): void {
    this.remove(host);
    this.hosts.push(host);
  }

  remove(host: H): void {
    this.hosts = this.hosts.filter((h) => h !== host);
  }

  top(): H | null {
    return this.hosts.length ? this.hosts[this.hosts.length - 1] : null;
  }

  get size(): number {
    return this.hosts.length;
  }
}
