// Turning the on-screen share card <svg> into a standalone image (web).
//
// The browser can rasterize an SVG through <img> + <canvas>, but an SVG
// loaded as an image is sandboxed: it can't see the page's web fonts. So the
// card's markup gets its fonts embedded as data: URLs in an @font-face block,
// fixed pixel dimensions and the SVG namespace. These are the pure string
// steps; the DOM work lives in components/feature/proof/shareCapture.web.ts.

export interface FontFaceSource {
  /** Family name as registered (quotes stripped). */
  readonly family: string;
  /** First url() in the rule's src. */
  readonly url: string;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

function unquote(s: string): string {
  return s.trim().replace(/^["']|["']$/gu, "").trim();
}

/** Family and first url() of an @font-face rule's cssText, or null when it isn't one. */
export function parseFontFace(cssText: string): FontFaceSource | null {
  if (!/@font-face/iu.test(cssText)) return null;
  const family = /font-family\s*:\s*([^;}]+)/iu.exec(cssText);
  const url = /url\(\s*(["']?)([^"')]+)\1\s*\)/iu.exec(cssText);
  if (!family || !url) return null;
  const name = unquote(family[1]);
  return name && url[2] ? { family: name, url: url[2].trim() } : null;
}

/** Families named in font-family attributes or style declarations of an SVG's markup. */
export function fontFamiliesIn(markup: string): string[] {
  const found = new Set<string>();
  const re = /font-family\s*(?:=\s*"([^"]+)"|=\s*'([^']+)'|:\s*([^;"'>]+))/giu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup))) {
    const value = (m[1] ?? m[2] ?? m[3] ?? "").replace(/&quot;/gu, '"');
    for (const part of value.split(",")) {
      const name = unquote(part);
      if (name) found.add(name);
    }
  }
  return [...found];
}

/** MIME type for a font URL by extension (TrueType when unknown: expo ships .ttf). */
export function fontMime(url: string): string {
  const ext = /\.([a-z0-9]+)(?:[?#].*)?$/iu.exec(url)?.[1]?.toLowerCase();
  if (ext === "otf") return "font/otf";
  if (ext === "woff") return "font/woff";
  if (ext === "woff2") return "font/woff2";
  return "font/ttf";
}

/** One embeddable @font-face rule. */
export function fontFaceCss(family: string, dataUrl: string): string {
  const safe = family.replace(/["\\]/gu, "");
  return `@font-face{font-family:"${safe}";src:url(${dataUrl});font-display:block;}`;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 of raw bytes (no btoa, so it works on any size and in bun). */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += `${B64[(n >> 18) & 63]}${B64[(n >> 12) & 63]}==`;
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += `${B64[(n >> 18) & 63]}${B64[(n >> 12) & 63]}${B64[(n >> 6) & 63]}=`;
  }
  return out;
}

/**
 * The card's <svg> markup as a standalone document: fixed width/height (the
 * export size), the SVG (and xlink, when used) namespaces, and an optional
 * <style> block (the embedded fonts) as its first child.
 */
export function standaloneSvg(markup: string, opts: { width: number; height: number; css?: string }): string {
  const open = /^\s*<svg\b([^>]*)>/iu.exec(markup);
  if (!open) throw new Error("not an <svg> element");
  const attrs = open[1]
    .replace(/\s(?:width|height|xmlns|xmlns:xlink)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s*\/$/u, "");
  const needsXlink = /xlink:/u.test(markup);
  const head =
    `<svg xmlns="${SVG_NS}"${needsXlink ? ` xmlns:xlink="${XLINK_NS}"` : ""}` +
    ` width="${Math.round(opts.width)}" height="${Math.round(opts.height)}"${attrs}>`;
  const style = opts.css ? `<style>${opts.css}</style>` : "";
  const rest = markup.slice(open[0].length);
  const selfClosed = /\/>\s*$/u.test(open[0]);
  return selfClosed ? `${head}${style}</svg>` : `${head}${style}${rest}`;
}

/** A data: URL an <img> can load. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
