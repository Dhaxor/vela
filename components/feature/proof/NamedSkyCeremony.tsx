// NAMED SKY (ELEVATE §2.7). The 7th proof closes the figure; the user names
// it (the default comes from the desire, 'The Studio') and it is set into
// their sky. Then 'Begin Season 2'.
//
// - useNamedSky(dreamId, season): the name draft, the suggested default and
//   nameConstellation, for any screen that hosts the ceremony.
// - NamedSkyPanel: the gilded plate, naming → named.
// - NamedSkyCeremony: the closed figure over the panel (a screen supplies the
//   actions, in its dock). The evidence route uses it after the 7th Star
//   Birth and when it is opened on a complete season.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LIMITS, isArcError, type DreamId, type Proof } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { formatCardDate } from "@/lib/share/cardModel";
import { figureFor } from "@/lib/sky/figures";
import { ConstellationFigure } from "@/components/sky";
import { GildedPlate, T, TextField, haptics, useGutter, useMotion } from "@/components/ui";
import { space } from "@/constants/theme";
import { WholeGlow } from "./StarBirth";

/** '8–21 October 2026', '28 September – 21 October 2026' or one day. '' without dated proofs. */
export function seasonSpan(proofs: readonly Pick<Proof, "dateKey">[]): string {
  const keys = proofs.map((p) => p.dateKey).filter((k) => formatCardDate(k)).sort();
  if (keys.length === 0) return "";
  const a = keys[0];
  const b = keys[keys.length - 1];
  const first = formatCardDate(a);
  const last = formatCardDate(b);
  if (a === b) return last;
  if (a.slice(0, 7) === b.slice(0, 7)) return `${Number(a.slice(8, 10))}–${last}`;
  if (a.slice(0, 4) === b.slice(0, 4)) return `${first.replace(/ \d{4}$/u, "")} – ${last}`;
  return `${first} – ${last}`;
}

export interface NamedSkyState {
  /** The default from the desire ('The Studio'). */
  readonly suggested: string;
  /** The draft in the field. */
  readonly name: string;
  setName(name: string): void;
  /** The saved name, or null while unnamed. */
  readonly named: string | null;
  readonly saving: boolean;
  readonly error: string | null;
  /** nameConstellation with the draft (or the suggestion when empty). Resolves true when set. */
  save(): Promise<boolean>;
}

export function useNamedSky(dreamId: DreamId, season: number): NamedSkyState {
  const arc = useArc();
  const dream = arc.dream(dreamId);
  const named = dream?.constellations.find((c) => c.season === season)?.name ?? null;
  const suggested = dream ? arc.suggestConstellationName(dreamId) : "";
  const [name, setName] = useState(named ?? suggested);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(!!(named ?? suggested));
  useEffect(() => {
    // The suggestion can arrive after the first render (arc hydrating); seed the field once.
    if (!seeded.current && (named ?? suggested)) {
      seeded.current = true;
      setName(named ?? suggested);
    }
  }, [named, suggested]);

  const save = async (): Promise<boolean> => {
    const value = name.replace(/\s+/gu, " ").trim() || suggested;
    if (!value || saving) return false;
    setSaving(true);
    setError(null);
    try {
      await arc.nameConstellation(dreamId, season, value);
      haptics.success();
      return true;
    } catch (e) {
      setError(isArcError(e) && e.code === "season-incomplete" ? "This sky isn't complete yet." : "That name didn't take. Try a shorter one.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    suggested,
    name,
    setName: (next) => {
      setError(null);
      setName(next);
    },
    named,
    saving,
    error,
    save,
  };
}

export interface NamedSkyPanelProps {
  sky: NamedSkyState;
  season: number;
  /** '8–21 October 2026'. */
  span?: string;
  /** Once named: what comes next ('Season 2 begins with what you did.'). */
  after?: string | null;
  testID?: string;
}

export function NamedSkyPanel({ sky, season, span, after, testID = "named-sky" }: NamedSkyPanelProps) {
  const policy = useMotion();
  const enter = policy.transitions ? FadeInDown.duration(520) : policy.still ? undefined : FadeIn.duration(320);
  if (sky.named) {
    return (
      <Animated.View entering={enter} key="named">
        <GildedPlate inset={false} testID={`${testID}-set`} accessibilityLabel={`${sky.named}, set into your sky`}>
          <View style={styles.center}>
            <T variant="eyebrow" tone="muted" center>
              Set into your sky
            </T>
            <T variant="display" tone="gold" center testID={`${testID}-title`}>
              {sky.named}
            </T>
            <T variant="caption" tone="muted" center numeric>
              {[`Season ${season}`, span].filter(Boolean).join(" · ")}
            </T>
            {after ? (
              <T variant="body" center style={styles.after}>
                {after}
              </T>
            ) : null}
          </View>
        </GildedPlate>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={enter} key="naming">
      <GildedPlate inset={false} testID={testID}>
        <View style={styles.center}>
          <T variant="eyebrow" tone="muted" center>
            {`Seven stars · Season ${season}`}
          </T>
          <T variant="display" center accessibilityRole="header">
            Your sky is whole.
          </T>
          <T variant="body" center>
            Seven real steps drew this figure. Give it a name and it stays in your sky.
          </T>
        </View>
        <TextField
          label="Its name"
          voice="words"
          value={sky.name}
          onChangeText={sky.setName}
          placeholder={sky.suggested || "The Studio"}
          maxLength={LIMITS.constellationName}
          error={sky.error}
          autoCapitalize="words"
          returnKeyType="done"
          testID={`${testID}-name`}
          style={styles.field}
        />
      </GildedPlate>
    </Animated.View>
  );
}

export interface NamedSkyCeremonyProps {
  dreamId: DreamId;
  season: number;
  sky: NamedSkyState;
  /** Once named: what comes next. */
  after?: string | null;
  /** Figure box height; the figure bleeds to the screen edges. */
  figureHeight: number;
  testID?: string;
}

/** The whole figure (lit 7) over the panel. The host screen supplies the actions. */
export function NamedSkyCeremony({ dreamId, season, sky, after, figureHeight, testID = "named-sky" }: NamedSkyCeremonyProps) {
  const arc = useArc();
  const gutter = useGutter();
  const win = useWindowDimensions();
  const proofs = arc.proofs(dreamId, season);
  const pad = Math.max(space.xl, Math.round(win.width * 0.09));
  return (
    <View testID={`${testID}-ceremony`}>
      <View style={[styles.figure, { marginHorizontal: -gutter, height: figureHeight }]}>
        <View pointerEvents="none" style={styles.glow}>
          <WholeGlow width={win.width} height={figureHeight} />
        </View>
        <ConstellationFigure
          figure={figureFor(dreamId, season)}
          lit={7}
          kinds={proofs.map((p) => p.kind)}
          width={win.width}
          height={figureHeight}
          padding={pad}
          accessibilityLabel={sky.named ? `${sky.named}, your constellation, all 7 stars lit` : "Your constellation, all 7 stars lit"}
          testID={`${testID}-figure`}
        />
      </View>
      <View style={styles.panel}>
        <NamedSkyPanel sky={sky} season={season} span={seasonSpan(proofs)} after={after} testID={testID} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: space.sm, paddingHorizontal: space.sm },
  field: { marginTop: space.lg },
  after: { marginTop: space.sm },
  figure: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", left: 0, top: 0 },
  panel: { marginTop: space.base },
});
