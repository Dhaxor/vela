// CONTENT REGISTRY — the single import point for all original writing
// ("@/lib/story/content"). Steward: A2. Writers never edit this file: they
// fill the data files it imports, keeping each file's exported const name.
//
// Also exports contentEntries(), a walker that tags every text with its
// ContentKind; the contract test, the style lint and the golden matrix run
// on it.

import type { FocusId } from "@/lib/focus";
import type {
  BridgeEntry,
  ContentFileId,
  ContentKind,
  ContentStatus,
  FocusContent,
  Fragment,
  MotifArchetype,
  MotifFlag,
  MotifId,
} from "./types";

import { SHARED_STAGES, STATUS as SHARED_STATUS } from "./stages.shared";
import { LOVE, STATUS as LOVE_STATUS } from "./love";
import { ABUNDANCE, STATUS as ABUNDANCE_STATUS } from "./abundance";
import { CAREER, STATUS as CAREER_STATUS } from "./career";
import { HEALTH, STATUS as HEALTH_STATUS } from "./health";
import { CONFIDENCE, STATUS as CONFIDENCE_STATUS } from "./confidence";
import { PEACE, STATUS as PEACE_STATUS } from "./peace";
import { WEAVE, STATUS as WEAVE_STATUS } from "./weave";
import { BRIDGES, STATUS as BRIDGES_STATUS } from "./bridges";
import { MOTIFS, STATUS as MOTIFS_STATUS } from "./motifs";
import { NOTIFICATIONS, STATUS as NOTIFICATIONS_STATUS } from "@/lib/content/notifications";
import { IDENTITY_LINES, STATUS as LINES_STATUS } from "@/lib/content/lines";
import { RITUAL_PROMPTS, STATUS as PROMPTS_STATUS } from "@/lib/content/prompts";
import { ONBOARDING_CHIPS, STATUS as CHIPS_STATUS } from "@/lib/content/chips";

export * from "./types";

export {
  SHARED_STAGES,
  WEAVE,
  BRIDGES,
  MOTIFS,
  NOTIFICATIONS,
  IDENTITY_LINES,
  RITUAL_PROMPTS,
  ONBOARDING_CHIPS,
};

export const FOCUS_CONTENT: Readonly<Record<FocusId, FocusContent>> = {
  love: LOVE,
  abundance: ABUNDANCE,
  career: CAREER,
  health: HEALTH,
  confidence: CONFIDENCE,
  peace: PEACE,
};

export const CONTENT_STATUS: Readonly<Record<ContentFileId, ContentStatus>> = {
  "stages.shared": SHARED_STATUS,
  love: LOVE_STATUS,
  abundance: ABUNDANCE_STATUS,
  career: CAREER_STATUS,
  health: HEALTH_STATUS,
  confidence: CONFIDENCE_STATUS,
  peace: PEACE_STATUS,
  weave: WEAVE_STATUS,
  bridges: BRIDGES_STATUS,
  motifs: MOTIFS_STATUS,
  notifications: NOTIFICATIONS_STATUS,
  lines: LINES_STATUS,
  prompts: PROMPTS_STATUS,
  chips: CHIPS_STATUS,
};

export function motifById(id: MotifId): MotifArchetype | undefined {
  return MOTIFS.find((m) => m.id === id);
}

export function bridgesFor(focus: FocusId): readonly BridgeEntry[] {
  return BRIDGES.entries.filter((b) => b.focus === focus);
}

/* =========================================================================
 * Walker
 * ========================================================================= */

export interface ContentEntry {
  readonly file: ContentFileId;
  readonly kind: ContentKind;
  /** Content id. Synthetic for texts without one ('<templateId>#body', 'chip-desire-love-0'). */
  readonly id: string;
  readonly text: string;
  readonly requires?: readonly MotifFlag[];
  readonly excludes?: readonly MotifFlag[];
}

const FOCUS_FILES: readonly (readonly [FocusId, ContentFileId])[] = [
  ["love", "love"],
  ["abundance", "abundance"],
  ["career", "career"],
  ["health", "health"],
  ["confidence", "confidence"],
  ["peace", "peace"],
];

