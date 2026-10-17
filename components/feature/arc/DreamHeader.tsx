// The open book's header, kept compact so the timeline starts in the first
// viewport even on an iPhone SE:
// - the cover: this season's generative plate (its constellation with the
//   stars lit so far and the current chapter's numeral). It is the dream's
//   constellation thumbnail: tap it to open the full sky (/sky/<dreamId>);
// - the dream in the user's own words (and its name, once it has one);
// - 'Season 1 · Stage III of VII';
// - a ledger: chapters · proofs · nights, and 'Your sky'.
import React from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { ChapterMeta, Dream, ProofKind, SeasonProgress } from "@/contexts/arc.types";
import { Press, T, UserWords } from "@/components/ui";
import { ChapterCover } from "@/components/sky";
import { AreaSign } from "@/components/glyphs";
import { focusById } from "@/lib/focus";
import { seasonStageLabel } from "@/lib/story/seasons";
import { cardShadow, colors, hitSize, radius, space } from "@/constants/theme";
import { dreamName, type DreamStats } from "./model";

export type DreamStanding = "weaving" | "resting" | "released" | "plan-locked";

export interface DreamHeaderProps {
  dream: Dream;
  latest: ChapterMeta | undefined;
  progress: SeasonProgress | undefined;
  /** Kinds of the current season's stars, star 1 first. */
  kinds: readonly ProofKind[];
  stats: DreamStats;
  standing: DreamStanding;
  onOpenSky: () => void;
}

const COVER = { width: 96, height: 128 } as const;

const STANDING: Record<Exclude<DreamStanding, "weaving">, { tag: string; note: string }> = {
  resting: { tag: "Resting", note: "Its book stays open. Wake it from the menu." },
  released: { tag: "Released", note: "Every chapter and proof stays here to reread." },
  "plan-locked": { tag: "Paused", note: "Waiting while Plus is off. Its book stays open." },
};

export function DreamHeader({ dream, latest, progress, kinds, stats, standing, onOpenSky }: DreamHeaderProps) {
  const name = dreamName(dream);
  const area = focusById(dream.focus)?.label ?? "";
  const stars = progress?.stars ?? 0;
  const skyLabel = `Your sky: ${stars} of 7 stars this season.`;

  return (
    <View testID="arc-dream-header">
      <View style={styles.top}>
        <Press
          onPress={onOpenSky}
          pressScale={0.97}
          style={styles.cover}
          testID={`story-card-${dream.id}`}
          accessibilityLabel={skyLabel}
          accessibilityHint="Opens your constellation"
        >
          <ChapterCover
            dreamId={dream.id}
            season={dream.season}
            focus={dream.focus}
            chapter={latest?.season === dream.season ? latest.number : 1}
            lit={stars}
            kinds={kinds}
            width={COVER.width}
            height={COVER.height}
          />
        </Press>
        <View style={styles.intro}>
          <View style={styles.area}>
            <AreaSign focus={dream.focus} size={14} color={colors.ink64} strokeWidth={1.4} />
            <T variant="eyebrow" tone="muted" numberOfLines={1}>
              {standing === "weaving" ? area : `${area} · ${STANDING[standing].tag}`}
            </T>
          </View>
          {name ? (
            <>
              <T variant="title" numberOfLines={2} style={styles.name} testID="arc-dream-name">
                {name}
              </T>
              <UserWords variant="caption" numberOfLines={2} style={styles.words}>
                {dream.desire}
              </UserWords>
            </>
          ) : (
            <UserWords variant="reading" numberOfLines={4} style={styles.name} testID="arc-dream-name">
              {dream.desire}
            </UserWords>
          )}
          {progress ? (
            <T variant="caption" tone="secondary" numeric style={styles.stage} testID="arc-season-stage">
              {seasonStageLabel(progress.season, progress.stage)}
            </T>
          ) : null}
          {standing !== "weaving" ? (
            <T variant="caption" tone="muted" style={styles.standing} testID="arc-standing">
              {STANDING[standing].note}
            </T>
          ) : null}
        </View>
      </View>

      <View style={styles.ledger}>
        <View style={styles.stats} accessible accessibilityLabel={`${stats.chapters} chapters, ${stats.proofs} proofs, ${stats.nights} nights.`} testID="arc-stats">
          <Stat value={stats.chapters} label={stats.chapters === 1 ? "chapter" : "chapters"} />
          <View style={styles.divider} />
          <Stat value={stats.proofs} label={stats.proofs === 1 ? "proof" : "proofs"} />
          <View style={styles.divider} />
          <Stat value={stats.nights} label={stats.nights === 1 ? "night" : "nights"} />
        </View>
        <Press onPress={onOpenSky} style={styles.open} testID={`arc-sky-${dream.id}`} accessibilityLabel={skyLabel} accessibilityHint="Opens your constellation">
          <T variant="body" tone="secondary">
            Your sky
          </T>
          <ChevronRight color={colors.ink64} size={18} strokeWidth={1.75} />
        </Press>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <T variant="title" numeric>
        {String(value)}
      </T>
      <T variant="caption" tone="muted">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: space.base },
  cover: {
    width: COVER.width,
    height: COVER.height,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.goldEngrave,
    ...cardShadow,
  },
  intro: { flex: 1 },
  area: { flexDirection: "row", alignItems: "center", gap: space.sm },
  name: { marginTop: space.xs },
  words: { marginTop: space.xs },
  stage: { marginTop: space.sm },
  standing: { marginTop: space.xs },
  ledger: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  stats: { flexDirection: "row", alignItems: "center", gap: space.base },
  divider: { width: 1, alignSelf: "stretch", backgroundColor: colors.hairline },
  open: { flex: 1, minHeight: hitSize, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.xxs },
});
