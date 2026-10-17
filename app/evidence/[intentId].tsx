// /evidence/[intentId] — PROOF → STAR BIRTH → (NAMED SKY) → THE WEAVE.
//
// One route, four honest states (CONTRACTS §16, ELEVATE §0.6):
// - form: today's bridge, the kind of proof, one sentence, an optional photo.
//   'Chart this proof' is saveProofAndWeave: proof + bridge + next chapter in
//   one atomic action.
// - star birth: the card condenses into a star and flies into the figure,
//   then 'Carry it forward' (the Weave of the chapter woven from it) or
//   'Save for 21:00'. `?born=<proofId>` reopens this state for a saved proof
//   (the Not-today sheet hands over here; a reload lands here too).
// - named sky: the 7th star closes the figure; the user names it, then
//   Season 2 begins (or Chapter VII, when the seventh star wove it).
// - empty: no open bridge (read the chapter / choose a bridge first), a
//   resting dream, or an unknown one. Always a way forward.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Share2 } from "lucide-react-native";
import { holdForCeremony, useArc } from "@/contexts/ArcContext";
import { useUser } from "@/contexts/UserContext";
import { isArcError, type Bridge, type ChapterMeta, type Dream, type Proof } from "@/contexts/arc.types";
import { now } from "@/lib/clock";
import { saveForLabel } from "@/lib/ritualTime";
import { proofEnding } from "@/lib/futureMemory";
import { localDateKey } from "@/lib/progress";
import { figureFor, heroHeight } from "@/lib/sky";
import { chapterLabel } from "@/lib/story/seasons";
import { Dock, GhostButton, Header, PrimaryButton, Screen, T, useMotion, useToast } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import {
  NamedSkyCeremony,
  NamedSkyPanel,
  NotTodaySheet,
  PlusNudgeCard,
  ProofForm,
  ProofReceipt,
  ShareCardSheet,
  StarBirth,
  chapterHref,
  chimeIfAudioActive,
  nextRitual,
  seasonSpan,
  useNamedSky,
  useProofAsks,
  weaveHref,
  whenLabel,
  type NamedSkyState,
  type ProofDraft,
} from "@/components/feature/proof";
import { colors, space } from "@/constants/theme";

/** 'Chapter II begins with …' (short enough for one line on an iPhone SE). */
const BEGINS_WITH = { did: "what you did", moved: "your step", learned: "your lesson" } as const;

/** Proofs whose Star Birth already played in this app session (no replays on return). */
const PLAYED = new Set<string>();
/** A saved proof older than this opens on the finished sky instead of replaying its birth. */
const REPLAY_WINDOW_MS = 2 * 60 * 1000;

/** The figure gets the Today hero's share of the window (about 30%, 200..340). */
function useFigureHeight(): number {
  return heroHeight(useWindowDimensions().height);
}

