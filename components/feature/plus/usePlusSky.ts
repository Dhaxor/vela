// The data behind the paywall's 'your own sky': the user's dreams as drawn
// constellations, seeded ghost figures for dreams not yet begun, and the
// stats line. Reads useArc() selectors only.
//
// A dream that has just begun a new season (0 stars) is drawn with the season
// it completed, so a 'The Studio' sky shows its seven stars, not an empty
// course.
import { useMemo } from "react";
import type { Dream } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { focusById, type FocusId } from "@/lib/focus";
import { FIGURE_STARS, figureFor, type Figure } from "@/lib/sky";
import { statsLine } from "./copy";
import type { SkyDream } from "./PlusSky";

export interface PlusSkyModel {
  readonly dreams: readonly SkyDream[];
  readonly ghosts: readonly Figure[];
  /** 'Career · Season 1 · 5 proofs' for the dream in focus; null before any dream. */
  readonly stats: string | null;
  readonly area: string | null;
  readonly focus: FocusId | null;
  /** Stars across every dream. */
  readonly stars: number;
  readonly accessibilityLabel: string;
}

const SHOWN = 2;
const SLOTS = 3;

export function usePlusSky(): PlusSkyModel {
  const arc = useArc();
  return useMemo(() => {
    const kept = arc.dreams.filter((d) => d.status !== "released");
    const focused = kept.find((d) => d.id === arc.activeDreamId) ?? kept[0] ?? null;
    const ordered: Dream[] = focused ? [focused, ...kept.filter((d) => d.id !== focused.id)] : [];

    const dreams: SkyDream[] = ordered.slice(0, SHOWN).map((d, index) => {
      const area = focusById(d.focus)?.label ?? "Your dream";
      const current = arc.seasonProgress(d.id)?.stars ?? 0;
      const season = current === 0 && d.season > 1 ? d.season - 1 : d.season;
      const proofs = arc.proofs(d.id, season);
      const lit = Math.min(FIGURE_STARS, season === d.season ? current : proofs.length);
      const named = d.constellations.find((c) => c.season === season)?.name ?? null;
      return {
        id: d.id,
        figure: figureFor(d.id, season),
        lit,
        kinds: proofs.slice(0, FIGURE_STARS).map((p) => p.kind),
        // The stats line under the hero already names the focused dream's
        // area, so its legend names only a constellation the user has named.
        caption: named ? `${named} · ${lit} of 7` : index === 0 ? `${lit} of 7 stars` : `${area} · ${lit} of 7`,
        spoken: `${named ?? area}, ${lit} of 7 stars`,
      };
    });

    const seed = focused?.id ?? "vela";
    const ghostCount = Math.max(1, SLOTS - dreams.length);
    const ghosts = Array.from({ length: ghostCount }, (_, i) => figureFor(`${seed}:ghost`, 2 + i));

    const area = focused ? focusById(focused.focus)?.label ?? null : null;
    const stats = focused && area ? statsLine(area, focused.season, arc.proofs(focused.id).length) : null;
    const spoken = dreams.map((d) => d.spoken).join("; ");
    const accessibilityLabel = `${spoken ? `Your sky: ${spoken}. ` : ""}Dashed outlines mark room for your next dream.`;

    return { dreams, ghosts, stats, area, focus: focused?.focus ?? null, stars: arc.totalStars, accessibilityLabel };
  }, [arc]);
}
