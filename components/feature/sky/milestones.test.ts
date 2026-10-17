import { describe, expect, test } from "bun:test";
import { MILESTONES, countWord, milestoneFor, skyLine } from "./milestones";

describe("lifetime milestones", () => {
  test("only 3, 12 and 30 stars are milestones", () => {
    expect(MILESTONES.map((m) => m.stars)).toEqual([3, 12, 30]);
  });

  test("the highest reached milestone wins and stays reached", () => {
    expect(milestoneFor(0)).toBeNull();
    expect(milestoneFor(2)).toBeNull();
    expect(milestoneFor(3)?.stars).toBe(3);
    expect(milestoneFor(11)?.stars).toBe(3);
    expect(milestoneFor(12)?.stars).toBe(12);
    expect(milestoneFor(29)?.stars).toBe(12);
    expect(milestoneFor(30)?.stars).toBe(30);
    expect(milestoneFor(300)?.stars).toBe(30);
  });

  test("the line names the milestone on the day and remembers it after", () => {
    expect(skyLine(0)).toContain("becomes a star");
    expect(skyLine(1)).toBe("One star so far. It is something you did.");
    expect(skyLine(2)).toBe("Two stars so far. Each is something you did.");
    expect(skyLine(3)).toBe(MILESTONES[0].line);
    expect(skyLine(9)).toBe("Nine stars. The shape began to show at three.");
    expect(skyLine(12)).toBe(MILESTONES[1].line);
    expect(skyLine(24)).toBe("24 stars. It became a sky of your own at twelve.");
    expect(skyLine(30)).toBe(MILESTONES[2].line);
    expect(skyLine(41)).toBe("41 stars. Each one an ordinary day you showed up for.");
  });

  test("count words", () => {
    expect(countWord(9)).toBe("Nine");
    expect(countWord(20)).toBe("Twenty");
    expect(countWord(21)).toBe("21");
  });

  test("copy never scores or shames", () => {
    for (const m of MILESTONES) {
      expect(`${m.line} ${m.since}`).not.toMatch(/streak|level|badge|score|unlock|only|future self|!/i);
    }
  });
});
