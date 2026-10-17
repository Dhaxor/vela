// TODAY. The night's one page: who you are becoming (the sky), what is asked
// of you tonight (the loop card, one filled CTA), and two small rituals.
//
// Top to bottom: progress chip + settings, the greeting, the SkyHero (the
// focused dream's constellation, ~30% of the window, 200pt floor), the weekly
// rhythm, dream pills (only with more than one dream), the LOOP CARD, the
// Sunday Proof Ledger, and the 2-up rituals row.
//
// 1.0 testIDs kept: open-settings, streak-chip, future-memory-card,
// record-proof, weave-next-chapter, proof-constellation, ritual-affirmation,
// ritual-script.
import React, { useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Settings } from "lucide-react-native";
import { useArc } from "@/contexts/ArcContext";
import { useProgress } from "@/contexts/RitualContext";
import { useUser } from "@/contexts/UserContext";
import type { Dream } from "@/contexts/arc.types";
import { now } from "@/lib/clock";
import { localDateKey, shouldShowLedger, weeklyLedger } from "@/lib/progress";
import { VELA_SAIL, figureFor } from "@/lib/sky/figures";
import { heroHeight } from "@/lib/sky/layout";
import { IconButton, Screen, T, useToast } from "@/components/ui";
import {
  ArcSwitcher,
  LedgerCard,
  LoopCard,
  NightsChip,
  RitualsRow,
  SkyHero,
  WeeklyRhythm,
  greetingFor,
  type ArcSwitcherItem,
} from "@/components/feature/today";
import { NotTodaySheet } from "@/components/feature/proof";
import { colors, space } from "@/constants/theme";

function byCreated(a: Dream, b: Dream): number {
  return a.createdAt.localeCompare(b.createdAt);
}