export default function EvidenceScreen() {
  const router = useRouter();
  const arc = useArc();
  const toast = useToast();
  const params = useLocalSearchParams<{ intentId: string; born?: string }>();
  const dreamId = String(params.intentId ?? "");
  const dream = arc.dream(dreamId);
  const bornParam = typeof params.born === "string" ? params.born : null;

  const [draft, setDraft] = useState<ProofDraft>({ kind: "did", text: "", photoUri: null });
  const [saving, setSaving] = useState(false);
  const [born, setBorn] = useState<{ id: string; play: boolean } | null>(null);
  const [notToday, setNotToday] = useState(false);
  const hold = useRef<(() => void) | null>(null);
  // The form keeps showing the bridge it was saving for while the save commits.
  const shownBridge = useRef<Bridge | undefined>(undefined);

  // A proof saved elsewhere (Not today) or before a reload: its birth, once.
  const bornProof = (born ? arc.proof(born.id) : bornParam ? arc.proof(bornParam) : undefined) ?? undefined;
  const validBorn = bornProof && bornProof.dreamId === dreamId ? bornProof : undefined;
  const play =
    born?.play ??
    (!!validBorn && !PLAYED.has(validBorn.id) && now().getTime() - Date.parse(validBorn.createdAt) < REPLAY_WINDOW_MS);

  // Release the persistence gate if the screen goes away mid-ceremony.
  useEffect(() => () => hold.current?.(), []);

  const save = async () => {
    const text = draft.text.trim();
    if (!text || saving || !dream) return;
    setSaving(true);
    hold.current?.();
    hold.current = holdForCeremony();
    try {
      const result = await arc.saveProofAndWeave({ dreamId, kind: draft.kind, text, photoUri: draft.photoUri, origin: "bridge" });
      setBorn({ id: result.proof.id, play: true });
      router.setParams({ born: result.proof.id });
    } catch (e) {
      hold.current?.();
      hold.current = null;
      const code = isArcError(e) ? e.code : null;
      toast.show({
        tone: "error",
        message:
          code === "season-complete"
            ? "This season is already complete. Name its sky to begin the next."
            : code === "dream-not-weaving"
              ? "This dream is resting, so it can't take a new star right now."
              : code === "invalid-input"
                ? "Write one sentence first. A few words are enough."
                : "That didn't save. Your words are still here; try once more.",
      });
    } finally {
      setSaving(false);
    }
  };

  const header = <Header testID="evidence" backLabel="Back" />;

  if (!arc.ready) {
    return <Screen header={header} testID="evidence-loading" />;
  }

  if (!dream || dream.status === "released") {
    return (
      <EmptyState
        header={header}
        title="This dream has drifted off."
        body="It may have been released, or replaced by a backup. Everything you charted for it is still in your Arc."
        primary={{ label: "Return to Today", onPress: () => router.replace("/"), testID: "evidence-empty-home" }}
      />
    );
  }

  // The ceremony for a saved proof (just now, or handed over by Not today).
  if (validBorn && !saving) {
    return (
      <BirthView
        key={validBorn.id}
        dream={dream}
        proof={validBorn}
        play={play}
        holdRef={hold}
        onPlayed={() => PLAYED.add(validBorn.id)}
      />
    );
  }

  const progress = arc.seasonProgress(dreamId);
  if (progress?.complete && !saving) {
    return <CompleteView dream={dream} season={progress.season} />;
  }

  if (!arc.weavingDreamIds.includes(dreamId)) {
    return (
      <EmptyState
        header={header}
        vignette="window"
        title="This dream is resting."
        body="Its stars and chapters are all still here. Choose it on Today and it weaves again."
        primary={{ label: "Return to Today", onPress: () => router.replace("/"), testID: "evidence-empty-home" }}
      />
    );
  }

  const open = arc.openBridge(dreamId);
  if (open) shownBridge.current = open;
  // While a save (or a Not-today save) commits, the bridge resolves before the birth state lands.
  const bridge = open ?? (saving || notToday ? shownBridge.current : undefined);
  if (!bridge) {
    const latest = arc.latestChapter(dreamId);
    const label = latest ? chapterLabel(latest.stage) : null;
    const heard = !!latest?.heardAt;
    return (
      <EmptyState
        header={header}
        title={heard ? "Choose today's bridge first." : "A chapter comes first."}
        body={
          heard
            ? `It waits at the end of ${label ?? "your chapter"}. One small, real step, sized to your day.`
            : `${label ?? "Your chapter"} is waiting. Its bridge comes at the end, and the proof after that.`
        }
        primary={
          latest
            ? { label: heard ? "Choose today's bridge" : "Enter chapter", onPress: () => router.push(chapterHref(latest.id)), testID: "evidence-empty-chapter" }
            : { label: "Return to Today", onPress: () => router.replace("/"), testID: "evidence-empty-home" }
        }
        secondary={latest ? { label: "Return to Today", onPress: () => router.replace("/"), testID: "evidence-empty-home" } : undefined}
      />
    );
  }

  return (
    <Screen
      header={header}
      testID="evidence-screen"
      dock={
        <Dock testID="evidence-dock">
          <PrimaryButton
            label="Chart this proof"
            onPress={() => void save()}
            disabled={!draft.text.trim()}
            loading={saving}
            accessibilityHint="Saves it as a star and weaves your next chapter from it"
            testID="evidence-save"
          />
        </Dock>
      }
    >
      {bridge ? <ProofForm bridge={bridge} draft={draft} onChange={setDraft} onNotToday={() => setNotToday(true)} /> : null}
      <NotTodaySheet
        visible={notToday}
        onClose={() => setNotToday(false)}
        dreamId={dreamId}
        onSaved={(result) => {
          setBorn({ id: result.proof.id, play: true });
          router.setParams({ born: result.proof.id });
        }}
        testID="evidence-not-today-sheet"
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------------- */
/* Star Birth → Carry it forward, or the Named Sky at the 7th star           */
/* ------------------------------------------------------------------------- */

interface BirthViewProps {
  dream: Dream;
  proof: Proof;
  play: boolean;
  holdRef: React.MutableRefObject<(() => void) | null>;
  onPlayed: () => void;
}

function BirthView({ dream, proof, play, holdRef, onPlayed }: BirthViewProps) {
  const router = useRouter();
  const arc = useArc();
  const toast = useToast();
  const policy = useMotion();
  const { profile } = useUser();
  const asks = useProofAsks();
  const figureHeight = useFigureHeight();
  const [finished, setFinished] = useState(!play);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);

  const season = proof.season;
  const seasonProofs = arc.proofs(dream.id, season);
  const kinds = seasonProofs.map((p) => p.kind);
  const closes = proof.starIndex >= 7;
  // The chapter this proof wove, in its own season (a 7th star carried into Season 2 is not 'next' here).
  const wovenMeta = proof.wovenInChapterId ? arc.chapterMeta(proof.wovenInChapterId) : undefined;
  const next: ChapterMeta | undefined = wovenMeta && wovenMeta.season === season ? wovenMeta : undefined;
  const sky = useNamedSky(dream.id, season);
  const today = localDateKey(now());
  const slot = nextRitual(profile, now());

  // A birth handed over from elsewhere (Not today) holds the gate while it plays.
  useEffect(() => {
    if (play && !holdRef.current) holdRef.current = holdForCeremony();
    // Once per mount.
  }, []);

  const complete = () => {
    onPlayed();
    holdRef.current?.();
    holdRef.current = null;
    setFinished(true);
    if (!closes && play) void asks.afterStarBirth(dream.id);
  };

  const carry = () => {
    if (next && !next.heardAt) router.replace(weaveHref(next.id));
    else router.replace("/");
  };
  const saveForLater = async () => {
    if (!next) return router.replace("/");
    setBusy(true);
    try {
      await arc.saveForRitual(next.id, slot.at.toISOString());
      toast.show({ message: `${chapterLabel(next.stage).split(" · ")[0]} will be waiting ${slot.later ? "tomorrow at" : "at"} ${slot.label}.`, tone: "proof" });
      router.replace("/");
    } catch {
      toast.show({ message: "That didn't save. Try once more.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const namedSky = async () => {
    const release = holdForCeremony(2000);
    const ok = await sky.save();
    setTimeout(release, 900);
    if (ok) asks.afterNamedSky(dream.id);
  };

  const ending = proofEnding(proof.kind);
  const stop = ending.indexOf(". ");
  const headline = stop > 0 ? ending.slice(0, stop + 1) : ending;
  const woven = next ? `${chapterLabel(next.stage).split(" · ")[0]} begins with ${BEGINS_WITH[proof.kind]}.` : stop > 0 ? ending.slice(stop + 2) : "";

  const caption = closes ? (
    <View style={styles.full} testID="evidence-success">
      <NamedSkyPanel sky={sky} season={season} span={seasonSpan(seasonProofs)} after={afterNaming(season, next)} testID="evidence-sky" />
    </View>
  ) : (
    <View style={styles.caption} testID="evidence-success">
      <T variant="eyebrow" tone="gold" numeric center>
        {`Proof ${proof.starIndex} · charted`}
      </T>
      <T variant="display" center accessibilityRole="header">
        {headline}
      </T>
      {woven ? (
        <T variant="body" center>
          {woven}
        </T>
      ) : null}
    </View>
  );

  const receipt = (
    <ProofReceipt kind={proof.kind} text={proof.text} when={whenLabel(proof.dateKey, today)} photoUri={proof.photoUri} testID="evidence-receipt" />
  );

  const footer = (
    <View style={styles.footer}>
      <GhostButton
        label="Share this star"
        icon={<Share2 color={colors.ink80} size={18} strokeWidth={1.75} />}
        onPress={() => setSharing(true)}
        testID="evidence-share"
      />
      {asks.nudge ? (
        <PlusNudgeCard
          onOpen={() => {
            asks.dismissNudge();
            router.push({ pathname: "/paywall", params: { from: "nudge" } });
          }}
          onDismiss={asks.dismissNudge}
        />
      ) : null}
    </View>
  );

  const dock = finished ? (
    <Animated.View entering={policy.transitions ? FadeIn.duration(420) : undefined}>
      <Dock testID="evidence-dock">
        {closes ? (
          <SeasonActions dream={dream} season={season} sky={sky} next={next} saveLabel={saveForLabel({ hhmm: slot.label, tomorrow: slot.later })} onName={namedSky} onLater={saveForLater} busy={busy} />
        ) : (
          <>
            <PrimaryButton label={next && !next.heardAt ? "Carry it forward" : "Back to Today"} onPress={carry} testID="evidence-finish" />
            {next && !next.heardAt && !next.savedForAt ? (
              <GhostButton label={saveForLabel({ hhmm: slot.label, tomorrow: slot.later })} onPress={() => void saveForLater()} disabled={busy} testID="evidence-save-for" />
            ) : null}
          </>
        )}
      </Dock>
    </Animated.View>
  ) : null;

  return (
    <Screen variant="reveal" focus={dream.focus} header={<Header testID="evidence" />} dock={dock} testID="evidence-birth">
      <StarBirth
        figure={figureFor(dream.id, season)}
        starIndex={proof.starIndex}
        kinds={kinds}
        kind={proof.kind}
        receipt={receipt}
        caption={caption}
        footer={footer}
        play={play}
        closing={closes}
        figureHeight={figureHeight}
        onLanded={chimeIfAudioActive}
        onComplete={complete}
        testID="evidence-star-birth"
      />
      <ShareCardSheet visible={sharing} onClose={() => setSharing(false)} dreamId={dream.id} proofId={proof.id} testID="evidence-share-card" />
    </Screen>
  );
}

/* ------------------------------------------------------------------------- */
/* The season's ending: name it, then Chapter VII or Season 2                 */
/* ------------------------------------------------------------------------- */

interface SeasonActionsProps {
  dream: Dream;
  /** The season that just completed. */
  season: number;
  sky: NamedSkyState;
  /** Chapter VII when the seventh star wove it and it is still unread. */
  next: ChapterMeta | undefined;
  /** 'Save for 21:00' or 'Save for tomorrow, 21:00'. */
  saveLabel: string;
  onName: () => void;
  onLater: () => void;
  busy?: boolean;
}

function SeasonActions({ dream, season, sky, next, saveLabel, onName, onLater, busy }: SeasonActionsProps) {
  const router = useRouter();
  const arc = useArc();
  const toast = useToast();
  const [beginning, setBeginning] = useState(false);

  if (!sky.named) {
    return <PrimaryButton label="Name this sky" onPress={onName} loading={sky.saving} testID="evidence-sky-save" />;
  }
  if (dream.season > season) {
    // A past season reopened (an old link): its story has already moved on.
    return <PrimaryButton label="Back to Today" onPress={() => router.replace("/")} testID="evidence-finish" />;
  }
  if (next && !next.heardAt) {
    return (
      <>
        <PrimaryButton label={`Read ${chapterLabel(next.stage).split(" · ")[0]}`} onPress={() => router.replace(weaveHref(next.id))} testID="evidence-finish" />
        {!next.savedForAt ? <GhostButton label={saveLabel} onPress={onLater} disabled={busy} testID="evidence-save-for" /> : null}
      </>
    );
  }
  const begin = async () => {
    if (beginning) return;
    setBeginning(true);
    const release = holdForCeremony(3000);
    try {
      const chapter = await arc.beginNextSeason(dream.id);
      router.replace(weaveHref(chapter.id));
    } catch {
      toast.show({ message: "Season 2 couldn't begin just now. Try once more.", tone: "error" });
    } finally {
      release();
      setBeginning(false);
    }
  };
  return (
    <>
      <PrimaryButton label={`Begin Season ${season + 1}`} onPress={() => void begin()} loading={beginning} testID="evidence-begin-season" />
      <GhostButton label="Not tonight" onPress={() => router.replace("/")} testID="evidence-later" />
    </>
  );
}

/** The line under the name: Chapter VII still to read, or the next season. */
function afterNaming(season: number, next: ChapterMeta | undefined): string {
  return next && !next.heardAt
    ? `${chapterLabel(next.stage)} is woven from your seventh star.`
    : `Season ${season + 1} begins with what you did.`;
}

/** Opened on a complete season: the whole figure, its name, what comes next. */
function CompleteView({ dream, season }: { dream: Dream; season: number }) {
  const arc = useArc();
  const { profile } = useUser();
  const router = useRouter();
  const toast = useToast();
  const asks = useProofAsks();
  const figureHeight = useFigureHeight();
  const sky = useNamedSky(dream.id, season);
  const latest = arc.latestChapter(dream.id);
  const next = latest && latest.season === season && !latest.heardAt ? latest : undefined;
  const slot = nextRitual(profile, now());

  const name = async () => {
    const release = holdForCeremony(2000);
    const ok = await sky.save();
    setTimeout(release, 900);
    if (ok) asks.afterNamedSky(dream.id);
  };
  const later = async () => {
    if (!next) return router.replace("/");
    try {
      await arc.saveForRitual(next.id, slot.at.toISOString());
      router.replace("/");
    } catch {
      toast.show({ message: "That didn't save. Try once more.", tone: "error" });
    }
  };

  return (
    <Screen
      variant="reveal"
      focus={dream.focus}
      header={<Header testID="evidence" />}
      testID="evidence-complete"
      dock={
        <Dock testID="evidence-dock">
          <SeasonActions dream={dream} season={season} sky={sky} next={next} saveLabel={saveForLabel({ hhmm: slot.label, tomorrow: slot.later })} onName={() => void name()} onLater={() => void later()} />
        </Dock>
      }
    >
      <NamedSkyCeremony dreamId={dream.id} season={season} sky={sky} after={afterNaming(season, next)} figureHeight={figureHeight} testID="evidence-sky" />
    </Screen>
  );
}

/* ------------------------------------------------------------------------- */
/* Empty states: always a way forward                                        */
/* ------------------------------------------------------------------------- */

interface Action {
  label: string;
  onPress: () => void;
  testID: string;
}

function EmptyState({
  header,
  title,
  body,
  primary,
  secondary,
  vignette = "horizon",
}: {
  header: React.ReactNode;
  title: string;
  body: string;
  primary: Action;
  secondary?: Action;
  vignette?: "horizon" | "window" | "sail" | "door";
}) {
  return (
    <Screen
      header={header}
      testID="evidence-empty"
      contentStyle={styles.emptyContent}
      dock={
        <Dock>
          <PrimaryButton label={primary.label} onPress={primary.onPress} testID={primary.testID} />
          {secondary ? <GhostButton label={secondary.label} onPress={secondary.onPress} testID={secondary.testID} /> : null}
        </Dock>
      }
    >
      <View style={styles.empty}>
        <Vignette name={vignette} width={168} />
        <T variant="title" center accessibilityRole="header">
          {title}
        </T>
        <T variant="body" center>
          {body}
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: "stretch" },
  caption: { alignItems: "center", gap: space.sm },
  footer: { marginTop: space.lg, gap: space.lg },
  emptyContent: { justifyContent: "center" },
  empty: { alignItems: "center", gap: space.base, paddingHorizontal: space.base, paddingBottom: space.huge },
});
