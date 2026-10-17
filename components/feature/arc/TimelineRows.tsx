// The Memory Book's rows. A thin spine (the thread of the book) runs down
// the centre of the chapter covers; bridges and proofs hang on it as small
// markers, and their text starts in line with the plates' text.
// - Season divider: an atlas chapter heading, with the constellation's name once named.
// - Bridge: violet (the loop's act). Proof: starlight, shape and tint by kind.
// - Course: the dashed way ahead, after the newest chapter of a season in progress.
// - Book start: the honest first page of a book carried over from Vela 1.0.
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import type { Proof } from "@/contexts/arc.types";
import { BridgeButton, Press, T, UserWords, VellumCard } from "@/components/ui";
import { BridgeGlyph, PROOF_LABEL, StarProof, TabIcon } from "@/components/glyphs";
import { sparklePath, toRoman } from "@/lib/sky";
import { stageMeta } from "@/lib/story/seasons";
import type { StageId } from "@/lib/story/content/types";
import { colors, radius, space } from "@/constants/theme";
import { MARKER, MARKER_TOP, NODE_PAD, SPINE_X, TEXT_X } from "./metrics";
import { relativeDate, shortDate, type BookStartRow, type BridgeRow, type CourseRow, type ProofRow, type SeasonRow } from "./model";

/* =========================================================================
 * Spine
 * ========================================================================= */

export interface SpineProps {
  /** The thread continues from the row above. */
  above: boolean;
  /** The thread continues to the row below. */
  below: boolean;
  /** Draw the part above the marker as the dashed course still to sail. */
  dashedAbove?: boolean;
}

const MARKER_CENTER = MARKER_TOP + MARKER / 2;

function Spine({ above, below, dashedAbove = false }: SpineProps) {
  return (
    <>
      {above ? (
        dashedAbove ? (
          <View style={[styles.spine, { top: 0, height: MARKER_CENTER }]}>
            <Svg width={2} height={MARKER_CENTER}>
              <Line x1={1} y1={0} x2={1} y2={MARKER_CENTER} stroke={colors.goldLine} strokeWidth={1} strokeDasharray={[2, 4]} />
            </Svg>
          </View>
        ) : (
          <View style={[styles.spine, styles.spineLine, { top: 0, height: MARKER_CENTER }]} />
        )
      ) : null}
      {below ? <View style={[styles.spine, styles.spineLine, { top: MARKER_CENTER, bottom: 0 }]} /> : null}
    </>
  );
}

/** The thread behind a plate: the plate covers its middle. */
export function PlateSpine({ above, below }: Omit<SpineProps, "dashedAbove">) {
  return (
    <>
      {above ? <View style={[styles.spine, styles.spineLine, { top: 0, height: "50%" }]} /> : null}
      {below ? <View style={[styles.spine, styles.spineLine, { top: "50%", bottom: 0 }]} /> : null}
    </>
  );
}

function Marker({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "bridge" | "course" }) {
  return (
    <View style={[styles.marker, tone === "bridge" && styles.markerBridge, tone === "course" && styles.markerCourse]}>
      {children}
    </View>
  );
}

/* =========================================================================
 * Season divider
 * ========================================================================= */

export function SeasonDivider({ row, today, first }: { row: SeasonRow; today: string; first: boolean }) {
  const named = row.name !== null;
  const detail = [
    `${row.stars} of 7 stars`,
    named && row.namedOn
      ? `named ${shortDate(row.namedOn, today)}`
      : row.complete
        ? row.current
          ? "ready to be named"
          : "complete"
        : row.startedOn
          ? `since ${shortDate(row.startedOn, today)}`
          : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={[styles.season, first && styles.seasonFirst]} testID={`arc-season-${row.season}`} accessibilityRole="header">
      <View style={styles.seasonRule}>
        <View style={styles.rule} />
        <T variant="eyebrow" tone={named ? "gold" : "muted"}>
          {`Season ${row.season}`}
        </T>
        <View style={styles.rule} />
      </View>
      {named ? (
        <T variant="title" center style={styles.seasonName}>
          {row.name}
        </T>
      ) : null}
      <T variant="caption" tone="muted" center numeric style={styles.seasonDetail}>
        {detail}
      </T>
    </View>
  );
}

