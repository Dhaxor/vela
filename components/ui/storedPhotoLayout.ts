// How the missing-photo placeholder fits its frame (StoredPhoto). Pure
// (storedPhotoLayout.test.ts). The window vignette is 4:3; the caption line
// only appears where it fits without crowding (a Scenes tile, the star sheet),
// never in a 56pt thumbnail, which says it through accessibility instead.

/** 'Photo kept on another phone': a stored photo whose file is not on this device. */
export const MISSING_PHOTO_COPY = "Photo kept on another phone";
/** The same words set on two even lines, for frames too narrow for one (no 'phone' left alone). */
export const MISSING_PHOTO_LINES = "Photo kept on\nanother phone";
/** Below this width the caption takes the two-line setting. */
const ONE_LINE_MIN = 240;

/** Smallest frame that shows the caption under the vignette. */
export const CAPTION_MIN = { width: 120, height: 110 } as const;
/** Caption line (caption lineHeight 18, two lines at most) + the gap above it. */
const CAPTION_BLOCK = 18 * 2 + 8;
const VIGNETTE_MIN = 20;
const VIGNETTE_MAX = 160;

export interface MissingPhotoLayout {
  /** Vignette width in points (its height is 3/4 of it). */
  readonly vignette: number;
  readonly caption: boolean;
  /** The caption's text: one line where it fits, else two even lines. */
  readonly captionText: string;
}

export function missingPhotoLayout(width: number, height: number): MissingPhotoLayout {
  const w = Number.isFinite(width) && width > 0 ? width : 0;
  const h = Number.isFinite(height) && height > 0 ? height : 0;
  const caption = w >= CAPTION_MIN.width && h >= CAPTION_MIN.height;
  const room = Math.max(0, h - (caption ? CAPTION_BLOCK : 0));
  // 60% of the width, and no taller than 70% of the room left (4:3 plate).
  const fit = Math.min(w * 0.6, ((room * 0.7) * 4) / 3, VIGNETTE_MAX);
  return { vignette: Math.round(Math.max(VIGNETTE_MIN, fit)), caption, captionText: w >= ONE_LINE_MIN ? MISSING_PHOTO_COPY : MISSING_PHOTO_LINES };
}
