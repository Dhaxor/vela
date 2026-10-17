// Native: capture the full-size share card view with react-native-view-shot
// and hand the PNG to the share sheet (expo-sharing). The web version of this
// module (shareCapture.web.ts) rasterizes the card's SVG and downloads it.
// Native modules are required lazily so nothing loads until the user shares.
import type { RefObject } from "react";
import type { View } from "react-native";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/share/cardModel";

export type ShareOutcome = "shared" | "downloaded" | "unavailable";

export interface CaptureTarget {
  /** The full-size (offscreen) card view, captured on iOS. */
  readonly nativeRef: RefObject<View | null>;
  /** nativeID of the on-screen preview wrapper, read on web. */
  readonly domId: string;
}

/** What the primary button says on this platform. */
export const SHARE_ACTION_LABEL = "Share image";

export async function shareCardImage(target: CaptureTarget, fileName: string): Promise<ShareOutcome> {
  const view = target.nativeRef.current;
  if (!view) return "unavailable";
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { captureRef } = require("react-native-view-shot") as typeof import("react-native-view-shot");
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");
    /* eslint-enable @typescript-eslint/no-require-imports */
    if (!(await Sharing.isAvailableAsync())) return "unavailable";
    const uri = await captureRef(view, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fileName: fileName.replace(/\.png$/u, ""),
    });
    await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share your star" });
    return "shared";
  } catch {
    return "unavailable";
  }
}