/** Every writer-produced text in the app, tagged with its file and kind. Deterministic order. */
export function contentEntries(): ContentEntry[] {
  const out: ContentEntry[] = [];
  const add = (file: ContentFileId, kind: ContentKind, frs: readonly Fragment[]) => {
    for (const f of frs) {
      out.push({
        file,
        kind,
        id: f.id,
        text: f.text,
        ...(f.requires ? { requires: f.requires } : {}),
        ...(f.excludes ? { excludes: f.excludes } : {}),
      });
    }
  };

  for (const stage of Object.values(SHARED_STAGES)) {
    add("stages.shared", "beat", [
      ...stage.opening.morning,
      ...stage.opening.evening,
      ...stage.sensory,
      ...stage.reflection,
      ...stage.closing.morning,
      ...stage.closing.evening,
    ]);
  }

  for (const [focus, file] of FOCUS_FILES) {
    const content = FOCUS_CONTENT[focus];
    for (const stage of Object.values(content.stages)) {
      add(file, "beat", [...stage.arrival, ...stage.living]);
      for (const t of stage.titles) out.push({ file, kind: "title", id: t.id, text: t.text });
    }
    for (const script of content.chapterOne) {
      out.push({ file, kind: "title", id: script.title.id, text: script.title.text });
      add(file, "beat", [script.opening.morning, script.opening.evening]);
      for (const item of script.body) if (item.kind === "text") add(file, "beat", [item.fragment]);
      add(file, "beat", [script.closing.morning, script.closing.evening]);
    }
  }

  for (const byPos of Object.values(WEAVE.woven)) {
    add("weave", "weave", [...byPos.arrival, ...byPos.witness, ...byPos.preClosing]);
  }
  add("weave", "seed", WEAVE.seed);
  add("weave", "notToday", WEAVE.notToday);
  add("weave", "recall", WEAVE.recall);
  add("weave", "cumulative", WEAVE.cumulative);

  for (const b of BRIDGES.entries) out.push({ file: "bridges", kind: "bridge", id: b.id, text: b.text });
  for (const frs of Object.values(BRIDGES.reshape)) add("bridges", "reshape", frs);
  add("bridges", "learnedRetry", BRIDGES.learnedRetry);

  for (const m of MOTIFS) {
    out.push({ file: "motifs", kind: "motifPhrase", id: `mo-${m.id}-place`, text: m.place });
    m.details.forEach((d, i) => out.push({ file: "motifs", kind: "motifPhrase", id: `mo-${m.id}-d${i + 1}`, text: d }));
    add("motifs", "motifLine", [...m.living, ...m.witness]);
  }

  for (const tpls of Object.values(NOTIFICATIONS)) {
    for (const t of tpls) {
      out.push({ file: "notifications", kind: "notification", id: t.id, text: t.title });
      out.push({ file: "notifications", kind: "notification", id: `${t.id}#body`, text: t.body });
    }
  }

  for (const byFocus of Object.values(IDENTITY_LINES)) {
    for (const frs of Object.values(byFocus)) add("lines", "identityLine", frs);
  }

  for (const frs of Object.values(RITUAL_PROMPTS.script)) add("prompts", "scriptPrompt", frs);
  add("prompts", "arcPrompt", RITUAL_PROMPTS.scriptArc);
  add("prompts", "gratitude", RITUAL_PROMPTS.gratitude);
  for (const frs of Object.values(RITUAL_PROMPTS.frames369)) add("prompts", "frame369", frs);

  for (const [focus, chips] of Object.entries(ONBOARDING_CHIPS.desires)) {
    chips.forEach((text, i) => out.push({ file: "chips", kind: "chip", id: `chip-desire-${focus}-${i}`, text }));
  }
  for (const f of ONBOARDING_CHIPS.feelings) {
    out.push({ file: "chips", kind: "chip", id: `chip-feeling-${f.id}`, text: f.label });
  }

  return out;
}
