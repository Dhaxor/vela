// The reader (/story/[id]): the peak screen. A chapter set on open sky in
// Newsreader at the reader's own text size, the user's words in gold italic,
// the woven proof highlighted and tagged. Narration is ONE native queue of
// per-sentence utterances (lib/audio): the spoken sentence is at full ink, the
// rest dims, and the page follows by paragraph. The bridge appears after the
// last paragraph: choose a sized step (or write your own), add an optional
// if-then with a time, commit, and only then ask about reminders (lib/asks).
// Once chosen, the bridge waits here with a violet 'I crossed it'.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from "react-native";
import { useIsFocused, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ellipsis } from "lucide-react-native";
import { Header, IconButton, Screen, T, useConfirm, useMotion, useToast, type ScreenProps } from "@/components/ui";
import {
  BedGlyph,
  BridgeChooser,
  ChapterNav,
  CrossedBridge,
  EndOrnament,
  MoreSheet,
  OpenBridgeCard,
  ReaderDock,
  ReaderHero,
  ReaderLoading,
  ReaderMissing,
  ReaderParagraph,
  RemindSheet,
  RestingNote,
  SeasonCompleteCard,
  SilenceGlyph,
  SleepGlyph,
  SleepSheet,
  SoftPlusCard,
  SoundscapeSheet,
  VoiceGlyph,
  VoiceSheet,
  clockLabel,
  minutesLabel,
  neighbours,
  nextRate,
  nextRitualAt,
  rateLabel,
  sleepTimerFor,
  type BridgeCommit,
  type PlayState,
  type SleepChoice,
  type WovenInfo,
} from "@/components/feature/reader";
import { NotTodaySheet, evidenceHref } from "@/components/feature/proof";
import { useArc } from "@/contexts/ArcContext";
import { useUser } from "@/contexts/UserContext";
import { usePlus } from "@/contexts/PlusContext";
import { daypartAt, isArcError, paragraphsForDaypart, type Chapter, type ChapterMeta, type Dream } from "@/contexts/arc.types";
import type { TextSize } from "@/contexts/user.types";
import {
  DEFAULT_RATE,
  SOUNDSCAPES,
  formatDuration,
  isBedLocked,
  resolveBed,
  useNarration,
  useSoundscape,
  voiceDisplayName,
  type BedId,
  type NarrationRate,
} from "@/lib/audio";
import { claimAsk, settle } from "@/lib/asks";
import { getPermission, requestPermissionAtCommitment } from "@/lib/notifications";
import { learnedRetryLine, reshapeStarters } from "@/lib/futureMemory";
import { stageMeta } from "@/lib/story/seasons";
import { toRoman } from "@/lib/sky";
import { now } from "@/lib/clock";
import { safeBack } from "@/lib/nav";
import { colors, motion, space } from "@/constants/theme";

type Params = { id: string; reveal?: string; at?: string; devAsk?: string };

export default function StoryReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const id = typeof params.id === "string" ? params.id : "";
  const arc = useArc();
  const arcRef = useRef(arc);
  arcRef.current = arc;

  const meta = arc.ready ? arc.chapterMeta(id) : undefined;
  const dream = meta ? arc.dream(meta.dreamId) : undefined;
  const cached = arc.ready ? arc.peekChapter(id) : undefined;
  const [loaded, setLoaded] = useState<{ id: string; chapter: Chapter | null } | null>(null);

  // Older chapters load lazily; the latest of every dream is always cached once ready.
  useEffect(() => {
    if (!arc.ready || cached || !meta) return;
    let alive = true;
    arcRef.current.loadChapter(id).then(
      (chapter) => alive && setLoaded({ id, chapter }),
      () => alive && setLoaded({ id, chapter: null })
    );
    return () => {
      alive = false;
    };
  }, [arc.ready, id, !!cached, !!meta]);

  const chapter = cached ?? (loaded?.id === id ? loaded.chapter ?? undefined : undefined);
  const missing = arc.ready && (!meta || !dream || (!cached && loaded?.id === id && loaded.chapter === null));
  const header = <Header testID="story" />;

  if (missing) {
    return (
      <Screen variant="reader" header={header} scroll={false} testID="story-screen">
        <ReaderMissing onBack={() => safeBack(router)} />
      </Screen>
    );
  }
  if (!chapter || !meta || !dream) {
    return (
      <Screen variant="reader" focus={dream?.focus} header={header} testID="story-screen">
        <ReaderLoading number={meta?.number ?? null} title={meta?.title ?? null} />
      </Screen>
    );
  }
  return (
    <Reader
      key={chapter.id}
      chapter={chapter}
      meta={meta}
      dream={dream}
      reveal={params.reveal === "1"}
      jumpToBridge={params.at === "bridge"}
      devAsk={__DEV__ && Platform.OS === "web" && params.devAsk === "1"}
    />
  );
}

