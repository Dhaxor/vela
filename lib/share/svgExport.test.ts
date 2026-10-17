import { describe, expect, test } from "bun:test";
import {
  bytesToBase64,
  fontFaceCss,
  fontFamiliesIn,
  fontMime,
  parseFontFace,
  standaloneSvg,
  svgDataUrl,
} from "./svgExport";

describe("parseFontFace", () => {
  test("reads the family and the first url of an @font-face rule", () => {
    expect(
      parseFontFace('@font-face { font-family: "Newsreader_400Regular"; src: url("/assets/Newsreader.ttf?platform=web&hash=1"); font-display: auto; }')
    ).toEqual({ family: "Newsreader_400Regular", url: "/assets/Newsreader.ttf?platform=web&hash=1" });
    expect(parseFontFace("@font-face{font-family:Inst;src:url(a.woff2) format('woff2'),url(b.ttf)}")).toEqual({ family: "Inst", url: "a.woff2" });
  });
  test("ignores other rules", () => {
    expect(parseFontFace(".a { color: red }")).toBeNull();
    expect(parseFontFace("@font-face { font-family: X; }")).toBeNull();
  });
});

describe("fontFamiliesIn", () => {
  test("collects families from attributes and inline styles, once each", () => {
    const markup =
      '<svg><text font-family="Newsreader_400Regular">a</text><text font-family=\'InstrumentSans_600SemiBold\'>b</text>' +
      '<text style="font-family: Newsreader_400Regular_Italic, serif;">c</text><text font-family="Newsreader_400Regular">d</text></svg>';
    expect(fontFamiliesIn(markup).sort()).toEqual(
      ["InstrumentSans_600SemiBold", "Newsreader_400Regular", "Newsreader_400Regular_Italic", "serif"].sort()
    );
  });
  test("decodes &quot; around names", () => {
    expect(fontFamiliesIn('<text font-family="&quot;My Font&quot;">x</text>')).toEqual(["My Font"]);
  });
});

describe("fontMime / fontFaceCss", () => {
  test("maps extensions, defaulting to TrueType", () => {
    expect(fontMime("/a/b.ttf?x=1")).toBe("font/ttf");
    expect(fontMime("x.otf")).toBe("font/otf");
    expect(fontMime("x.woff")).toBe("font/woff");
    expect(fontMime("x.woff2#frag")).toBe("font/woff2");
    expect(fontMime("/fonts/blob")).toBe("font/ttf");
  });
  test("builds a rule with a safe family name", () => {
    expect(fontFaceCss('Na"me', "data:font/ttf;base64,AAA")).toBe(
      '@font-face{font-family:"Name";src:url(data:font/ttf;base64,AAA);font-display:block;}'
    );
  });
});

describe("bytesToBase64", () => {
  test("matches the platform encoder for every padding case", () => {
    for (const s of ["", "f", "fo", "foo", "foob", "fooba", "foobar", "✦ Vela"]) {
      const bytes = new TextEncoder().encode(s);
      expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
    }
  });
  test("handles binary bytes", () => {
    const bytes = Uint8Array.from({ length: 1000 }, (_, i) => (i * 37) & 255);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });
});

describe("standaloneSvg", () => {
  test("pins the export size, adds the namespace and embeds the style first", () => {
    const out = standaloneSvg('<svg width="270" height="480" viewBox="0 0 1080 1920" style="x"><rect/></svg>', {
      width: 1080,
      height: 1920,
      css: "@font-face{}",
    });
    expect(out).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" style="x"><style>@font-face{}</style><rect/></svg>'
    );
  });
  test("replaces an existing namespace and adds xlink only when used", () => {
    const out = standaloneSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><use xlink:href="#a"/></svg>', { width: 10, height: 10 });
    expect(out.match(/xmlns="/gu)).toHaveLength(1);
    expect(out).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(standaloneSvg("<svg><g/></svg>", { width: 1, height: 1 })).not.toContain("xlink");
  });
  test("handles a self-closing root and rejects non-svg markup", () => {
    expect(standaloneSvg('<svg viewBox="0 0 1 1"/>', { width: 2, height: 3 })).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3" viewBox="0 0 1 1"></svg>'
    );
    expect(() => standaloneSvg("<div></div>", { width: 1, height: 1 })).toThrow();
  });
});

describe("svgDataUrl", () => {
  test("is a loadable, fully escaped data URL", () => {
    const url = svgDataUrl('<svg><text>#1 “x”</text></svg>');
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(url).not.toContain("#");
    expect(decodeURIComponent(url.split(",")[1])).toBe('<svg><text>#1 “x”</text></svg>');
  });
});
