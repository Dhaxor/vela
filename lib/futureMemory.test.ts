import { describe, expect, test } from "bun:test";
import {
  deriveFutureAction,
  evidenceBridge,
  proofConstellation,
  sanitizeEvidence,
  type FutureAction,
} from "./futureMemory";

describe("future memory action loop", () => {
  test("derives a stable, focus-specific action", () => {
    const input = { focus: "career" as const, desire: "lead a thoughtful studio", chapter: 2 };
    expect(deriveFutureAction(input)).toBe(deriveFutureAction(input));
    expect(deriveFutureAction(input)).toMatch(/work|message|skill/i);
  });

  test("turns evidence into a future chapter bridge without unsafe length", () => {
    const raw = `  I sent   the proposal. ${"x".repeat(400)} `;
    expect(sanitizeEvidence(raw)).toHaveLength(240);
    const bridge = evidenceBridge(raw);
    expect(bridge).toContain("I sent the proposal");
    expect(bridge).toContain("change what comes next");
  });

  test("builds a seven-day constellation from completed evidence only", () => {
    const actions: FutureAction[] = Array.from({ length: 9 }, (_, index) => ({
      id: `${index}`,
      intentId: "i",
      storyId: "s",
      text: "step",
      state: "completed",
      createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
      completedAt: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
      evidence: `proof ${index}`,
      evidenceKind: "did",
    }));
    actions.push({
      id: "open",
      intentId: "i",
      storyId: "s",
      text: "open",
      state: "open",
      createdAt: "2026-08-10T12:00:00.000Z",
    });
    const points = proofConstellation(actions);
    expect(points).toHaveLength(7);
    expect(points[0].dateKey).toBe("2026-08-03");
    expect(points[6].dateKey).toBe("2026-08-09");
  });
});