/* ========================================================================= */

type Zone = "choose" | "open" | "season-complete" | "crossed" | "resting" | "none";
type SheetName = "bed" | "voice" | "sleep" | "more" | null;

const BED_SHORT: Record<BedId, string> = { night: "Night", rain: "Rain", hearth: "Hearth", dawn: "Dawn" };
/** Paragraphs that rise in on a first reading (the rest are below the fold). */
const RISE_COUNT = 6;
const RISE_STAGGER_MS = 120;
/** After the reader drags the page, narration stops steering the scroll for a while. */
const FOLLOW_PAUSE_MS = 6000;

interface ReaderProps {
  chapter: Chapter;
  meta: ChapterMeta;
  dream: Dream;
  reveal: boolean;
  jumpToBridge: boolean;
  devAsk: boolean;
}

function dayLabel(dateKey: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey ?? "");
  if (!m) return null;
  try {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function Reader({ chapter, meta, dream, reveal, jumpToBridge, devAsk }: ReaderProps) {
  const router = useRouter();
  const arc = useArc();
  const arcRef = useRef(arc);
  arcRef.current = arc;
  const { profile, updateProfile } = useUser();
  const plus = usePlus();
  const toast = useToast();
  const confirm = useConfirm();
  const focused = useIsFocused();
  const policy = useMotion();

  /* ---- the chapter as read now ---- */
  const [daypart] = useState(() => daypartAt(now()));
  const paragraphs = useMemo(() => paragraphsForDaypart(chapter, daypart), [chapter, daypart]);
  const stage = stageMeta(meta.stage);
  const numeral = toRoman(meta.number);
  const size: TextSize = profile?.textSize ?? "S";
  const wovenProof = chapter.wovenProofId ? arc.proof(chapter.wovenProofId) : undefined;
  const woven = useMemo<WovenInfo | null>(
    () => (wovenProof ? { kind: wovenProof.kind, dateLabel: dayLabel(wovenProof.dateKey) } : null),
    [wovenProof?.kind, wovenProof?.dateKey]
  );
  const [animate] = useState(() => reveal || meta.heardAt === null);

  /* ---- where this chapter sits in the loop ---- */
  const { prev, next } = neighbours(arc.chapters(dream.id), chapter.id);
  const isLatest = arc.latestChapter(dream.id)?.id === chapter.id;
  const weaving = arc.weavingDreamIds.includes(dream.id);
  const season = arc.seasonProgress(dream.id);
  const offers = arc.bridgeOffers(chapter.id);
  const bridge = meta.bridgeId ? arc.bridge(meta.bridgeId) : undefined;
  const proofs = arc.proofs(dream.id);
  const lastProof = proofs[proofs.length - 1];
  const [changing, setChanging] = useState(false);
  const [notToday, setNotToday] = useState(false);
  const [busy, setBusy] = useState(false);

  const zone: Zone =
    isLatest && !weaving
      ? "resting"
      : bridge?.status === "open" && !changing
        ? "open"
        : offers.length > 0
          ? "choose"
          : isLatest && season?.complete && season.season === meta.season
            ? "season-complete"
            : bridge && (bridge.status === "crossed" || bridge.status === "learned")
              ? "crossed"
              : "none";
  const restingReason = dream.status === "released" ? "released" : dream.status === "resting" ? "resting" : "plan-locked";

  const starters = useMemo(() => (zone === "choose" ? reshapeStarters(dream.focus, dream.desire) : []), [zone, dream.focus, dream.desire]);
  const retryLine = useMemo(() => {
    if (zone !== "choose" || lastProof?.kind !== "learned") return null;
    const lastBridge = lastProof.bridgeId ? arc.bridge(lastProof.bridgeId) : undefined;
    return learnedRetryLine({ chapterId: chapter.id, name: profile?.name ?? "", bridgeText: lastBridge?.text ?? null, proofText: lastProof.text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, lastProof?.id, chapter.id, profile?.name]);

  /* ---- listening ---- */
  const [bedId, setBedId] = useState<BedId>(() => resolveBed(profile?.bed, plus.isPlus));
  const [bedOn, setBedOn] = useState(() => profile?.bedOn !== false);
  const bed = useSoundscape(bedOn ? bedId : null, { locked: !plus.canUseBed(bedId) });
  const bedRef = useRef(bed);
  bedRef.current = bed;
  const [sleep, setSleep] = useState<SleepChoice>("off");

  const heard = useRef(meta.heardAt !== null);
  const markHeard = useCallback(() => {
    if (heard.current) return;
    heard.current = true;
    void arcRef.current.markHeard(chapter.id);
  }, [chapter.id]);

  const narration = useNarration(chapter, {
    daypart,
    name: profile?.name,
    pronunciation: profile?.pronunciation ?? null,
    rate: profile?.rate ?? DEFAULT_RATE,
    voiceId: profile?.voiceId ?? null,
    onHeard: markHeard,
    onSpeakingChange: (speaking) => bedRef.current.duck(speaking),
    onFinished: () => void bedRef.current.fadeOut(12_000),
    onSleepTimerEnd: () => {
      setSleep("off");
      void bedRef.current.fadeOut();
    },
  });
  const narrationRef = useRef(narration);
  narrationRef.current = narration;
  const engaged = narration.status === "playing" || narration.status === "paused";

  const onPlay = () => {
    switch (narration.status) {
      case "playing":
        narration.pause();
        void bed.stop();
        return;
      case "paused":
        if (bedOn) void bed.start();
        narration.resume();
        return;
      case "unavailable":
        return;
      default:
        if (bedOn) void bed.start();
        narration.play();
    }
  };

  // A bed picked while the voice is playing joins in (the hook crossfades between beds itself).
  const startBed = useRef(false);
  useEffect(() => {
    if (!startBed.current) return;
    startBed.current = false;
    if (bedOn && narrationRef.current.status === "playing") void bedRef.current.start();
  }, [bedId, bedOn]);

  // Leaving the screen (proof form, paywall) pauses the voice; locking the phone does not.
  useEffect(() => {
    if (focused || narrationRef.current.status !== "playing") return;
    narrationRef.current.pause();
    void bedRef.current.stop();
  }, [focused]);

  /* ---- scroll: follow the voice by paragraph, title in the bar, quiet dock at the end ---- */
  const scrollRef = useRef<ScrollView>(null);
  const policyRef = useRef(policy);
  policyRef.current = policy;
  const geo = useRef({ y: 0, viewport: 0, dock: 0, heroBottom: 0, articleY: 0, endY: Number.POSITIVE_INFINITY, paras: [] as { y: number; h: number }[] });
  const [chrome, setChrome] = useState({ titled: false, quiet: false });
  const followPausedUntil = useRef(0);
  /** Our own scrollTo: scroll events inside its glide, or landing on its target, are not the reader's hand. */
  const steering = useRef({ until: 0, y: -1 });
  const steer = (y: number, animated: boolean) => {
    steering.current = { until: Date.now() + (animated ? 900 : 250), y: Math.round(y) };
    scrollRef.current?.scrollTo({ y, animated });
  };
  const pendingJump = useRef(jumpToBridge);

  const evaluate = useCallback(() => {
    const g = geo.current;
    if (g.viewport <= 0) return;
    const visibleBottom = g.y + g.viewport - g.dock;
    const titled = g.heroBottom > 0 && g.y > g.heroBottom - space.xl;
    const quiet = g.endY < visibleBottom;
    setChrome((c) => (c.titled === titled && c.quiet === quiet ? c : { titled, quiet }));
    const last = g.paras[paragraphs.length - 1];
    if (last && g.articleY + last.y + last.h / 2 < visibleBottom) markHeard();
  }, [paragraphs.length, markHeard]);

  const scrollToEnd = useCallback(() => {
    const g = geo.current;
    if (!Number.isFinite(g.endY)) return;
    steer(Math.max(0, g.endY - space.lg), !pendingJump.current && policyRef.current.transitions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Peak to end: when the voice finishes, the page glides on to the bridge, so imagining hands straight over to acting.
  useEffect(() => {
    if (narration.status !== "finished" || Date.now() < followPausedUntil.current) return;
    if (zone === "choose" || zone === "open" || zone === "season-complete") scrollToEnd();
    // Only on the transition into 'finished'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narration.status]);

  const onEndLayout = (e: LayoutChangeEvent) => {
    geo.current.endY = e.nativeEvent.layout.y;
    if (pendingJump.current && geo.current.viewport > 0) {
      scrollToEnd();
      pendingJump.current = false;
    }
    evaluate();
  };

  const onParagraphLayout = useCallback(
    (index: number, y: number, h: number) => {
      geo.current.paras[index] = { y, h };
      evaluate();
    },
    [evaluate]
  );

  const listenFrom = useCallback((index: number) => {
    narrationRef.current.seekToParagraph(index);
    if (narrationRef.current.status === "paused") narrationRef.current.resume();
  }, []);

  useEffect(() => {
    const current = narration.current;
    if (narration.status !== "playing" || !current || Date.now() < followPausedUntil.current) return;
    const p = geo.current.paras[current.paragraphIndex];
    if (!p) return;
    const target = Math.max(0, geo.current.articleY + p.y - geo.current.viewport * 0.22);
    // Under Reduce Motion (and in still mode) the page jumps instead of gliding.
    steer(target, policy.transitions);
  }, [narration.current?.paragraphIndex, narration.status]);

  const scrollProps: ScreenProps["scrollProps"] = {
    ref: scrollRef,
    scrollEventThrottle: 32,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      geo.current.y = e.nativeEvent.contentOffset.y;
      // The reader moved the page (a drag, a fling, a wheel on web): stop steering it for a while.
      const ours = Date.now() < steering.current.until || Math.abs(geo.current.y - steering.current.y) <= 2;
      if (!ours) followPausedUntil.current = Date.now() + FOLLOW_PAUSE_MS;
      evaluate();
    },
    onScrollBeginDrag: () => {
      followPausedUntil.current = Date.now() + FOLLOW_PAUSE_MS;
    },
    onLayout: (e: LayoutChangeEvent) => {
      geo.current.viewport = e.nativeEvent.layout.height;
      if (pendingJump.current && Number.isFinite(geo.current.endY)) {
        scrollToEnd();
        pendingJump.current = false;
      }
      evaluate();
    },
  };

  /* ---- sheets ---- */
  const [sheet, setSheet] = useState<SheetName>(null);
  const [remind, setRemind] = useState<{ time: string; text: string } | null>(null);
  const [remindBusy, setRemindBusy] = useState(false);
  const closeSheet = () => setSheet(null);

  const pickBed = (id: BedId) => {
    if (isBedLocked(id, plus.isPlus)) {
      setSheet(null);
      router.push("/paywall?from=bed" as Href);
      return;
    }
    startBed.current = true;
    setBedId(id);
    setBedOn(true);
    if (profile && (profile.bed !== id || profile.bedOn === false)) void updateProfile({ bed: id, bedOn: true });
  };
  const silence = () => {
    setBedOn(false);
    if (profile && profile.bedOn !== false) void updateProfile({ bedOn: false });
  };

  const pickVoice = (identifier: string) => {
    narration.setVoice(identifier);
    void updateProfile({ voiceId: identifier });
  };
  const pickRate = (rate: NarrationRate) => {
    narration.setRate(rate);
    void updateProfile({ rate });
  };
  const pickSleep = (choice: SleepChoice) => {
    setSleep(choice);
    narration.setSleepTimer(sleepTimerFor(choice));
  };

  const rewrite = async () => {
    setSheet(null);
    await wait(motion.state + 60);
    const ok = await confirm({
      title: `Rewrite Chapter ${numeral}?`,
      message: "Vela writes it again with new scenes. Its number, your woven proof and your bridge stay exactly as they are.",
      confirmLabel: "Rewrite it",
      cancelLabel: "Keep this one",
    });
    if (!ok) return;
    narration.stop();
    void bed.stop();
    try {
      await arc.rerenderChapter(chapter.id);
      steer(0, false);
      toast.show({ message: `Chapter ${numeral}, rewritten.` });
    } catch (e) {
      const notLatest = isArcError(e) && e.code === "not-latest-chapter";
      toast.show({ message: notLatest ? "Only the newest chapter can be rewritten." : "That didn’t work. Your chapter is unchanged.", tone: "error" });
    }
  };

  /* ---- the bridge ---- */
  const commit = async ({ choice, ifThen, remindAt }: BridgeCommit) => {
    setBusy(true);
    try {
      const chosen = await arc.chooseBridge({ chapterId: chapter.id, choice, ifThen, remindAt });
      setChanging(false);
      const permission = devAsk ? "undetermined" : await getPermission();
      const ask = permission === "undetermined" ? await claimAsk(["notifications"]) : null;
      if (ask === "notifications") {
        const at = remindAt ? new Date(remindAt) : profile ? nextRitualAt(profile.ritual, profile.ritualTimes, now()) : null;
        if (at) {
          setRemind({ time: clockLabel(at), text: chosen.text });
          return;
        }
      }
      toast.show({ message: "Bridge set. Cross it, then leave your proof.", tone: "proof" });
    } catch (e) {
      const code = isArcError(e) ? e.code : null;
      toast.show({
        message:
          code === "season-complete"
            ? "This season is complete. Your sky is waiting to be named."
            : code === "dream-not-weaving"
              ? "This dream is resting, so it can’t take a bridge right now."
              : "That bridge didn’t save. Try once more.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const answerRemind = async (yes: boolean) => {
    const pending = remind;
    if (!pending) return;
    if (!yes) {
      setRemind(null);
      toast.show({ message: "Bridge set. Cross it, then leave your proof.", tone: "proof" });
      return;
    }
    setRemindBusy(true);
    const result = await requestPermissionAtCommitment();
    if (result === "granted" || result === "denied") await settle("notifications");
    setRemindBusy(false);
    setRemind(null);
    toast.show(
      result === "granted"
        ? { message: `Vela will remind you at ${pending.time}.`, tone: "proof" }
        : { message: "No reminder, and that’s fine. Your bridge is set." }
    );
  };

  /* ---- the one soft Plus note: from Chapter III on, through lib/asks ----
   * Decided once, the first time the end of the chapter comes into view. If a
   * bridge is still to be chosen then, the reminder ask at commitment has
   * priority (lib/asks K2), so the note is skipped for this visit rather than
   * racing it for the session's one ask. */
  const [softPlus, setSoftPlus] = useState(false);
  const softPlusDecided = useRef(false);
  useEffect(() => {
    if (!chrome.quiet || softPlusDecided.current) return;
    softPlusDecided.current = true;
    // Only on the chapter being lived (not a reread), never on top of the season's peak or a resting dream.
    if (plus.isPlus || meta.number < 3 || !isLatest || zone === "choose" || zone === "resting" || zone === "season-complete") return;
    void claimAsk(["plus-nudge"]).then((kind) => {
      if (kind === "plus-nudge") setSoftPlus(true);
    });
  }, [chrome.quiet, plus.isPlus, meta.number, isLatest, zone]);

  /* ---- dock ---- */
  const left = Math.max(0, narration.estimatedTotalMs - narration.estimatedElapsedMs);
  let status: string;
  switch (narration.status) {
    case "playing":
      status = `Listening · ${formatDuration(left)} left`;
      break;
    case "paused":
      status = `Paused · ${formatDuration(left)} left`;
      break;
    case "finished":
      status = "Heard to the end";
      break;
    case "unavailable":
      status = "Narration isn’t available here. Read at your own pace.";
      break;
    default:
      status = `${minutesLabel(narration.estimatedTotalMs)} · Unlimited listens, always`;
  }
  if (narration.status !== "unavailable") {
    const base = narration.status === "idle" ? minutesLabel(narration.estimatedTotalMs) : status;
    if (narration.sleepRemainingMs !== null) status = `${base} · Sleep in ${formatDuration(narration.sleepRemainingMs)}`;
    else if (sleep === "end" && narration.status !== "finished") status = `${base} · Stops at the end`;
  }
  const play: PlayState =
    narration.status === "playing" ? "pause" : narration.status === "paused" ? "resume" : narration.status === "finished" ? "again" : "play";
  const voiceName = narration.voice ? voiceDisplayName(narration.voice) : null;
  // Under the glyph only a short name fits ('Ava'); long browser names stay in the sheet.
  const voiceShort = voiceName && voiceName.length <= 9 ? voiceName : "Voice";
  const sleepLabel = narration.sleepRemainingMs !== null ? formatDuration(narration.sleepRemainingMs) : sleep === "end" ? "End" : "Sleep";
  const bedLabel = bedOn ? BED_SHORT[bedId] : "Silence";

  const dock = (
    <ReaderDock
      progress={narration.progress}
      status={status}
      play={play}
      quiet={chrome.quiet && (zone === "choose" || zone === "open" || zone === "season-complete")}
      disabled={narration.status === "unavailable"}
      onPlay={onPlay}
      onLayout={(e) => {
        geo.current.dock = e.nativeEvent.layout.height;
        evaluate();
      }}
      left={[
        {
          glyph: bedOn ? <BedGlyph color={colors.ink80} /> : <SilenceGlyph color={colors.ink64} />,
          label: bedLabel,
          accessibilityLabel: `Soundscape: ${bedOn ? SOUNDSCAPES.find((s) => s.id === bedId)?.label ?? bedLabel : "off"}`,
          onPress: () => setSheet("bed"),
          testID: "story-bed",
          active: bedOn && bed.status === "playing",
        },
        {
          glyph: (
            <T variant="body" strong tone="secondary" numeric>
              {rateLabel(narration.rate)}
            </T>
          ),
          label: "Speed",
          accessibilityLabel: `Speed ${narration.rate.toFixed(1)}. Double tap to change.`,
          onPress: () => pickRate(nextRate(narration.rate)),
          testID: "story-speed",
        },
      ]}
      right={[
        {
          glyph: <SleepGlyph color={sleep === "off" ? colors.ink80 : colors.gold300} />,
          label: sleepLabel,
          accessibilityLabel: sleep === "off" ? "Sleep timer: off" : `Sleep timer: ${sleepLabel}`,
          onPress: () => setSheet("sleep"),
          testID: "story-sleep",
          active: sleep !== "off",
        },
        {
          glyph: <VoiceGlyph color={colors.ink80} />,
          label: voiceShort,
          accessibilityLabel: voiceName ? `Voice: ${voiceName}` : "Voice",
          onPress: () => setSheet("voice"),
          testID: "story-voice",
        },
      ]}
    />
  );

  const showJump = (zone === "choose" || zone === "open") && meta.heardAt !== null;
  const nextNumeral = toRoman(meta.number + 1);

  return (
    <Screen
      variant="reader"
      focus={dream.focus}
      testID="story-screen"
      scrollProps={scrollProps}
      header={
        <Header
          testID="story"
          title={chrome.titled ? `${numeral} · ${stage.name}` : undefined}
          right={
            <IconButton accessibilityLabel="Chapter options" onPress={() => setSheet("more")} testID="story-more">
              <Ellipsis color={colors.ink80} size={24} strokeWidth={1.75} />
            </IconButton>
          }
        />
      }
      dock={dock}
    >
      <View style={styles.page}>
        <ReaderHero
          number={meta.number}
          stageName={stage.name}
          title={chapter.title}
          meta={`Season ${meta.season} · ${minutesLabel(narration.estimatedTotalMs)} to listen`}
          jump={showJump ? { label: zone === "open" ? "Today’s bridge" : "Choose today’s bridge", onPress: scrollToEnd } : null}
          onLayout={(e) => {
            geo.current.heroBottom = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
          }}
        />

        <View
          onLayout={(e) => {
            geo.current.articleY = e.nativeEvent.layout.y;
            evaluate();
          }}
        >
          {paragraphs.map((p, i) => (
            <ReaderParagraph
              key={`${chapter.revision}-${p.key}`}
              paragraph={p}
              index={i}
              size={size}
              sentence={narration.current?.paragraphIndex === i ? narration.current : null}
              listening={engaged && narration.current !== null}
              woven={p.wovenProofId ? woven ?? { kind: "did", dateLabel: null } : null}
              riseDelay={animate && i < RISE_COUNT ? 160 + i * RISE_STAGGER_MS : null}
              onLayout={onParagraphLayout}
              onListenFrom={engaged ? listenFrom : undefined}
            />
          ))}
        </View>

        <View style={styles.end} onLayout={onEndLayout}>
          <View style={styles.ornament}>
            <EndOrnament />
          </View>
          {zone === "choose" ? (
            <BridgeChooser
              key={changing ? "change" : "choose"}
              offers={offers}
              starters={starters}
              retryLine={retryLine}
              nextNumeral={nextNumeral}
              current={
                changing && bridge
                  ? { tier: bridge.tier, libraryId: bridge.libraryId, text: bridge.text, ifThen: bridge.ifThen }
                  : null
              }
              busy={busy}
              now={now}
              onCommit={(c) => void commit(c)}
              onCancel={changing ? () => setChanging(false) : undefined}
            />
          ) : zone === "open" && bridge ? (
            <OpenBridgeCard
              bridge={bridge}
              now={now()}
              onCrossed={() => router.push({ pathname: "/evidence/[intentId]", params: { intentId: dream.id } })}
              onNotToday={() => setNotToday(true)}
              onChange={offers.length > 0 ? () => setChanging(true) : undefined}
            />
          ) : zone === "season-complete" ? (
            <SeasonCompleteCard
              stars={season?.stars ?? 7}
              named={season?.constellationName ?? null}
              // Unnamed: straight to the Named Sky ceremony. Named: the sky, which offers the next season.
              onSky={() => router.push(season?.constellationName ? (`/sky/${dream.id}` as Href) : evidenceHref(dream.id))}
            />
          ) : zone === "crossed" && bridge ? (
            <CrossedBridge
              bridge={bridge}
              proof={bridge.proofId ? arc.proof(bridge.proofId) : undefined}
              dateLabel={dayLabel(bridge.proofId ? arc.proof(bridge.proofId)?.dateKey : undefined)}
            />
          ) : zone === "resting" ? (
            <RestingNote reason={restingReason} onToday={() => router.navigate("/")} />
          ) : null}
        </View>

        {softPlus ? (
          <View style={styles.soft}>
            <SoftPlusCard
              onLater={() => setSoftPlus(false)}
              onSee={() => {
                setSoftPlus(false);
                router.push({ pathname: "/paywall", params: { from: "reader" } });
              }}
            />
          </View>
        ) : null}

        <View style={styles.nav}>
          <ChapterNav
            prev={prev}
            next={next}
            season={meta.season}
            onOpen={(target) => router.replace({ pathname: "/story/[id]", params: { id: target } })}
          />
        </View>
      </View>

      <SoundscapeSheet
        visible={sheet === "bed"}
        onClose={closeSheet}
        beds={SOUNDSCAPES}
        bedId={bedId}
        bedOn={bedOn}
        isLocked={(b) => isBedLocked(b, plus.isPlus)}
        onPick={pickBed}
        onSilence={silence}
      />
      <VoiceSheet
        visible={sheet === "voice"}
        onClose={closeSheet}
        voices={narration.voices}
        selectedId={narration.voice?.identifier ?? null}
        onPickVoice={pickVoice}
        rate={narration.rate}
        onRate={pickRate}
      />
      <SleepSheet
        visible={sheet === "sleep"}
        onClose={closeSheet}
        choice={sleep}
        remaining={narration.sleepRemainingMs !== null ? formatDuration(narration.sleepRemainingMs) : null}
        onPick={pickSleep}
      />
      <MoreSheet
        visible={sheet === "more"}
        onClose={closeSheet}
        textSize={size}
        onTextSize={(s) => void updateProfile({ textSize: s })}
        canRewrite={isLatest && weaving}
        numeral={numeral}
        onRewrite={() => void rewrite()}
      />
      {dream ? (
        // A lesson star instead of a dead end: saves a learned proof, then the Star Birth on /evidence.
        <NotTodaySheet visible={notToday} onClose={() => setNotToday(false)} dreamId={dream.id} testID="story-not-today-sheet" />
      ) : null}
      <RemindSheet
        visible={remind !== null}
        time={remind?.time ?? ""}
        bridgeText={remind?.text ?? ""}
        busy={remindBusy}
        onYes={() => void answerRemind(true)}
        onNo={() => void answerRemind(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 600, alignSelf: "center" },
  end: { marginTop: space.lg },
  ornament: { alignItems: "center", marginBottom: space.xl },
  soft: { marginTop: space.xl },
  nav: { marginTop: space.xxl },
});
