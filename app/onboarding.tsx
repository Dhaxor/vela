// FIRST LIGHT (ELEVATE §0.4): from install to a chapter written from your own
// words in six short steps, each one decision, with back on every step:
//
//   1 welcome (the free promise) → 2 focus → 3 in your words (+ feeling)
//   → 4 name (+ how to say it) → 5 ritual and time → 6 one thing you've
//   already done (optional seed proof) → the Weave → Chapter I
//
// Progress is six stars connecting into the Vela sail; the Weave lights the
// seventh. No account, no paywall, no permission prompt: reminders are only
// explained here (the ask comes when the first bridge is chosen).
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInLeft, FadeInRight, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import type { RitualTime } from "@/contexts/user.types";
import { useUser } from "@/contexts/UserContext";
import { focusById, type FocusId } from "@/lib/focus";
import { Dock, PrimaryButton, Screen, T, TextField, drift, useMotion } from "@/components/ui";
import { AreaSign } from "@/components/glyphs";
import {
  DEFAULT_PRESET,
  DesireField,
  DrawnVelaMark,
  FIRST_LIGHT_ID,
  FeelingChips,
  FocusGrid,
  RitualPicker,
  SeedField,
  StepIntro,
  StepTopBar,
  stageFirstLight,
  toHHmm,
  type RitualSlot,
} from "@/components/feature/onboarding";
import { colors, motion, space } from "@/constants/theme";

