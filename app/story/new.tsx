// A new dream (the additional-dream intake). The first dream is made in First
// Light; this screen is reused for every dream after it, with the same fields:
// where it lives → in your own words → how it feels → the Weave → Chapter I.
//
// Free keeps one dream weaving at a time, so without room for another the
// paywall opens once (from=second-dream). Coming back without Plus shows a
// calm locked state instead of bouncing to the paywall again; coming back
// with Plus unlocks the intake in place.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { X } from "@/components/glyphs/icons";
import { useArc } from "@/contexts/ArcContext";
import { isArcError } from "@/contexts/arc.types";
import { useUser } from "@/contexts/UserContext";
import { safeBack } from "@/lib/nav";
import type { FocusId } from "@/lib/focus";
import { Dock, GhostButton, Header, IconButton, PrimaryButton, Screen, T, useToast } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import { DesireField, FeelingChips, FocusChips, StepIntro } from "@/components/feature/onboarding";
import { colors, space } from "@/constants/theme";

const PAYWALL = { pathname: "/paywall", params: { from: "second-dream" } } as const;

export default function NewDreamScreen() {
  const router = useRouter();
  const arc = useArc();
  const { profile } = useUser();
  const toast = useToast();

  const preferred = useMemo(() => profile?.focusAreas ?? [], [profile?.focusAreas]);
  // Suggest the user's own areas, starting with one no living dream holds yet.
  const initialFocus = useMemo<FocusId | null>(() => {
    const taken = new Set(arc.dreams.filter((d) => d.status !== "released").map((d) => d.focus));
    return preferred.find((f) => !taken.has(f)) ?? preferred[0] ?? null;
    // Only on first render: later dreams must not move the user's pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [focus, setFocus] = useState<FocusId | null>(initialFocus);
  const [desire, setDesire] = useState("");
  const [feeling, setFeeling] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Creating a dream fills the free slot mid-flow; never show the lock for our own dream.
  const creating = useRef(false);

  const locked = !arc.canCreateDream && !creating.current;
  const canWeave = focus !== null && desire.trim().length >= 3 && feeling !== null;

  // Open the paywall once per visit; afterwards the locked state offers it again.
  const offered = useRef(false);
  useEffect(() => {
    if (!locked || offered.current) return;
    offered.current = true;
    // A frame later, so a cold start onto /story/new has a mounted stack to push onto.
    const frame = requestAnimationFrame(() => router.push(PAYWALL));
    return () => cancelAnimationFrame(frame);
  }, [locked, router]);

  const close = () => safeBack(router);

  const weave = async () => {
    if (!canWeave || busy || !focus || !feeling) return;
    setBusy(true);
    creating.current = true;
    try {
      const chapter = await arc.createDream({ focus, desire: desire.trim(), feeling });
      router.replace({ pathname: "/weave/[chapterId]", params: { chapterId: chapter.id } });
    } catch (e) {
      creating.current = false;
      setBusy(false);
      if (isArcError(e) && e.code === "plan-limit") router.push(PAYWALL);
      else toast.show({ message: "That dream couldn’t be woven. Check the words and try again.", tone: "error" });
    }
  };

  const header = (
    <Header
      title="A new dream"
      back={false}
      testID="new-story-header"
      right={
        <IconButton accessibilityLabel="Close" onPress={close} testID="new-story-close">
          <X color={colors.ink80} size={24} strokeWidth={1.75} />
        </IconButton>
      }
    />
  );

  if (locked) {
    return (
      <Screen
        testID="new-story-locked"
        header={header}
        dock={
          <Dock>
            <PrimaryButton label="See Vela Plus" onPress={() => router.push(PAYWALL)} testID="intake-plus" />
            <GhostButton label="Not now" onPress={close} testID="intake-locked-back" />
          </Dock>
        }
      >
        <View style={styles.locked}>
          <Vignette name="door" width={176} />
          <T variant="title" center style={styles.lockedTitle} accessibilityRole="header">
            Your sky holds one dream at a time.
          </T>
          <T center style={styles.lockedBody}>
            Vela Plus lets more than one dream weave at once. Or rest the dream you have from the Arc, and begin this one free.
          </T>
          <T variant="caption" center style={styles.lockedNote}>
            Every chapter you have stays readable either way.
          </T>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      testID="new-story-screen"
      focus={focus}
      header={header}
      dock={
        <Dock>
          <PrimaryButton
            label="Weave Chapter I"
            onPress={() => void weave()}
            disabled={!canWeave}
            loading={busy}
            testID="intake-weave"
            accessibilityHint={canWeave ? undefined : "Choose where it lives, write a few words and choose a feeling first"}
          />
        </Dock>
      }
    >
      <StepIntro title="What else is calling?" lead="Each dream gets its own sky, its own chapters and its own stars." />

      <T variant="eyebrow" style={styles.label}>
        Where it lives
      </T>
      <FocusChips value={focus} onChange={setFocus} preferred={preferred} testIDPrefix="intake-focus-" />

      <View style={styles.group}>
        <DesireField
          label="In your own words"
          focus={focus}
          value={desire}
          onChangeText={setDesire}
          testID="intake-desire"
          suggestionPrefix="intake-suggestion-"
        />
      </View>

      <T variant="eyebrow" style={[styles.label, styles.group]}>
        When it’s real, you feel
      </T>
      <FeelingChips value={feeling} onChange={setFeeling} testIDPrefix="intake-feeling-" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space.md },
  group: { marginTop: space.xl },
  locked: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xl },
  lockedTitle: { marginTop: space.lg },
  lockedBody: { marginTop: space.md, maxWidth: 340 },
  lockedNote: { marginTop: space.lg },
});
