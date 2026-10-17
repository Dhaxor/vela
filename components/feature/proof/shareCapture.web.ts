// Web: rasterize the on-screen share card's SVG at 1080×1920 and download it
// as a PNG. An SVG drawn through <img> can't see the page's web fonts, so the
// fonts the card uses are fetched from the expo-font @font-face rules and
// embedded as data: URLs first (lib/share/svgExport). If anything fails the
// caller shows the card with a note instead.
import type { RefObject } from "react";
import type { View } from "react-native";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/share/cardModel";
import { bytesToBase64, fontFaceCss, fontFamiliesIn, fontMime, parseFontFace, standaloneSvg, svgDataUrl } from "@/lib/share/svgExport";

export type ShareOutcome = "shared" | "downloaded" | "unavailable";

export interface CaptureTarget {
  readonly nativeRef: RefObject<View | null>;
  readonly domId: string;
}

export const SHARE_ACTION_LABEL = "Download image";

/** Every @font-face rule the page can read, by family. */
function pageFontUrls(): Map<string, string> {
  const found = new Map<string, string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(rules)) {
      const face = parseFontFace(rule.cssText);
      if (face && !found.has(face.family)) found.set(face.family, face.url);
    }
  }
  return found;
}

async function embeddedFonts(markup: string): Promise<string> {
  const urls = pageFontUrls();
  const wanted = fontFamiliesIn(markup).filter((family) => urls.has(family));
  const rules = await Promise.all(
    wanted.map(async (family) => {
      const url = urls.get(family)!;
      try {
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        return fontFaceCss(family, `data:${fontMime(url)};base64,${bytesToBase64(bytes)}`);
      } catch {
        return "";
      }
    })
  );
  return rules.join("");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("card image failed to load"));
    img.src = src;
  });
}

/** The card as a PNG data URL (exported for the dev harness). */
export async function renderCardPng(domId: string): Promise<string> {
  const svg = document.getElementById(domId)?.querySelector("svg");
  if (!svg) throw new Error("no card on screen");
  const markup = new XMLSerializer().serializeToString(svg);
  const doc = standaloneSvg(markup, { width: CARD_WIDTH, height: CARD_HEIGHT, css: await embeddedFonts(markup) });
  const img = await loadImage(svgDataUrl(doc));
  // Give the embedded fonts a frame to settle inside the image before drawing.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  return canvas.toDataURL("image/png");
}

export async function shareCardImage(target: CaptureTarget, fileName: string): Promise<ShareOutcome> {
  if (typeof document === "undefined") return "unavailable";
  try {
    const url = await renderCardPng(target.domId);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return "downloaded";
  } catch {
    return "unavailable";
  }
}