/* =========================================================================
 * Book start (migrated from 1.0)
 * ========================================================================= */

export function BookStartPlate({ row }: { row: BookStartRow }) {
  const opensAt = row.firstChapter > 1 ? `, so this book opens at Chapter ${toRoman(row.firstChapter)}` : "";
  const kept =
    row.earlierProofs === 0
      ? "Every chapter from now on is kept."
      : `${row.earlierProofs === 1 ? "Your earlier proof is here" : `All ${row.earlierProofs} earlier proofs are here`}, and every chapter from now on is kept.`;
  return (
    <VellumCard padding="compact" style={styles.bookStart} testID="arc-book-start">
      <View style={styles.bookStartHead}>
        <TabIcon name="arc" focused size={20} color={colors.gold300} />
        <T variant="title">Your book starts here</T>
      </View>
      <T variant="body" tone="muted" style={styles.bookStartBody}>
        {`Vela 1.0 kept only your newest chapter${opensAt}. ${kept}`}
      </T>
    </VellumCard>
  );
}

/* =========================================================================
 * Bridge node
 * ========================================================================= */

const TIER_EYEBROW: Record<BridgeRow["bridge"]["tier"], string> = {
  "2min": "2-minute bridge",
  "15min": "15-minute bridge",
  brave: "Brave bridge",
  own: "Your own bridge",
};

export interface BridgeNodeProps extends Omit<SpineProps, "dashedAbove"> {
  row: BridgeRow;
  /** Present when the bridge is open on a dream that weaves: 'I crossed it' leads to the proof form. */
  onCross?: () => void;
}

export const BridgeNode = React.memo(function BridgeNode({ row, above, below, onCross }: BridgeNodeProps) {
  const { bridge } = row;
  const open = bridge.status === "open";
  return (
    <View style={styles.node} testID={`arc-bridge-${bridge.id}`}>
      <Spine above={above} below={below} />
      <Marker tone="bridge">
        <BridgeGlyph size={16} color={colors.violet400} />
      </Marker>
      <View style={styles.nodeText}>
        <T variant="eyebrow" tone="violet" numberOfLines={1}>
          {open ? `${TIER_EYEBROW[bridge.tier]} · Open` : TIER_EYEBROW[bridge.tier]}
        </T>
        <T variant="body" tone="secondary" style={styles.nodeBody}>
          {bridge.text}
        </T>
        {bridge.ifThen ? (
          <T variant="caption" tone="muted" style={styles.nodeCaption}>
            {`If it's ${bridge.ifThen.when} and I hesitate, then I ${bridge.ifThen.then}.`}
          </T>
        ) : null}
        {open && onCross ? (
          // The loop's act is never a text link: filled violet (ELEVATE §2).
          <BridgeButton label="I crossed it" onPress={onCross} testID="arc-bridge-crossed" style={styles.crossed} />
        ) : null}
      </View>
    </View>
  );
});

/* =========================================================================
 * Proof node
 * ========================================================================= */

export interface ProofNodeProps extends Omit<SpineProps, "dashedAbove"> {
  row: ProofRow;
  today: string;
  onOpen: (proof: Proof) => void;
}

const KIND_TONE = { did: "did", moved: "moved", learned: "learned" } as const;