const STEPS = 6;
const WELCOME = 0;
const FOCUS = 1;
const WORDS = 2;
const NAME = 3;
const RITUAL = 4;
const SEED = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const { saveProfile } = useUser();
  const policy = useMotion();
  const scroll = useRef<ScrollView>(null);
  const sayIt = useRef<TextInput>(null);

  const [step, setStep] = useState(WELCOME);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [focusAreas, setFocusAreas] = useState<FocusId[]>([]);
  const [desire, setDesire] = useState("");
  const [feeling, setFeeling] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [ritual, setRitual] = useState<RitualTime | null>(null);
  const [times, setTimes] = useState<Record<RitualSlot, string>>({ ...DEFAULT_PRESET });
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);

  const primary = focusAreas[0] ?? null;
  const canContinue =
    step === FOCUS
      ? primary !== null
      : step === WORDS
        ? desire.trim().length >= 3 && feeling !== null
        : step === NAME
          ? name.trim().length > 0
          : step === RITUAL
            ? ritual !== null
            : true;

  const goTo = useCallback((next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const back = useCallback(() => {
    if (step > WELCOME) goTo(step - 1);
  }, [step, goTo]);

  // Android back walks the steps instead of leaving the app.
  useEffect(() => {
    if (step === WELCOME) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [step, back]);

  const finish = () => {
    if (busy || !primary || !feeling || !ritual) return;
    setBusy(true);
    stageFirstLight({ focus: primary, desire: desire.trim(), feeling, seed: seed.trim() });
    // Same tick: leave onboarding for the Weave, then commit the profile. The
    // Weave writes Chapter I once the profile (and the name in it) is live.
    router.replace({ pathname: "/weave/[chapterId]", params: { chapterId: FIRST_LIGHT_ID } });
    void saveProfile({
      name: name.trim(),
      pronunciation: pronunciation.trim() || null,
      focusAreas,
      ritual,
      ritualTimes: { morning: toHHmm(times.morning), evening: toHHmm(times.evening) },
    });
  };

  const next = () => {
    if (!canContinue) return;
    if (step < SEED) goTo(step + 1);
    else finish();
  };

  // The one requirement that can sit below the fold on a small phone gets a word above the button.
  const nudge = step === WORDS && desire.trim().length >= 3 && feeling === null ? "Choose how it feels to continue" : null;

  const cta = step === WELCOME ? "Begin" : step === SEED ? "Weave Chapter I" : "Continue";

  // FIRST LIGHT: the sky fades in under the self-drawing mark; the promise follows.
  const sky = useSharedValue(policy.transitions ? 0 : 1);
  const promise = useSharedValue(policy.transitions ? 0 : 1);
  useEffect(() => {
    if (!policy.transitions) return;
    sky.value = withTiming(1, { duration: motion.reveal });
    promise.value = withDelay(1500, withTiming(1, { duration: motion.reveal, easing: drift }));
    // Mount-only: the welcome plays once per launch of onboarding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skyStyle = useAnimatedStyle(() => ({ opacity: sky.value }));
  const promiseStyle = useAnimatedStyle(() => ({ opacity: promise.value, transform: [{ translateY: (1 - promise.value) * 8 }] }));

  const entering = !policy.transitions
    ? undefined
    : (direction === 1 ? FadeInRight : FadeInLeft).duration(motion.enter);

  const area = primary ? focusById(primary) : undefined;
  const areaEyebrow = area ? (
    <>
      <AreaSign focus={area.id} size={20} color={colors.gold300} />
      <T variant="eyebrow" tone="gold">
        {area.label}
      </T>
    </>
  ) : undefined;

  return (
    <Animated.View style={[styles.fill, skyStyle]}>
      <Screen
        focus={primary}
        testID="onboarding"
        scrollProps={{ ref: scroll }}
        header={<StepTopBar step={step} total={STEPS} onBack={step > WELCOME ? back : undefined} />}
        dock={
          <Dock>
            {nudge ? (
              <T variant="caption" tone="secondary" center testID="onboarding-nudge">
                {nudge}
              </T>
            ) : null}
            <PrimaryButton
              label={cta}
              onPress={next}
              disabled={!canContinue}
              loading={busy}
              testID={step === SEED ? "onboarding-done" : "onboarding-next"}
              accessibilityHint={canContinue ? undefined : HINTS[step]}
            />
          </Dock>
        }
      >
        <Animated.View key={step} entering={step === WELCOME ? (policy.transitions ? FadeIn.duration(motion.enter) : undefined) : entering} style={styles.fill}>
          {step === WELCOME ? (
            <View style={styles.welcome}>
              <DrawnVelaMark size={112} testID="onboarding-mark" />
              <Animated.View style={[styles.promise, promiseStyle]}>
                <T variant="eyebrow" tone="gold" center>
                  Vela
                </T>
                <T variant="display" center style={styles.promiseTitle} accessibilityRole="header">
                  {"Your story is written\non this phone."}
                </T>
                <T center style={styles.promiseBody}>
                  Unlimited listens. No account.
                </T>
                <View style={styles.loop} testID="onboarding-loop">
                  <LoopLine numeral="I" text="A chapter written from your own words" />
                  <LoopLine numeral="II" text="One real step to take toward it" />
                  <LoopLine numeral="III" text="What you do becomes a star, and the next chapter" />
                </View>
              </Animated.View>
            </View>
          ) : null}

          {step === FOCUS ? (
            <>
              <StepIntro title="What are you calling in?" lead="Your first story begins with the first one you choose. Add others if they pull at you too." />
              <FocusGrid value={focusAreas} onChange={setFocusAreas} testIDPrefix="focus-" />
            </>
          ) : null}

          {step === WORDS ? (
            <>
              <StepIntro eyebrow={areaEyebrow} title="In your own words." lead="Your first chapter is written from these words." />
              <DesireField
                focus={primary}
                value={desire}
                onChangeText={setDesire}
                testID="onboarding-desire"
                suggestionPrefix="onboarding-suggestion-"
              />
              <T variant="eyebrow" style={styles.groupLabel}>
                When it’s real, you feel
              </T>
              <FeelingChips value={feeling} onChange={setFeeling} testIDPrefix="onboarding-feeling-" />
            </>
          ) : null}

          {step === NAME ? (
            <>
              <StepIntro title="What should we call you?" lead="Your name is woven into every chapter." />
              <TextField
                label="Your first name"
                value={name}
                onChangeText={setName}
                placeholder="First name"
                maxLength={40}
                autoFocus={policy.transitions}
                autoCorrect={false}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={() => sayIt.current?.focus()}
                testID="name-input"
              />
              <TextField
                ref={sayIt}
                label="How to say it"
                value={pronunciation}
                onChangeText={setPronunciation}
                placeholder={name.trim() ? `Spell ${name.trim()} the way it sounds` : "Spell it the way it sounds"}
                hint="Optional. The narrator says your name this way, for example MY-uh."
                maxLength={40}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={next}
                style={styles.second}
                testID="pronunciation-input"
              />
            </>
          ) : null}

          {step === RITUAL ? (
            <>
              <StepIntro title="When shall we meet?" lead="A chapter is easier to keep when it has a time." />
              <RitualPicker ritual={ritual} onRitual={setRitual} times={times} onTime={(slot, p) => setTimes((t) => ({ ...t, [slot]: p }))} />
            </>
          ) : null}

          {step === SEED ? (
            <>
              <StepIntro eyebrow={areaEyebrow} title="One thing you’ve already done toward this." lead="Optional, and anything counts: a search, a message, a first sketch." />
              <SeedField focus={primary} value={seed} onChangeText={setSeed} testID="onboarding-seed" />
            </>
          ) : null}
        </Animated.View>
      </Screen>
    </Animated.View>
  );
}

const HINTS: Record<number, string> = {
  [FOCUS]: "Choose an area first",
  [WORDS]: "Write a few words and choose a feeling first",
  [NAME]: "Enter your name first",
  [RITUAL]: "Choose morning, evening or both first",
};

function LoopLine({ numeral, text }: { numeral: string; text: string }) {
  return (
    <View style={styles.loopLine}>
      <T variant="caption" tone="gold" numeric style={styles.loopNumeral}>
        {numeral}
      </T>
      <T variant="caption" tone="secondary" style={styles.loopText}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xl },
  promise: { alignItems: "center", marginTop: space.lg, alignSelf: "stretch" },
  promiseTitle: { marginTop: space.md },
  promiseBody: { marginTop: space.md },
  loop: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: space.md,
  },
  loopLine: { flexDirection: "row", alignItems: "baseline", gap: space.md },
  loopNumeral: { width: space.lg, textAlign: "right" },
  loopText: { flex: 1 },
  groupLabel: { marginTop: space.xl, marginBottom: space.md },
  second: { marginTop: space.lg },
});
