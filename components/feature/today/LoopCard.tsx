// THE LOOP CARD: Today's one card, a state machine over arc.loopState()
// (CONTRACTS §5.1). Each state has one clear next move:
//   [A] chapter waiting    Gilded plate · 'Enter chapter' (gold)
//       chapter heard      Bridge card · 'Choose today's bridge' (violet)
//   [B] bridge open        Bridge card · 'I crossed it' (violet) + 'Not today'
//   [C] next woven         Gilded plate · 'Read now' (gold) + 'Save for 21:00'
//   [D] sealed             Closure plate (LOG SEALED): date · chapter · proofs · next ritual
//   season complete        Gilded plate · 'Name your sky' / 'Begin Season 2' (gold); the
//                          promise of the next Chapter I follows seasonCarries (proof/seasonEnd)
//   resting / plan-locked  Vellum · 'Wake this dream' / 'Keep this dream weaving' (gold)
//   empty                  Gilded plate · 'Begin a dream' (gold)
// The card always carries testID 'future-memory-card' (App Review notes, e2e).
import React, { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight } from "@/components/glyphs/icons";
import { useArc } from "@/contexts/ArcContext";
import { usePlus } from "@/contexts/PlusContext";
import { useUser } from "@/contexts/UserContext";
import { isArcError, type ChapterMeta, type Dream, type LoopState, type Proof } from "@/contexts/arc.types";
import { DEFAULT_RITUAL_TIMES } from "@/contexts/user.types";
import { now as clockNow } from "@/lib/clock";
import { TIER_LABEL } from "@/lib/futureMemory";
import { localDateKey } from "@/lib/progress";
import { figureFor } from "@/lib/sky/figures";
import { toRoman } from "@/lib/sky/numerals";
import { chapterLabel } from "@/lib/story/seasons";
import { BridgeGlyph, Vignette } from "@/components/glyphs";
import { evidenceHref, nextSeasonCopy, seasonCarries, weaveHref } from "@/components/feature/proof";
import {
  BridgeButton,
  GhostButton,
  GildedPlate,
  Press,
  PrimaryButton,
  T,
  UserWords,
  VellumCard,
  haptics,
  useConfirm,
  useToast,
} from "@/components/ui";
import { colors, space } from "@/constants/theme";
import { dreamShortName } from "./ArcSwitcher";
import { chapterEyebrow, dayMonth, nextRitual, relativeDay, saveForLabel, wallTime, whenLabel } from "./time";

export const LOOP_CARD_TEST_ID = "future-memory-card";

export interface LoopCardProps {
  loop: LoopState;
  now: Date;
  /** Opens the 'Not today' learned-proof sheet. */
  onNotToday: (dreamId: string) => void;
}

/** 'It begins with what you did yesterday:' for the proof a chapter weaves. */
function wovenLead(proof: Proof, now: Date): string {
  if (proof.origin === "onboarding") return "It begins with what you’d already done:";
  const when = relativeDay(proof.dateKey, now);
  if (proof.kind === "learned") return `It begins with what you learned ${when}:`;
  if (proof.kind === "moved") return `It begins with what moved ${when}:`;
  return `It begins with what you did ${when}:`;
}

function stripEnd(text: string): string {
  return text.trim().replace(/[.!?…]+$/u, "");
}

/** Below this window height the plate trims itself so its CTA stays above the fold (iPhone SE). */
const COMPACT_HEIGHT = 760;
/** Below this one (Display Zoom, 568pt tall) the bridge card trims too. */
const TINY_HEIGHT = 640;

/** The chapter's hook line: the woven proof in the user's words, else the desire. */
function ChapterHook({ meta, dream, now, compact }: { meta: ChapterMeta; dream: Dream; now: Date; compact: boolean }) {
  const arc = useArc();
  const proof = meta.wovenProofId ? arc.proof(meta.wovenProofId) : undefined;
  return (
    <View style={styles.hook}>
      {proof || !compact ? (
        <T variant="caption" tone="muted">
          {proof ? wovenLead(proof, now) : "Written from your words:"}
        </T>
      ) : null}
      <UserWords variant="reading" numberOfLines={compact ? 1 : 2}>
        {proof ? proof.text : dream.desire}
      </UserWords>
    </View>
  );
}

