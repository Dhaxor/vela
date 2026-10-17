// The listening dock's row: 2 controls, the play disc, 2 controls. At 64pt a
// control the row needs 4 × 64 + 64 + 2 gaps = 328pt, more than the 288pt a
// 320pt-wide screen (Display Zoom on an iPhone SE/8) leaves inside its
// gutters, and the last control ('Voice') was clipped. Pure (bun-tested).

export const DOCK_DISC = 64;
/** A side control's widest. */
export const DOCK_CONTROL_MAX = 64;
/** Never narrower than a comfortable tap target. */
export const DOCK_CONTROL_MIN = 48;

/** Width of each side control so the row fits `rowWidth` with `gap` between a pair's controls. */
export function dockControlWidth(rowWidth: number, gap: number): number {
  return Math.max(DOCK_CONTROL_MIN, Math.min(DOCK_CONTROL_MAX, Math.floor((rowWidth - DOCK_DISC - 2 * gap) / 4)));
}

/** The row's width at a control width. */
export function dockRowWidth(control: number, gap: number): number {
  return 4 * control + DOCK_DISC + 2 * gap;
}
