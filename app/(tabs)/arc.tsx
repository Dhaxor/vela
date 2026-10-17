// ARC TAB: the Memory Book (ELEVATE §0.9, §3, P7). Every chapter, bridge and
// proof of a dream, kept in the order they happened, as one virtualized list:
// header (switcher + the dream) → season by season, ChapterPlate → Bridge →
// Proof → the next ChapterPlate → … → the ghost plate for a new dream.
// - Tap a chapter to reread it (/story/<id>); tap a proof to see its star (/sky/<dreamId>).
// - '…' holds rename / rest / release, each behind a sheet that states its consequences.
// - Business rules come from useArc(): canCreateDream, weavingDreamIds and the actions.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, View, useWindowDimensions, type ListRenderItemInfo } from "react-native";
import { useRouter } from "expo-router";
import { MoreHorizontal } from "@/components/glyphs/icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { ChapterMeta, DreamId, Proof } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { usePlus } from "@/contexts/PlusContext";
import { useProgress } from "@/contexts/RitualContext";
import { IconButton, Screen, T, drift, useMotion } from "@/components/ui";
import {
  ArcEmpty,
  BookStartPlate,
  BridgeNode,
  ChapterPlate,
  CourseNode,
  DreamHeader,
  DreamMenu,
  DreamSwitcher,
  GhostPlate,
  PlateSpine,
  ProofNode,
  SeasonDivider,
  buildTimeline,
  dreamStats,
  orderDreams,
  type DreamStanding,
  type TimelineRow,
} from "@/components/feature/arc";
import { now } from "@/lib/clock";
import { localDateKey } from "@/lib/progress";
import { gutterFor } from "@/lib/sky";
import { colors, motion, space } from "@/constants/theme";

/** Rows the thread runs through (season dividers and the 1.0 note break it). */
const THREADED = new Set<TimelineRow["kind"]>(["chapter", "bridge", "proof", "course"]);

