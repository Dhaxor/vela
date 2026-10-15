import { describe, expect, test } from "bun:test";
import type { VoiceLike } from "./types";
import { pickVoice, rankVoices, suggestsVoiceDownload, voiceDisplayName, voiceQuality, voiceSubtitle } from "./voices";

const ios = (tier: string, lang: string, name: string): VoiceLike => ({
  identifier: `com.apple.voice.${tier}.${lang}.${name}`,
  name,
  language: lang,
  // expo-speech reports Premium as 'Default' on iOS: ranking must not trust it.
  quality: tier === "enhanced" ? "Enhanced" : "Default",
});

describe("voiceQuality", () => {
  test("reads the tier from the identifier, not expo-speech's quality field", () => {
    expect(voiceQuality(ios("premium", "en-US", "Ava"))).toBe("premium");
    expect(voiceQuality(ios("enhanced", "en-US", "Samantha"))).toBe("enhanced");
    expect(voiceQuality(ios("compact", "en-US", "Samantha"))).toBe("compact");
    expect(voiceQuality({ identifier: "com.apple.ttsbundle.siri_Nicky_en-US_premium", name: "Nicky", language: "en-US" })).toBe(
      "premium"
    );
  });

  test("web and Android fall back to names and the reported tier", () => {
    expect(voiceQuality({ identifier: "Microsoft Aria Online (Natural) - English (United States)", name: "Microsoft Aria Online (Natural) - English (United States)", language: "en-US" })).toBe("enhanced");
    expect(voiceQuality({ identifier: "Google US English", name: "Google US English", language: "en-US" })).toBe("default");
    expect(voiceQuality({ identifier: "en-us-x-tpf-local", name: "en-us-x-tpf-local", language: "en-US", quality: "Enhanced" })).toBe("enhanced");
  });

  test("Eloquence voices count as compact", () => {
    expect(voiceQuality({ identifier: "com.apple.eloquence.en-US.Eddy", name: "Eddy", language: "en-US" })).toBe("compact");
  });
});

describe("rankVoices", () => {
  const voices: VoiceLike[] = [
    ios("compact", "en-US", "Samantha"),
    ios("compact", "fr-FR", "Thomas"),
    ios("enhanced", "en-GB", "Serena"),
    ios("premium", "en-US", "Zoe"),
    ios("premium", "en-US", "Ava"),
    ios("enhanced", "en-US", "Evan"),
    { identifier: "com.apple.eloquence.en-US.Eddy", name: "Eddy", language: "en-US" },
    { identifier: "com.apple.speech.synthesis.voice.Bubbles", name: "Bubbles", language: "en-US" },
    ios("premium", "de-DE", "Anna"),
  ];

  test("English first, then tier, then the preferred locale, then name; novelty voices dropped", () => {
    expect(rankVoices(voices).map((v) => v.name)).toEqual([
      "Ava",
      "Zoe",
      "Evan",
      "Serena",
      "Samantha",
      "Eddy",
      "Anna",
      "Thomas",
    ]);
  });

  test("the device locale breaks ties within a tier; English still beats a better foreign voice", () => {
    const names = rankVoices(voices, "en-GB").map((v) => v.name);
    expect(names.indexOf("Serena")).toBeLessThan(names.indexOf("Evan"));
    expect(names.indexOf("Ava")).toBeLessThan(names.indexOf("Serena"));
    expect(names.indexOf("Samantha")).toBeLessThan(names.indexOf("Anna"));
  });

  test("scores sort descending and duplicates collapse", () => {
    const ranked = rankVoices([...voices, ios("premium", "en-US", "Ava")]);
    expect(ranked.filter((v) => v.name === "Ava")).toHaveLength(1);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
  });

  test("locale codes are normalised", () => {
    const ranked = rankVoices([{ identifier: "a", name: "A", language: "fr_FR" }, { identifier: "b", name: "B", language: "EN_us" }]);
    expect(ranked[0].name).toBe("B");
  });

  test("an empty list ranks to nothing", () => {
    expect(rankVoices([])).toEqual([]);
  });
});

describe("pickVoice", () => {
  const ranked = rankVoices([ios("compact", "en-US", "Samantha"), ios("premium", "en-US", "Ava")]);

  test("the saved voice when installed, else the best", () => {
    expect(pickVoice(ranked, "com.apple.voice.compact.en-US.Samantha")?.name).toBe("Samantha");
    expect(pickVoice(ranked, "com.apple.voice.premium.en-GB.Gone")?.name).toBe("Ava");
    expect(pickVoice(ranked, null)?.name).toBe("Ava");
    expect(pickVoice([], null)).toBeNull();
  });
});

describe("display", () => {
  const [ava] = rankVoices([ios("premium", "en-GB", "Ava")], "en-GB");

  test("real name and a plain accent + tier subtitle", () => {
    expect(voiceDisplayName(ava)).toBe("Ava");
    expect(voiceSubtitle(ava)).toBe("British · Premium");
  });

  test("vendor and locale noise is stripped from web names", () => {
    const [aria] = rankVoices([
      { identifier: "x", name: "Microsoft Aria Online (Natural) - English (United States)", language: "en-US" },
    ]);
    expect(voiceDisplayName(aria)).toBe("Aria");
    expect(voiceSubtitle(aria)).toBe("American · Enhanced");
  });

  test("unknown accents show the locale; untiered voices show no tier", () => {
    const [v] = rankVoices([{ identifier: "y", name: "Moira", language: "en-ZW" }]);
    expect(voiceSubtitle(v)).toBe("en-ZW");
  });
});

describe("suggestsVoiceDownload", () => {
  test("only when the best English voice is compact", () => {
    expect(suggestsVoiceDownload(rankVoices([ios("compact", "en-US", "Samantha")]))).toBe(true);
    expect(suggestsVoiceDownload(rankVoices([ios("compact", "en-US", "Samantha"), ios("enhanced", "en-US", "Evan")]))).toBe(false);
    expect(suggestsVoiceDownload(rankVoices([{ identifier: "Google US English", name: "Google US English", language: "en-US" }]))).toBe(false);
    expect(suggestsVoiceDownload([])).toBe(true);
  });
});
