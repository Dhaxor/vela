export interface GlyphProps {
  /** Rendered box in points (glyphs are square unless noted). */
  size?: number;
  color?: string;
  strokeWidth?: number;
  testID?: string;
}

/** Shared stroke treatment: engraved line-art with round ends. */
export const LINE = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
