import { describe, expect, test } from "bun:test";
import { CAPTION_MIN, MISSING_PHOTO_COPY, missingPhotoLayout } from "./storedPhotoLayout";

describe("missing-photo placeholder layout", () => {
  test("thumbnails (Arc 56pt, receipt 64pt): a small vignette, no caption", () => {
    for (const s of [56, 64]) {
      const l = missingPhotoLayout(s, s);
      expect(l.caption).toBe(false);
      expect(l.vignette).toBeLessThanOrEqual(s * 0.6 + 1);
      expect((l.vignette * 3) / 4).toBeLessThan(s);
    }
  });

  test("a Scenes tile and the star sheet: vignette and caption both fit", () => {
    for (const [w, h] of [
      [160, 200],
      [185, 231],
      [382, 237],
    ]) {
      const l = missingPhotoLayout(w, h);
      expect(l.caption).toBe(true);
      // vignette height + caption block stays inside the frame
      expect((l.vignette * 3) / 4 + 44).toBeLessThanOrEqual(h);
      expect(l.vignette).toBeLessThanOrEqual(w);
    }
  });

  test("never larger than the plate, never vanishing", () => {
    expect(missingPhotoLayout(1000, 1000).vignette).toBe(160);
    expect(missingPhotoLayout(0, 0).vignette).toBe(20);
    expect(missingPhotoLayout(Number.NaN, 50).caption).toBe(false);
  });

  test("the caption threshold", () => {
    expect(missingPhotoLayout(CAPTION_MIN.width, CAPTION_MIN.height).caption).toBe(true);
    expect(missingPhotoLayout(CAPTION_MIN.width - 1, 400).caption).toBe(false);
    expect(missingPhotoLayout(400, CAPTION_MIN.height - 1).caption).toBe(false);
  });

  test("the words: one line where it fits, two even lines in a narrow tile", () => {
    expect(MISSING_PHOTO_COPY).toBe("Photo kept on another phone");
    expect(missingPhotoLayout(382, 237).captionText).toBe(MISSING_PHOTO_COPY);
    expect(missingPhotoLayout(185, 231).captionText).toBe("Photo kept on\nanother phone");
    expect(missingPhotoLayout(185, 231).captionText.replace("\n", " ")).toBe(MISSING_PHOTO_COPY);
  });
});
