// The size to ask react-native-view-shot for, so the share PNG is exactly
// CARD_WIDTH × CARD_HEIGHT pixels on every phone. Pure (bun-tested).
//
// The platforms read `width`/`height` differently: iOS treats them as POINTS
// and renders at the screen's scale (a 1080-point request on a @3x iPhone is a
// 3240 × 5760 bitmap, ~75 MB in memory), Android as the output's PIXELS.
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/share/cardModel";

export function captureSizeFor(os: string, pixelRatio: number): { readonly width: number; readonly height: number } {
  if (os !== "ios") return { width: CARD_WIDTH, height: CARD_HEIGHT };
  const scale = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  return { width: CARD_WIDTH / scale, height: CARD_HEIGHT / scale };
}
