// /sky/[intentId]: a dream's constellation, full screen. Opened from the
// Today hero and the Arc header (a stack route, not a tab).
//
// - The season's figure fills the screen; every lit star is tappable and
//   opens StarDetailSheet (date, kind, sentence, photo, 'Changed Chapter N').
// - From Season 2 on, the named skies sit above as engraved plates; tapping
//   one shows that season.
// - 'See as a list' is the same stars as rows (VoiceOver, large text).
// - A complete season is named here if the Named Sky was skipped, and then
//   'Begin Season N' starts the next one, for a dream that weaves; a resting
//   or plan-locked dream says so and offers to wake it first.
// - A past season that was whole but never named (a 1.0 season migrated in
//   one piece) can be named from its plate.
// - Gentle lifetime milestones (3, 12, 30 stars), in copy only.
// Deep-link safe: back uses safeBack (Header), and an unknown id gets a
// designed empty state instead of a blank page.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { List, Sparkles } from "@/components/glyphs/icons";
import { useArc } from "@/contexts/ArcContext";
import { STARS_PER_SEASON, isArcError } from "@/contexts/arc.types";
import { figureFor } from "@/lib/sky/figures";
import { seasonStageLabel } from "@/lib/story/seasons";
import { Vignette } from "@/components/glyphs";
import { GhostButton, Header, PrimaryButton, Screen, T, haptics, useToast } from "@/components/ui";
import { dreamGivenName } from "@/lib/dreams";
import { focusById } from "@/lib/focus";
import { ShareCardSheet, evidenceHref, nameSeasonHref, weaveHref } from "@/components/feature/proof";
import {
  ConstellationView,
  KindLegend,
  SeasonStrip,
  StarDetailSheet,
  StarList,
  skyLine,
  useWakeDream,
  type SeasonPlate,
  type StarSelection,
} from "@/components/feature/sky";
import { colors, space } from "@/constants/theme";

