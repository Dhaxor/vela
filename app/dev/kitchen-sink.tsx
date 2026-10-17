// Dev-only catalogue of the Night Atlas design system: every primitive, glyph
// and sky variant on one page (/dev/kitchen-sink). Release builds redirect.
import React, { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Redirect } from "expo-router";
import { ArrowRight, MoreHorizontal, Settings, X } from "@/components/glyphs/icons";
import {
  BridgeButton,
  ChipGroup,
  DangerButton,
  Dock,
  GhostButton,
  GildedPlate,
  Header,
  IconButton,
  PrimaryButton,
  ProgressStars,
  Screen,
  SecondaryButton,
  Segmented,
  Sheet,
  Switch,
  T,
  TextField,
  UserWords,
  VellumCard,
  useConfirm,
  useMotion,
  useToast,
} from "@/components/ui";
import { ChapterCover, ConstellationFigure, SkyBackdrop, type SkyVariant } from "@/components/sky";
import {
  AreaSign,
  BridgeGlyph,
  ChapterNumeral,
  PROOF_LABEL,
  StarProof,
  TabIcon,
  VelaMark,
  Vignette,
  type TabIconName,
  type VignetteName,
} from "@/components/glyphs";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";
import { ORIGINAL_FIGURES, VELA_SAIL, VELA_STAR_NAMES } from "@/lib/sky/figures";
import { gutterFor, heroHeight } from "@/lib/sky/layout";
import type { ProofKind } from "@/contexts/arc.types";
import { colors, palette, radius, space } from "@/constants/theme";

export default function KitchenSink() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Catalogue />;
}

const KINDS: readonly ProofKind[] = ["did", "moved", "learned"];
const SAMPLE_KINDS: readonly ProofKind[] = ["did", "moved", "did", "learned", "did", "moved", "did"];
const FEELINGS = [
  { value: "proud", label: "Proud" },
  { value: "calm", label: "Calm" },
  { value: "free", label: "Free" },
  { value: "loved", label: "Loved" },
  { value: "safe", label: "Safe" },
  { value: "alive", label: "Alive" },
] as const;
type Feeling = (typeof FEELINGS)[number]["value"];
const RATES = [
  { value: "0.8", label: "0.8×", accessibilityLabel: "Speed 0.8" },
  { value: "0.9", label: "0.9×", accessibilityLabel: "Speed 0.9" },
  { value: "1.0", label: "1.0×", accessibilityLabel: "Speed 1.0" },
] as const;
const TAB_ICONS: readonly TabIconName[] = ["today", "arc", "rituals", "sky", "scenes"];
const VIGNETTES: readonly VignetteName[] = ["sail", "horizon", "window", "door"];
const VARIANTS: readonly SkyVariant[] = ["calm", "reveal", "reader", "still"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <T variant="eyebrow">{title}</T>
        <View style={styles.rule} />
      </View>
      {children}
    </View>
  );
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: value }]} />
      <T variant="caption" tone="faint" numberOfLines={1}>
        {name}
      </T>
    </View>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.labeled}>
      {children}
      <T variant="caption" tone="faint" center numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

