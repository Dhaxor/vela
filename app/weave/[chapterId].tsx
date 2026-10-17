// /weave/<chapterId>: THE WEAVE, the interstitial before every new chapter.
// Its only input is the route param. Callers: First Light (onboarding), the
// additional-dream intake (/story/new) and the evidence flow after a proof
// weaves the next chapter. It ends with router.replace to /story/<chapterId>.
//
// - Full motion: about 2.4s (words rise, scatter into stars, lines connect,
//   the numeral resolves), then a short hold. Skippable by tap, except the
//   user's very first Weave, which plays through.
// - Reduce Motion: a short crossfade of the end state.
// - Still mode: the end state, waiting for a tap.
//
// First Light passes the sentinel FIRST_LIGHT_ID: the dream is created here,
// once the new profile is live (see components/feature/onboarding/firstLight.ts),
// and the param is swapped for the real chapter id.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { holdForCeremony, useArc } from "@/contexts/ArcContext";
import { isArcError } from "@/contexts/arc.types";
import { useUser } from "@/contexts/UserContext";
import { gutterFor, toRoman } from "@/lib/sky";
import { Screen, T, haptics, useMotion, useToast } from "@/components/ui";
import { FIRST_LIGHT_ID, WEAVE_TIMING, WeaveStage, clearFirstLight, stagedFirstLight, useWeaveModel, type WeaveMode } from "@/components/feature/onboarding";
import { motion, space } from "@/constants/theme";

/** Beat held on the resolved numeral before the chapter opens. */
const HOLD_MS = 350;
/** Reduce Motion: crossfade in, then a calm beat. */
const CROSSFADE_TOTAL_MS = motion.enter + 1300;

export default function WeaveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chapterId?: string }>();
  const raw = typeof params.chapterId === "string" ? params.chapterId : null;
  const arc = useArc();
  const { profile } = useUser();
  const toast = useToast();
  const policy = useMotion();

  const firstLight = raw === FIRST_LIGHT_ID;
  const [createdId, setCreatedId] = useState<string | null>(() => (firstLight ? stagedFirstLight()?.chapterId ?? null : null));
  const chapterId = firstLight ? createdId : raw;
  const model = useWeaveModel(chapterId);

  // First Light: write Chapter I (with the seed proof) once the profile is live.
  useEffect(() => {
    if (!firstLight || createdId) return;
    const staged = stagedFirstLight();
    if (!staged) {
      // Reloaded mid-Weave: weave what exists, or go home.
      const latest = arc.activeDreamId ? arc.latestChapter(arc.activeDreamId) : undefined;
      if (latest) setCreatedId(latest.id);
      else router.replace("/");
      return;
    }
    if (staged.chapterId) {
      setCreatedId(staged.chapterId);
      return;
    }
    if (!profile || staged.creating) return;
    staged.creating = true;
    const { focus, desire, feeling, seed } = staged.draft;
    arc
      .createDream({ focus, desire, feeling, seedProof: seed ? { text: seed } : undefined })
      .then((chapter) => {
        staged.chapterId = chapter.id;
        setCreatedId(chapter.id);
        router.setParams({ chapterId: chapter.id });
      })
      .catch((e: unknown) => {
        clearFirstLight();
        toast.show({
          message: isArcError(e) && e.code === "invalid-input" ? "Those words didn’t take. Try your dream again from Today." : "Your first chapter couldn’t be written. Try again from Today.",
          tone: "error",
        });
        router.replace("/");
      });
  }, [firstLight, createdId, profile, arc, router, toast]);

  // A chapter id that doesn't exist: nothing to weave. (First Light's own id is
  // exempt for the render in which the new param lands before the arc state.)
  useEffect(() => {
    if (firstLight || !arc.ready || !raw || arc.chapterMeta(raw)) return;
    if (stagedFirstLight()?.chapterId === raw) return;
    router.replace("/");
  }, [firstLight, arc, raw, router]);

  const mode: WeaveMode = policy.still ? "still" : policy.reduced ? "crossfade" : "full";
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const done = useRef(false);
  const release = useRef<(() => void) | null>(null);

  // `open` reads the latest chapter id through a ref, so it never changes identity
  // and the ceremony timer below is set exactly once.
  const target = useRef<string | null>(null);
  target.current = model?.chapterId ?? null;
  const open = useCallback(() => {
    const id = target.current;
    if (done.current || !id) return;
    done.current = true;
    release.current?.();
    if (stagedFirstLight()?.chapterId === id) clearFirstLight();
    router.replace({ pathname: "/story/[id]", params: { id } });
  }, [router]);

  // Hold storage writes while the ceremony runs, then open the chapter.
  const ready = !!model && !!size;
  useEffect(() => {
    if (!ready) return;
    release.current = holdForCeremony(6000);
    const total = mode === "full" ? WEAVE_TIMING.total + HOLD_MS : mode === "crossfade" ? CROSSFADE_TOTAL_MS : null;
    const timer = total === null ? null : setTimeout(open, total);
    if (mode === "still") release.current();
    return () => {
      if (timer) clearTimeout(timer);
      release.current?.();
    };
  }, [ready, mode, open]);

  const skippable = mode === "still" || (!!model && !model.firstTime);
  const hint = mode === "still" ? `Tap to begin Chapter ${model ? toRoman(model.numeral) : ""}` : skippable ? "Tap to skip" : null;

  return (
    <Screen variant="reveal" scroll={false} padded={false} edges={["top", "bottom"]} focus={model?.focus} testID="weave">
      <Pressable
        style={styles.fill}
        onPress={skippable ? open : undefined}
        disabled={!skippable}
        accessibilityRole="button"
        accessibilityLabel={model ? `Chapter ${model.numeral}, ${model.title}. ${model.caption}` : "Weaving your chapter"}
        accessibilityHint={skippable ? "Opens the chapter" : undefined}
        testID="weave-stage"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (!size || Math.round(width) !== Math.round(size.width) || Math.round(height) !== Math.round(size.height)) setSize({ width, height });
        }}
      >
        {model && size ? (
          <WeaveStage
            words={model.words}
            figure={model.figure}
            lit={model.lit}
            kinds={model.kinds}
            numeral={model.numeral}
            title={model.title}
            stageName={model.stageName}
            caption={model.caption}
            mode={mode}
            width={size.width}
            height={size.height}
            gutter={gutterFor(size.width)}
            running={ready}
            onReveal={haptics.reveal}
            testID="weave-figure"
          />
        ) : null}
        {hint ? (
          <View style={styles.hint} pointerEvents="none">
            <T variant="caption" tone="faint" center testID="weave-hint">
              {hint}
            </T>
          </View>
        ) : null}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hint: { position: "absolute", left: 0, right: 0, bottom: space.lg },
});