export default function ArcScreen() {
  const arc = useArc();
  const plus = usePlus();
  const { state: progress } = useProgress();
  const router = useRouter();
  // This component renders <Screen>, so it sits outside Screen's gutter context.
  const gutter = gutterFor(useWindowDimensions().width);
  const policy = useMotion();
  const list = useRef<FlatList<TimelineRow>>(null);

  const dreams = useMemo(() => orderDreams(arc.dreams), [arc.dreams]);
  const [selectedId, setSelectedId] = useState<DreamId | null>(arc.activeDreamId ?? dreams[0]?.id ?? null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Follow Today's focus when it changes (the switcher here only browses), except
  // when an action taken here moved it: resting the focused dream must not
  // swap the open book for another one under the user's thumb.
  // (A short window: actions resolve on the in-memory commit, so the focus change lands at once.)
  const keepOpen = useRef<{ id: DreamId; until: number } | null>(null);
  useEffect(() => {
    const keep = keepOpen.current;
    keepOpen.current = null;
    if (keep && Date.now() < keep.until) setSelectedId(keep.id);
    else if (arc.activeDreamId) setSelectedId(arc.activeDreamId);
  }, [arc.activeDreamId]);

  const dream = dreams.find((d) => d.id === selectedId) ?? dreams[0] ?? null;
  const dreamId = dream?.id ?? null;
  const weaving = !!dreamId && arc.weavingDreamIds.includes(dreamId);
  const standing: DreamStanding = !dream
    ? "weaving"
    : dream.status === "released"
      ? "released"
      : dream.status === "resting"
        ? "resting"
        : weaving
          ? "weaving"
          : "plan-locked";

  const today = localDateKey(now());
  const input = useMemo(
    () => (dream ? { dream, chapters: arc.chapters(dream.id), bridges: arc.bridges(dream.id), proofs: arc.proofs(dream.id), weaving } : null),
    [arc, dream, weaving]
  );
  const rows = useMemo(() => (input ? buildTimeline(input) : []), [input]);
  const stats = useMemo(
    () => (input ? dreamStats(input, progress.days, progress.nightsShownUp) : { chapters: 0, proofs: 0, nights: 0 }),
    [input, progress.days, progress.nightsShownUp]
  );
  const seasonProgress = dreamId ? arc.seasonProgress(dreamId) : undefined;
  const kinds = useMemo(() => (dream ? arc.proofs(dream.id, dream.season).map((p) => p.kind) : []), [arc, dream]);
  const latest = dreamId ? arc.latestChapter(dreamId) : undefined;
  const otherWeaving = useMemo(() => {
    const id = arc.weavingDreamIds.find((d) => d !== dreamId);
    return (id ? arc.dream(id) : undefined) ?? null;
  }, [arc, dreamId]);

  // A soft crossfade when another book opens (none under Reduce Motion or still mode).
  const fade = useSharedValue(1);
  const select = useCallback(
    (id: DreamId) => {
      setSelectedId(id);
      list.current?.scrollToOffset({ offset: 0, animated: false });
      if (policy.transitions) {
        fade.value = 0.35;
        fade.value = withTiming(1, { duration: motion.state, easing: drift });
      }
    },
    [fade, policy.transitions]
  );
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const openChapter = useCallback((meta: ChapterMeta) => router.push({ pathname: "/story/[id]", params: { id: meta.id } }), [router]);
  const openSky = useCallback(
    (proof?: Proof) => {
      if (!dreamId) return;
      // season/star let the sky open on that proof's star (StarDetailSheet) when it supports them.
      router.push({
        pathname: "/sky/[intentId]",
        params: proof ? { intentId: dreamId, season: String(proof.season), star: String(proof.starIndex) } : { intentId: dreamId },
      });
    },
    [router, dreamId]
  );
  const cross = useCallback(() => {
    if (dreamId) router.push({ pathname: "/evidence/[intentId]", params: { intentId: dreamId } });
  }, [router, dreamId]);
  // The free dream already weaves: the second one is a Plus entry point (same context param as /story/new).
  const newDream = useCallback(
    () => (arc.canCreateDream ? router.push("/story/new") : router.push({ pathname: "/paywall", params: { from: "second-dream" } })),
    [router, arc.canCreateDream]
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<TimelineRow>) => {
      if (!dream) return null;
      const above = index > 0 && THREADED.has(rows[index - 1].kind) && THREADED.has(item.kind);
      const below = index < rows.length - 1 && THREADED.has(rows[index + 1].kind) && THREADED.has(item.kind);
      switch (item.kind) {
        case "season":
          return <SeasonDivider row={item} today={today} first={index === 0} />;
        case "book-start":
          return <BookStartPlate row={item} />;
        case "chapter":
          return (
            <View style={styles.plateRow}>
              <PlateSpine above={above} below={below} />
              <ChapterPlate row={item} dream={dream} today={today} onOpen={openChapter} />
            </View>
          );
        case "bridge":
          return <BridgeNode row={item} above={above} below={below} onCross={item.bridge.status === "open" && weaving ? cross : undefined} />;
        case "proof":
          return <ProofNode row={item} today={today} above={above} below={below} onOpen={openSky} />;
        case "course":
          return <CourseNode row={item} above={above} />;
      }
    },
    [dream, rows, today, weaving, openChapter, openSky, cross]
  );

  if (!dream) {
    return (
      <Screen scroll={false} testID="arc-screen">
        <ArcEmpty onBegin={() => router.push("/story/new")} />
      </Screen>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <T variant="eyebrow" tone="muted" accessibilityRole="header">
          Memory book
        </T>
        {standing !== "released" ? (
          <IconButton accessibilityLabel="Dream options" variant="vellum" onPress={() => setMenuOpen(true)} testID="arc-menu">
            <MoreHorizontal color={colors.ink80} size={22} strokeWidth={1.75} />
          </IconButton>
        ) : (
          <View style={styles.menuSpace} />
        )}
      </View>
      <DreamSwitcher dreams={dreams} selectedId={dream.id} onSelect={select} />
      <View style={dreams.length > 1 ? styles.headerGap : styles.headerGapTight}>
        <DreamHeader
          dream={dream}
          latest={latest}
          progress={seasonProgress}
          kinds={kinds}
          stats={stats}
          standing={standing}
          onOpenSky={() => openSky()}
        />
      </View>
    </View>
  );

  return (
    <Screen scroll={false} padded={false} focus={dream.focus} testID="arc-screen">
      <Animated.View style={[styles.flex, fadeStyle]}>
        <FlatList
          ref={list}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderItem}
          extraData={dream.id}
          ListHeaderComponent={header}
          ListFooterComponent={<GhostPlate dreamCount={dreams.length} activeCount={dreams.filter((d) => d.status === "active").length} canCreate={arc.canCreateDream} onPress={newDream} />}
          contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={11}
          testID="arc-timeline"
        />
      </Animated.View>
      <DreamMenu
        dream={dream}
        standing={standing}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        isPlus={plus.isPlus}
        otherWeaving={otherWeaving}
        hasOpenBridge={!!arc.openBridge(dream.id)}
        onAction={() => (keepOpen.current = { id: dream.id, until: Date.now() + 1500 })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: space.sm, paddingBottom: space.xxl },
  header: { paddingBottom: space.base },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  menuSpace: { height: 44 },
  headerGap: { marginTop: space.lg },
  headerGapTight: { marginTop: space.sm },
  plateRow: { paddingVertical: space.sm },
});