function Catalogue() {
  const { width, height } = useWindowDimensions();
  const gutter = gutterFor(width);
  const toast = useToast();
  const confirm = useConfirm();
  const policy = useMotion();
  const inner = width - gutter * 2;
  // Tiles carry a 1px border on each side, so their content is 2pt narrower.
  const half = Math.floor((inner - space.md) / 2) - 2;
  const third = Math.floor((inner - space.md * 2) / 3) - 2;

  const [lit, setLit] = useState(4);
  const [draw, setDraw] = useState(false);
  const [feeling, setFeeling] = useState<Feeling | null>("proud");
  const [multi, setMulti] = useState<Feeling[]>(["calm", "free"]);
  const [rate, setRate] = useState<(typeof RATES)[number]["value"]>("0.9");
  const [reminders, setReminders] = useState(true);
  const [name, setName] = useState("Maya");
  const [desire, setDesire] = useState("");
  const [picked, setPicked] = useState<"a" | "b">("a");
  const [sheet, setSheet] = useState(false);

  const step = (d: number) => {
    setDraw(d > 0);
    setLit((n) => Math.max(0, Math.min(7, n + d)));
  };

  return (
    <Screen
      testID="kitchen-sink"
      header={<Header title="Night Atlas" testID="ks-header" right={<IconButton accessibilityLabel="Settings" testID="ks-settings"><Settings color={colors.ink64} size={22} strokeWidth={1.75} /></IconButton>} />}
      dock={
        <Dock testID="ks-dock">
          <PrimaryButton label="Open a sheet" onPress={() => setSheet(true)} testID="ks-open-sheet" />
        </Dock>
      }
    >
      <View style={styles.hero}>
        <VelaMark size={72} />
        <T variant="display" center>
          Night Atlas
        </T>
        <T variant="body" tone="muted" center>
          {`Design system v2 · motion ${policy.still ? "still" : policy.reduced ? "reduced" : "on"}`}
        </T>
      </View>

      <Section title="Type">
        <T variant="display">Display · Chapter IV</T>
        <T variant="title">Title · Someone Notices</T>
        <T variant="body">Body · Each step you take toward the dream becomes a star.</T>
        <T variant="body" strong tone="primary">
          Body strong · Instrument Sans 600
        </T>
        <T variant="reading">
          Reading · The studio is quiet at nine. You open the file you have been circling for a week, and this time you stay.
        </T>
        <UserWords variant="reading">my own design studio, with clients who trust my eye</UserWords>
        <T variant="caption">Caption · charted on this device</T>
        <T variant="eyebrow">Eyebrow · Tonight’s chapter</T>
        <T variant="title" tone="gold" numeric>
          12 nights · 9 stars
        </T>
      </Section>

      <Section title="Colour">
        <View style={styles.wrap}>
          {(["sky950", "sky900", "sky800", "sky700", "sky600"] as const).map((k) => (
            <Swatch key={k} name={k} value={palette[k]} />
          ))}
        </View>
        <View style={styles.wrap}>
          {(["ink100", "ink80", "ink64", "ink48", "gold500", "gold300", "violet400", "did", "moved", "learned", "danger"] as const).map((k) => (
            <Swatch key={k} name={k} value={palette[k]} />
          ))}
        </View>
      </Section>

      <Section title="Buttons">
        <PrimaryButton label="Enter chapter" trailing={<ArrowRight color={colors.onGold} size={18} strokeWidth={2} />} onPress={() => toast.show("Primary: the one gold CTA")} testID="ks-primary" />
        <BridgeButton label="I crossed it" icon={<BridgeGlyph size={20} color={colors.sky950} />} onPress={() => toast.show({ message: "Bridge crossed", tone: "proof" })} testID="ks-bridge" />
        <SecondaryButton label="Save for 21:00" onPress={() => {}} testID="ks-secondary" />
        <View style={styles.row}>
          <GhostButton label="Not today" onPress={() => {}} testID="ks-ghost" />
          <GhostButton label="Learn more" tone="violet" onPress={() => {}} testID="ks-ghost-violet" />
        </View>
        <PrimaryButton label="Weaving…" loading testID="ks-loading" />
        <PrimaryButton label="Disabled primary" disabled testID="ks-disabled-primary" />
        <SecondaryButton label="Disabled" disabled testID="ks-disabled" />
        <View style={styles.row}>
          <IconButton accessibilityLabel="Close" testID="ks-icon-close">
            <X color={colors.ink80} size={22} strokeWidth={1.75} />
          </IconButton>
          <IconButton accessibilityLabel="More" variant="vellum" testID="ks-icon-more">
            <MoreHorizontal color={colors.ink80} size={22} strokeWidth={1.75} />
          </IconButton>
          <IconButton accessibilityLabel="Settings" variant="vellum" testID="ks-icon-settings">
            <Settings color={colors.ink80} size={22} strokeWidth={1.75} />
          </IconButton>
        </View>
      </Section>

      <Section title="Materials">
        <GildedPlate lit={lit} testID="ks-plate" accessibilityLabel="Tonight's chapter">
          <T variant="eyebrow" tone="gold">
            Tonight’s chapter
          </T>
          <View style={styles.plateTitle}>
            <ChapterNumeral value={4} variant="title" />
            <T variant="display">Someone Notices</T>
          </View>
          <T variant="body" style={styles.plateBody}>
            It begins with what you did on Tuesday.
          </T>
          <PrimaryButton label="Enter chapter" onPress={() => {}} testID="ks-plate-cta" />
        </GildedPlate>
        <VellumCard testID="ks-vellum">
          <T variant="title">Vellum card</T>
          <T variant="body" style={styles.mt8}>
            sky700 at 72%, a hairline, a 1px top highlight, radius 20, padding 24.
          </T>
        </VellumCard>
        <View style={styles.row}>
          <VellumCard padding="compact" style={styles.flex} selected={picked === "a"} onPress={() => setPicked("a")} testID="ks-select-a">
            <T variant="body" strong tone="primary">
              2 minutes
            </T>
            <T variant="caption">Open the file</T>
          </VellumCard>
          <VellumCard padding="compact" style={styles.flex} selected={picked === "b"} onPress={() => setPicked("b")} testID="ks-select-b">
            <T variant="body" strong tone="primary">
              Brave
            </T>
            <T variant="caption">Send it today</T>
          </VellumCard>
        </View>
        <VellumCard tone="bridge" testID="ks-bridge-card">
          <View style={styles.row}>
            <BridgeGlyph size={22} />
            <T variant="eyebrow" tone="violet">
              Today’s bridge
            </T>
          </View>
          <T variant="title" style={styles.mt8}>
            Send one piece of work to someone whose eye you trust.
          </T>
        </VellumCard>
      </Section>

      <Section title="Inputs">
        <TextField label="Your name" value={name} onChangeText={setName} placeholder="What should Vela call you?" testID="ks-name" />
        <TextField
          label="In your own words"
          voice="words"
          multiline
          value={desire}
          onChangeText={setDesire}
          placeholder="My own design studio, with clients who trust my eye"
          maxLength={160}
          showCount
          testID="ks-desire"
        />
        <TextField label="With an error" value="" placeholder="Required" error="Write one honest sentence." testID="ks-error" />
        <ChipGroup options={FEELINGS} value={feeling} onChange={setFeeling} testIDPrefix="ks-feeling-" accessibilityLabel="Feeling" />
        <ChipGroup multiple options={FEELINGS.slice(0, 4)} value={multi} onChange={setMulti} testIDPrefix="ks-multi-" />
        <Segmented options={RATES} value={rate} onChange={setRate} testID="ks-rate" accessibilityLabel="Speed" />
        <View style={styles.between}>
          <T variant="body">Ritual reminders</T>
          <Switch value={reminders} onValueChange={setReminders} accessibilityLabel="Ritual reminders" testID="ks-switch" />
        </View>
        <ProgressStars total={6} value={2} accessibilityLabel="Step 3 of 6" testID="ks-steps" />
        <ProgressStars states={["lit", "rest", "lit", "lit", "rest", "current", "upcoming"]} accessibilityLabel="3 of 4 nights this week" testID="ks-rhythm" />
      </Section>

      <Section title="Glyphs">
        <View style={styles.wrap}>
          {KINDS.map((k) => (
            <Labeled key={k} label={PROOF_LABEL[k]}>
              <StarProof kind={k} size={32} />
            </Labeled>
          ))}
          <Labeled label="Bridge">
            <BridgeGlyph size={32} />
          </Labeled>
          <Labeled label="Vela">
            <VelaMark size={32} />
          </Labeled>
        </View>
        <View style={styles.wrap}>
          {FOCUS_AREAS.map((f) => (
            <Labeled key={f.id} label={f.label}>
              <AreaSign focus={f.id} size={32} />
            </Labeled>
          ))}
        </View>
        <View style={styles.wrap}>
          {TAB_ICONS.map((n) => (
            <Labeled key={n} label={n}>
              <View style={styles.row}>
                <TabIcon name={n} focused color={colors.ink100} />
                <TabIcon name={n} color={colors.ink48} />
              </View>
            </Labeled>
          ))}
        </View>
        <View style={styles.wrap}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <ChapterNumeral key={n} value={n} variant="title" />
          ))}
        </View>
        <ChapterNumeral value={3} ruled />
        <View style={styles.wrap}>
          {VIGNETTES.map((v) => (
            <Labeled key={v} label={v}>
              <Vignette name={v} width={half - space.sm} />
            </Labeled>
          ))}
        </View>
      </Section>

      <Section title="Constellation">
        <View style={[styles.figureBox, { height: heroHeight(height) }]}>
          <ConstellationFigure
            key={`${lit}-${draw}`}
            lit={lit}
            kinds={SAMPLE_KINDS}
            width={inner}
            height={heroHeight(height)}
            drawLatest={draw}
            onStarPress={(i) => toast.show(i === 0 ? "Anchor · your dream" : `${VELA_STAR_NAMES[i]} · proof ${i}`)}
            testID="ks-figure"
          />
        </View>
        <View style={styles.between}>
          <SecondaryButton label="Dim" onPress={() => step(-1)} style={styles.flex} testID="ks-lit-minus" />
          <T variant="title" tone="gold" numeric style={styles.count}>
            {`${lit} / 7`}
          </T>
          <SecondaryButton label="Light" onPress={() => step(1)} style={styles.flex} testID="ks-lit-plus" />
        </View>
        <View style={styles.wrap}>
          {[VELA_SAIL, ...ORIGINAL_FIGURES].map((f) => (
            <Labeled key={f.id} label={f.name}>
              <View style={styles.thumb}>
                <ConstellationFigure figure={f} lit={7} width={third} height={third * 0.7} padding={14} variant="inset" />
              </View>
            </Labeled>
          ))}
        </View>
      </Section>

      <Section title="Chapter covers">
        <View style={styles.wrap}>
          {FOCUS_AREAS.map((f, i) => (
            <Labeled key={f.id} label={f.label}>
              <View style={styles.cover}>
                <ChapterCover dreamId={`demo-${f.id}`} season={i % 2 === 0 ? 1 : 2} focus={f.id as FocusId} chapter={i + 2} lit={i + 1} kinds={SAMPLE_KINDS} width={half} height={half * 1.3} />
              </View>
            </Labeled>
          ))}
        </View>
      </Section>

      <Section title="Sky variants">
        <View style={styles.wrap}>
          {VARIANTS.map((v) => (
            <Labeled key={v} label={v}>
              <View style={[styles.tile, { width: half, height: 220 }]}>
                <SkyBackdrop variant={v} width={half} height={220} />
              </View>
            </Labeled>
          ))}
        </View>
        <View style={styles.wrap}>
          {FOCUS_AREAS.map((f) => (
            <Labeled key={f.id} label={f.label}>
              <View style={[styles.tile, { width: third, height: 140 }]}>
                <SkyBackdrop focus={f.id} width={third} height={140} active={false} />
              </View>
            </Labeled>
          ))}
        </View>
      </Section>

      <Section title="Feedback">
        <View style={styles.row}>
          <GhostButton label="Toast" onPress={() => toast.show("Saved to your sky")} testID="ks-toast" />
          <GhostButton label="Proof toast" onPress={() => toast.show({ message: "Proof 4 · charted", tone: "proof" })} testID="ks-toast-proof" />
          <GhostButton label="Error" tone="danger" onPress={() => toast.show({ message: "That didn’t save. Try again.", tone: "error" })} testID="ks-toast-error" />
        </View>
        <DangerButton
          label="Release this dream…"
          onPress={async () => {
            const ok = await confirm({
              title: "Release this dream?",
              message: "Its chapters stay readable in your Memory Book. It stops weaving.",
              confirmLabel: "Release",
              destructive: true,
            });
            toast.show(ok ? "Released" : "Kept");
          }}
          testID="ks-confirm"
        />
      </Section>

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Choose today’s bridge"
        subtitle="One small, observable step. Pick the size that fits your day."
        testID="ks-sheet"
        footer={<BridgeButton label="Make it observable" onPress={() => setSheet(false)} testID="ks-sheet-cta" />}
      >
        <View style={styles.sheetList}>
          <VellumCard tone="bridge" padding="compact" selected>
            <T variant="caption" tone="violet" strong>
              15 minutes
            </T>
            <T variant="body" tone="primary">
              Send one piece of work to someone whose eye you trust.
            </T>
          </VellumCard>
          <VellumCard padding="compact">
            <T variant="caption" strong>
              2 minutes
            </T>
            <T variant="body">Open the portfolio file and name it.</T>
          </VellumCard>
          {/* A toast raised while a sheet stays open draws inside the sheet (an iOS Modal covers the root). */}
          <GhostButton
            label="Toast from the sheet"
            tone="danger"
            onPress={() => toast.show({ message: "That didn’t save. Try again.", tone: "error" })}
            testID="ks-sheet-toast"
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space.sm, paddingTop: space.lg, paddingBottom: space.xl },
  section: { gap: space.base, marginBottom: space.xxl },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.xs },
  rule: { flex: 1, height: 1, backgroundColor: colors.hairline },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  flex: { flex: 1 },
  mt8: { marginTop: space.sm },
  swatch: { width: 64, gap: space.xs },
  swatchChip: { height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline },
  labeled: { alignItems: "center", gap: space.xs },
  plateTitle: { flexDirection: "row", alignItems: "baseline", gap: space.md, marginTop: space.sm, paddingRight: space.huge },
  plateBody: { marginTop: space.sm, marginBottom: space.lg },
  figureBox: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline, overflow: "hidden" },
  count: { minWidth: 72, textAlign: "center" },
  thumb: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.vellum },
  cover: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.goldEngrave },
  tile: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline },
  sheetList: { gap: space.md },
});