export default function TodayScreen() {
  const router = useRouter();
  const arc = useArc();
  const toast = useToast();
  const { profile } = useUser();
  const { summary } = useProgress();
  const win = useWindowDimensions();
  const params = useLocalSearchParams<{ ledger?: string }>();
  const at = now();
  const todayKey = localDateKey(at);

  const [viewId, setViewId] = useState<string | null>(null);
  // The Not-today sheet keeps its dream after closing so it can animate out.
  const [notToday, setNotToday] = useState<{ dreamId: string; open: boolean } | null>(null);

  // Dreams that can be shown: everything not released, oldest first.
  const shown = useMemo(() => arc.dreams.filter((d) => d.status !== "released").sort(byCreated), [arc.dreams]);
  const dream = (viewId ? shown.find((d) => d.id === viewId) : undefined) ?? arc.activeDream ?? shown[0] ?? null;
  const dreamId = dream?.id ?? null;
  const loop = arc.loopState(dreamId, at);

  const season = dreamId ? arc.seasonProgress(dreamId) : undefined;
  const seasonNo = season?.season ?? dream?.season ?? 1;
  const lit = season?.stars ?? 0;
  const proofsThisSeason = useMemo(
    () => (dreamId ? [...arc.proofs(dreamId, seasonNo)].sort((a, b) => a.starIndex - b.starIndex) : []),
    [arc, dreamId, seasonNo]
  );
  const kinds = proofsThisSeason.map((p) => p.kind);
  const figure = dreamId ? figureFor(dreamId, seasonNo) : VELA_SAIL;
  const figureName = season?.constellationName ?? figure.name;

  const allProofs = useMemo(() => arc.dreams.flatMap((d) => arc.proofs(d.id)), [arc]);
  const ledger = useMemo(() => weeklyLedger(allProofs, at), [allProofs, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const ledgerPreview = __DEV__ && params.ledger === "1";
  const showLedger = shouldShowLedger(ledger, at) || ledgerPreview;

  const items: ArcSwitcherItem[] = shown.map((d) => ({
    dream: d,
    quiet: d.status === "resting" ? "resting" : arc.planLockedDreamIds.includes(d.id) ? "plan-locked" : null,
  }));

  const select = async (id: string) => {
    if (id === dreamId) return;
    // Focusing a weaving dream is free of side effects, so it persists. A
    // resting or plan-locked dream is only viewed: waking it is an explicit
    // choice on its card (it can change which dream weaves).
    if (arc.weavingDreamIds.includes(id)) {
      setViewId(null);
      try {
        await arc.setActiveDream(id);
      } catch {
        toast.show({ message: "That dream couldn’t be opened. Try again.", tone: "error" });
      }
    } else {
      setViewId(id);
    }
  };

  const heroH = heroHeight(win.height);
  // Small phones (iPhone SE) tighten the gaps so the loop card's CTA stays above the fold.
  const roomy = win.height >= 760;
  const name = profile?.name?.trim() || "friend";
  const openBridge = dreamId ? arc.openBridge(dreamId) : undefined;
  // A brand-new sky says so, instead of '0 nights · 0 stars'.
  const firstNight = summary.nightsShownUp === 0 && summary.stars === 0;

  return (
    <Screen testID="today-screen" contentStyle={styles.content}>
      <View style={styles.top}>
        <T variant="display" accessibilityRole="header" style={styles.greeting} testID="today-greeting">
          {greetingFor(at)}, {name}.
        </T>
        <IconButton accessibilityLabel="Settings" variant="vellum" onPress={() => router.push("/settings")} testID="open-settings">
          <Settings color={colors.ink80} size={20} strokeWidth={1.75} />
        </IconButton>
      </View>

      {dream ? (
        <View style={styles.status}>
          <NightsChip label={firstNight ? "Your first night" : summary.chipLabel} nights={summary.nightsShownUp} stars={summary.stars} />
          <WeeklyRhythm week={summary.week} paused={summary.paused} todayKey={todayKey} />
        </View>
      ) : null}

      <SkyHero
        figure={figure}
        lit={dream ? lit : 0}
        kinds={kinds}
        width={win.width}
        height={heroH}
        identity={`${dreamId ?? "none"}#${seasonNo}`}
        caption={dream ? `${figureName} · ${lit} of 7` : undefined}
        onPress={dreamId ? () => router.push({ pathname: "/sky/[intentId]", params: { intentId: dreamId } }) : undefined}
        accessibilityLabel={dream ? `Your sky: ${figureName}, ${lit} of 7 stars lit` : "An empty sky, waiting for a dream"}
      />

      {items.length > 1 ? (
        <View style={[styles.switcher, roomy && styles.roomy]}>
          <ArcSwitcher items={items} selectedId={dreamId} onSelect={(id) => void select(id)} />
        </View>
      ) : null}

      <View style={[styles.card, roomy && styles.roomy]}>
        <LoopCard
          loop={loop}
          now={at}
          onNotToday={(id) => setNotToday({ dreamId: id, open: true })}
        />
      </View>

      {showLedger ? (
        <View style={styles.section}>
          <LedgerCard ledger={ledger} nextBridge={openBridge ?? null} preview={ledgerPreview && !shouldShowLedger(ledger, at)} />
        </View>
      ) : null}

      {dream ? (
        <View style={styles.section}>
          <RitualsRow
            dream={dream}
            name={profile?.name?.trim() ?? ""}
            todayKey={todayKey}
            carriedToday={summary.doneToday.includes("line-carried")}
            wroteToday={summary.doneToday.includes("ritual-saved")}
          />
        </View>
      ) : null}

      {notToday ? (
        // S4's sheet: the lesson becomes a learned star, then the Star Birth on /evidence.
        <NotTodaySheet
          visible={notToday.open}
          onClose={() => setNotToday((v) => (v ? { ...v, open: false } : v))}
          dreamId={notToday.dreamId}
          testID="not-today"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.sm },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  greeting: { flex: 1, paddingTop: space.xxs },
  status: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, marginTop: space.xs, marginBottom: space.xs },
  switcher: { marginTop: space.md },
  card: { marginTop: space.md },
  roomy: { marginTop: space.base },
  section: { marginTop: space.lg },
});