export default function SkyScreen() {
  // season/star (from the Arc timeline) open the sky on that proof's star.
  const params = useLocalSearchParams<{ intentId: string; season?: string; star?: string }>();
  const intentId = typeof params.intentId === "string" ? params.intentId : "";
  const router = useRouter();
  const arc = useArc();
  const toast = useToast();
  const win = useWindowDimensions();
  const dream = intentId ? arc.dream(intentId) : undefined;
  const progress = dream ? arc.seasonProgress(dream.id) : undefined;
  const current = progress?.season ?? dream?.season ?? 1;

  const askedSeason = Number(params.season);
  const askedStar = Number(params.star);
  const [viewSeason, setViewSeason] = useState(Number.isInteger(askedSeason) && askedSeason >= 1 && askedSeason <= current ? askedSeason : current);
  const [mode, setMode] = useState<"sky" | "list">("sky");
  const [selection, setSelection] = useState<StarSelection | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [waking, setWaking] = useState(false);
  const wakeDream = useWakeDream();

  // A new season (Begin Season N) moves the view along with it.
  const firstSeason = useRef(current);
  useEffect(() => {
    if (current !== firstSeason.current) {
      firstSeason.current = current;
      setViewSeason(current);
    }
  }, [current]);

  // Arrived from a proof in the Arc timeline: open its star once.
  useEffect(() => {
    if (!dream || !Number.isInteger(askedStar)) return;
    const hit = arc.proofs(dream.id, viewSeason).find((p) => p.starIndex === askedStar);
    if (hit) setSelection({ kind: "proof", proofId: hit.id });
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!dream]);

  const complete = !!progress?.complete;
  const unnamed = complete && !progress?.constellationName;

  const plates: SeasonPlate[] = useMemo(() => {
    if (!dream) return [];
    return Array.from({ length: current }, (_, i) => {
      const season = i + 1;
      const proofs = [...arc.proofs(dream.id, season)].sort((a, b) => a.starIndex - b.starIndex);
      return {
        season,
        figure: figureFor(dream.id, season),
        lit: season === current ? progress?.stars ?? proofs.length : proofs.length,
        kinds: proofs.map((p) => p.kind),
        name: dream.constellations.find((c) => c.season === season)?.name ?? null,
        current: season === current,
      };
    });
  }, [arc, dream, current, progress?.stars]);

  if (!dream) {
    return (
      <Screen header={<Header title="Your sky" testID="sky" />} testID="sky-screen">
        <View style={styles.empty} testID="sky-empty">
          <Vignette name="window" width={160} />
          <T variant="title" center style={styles.emptyTitle}>
            This sky has drifted off.
          </T>
          <T variant="body" center style={styles.emptyBody}>
            This link points to a sky that isn’t on this phone. A backup may bring it back.
          </T>
          <PrimaryButton label="Back to Today" onPress={() => router.replace("/")} testID="sky-empty-home" />
        </View>
      </Screen>
    );
  }

  const plate = plates.find((p) => p.season === viewSeason) ?? plates[plates.length - 1];
  const proofs = [...arc.proofs(dream.id, plate.season)].sort((a, b) => a.starIndex - b.starIndex);
  const isCurrent = plate.season === current;
  const title = plate.name ?? plate.figure.name;
  const figureNote =
    plate.season === 1 ? "Drawn on the real stars of Vela, the Sails." : "An original figure, drawn for this dream.";
  const figW = win.width;
  // The figure takes the room the text leaves, so the page fills the screen on tall phones.
  const reserved = 400 + (plates.length > 1 ? 136 : 0);
  const figH = Math.round(Math.min(560, Math.max(260, win.height - reserved)));

  // Only a weaving dream can begin its next season (beginNextSeason requires it).
  const weaving = arc.weavingDreamIds.includes(dream.id);
  const planLocked = arc.planLockedDreamIds.includes(dream.id);
  const released = dream.status === "released";
  // A past season that is whole but has no name (CONTRACTS §3: 'the Named Sky can still be done').
  const pastUnnamed = !isCurrent && !released && plate.lit >= STARS_PER_SEASON && !plate.name;

  const begin = async () => {
    setStarting(true);
    try {
      const chapter = await arc.beginNextSeason(dream.id);
      haptics.reveal();
      router.push(weaveHref(chapter.id));
    } catch (e) {
      const code = isArcError(e) ? e.code : null;
      toast.show({
        message:
          code === "season-incomplete"
            ? "This season still has stars to light."
            : code === "dream-not-weaving"
              ? "This dream is resting. Wake it to begin its next season."
              : "The next season couldn’t start. Try again.",
        tone: "error",
      });
    } finally {
      setStarting(false);
    }
  };
  const wake = async () => {
    setWaking(true);
    try {
      await wakeDream(dream);
    } finally {
      setWaking(false);
    }
  };

  return (
    <Screen
      variant="reveal"
      focus={dream.focus}
      testID="sky-screen"
      // The header names the dream briefly (its given name, else its area); the figure's own name sits below.
      header={<Header title={dreamGivenName(dream) ?? focusById(dream.focus)?.label ?? "Your sky"} testID="sky" />}
    >
      <SeasonStrip plates={plates} selected={plate.season} onSelect={setViewSeason} />

      <View style={[styles.intro, plates.length > 1 && styles.introAfterStrip]}>
        <T variant="eyebrow" tone="muted" center numeric>
          {isCurrent && progress ? seasonStageLabel(plate.season, progress.stage) : `Season ${plate.season} · complete`}
        </T>
        <T
          variant="display"
          tone={plate.name ? "gold" : "primary"}
          italic={!!plate.name}
          center
          accessibilityRole="header"
          style={styles.title}
          testID="sky-title"
        >
          {title}
        </T>
        <T variant="caption" tone="muted" center numeric>
          {plate.lit} of 7 stars · {figureNote}
        </T>
      </View>

      {mode === "sky" ? (
        <>
          <ConstellationView
            dream={dream}
            season={plate.season}
            figure={plate.figure}
            proofs={proofs}
            lit={plate.lit}
            width={figW}
            height={figH}
            onSelect={setSelection}
          />
          <T variant="caption" tone="faint" center style={styles.hint}>
            {plate.lit > 0 ? "Tap a star to reread its day." : "Tap the gold star: it is your dream."}
          </T>
          <View style={styles.legend}>
            <KindLegend />
          </View>
        </>
      ) : (
        <View style={styles.list}>
          <StarList dream={dream} season={plate.season} proofs={proofs} onSelect={setSelection} />
        </View>
      )}

      {isCurrent && complete && !released ? (
        <View style={styles.actions}>
          {unnamed ? (
            <PrimaryButton label="Name your sky" onPress={() => router.push(evidenceHref(dream.id))} testID="sky-name" />
          ) : weaving ? (
            <PrimaryButton label={`Begin Season ${current + 1}`} loading={starting} onPress={() => void begin()} testID="sky-begin-season" />
          ) : (
            <View style={styles.resting} testID="sky-season-resting">
              <T variant="body" center>
                {planLocked
                  ? `Vela Plus has ended, so one dream weaves at a time. Choose this one and Season ${current + 1} can begin.`
                  : `This dream is resting. Wake it and Season ${current + 1} can begin.`}
              </T>
              <PrimaryButton
                label={planLocked ? "Keep this dream weaving" : "Wake this dream"}
                loading={waking}
                onPress={() => void wake()}
                testID="sky-wake-dream"
              />
            </View>
          )}
        </View>
      ) : null}

      {pastUnnamed ? (
        <View style={styles.actions}>
          <PrimaryButton label="Name this sky" onPress={() => router.push(nameSeasonHref(dream.id, plate.season))} testID="sky-name-season" />
        </View>
      ) : null}

      <View style={styles.milestone} testID="sky-milestone">
        <T variant="reading" italic tone="secondary" center>
          {skyLine(arc.totalStars)}
        </T>
        {arc.dreams.length > 1 ? (
          <T variant="caption" tone="faint" center>
            Counted across every dream you keep.
          </T>
        ) : null}
      </View>

      <GhostButton
        label={mode === "sky" ? "See as a list" : "See as a sky"}
        icon={mode === "sky" ? <List color={colors.ink80} size={18} strokeWidth={1.75} /> : <Sparkles color={colors.ink80} size={18} strokeWidth={1.75} />}
        onPress={() => setMode(mode === "sky" ? "list" : "sky")}
        testID="sky-toggle-list"
        style={styles.toggle}
      />

      <StarDetailSheet
        dream={dream}
        selection={selection}
        onClose={() => setSelection(null)}
        onShare={(proofId) => {
          setSelection(null);
          // Let the detail sheet leave before the share sheet rises (one modal at a time on iOS).
          setTimeout(() => setShareId(proofId), 320);
        }}
      />
      <ShareCardSheet visible={shareId !== null} onClose={() => setShareId(null)} dreamId={dream.id} proofId={shareId} testID="share-card" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.xs, marginTop: space.sm },
  introAfterStrip: { marginTop: space.lg },
  title: { marginVertical: space.xxs },
  hint: { marginTop: space.xs },
  legend: { marginTop: space.base },
  list: { marginTop: space.lg },
  actions: { marginTop: space.lg },
  resting: { gap: space.base },
  milestone: { marginTop: space.xl, gap: space.xs, paddingHorizontal: space.base },
  toggle: { marginTop: space.base },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.huge },
  emptyTitle: { marginTop: space.lg },
  emptyBody: { marginTop: space.sm, marginBottom: space.lg },
});
