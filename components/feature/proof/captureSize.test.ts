import { describe, expect, test } from "bun:test";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/share/cardModel";
import { captureSizeFor } from "./captureSize";

describe("share card capture size", () => {
  test("iOS asks for points, so the PNG is 1080×1920 px at any screen scale", () => {
    for (const scale of [2, 3]) {
      const size = captureSizeFor("ios", scale);
      expect(size.width * scale).toBe(CARD_WIDTH);
      expect(size.height * scale).toBe(CARD_HEIGHT);
    }
    expect(captureSizeFor("ios", 3)).toEqual({ width: 360, height: 640 });
  });

  test("never the 3× bitmap (3240×5760) the pixel sizes used to make on a @3x iPhone", () => {
    const { width, height } = captureSizeFor("ios", 3);
    expect(width * 3).not.toBe(3240);
    expect(height * 3).not.toBe(5760);
  });

  test("Android takes output pixels; a bad scale falls back to 1", () => {
    expect(captureSizeFor("android", 2.625)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    expect(captureSizeFor("ios", 0)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    expect(captureSizeFor("ios", Number.NaN)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
  });
});