/** Eyebrow, the chapter's own title, and (room permitting) its place in the season. */
function PlateHeading({ eyebrow, meta, compact }: { eyebrow: string; meta: ChapterMeta; compact: boolean }) {
  return (
    <View style={[styles.heading, compact && styles.headingCompact]}>
      <T variant="eyebrow" tone="gold" style={styles.insetSafe}>
        {eyebrow}
      </T>
      <T variant="title" accessibilityRole="header" style={styles.title}>
        {meta.title}
      </T>
      {compact ? null : (
        <T variant="caption" tone="muted">
          {meta.season > 1 ? `Season ${meta.season} · ` : ""}
          {chapterLabel(meta.stage)}
        </T>
      )}
    </View>
  );
}

export function LoopCard({ loop, now, onNotToday }: LoopCardProps) {
  const arc = useArc();
  const router = useRouter();
  const { profile } = useUser();
  const plus = usePlus();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const win = useWindowDimensions();
  const compact = win.height < COMPACT_HEIGHT;
  // Display Zoom on a 4.7" phone (320×568), or large text on a short one: the if-then shrinks to a
  // caption so 'I crossed it' clears the tab bar. Height is counted in text lines, so big type counts as less room.
  const tiny = win.height / Math.max(1, win.fontScale || 1) < TINY_HEIGHT;

  const openChapter = (id: string, extra?: Record<string, string>) =>
    router.push({ pathname: "/story/[id]", params: { id, ...extra } });

  const fail = (e: unknown, fallback: string) => {
    if (isArcError(e) && e.code === "dream-not-weaving") toast.show({ message: "This dream is resting right now.", tone: "error" });
    else if (isArcError(e) && e.code === "plan-limit") {
      // A lapsed member hears 'every dream can weave again'; anyone else, 'room for a second dream'.
      const from = arc.planLockedDreamIds.length > 0 ? "lapsed" : "second-dream";
      toast.show({ message: "One dream weaves at a time on the free plan.", tone: "error", action: { label: "Vela Plus", onPress: () => router.push({ pathname: "/paywall", params: { from } }) } });
    } else toast.show({ message: fallback, tone: "error" });
  };

  /* ---------------------------------------------------------------- empty */
  if (loop.kind === "empty") {
    return (
      <GildedPlate inset={false} testID={LOOP_CARD_TEST_ID} accessibilityLabel="Begin a dream">
        <View style={styles.vignette}>
          <Vignette name="horizon" width={136} />
        </View>
        <T variant="eyebrow" tone="gold" center>
          Your first sky
        </T>
        <T variant="title" center accessibilityRole="header" style={styles.title}>
          A dream gets its own sky.
        </T>
        <T variant="body" center style={styles.body}>
          Say what you want in your own words. Vela writes Chapter I, and every real step you take becomes a star.
        </T>
        <PrimaryButton label="Begin a dream" onPress={() => router.push("/story/new")} trailing={<ArrowRight color={colors.onGold} size={18} strokeWidth={2} />} testID="today-begin-dream" />
      </GildedPlate>
    );
  }

  const dream = arc.dream(loop.dreamId);
  if (!dream) return null;
  const season = arc.seasonProgress(dream.id);
  const lit = season?.stars ?? 0;
  const figure = figureFor(dream.id, season?.season ?? dream.season);

  /* -------------------------------------------------------------- resting */
  if (loop.kind === "resting") {
    const lockedByPlan = loop.reason === "plan-locked";
    const otherActive = arc.dreams.find((d) => d.id !== dream.id && d.status === "active");
    const wake = async () => {
      if (loop.reason === "resting" && !plus.isPlus && otherActive) {
        const ok = await confirm({
          title: "Wake this dream?",
          message: `On the free plan one dream weaves at a time, so ${dreamShortName(otherActive)} will rest. Every chapter stays readable.`,
          confirmLabel: "Wake it",
        });
        if (!ok) return;
      }
      setBusy("wake");
      try {
        await arc.setActiveDream(dream.id);
        haptics.success();
        toast.show({ message: `${dreamShortName(dream)} is weaving again.`, tone: "proof" });
      } catch (e) {
        fail(e, "That didn’t work. Try again in a moment.");
      } finally {
        setBusy(null);
      }
    };
    return (
      <VellumCard testID={LOOP_CARD_TEST_ID} raised>
        <T variant="eyebrow" tone="muted">
          {lockedByPlan ? "One dream weaves at a time" : "Resting"}
        </T>
        <T variant="title" accessibilityRole="header" style={styles.title}>
          {lockedByPlan ? "Choose the dream that keeps weaving." : "This dream is resting."}
        </T>
        <T variant="body" style={styles.body}>
          {lockedByPlan
            ? "Vela Plus has ended, so one dream weaves at a time. Every chapter stays readable, and nothing is lost."
            : "Its chapters and stars are kept in your Memory Book. Wake it whenever you’re ready."}
        </T>
        <PrimaryButton
          label={lockedByPlan ? "Keep this dream weaving" : "Wake this dream"}
          loading={busy === "wake"}
          onPress={() => void wake()}
          testID="today-wake-dream"
        />
        {lockedByPlan ? <GhostButton label="About Vela Plus" tone="muted" onPress={() => router.push({ pathname: "/paywall", params: { from: "lapsed" } })} testID="today-plus" style={styles.ghost} /> : null}
      </VellumCard>
    );
  }

  /* ------------------------------------------------------- season complete */
  if (loop.kind === "season-complete") {
    const name = season?.constellationName ?? null;
    // 'Begins with what you did' only when Season N+1's Chapter I really weaves the 7th proof (an unseeded season).
    const next = nextSeasonCopy(loop.season, seasonCarries(arc.proofs(dream.id, loop.season)));
    const begin = async () => {
      setBusy("season");
      try {
        const chapter = await arc.beginNextSeason(dream.id);
        haptics.reveal();
        // The Weave (S1) lands on the new Chapter I.
        router.push(weaveHref(chapter.id));
      } catch (e) {
        fail(e, "The next season couldn’t start. Try again in a moment.");
      } finally {
        setBusy(null);
      }
    };
    return (
      <GildedPlate figure={figure} lit={7} testID={LOOP_CARD_TEST_ID} accessibilityLabel={`Season ${loop.season} complete`}>
        <T variant="eyebrow" tone="gold" style={styles.insetSafe}>
          {loop.named && name ? `${name} · Season ${loop.season}` : `Season ${loop.season} · seven stars`}
        </T>
        <T variant="title" accessibilityRole="header" style={styles.title}>
          {loop.named ? next.title : "Your sky is whole."}
        </T>
        <T variant="body" style={styles.body}>
          {loop.named ? next.body : "Give this constellation a name. It stays in your sky for good."}
        </T>
        {loop.named ? (
          <PrimaryButton label={`Begin Season ${loop.season + 1}`} loading={busy === "season"} onPress={() => void begin()} testID="today-begin-season" />
        ) : (
          // The Named Sky ceremony lives with the proof flow (S4): /evidence on a complete season.
          <PrimaryButton label="Name your sky" onPress={() => router.push(evidenceHref(dream.id))} testID="today-name-sky" />
        )}
      </GildedPlate>
    );
  }

  const meta = arc.chapterMeta(loop.chapterId);
  if (!meta) return null;

  /* ------------------------------------------------------- [B] bridge open */
  if (loop.kind === "bridge-open") {
    const bridge = arc.bridge(loop.bridgeId);
    if (!bridge) return null;
    const ifThen = bridge.ifThen ? `If it’s ${bridge.ifThen.when} and I hesitate, then I ${stripEnd(bridge.ifThen.then)}.` : null;
    return (
      <VellumCard tone="bridge" testID={LOOP_CARD_TEST_ID} raised accessibilityLabel={`Today’s bridge: ${bridge.text}`}>
        <View style={styles.bridgeHead}>
          <BridgeGlyph size={20} />
          <T variant="eyebrow" tone="violet">
            Today’s bridge · {TIER_LABEL[bridge.tier]}
          </T>
        </View>
        <T variant="title" style={styles.title}>
          {bridge.text}
        </T>
        {ifThen ? (
          <View style={[styles.ifThen, tiny && styles.ifThenTiny]} testID="today-if-then">
            <T variant={tiny ? "caption" : "body"} tone="secondary">
              {ifThen}
            </T>
          </View>
        ) : null}
        <BridgeButton
          label="I crossed it"
          icon={<BridgeGlyph size={20} color={colors.sky950} />}
          onPress={() => router.push(evidenceHref(dream.id))}
          accessibilityHint="Log what you did as a star"
          testID="record-proof"
          style={styles.cta}
        />
        <GhostButton
          label="Not today"
          tone="muted"
          onPress={() => onNotToday(dream.id)}
          accessibilityHint="Keep what got in the way as a lesson star"
          testID="today-not-today"
          style={styles.ghost}
        />
      </VellumCard>
    );
  }

  /* ------------------------------------------- [A] heard: choose the bridge */
  if (loop.kind === "chapter-waiting" && loop.heard) {
    return (
      <VellumCard tone="bridge" testID={LOOP_CARD_TEST_ID} raised>
        <View style={styles.bridgeHead}>
          <BridgeGlyph size={20} />
          <T variant="eyebrow" tone="violet">
            Today’s bridge
          </T>
        </View>
        <T variant="title" accessibilityRole="header" style={styles.title}>
          One real step, sized to today.
        </T>
        <T variant="body" style={styles.body}>
          Three wait at the end of Chapter {toRoman(meta.number)}: two minutes, fifteen, or brave.
        </T>
        <BridgeButton label="Choose today’s bridge" onPress={() => openChapter(meta.id, { at: "bridge" })} testID="today-choose-bridge" />
        <GhostButton label={`Reread Chapter ${toRoman(meta.number)}`} tone="muted" onPress={() => openChapter(meta.id)} testID="today-reread" style={styles.ghost} />
      </VellumCard>
    );
  }

  /* ------------------------------------------------- [A] chapter waiting */
  if (loop.kind === "chapter-waiting") {
    return (
      <GildedPlate figure={figure} lit={lit} testID={LOOP_CARD_TEST_ID}>
        <Press
          onPress={() => openChapter(meta.id)}
          pressScale={0.99}
          accessibilityRole="link"
          accessibilityLabel={`${chapterEyebrow(now)}: ${chapterLabel(meta.stage)}, ${meta.title}`}
          testID="today-chapter-open"
        >
          <PlateHeading eyebrow={compact ? `${chapterEyebrow(now)} · ${toRoman(meta.number)}` : chapterEyebrow(now)} meta={meta} compact={compact} />
          <ChapterHook meta={meta} dream={dream} now={now} compact={compact} />
        </Press>
        <PrimaryButton
          label="Enter chapter"
          trailing={<ArrowRight color={colors.onGold} size={18} strokeWidth={2} />}
          onPress={() => openChapter(meta.id)}
          testID="today-enter-chapter"
        />
      </GildedPlate>
    );
  }

  /* ---------------------------------------------------- [C] next woven */
  if (loop.kind === "next-woven") {
    const ritual = profile ? nextRitual(profile.ritual, profile.ritualTimes ?? DEFAULT_RITUAL_TIMES, now) : null;
    const save = async () => {
      if (!profile) return;
      // The moment is taken at the tap, never from the render: the card may have been on screen since before 21:00.
      const slot = nextRitual(profile.ritual, profile.ritualTimes ?? DEFAULT_RITUAL_TIMES, clockNow());
      if (!slot) return;
      setBusy("save");
      try {
        await arc.saveForRitual(meta.id, slot.at.toISOString());
        haptics.select();
        toast.show({ message: `Saved for ${slot.tomorrow ? "tomorrow, " : ""}${slot.hhmm}.` });
      } catch (e) {
        fail(e, "That didn’t save. Try again in a moment.");
      } finally {
        setBusy(null);
      }
    };
    return (
      <GildedPlate figure={figure} lit={lit} testID={LOOP_CARD_TEST_ID} accessibilityLabel={`Chapter ${toRoman(meta.number)} is ready`}>
        <PlateHeading eyebrow={`Chapter ${toRoman(meta.number)} is ready`} meta={meta} compact={compact} />
        <ChapterHook meta={meta} dream={dream} now={now} compact={compact} />
        <PrimaryButton
          label="Read now"
          trailing={<ArrowRight color={colors.onGold} size={18} strokeWidth={2} />}
          onPress={() => openChapter(meta.id, { reveal: "1" })}
          testID="weave-next-chapter"
        />
        {ritual ? (
          <GhostButton label={saveForLabel(ritual)} tone="secondary" disabled={busy === "save"} onPress={() => void save()} testID="today-save-for" style={styles.ghost} />
        ) : null}
      </GildedPlate>
    );
  }

  /* --------------------------------------------------------- [D] sealed */
  const today = localDateKey(now);
  const provedToday = arc.proofs(dream.id).filter((p) => p.origin !== "onboarding" && p.dateKey === today).length;
  const until = loop.until && Date.parse(loop.until) > now.getTime() ? loop.until : null;
  const ritual = profile ? nextRitual(profile.ritual, profile.ritualTimes ?? DEFAULT_RITUAL_TIMES, now) : null;
  const log = [dayMonth(today), `Chapter ${toRoman(meta.number)}`, provedToday > 0 ? `${provedToday} ${provedToday === 1 ? "proof" : "proofs"}` : null]
    .filter(Boolean)
    .join("  ·  ");
  // '21:00' tonight, 'tomorrow, 21:00' once tonight's ritual has passed.
  const opens = until ? whenLabel(until, now) : "";
  const next = until ? (opens.includes(",") ? `Opens ${opens.replace(", ", " at ")}` : `Opens at ${opens}`) : ritual ? `Next ritual ${ritual.hhmm}` : null;
  return (
    <GildedPlate figure={figure} lit={lit} testID={LOOP_CARD_TEST_ID} accessibilityLabel={until ? `Chapter ${toRoman(meta.number)} is saved for ${opens}` : "Sealed for today"}>
      <T variant="eyebrow" tone="gold" style={styles.insetSafe}>
        {until ? "Saved for your ritual" : "Sealed for today"}
      </T>
      <T variant="title" accessibilityRole="header" style={styles.title}>
        {until ? `Chapter ${toRoman(meta.number)} waits for ${opens}.` : "Today is charted."}
      </T>
      <T variant="body" style={styles.body}>
        {until
          ? "It’s woven and kept. Come back at your ritual, or open it whenever you like."
          : "You showed up, and the sky kept it. Nothing else is asked of you today."}
      </T>
      <View style={styles.log} testID="today-log-sealed" accessible accessibilityLabel={[log, next].filter(Boolean).join(". ")}>
        <T variant="caption" tone="secondary" numeric center>
          {log}
        </T>
        {next ? (
          <T variant="caption" tone="gold" numeric center>
            {next}
          </T>
        ) : null}
      </View>
      <GhostButton
        label={until ? "Read it now" : `Reread Chapter ${toRoman(meta.number)}`}
        tone="muted"
        onPress={() => openChapter(meta.id)}
        testID="today-reread"
        style={styles.ghostTight}
      />
    </GildedPlate>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space.xs, marginBottom: space.base },
  headingCompact: { marginBottom: space.md },
  /** Keep the first line clear of the plate's inset figure (76×44, top-right). */
  insetSafe: { marginRight: 76 },
  title: { marginTop: space.xs },
  body: { marginTop: space.sm, marginBottom: space.lg },
  hook: { gap: space.xs, marginBottom: space.lg },
  bridgeHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  ifThen: {
    marginTop: space.md,
    paddingLeft: space.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.violetLine,
  },
  ifThenTiny: { marginTop: space.sm },
  cta: { marginTop: space.lg },
  ghost: { marginTop: space.sm },
  ghostTight: { marginTop: space.xs, marginBottom: -space.sm },
  vignette: { alignItems: "center", marginBottom: space.base },
  log: {
    gap: space.xxs,
    paddingTop: space.md,
    marginBottom: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.goldEngrave,
  },
});
