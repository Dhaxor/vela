// Voices, the pure half (R3): rank by IDENTIFIER substring, because
// expo-speech reports iOS Premium voices as quality 'Default'. Show the real
// name. Download help is plain text (VOICE_DOWNLOAD_HINT), never a URL.

import type { RankVoices, RankedVoice, VoiceLike, VoiceQuality } from "./types";

const QUALITY_SCORE: Readonly<Record<VoiceQuality, number>> = { premium: 4, enhanced: 3, default: 2, compact: 1 };

/** iOS/macOS novelty voices (Bells, Bubbles, Zarvox, Whisper…). Never right for a chapter. */
const NOVELTY = "speech.synthesis.voice.";
/** iOS Eloquence voices (Eddy, Flo, Reed, Grandma…): robotic, so they rank below every compact voice. */
const ELOQUENCE = ".eloquence.";

/**
 * Quality from the identifier ('com.apple.voice.premium.en-US.Ava'). Web
 * voices carry no tier, so 'Natural'/'Neural' cloud voices count as enhanced;
 * Android reports its tier honestly through `quality`.
 */
export function voiceQuality(voice: VoiceLike): VoiceQuality {
  const id = voice.identifier.toLowerCase();
  if (id.includes("premium")) return "premium";
  if (id.includes("enhanced")) return "enhanced";
  if (id.includes("compact") || id.includes(ELOQUENCE)) return "compact";
  if (/\b(natural|neural)\b/i.test(voice.name) || voice.quality === "Enhanced") return "enhanced";
  return "default";
}

/** 'en_US' / 'EN-us' → 'en-us'. */
const normalizeLanguage = (lang: string): string => lang.replace(/_/g, "-").toLowerCase();

/** How well a voice's language fits: same language (English) and, as a tie-breaker, the exact locale. */
function languageFit(language: string, preferred: string): { sameLanguage: boolean; exactLocale: boolean } {
  const lang = normalizeLanguage(language);
  const want = normalizeLanguage(preferred);
  return {
    sameLanguage: lang.split("-")[0] === want.split("-")[0],
    exactLocale: lang === want || lang.startsWith(`${want}-`),
  };
}

/**
 * English before everything else; within it premium > enhanced > default >
 * compact (a premium British voice beats a compact American one), then the
 * preferred locale, then name. Novelty voices are dropped and duplicates
 * collapse to the first seen. Pass the device locale as preferredLanguage
 * when it is English.
 */
export const rankVoices: RankVoices = (voices, preferredLanguage = "en-US") => {
  const seen = new Set<string>();
  const ranked: RankedVoice[] = [];
  for (const v of voices) {
    if (!v.identifier || seen.has(v.identifier) || v.identifier.includes(NOVELTY)) continue;
    seen.add(v.identifier);
    const quality = voiceQuality(v);
    const fit = languageFit(v.language, preferredLanguage);
    const eloquencePenalty = v.identifier.includes(ELOQUENCE) ? 1 : 0;
    ranked.push({
      identifier: v.identifier,
      name: v.name,
      language: v.language,
      quality,
      score: (fit.sameLanguage ? 100 : 0) + QUALITY_SCORE[quality] * 10 + (fit.exactLocale ? 5 : 0) - eloquencePenalty,
    });
  }
  return ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
};

/** The saved voice when it is still installed, else the best ranked one. */
export function pickVoice(ranked: readonly RankedVoice[], identifier: string | null): RankedVoice | null {
  return (identifier ? ranked.find((v) => v.identifier === identifier) : undefined) ?? ranked[0] ?? null;
}

/** Name without vendor and locale noise: 'Microsoft Aria Online (Natural) - English (United States)' → 'Aria'. */
export function voiceDisplayName(voice: RankedVoice): string {
  const clean = voice.name
    .replace(/^(Microsoft|Google|Apple)\s+/i, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*\((premium|enhanced|compact|natural)\)\s*/gi, " ")
    .replace(/\s+Online\b/i, "")
    .trim();
  return clean || voice.name;
}

const ACCENTS: Readonly<Record<string, string>> = {
  "en-us": "American",
  "en-gb": "British",
  "en-au": "Australian",
  "en-ie": "Irish",
  "en-in": "Indian",
  "en-za": "South African",
  "en-nz": "New Zealand",
  "en-ca": "Canadian",
  "en-sg": "Singaporean",
};

const QUALITY_LABEL: Readonly<Record<VoiceQuality, string | null>> = {
  premium: "Premium",
  enhanced: "Enhanced",
  compact: "Compact",
  default: null,
};

/** Second line in the Voice sheet: 'British · Premium'. */
export function voiceSubtitle(voice: RankedVoice): string {
  const lang = normalizeLanguage(voice.language);
  const accent = ACCENTS[lang.slice(0, 5)] ?? voice.language;
  const tier = QUALITY_LABEL[voice.quality];
  return tier ? `${accent} · ${tier}` : accent;
}

/** True when the best English voice is only compact: show VOICE_DOWNLOAD_HINT (on iOS). */
export function suggestsVoiceDownload(ranked: readonly RankedVoice[]): boolean {
  const best = ranked.find((v) => normalizeLanguage(v.language).startsWith("en"));
  return best === undefined || best.quality === "compact";
}