export const ProofNode = React.memo(function ProofNode({ row, today, above, below, onOpen }: ProofNodeProps) {
  const { proof, day, wovenIntoNumber } = row;
  const label = proof.origin === "not-today" ? `${PROOF_LABEL.learned} · Not today` : PROOF_LABEL[proof.kind];
  const notes = [
    relativeDate(proof.dateKey, today),
    proof.origin === "onboarding" ? "Where it began" : null,
    wovenIntoNumber ? `Woven into Chapter ${toRoman(wovenIntoNumber)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Press
      style={styles.node}
      onPress={() => onOpen(proof)}
      pressScale={0.985}
      testID={`arc-proof-${proof.id}`}
      accessibilityLabel={`Star ${proof.starIndex}. ${label}, day ${day}. ${proof.text}. ${notes}.`}
      accessibilityHint="Opens this star in your sky"
    >
      <Spine above={above} below={below} />
      <Marker>
        <StarProof kind={proof.kind} size={18} />
      </Marker>
      <View style={styles.proofRow}>
        <View style={styles.nodeTextFlex}>
          <T variant="eyebrow" tone={KIND_TONE[proof.kind]} numberOfLines={1}>
            {`${label} · Day ${day}`}
          </T>
          <UserWords variant="reading" style={styles.nodeBody}>
            {proof.text}
          </UserWords>
          <T variant="caption" tone="muted" style={styles.nodeCaption}>
            {notes}
          </T>
        </View>
        {proof.photoUri ? (
          <Image source={{ uri: proof.photoUri }} style={styles.photo} accessibilityLabel="Proof photo" testID={`arc-proof-photo-${proof.id}`} />
        ) : null}
      </View>
    </Press>
  );
});

/* =========================================================================
 * Course ahead
 * ========================================================================= */

export function CourseNode({ row, above }: { row: CourseRow; above: boolean }) {
  const next = stageMeta(row.nextStage as StageId);
  const title = row.final ? "One star left" : `Next · ${toRoman(row.nextStage)} · ${next.name}`;
  const body = row.final
    ? "Your next proof completes this season's sky."
    : `Written from your next proof. ${row.starsLeft === 1 ? "One star" : `${row.starsLeft} stars`} left this season.`;
  return (
    <View style={styles.node} testID={`arc-course-${row.season}`} accessible accessibilityLabel={`${title}. ${body}`}>
      <Spine above={above} below={false} dashedAbove />
      <Marker tone="course">
        <Svg width={MARKER} height={MARKER}>
          <Circle cx={MARKER / 2} cy={MARKER / 2} r={MARKER / 2 - 1} stroke={colors.goldLine} strokeWidth={1} strokeDasharray={[2, 3]} fill={colors.sky900} />
          <Path d={sparklePath(MARKER / 2, MARKER / 2, 5.5, 0.2)} fill={colors.gold300} opacity={0.75} />
        </Svg>
      </Marker>
      <View style={styles.nodeText}>
        <T variant="eyebrow" tone="gold" numberOfLines={1}>
          {title}
        </T>
        <T variant="body" tone="muted" style={styles.nodeBody}>
          {body}
        </T>
      </View>
    </View>
  );
}

/* ========================================================================= */

const styles = StyleSheet.create({
  spine: { position: "absolute", left: SPINE_X - 1, width: 2, pointerEvents: "none" },
  spineLine: { left: SPINE_X - 0.5, width: 1, backgroundColor: colors.goldEngrave },
  marker: {
    pointerEvents: "none",
    position: "absolute",
    left: SPINE_X - MARKER / 2,
    top: MARKER_TOP,
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky900,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  markerBridge: { borderColor: colors.violetLine },
  markerCourse: { borderWidth: 0, backgroundColor: colors.transparent },

  season: { alignItems: "center", paddingTop: space.xl, paddingBottom: space.base },
  seasonFirst: { paddingTop: space.base },
  seasonRule: { flexDirection: "row", alignItems: "center", gap: space.md, alignSelf: "stretch" },
  rule: { flex: 1, height: 1, backgroundColor: colors.goldEngrave },
  seasonName: { marginTop: space.sm },
  seasonDetail: { marginTop: space.xs },

  bookStart: { marginBottom: space.base },
  bookStartHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  bookStartBody: { marginTop: space.sm },

  node: { paddingVertical: NODE_PAD, minHeight: MARKER_TOP + MARKER + NODE_PAD },
  nodeText: { marginLeft: TEXT_X },
  nodeTextFlex: { flex: 1 },
  proofRow: { marginLeft: TEXT_X, flexDirection: "row", gap: space.md },
  nodeBody: { marginTop: space.xs },
  nodeCaption: { marginTop: space.xs },
  crossed: { alignSelf: "flex-start", marginTop: space.md, paddingHorizontal: space.lg },
  photo: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.sky800,
  },
});
