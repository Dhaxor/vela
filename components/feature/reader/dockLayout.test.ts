import { describe, expect, test } from "bun:test";
import { DOCK_CONTROL_MAX, DOCK_CONTROL_MIN, dockControlWidth, dockRowWidth } from "./dockLayout";

const GAP = 4;
/** The width inside the gutters (16pt below 380pt, else 24pt). */
const inside = (screen: number) => screen - 2 * (screen < 380 ? 16 : 24);

describe("reader dock row fits the screen", () => {
  test("320pt (Display Zoom): narrower controls, nothing clipped", () => {
    const w = dockControlWidth(inside(320), GAP);
    expect(w).toBeLessThan(DOCK_CONTROL_MAX);
    expect(dockRowWidth(w, GAP)).toBeLessThanOrEqual(inside(320));
  });

  test("375pt and wider keep the full 64pt controls", () => {
    for (const screen of [375, 390, 393, 430]) {
      expect(dockControlWidth(inside(screen), GAP)).toBe(DOCK_CONTROL_MAX);
      expect(dockRowWidth(DOCK_CONTROL_MAX, GAP)).toBeLessThanOrEqual(inside(screen));
    }
  });

  test("never below a tap target", () => {
    expect(dockControlWidth(100, GAP)).toBe(DOCK_CONTROL_MIN);
  });
});
