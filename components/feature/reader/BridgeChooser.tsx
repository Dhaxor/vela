// BridgeChooser: the end of a chapter, where imagining turns into one real
// step. Three sized offers from the library (2 minutes / 15 minutes / brave,
// the suggested one preselected), 'Write my own', then an optional single
// if-then line with a time, and the violet commitment.
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Plus } from "lucide-react-native";
import { BridgeButton, ChipGroup, GhostButton, Press, T, TextField, VellumCard } from "@/components/ui";
import { BridgeGlyph } from "@/components/glyphs";
import { LIMITS, type BridgeChoice, type BridgeOffer, type BridgeOfferTier, type IfThen } from "@/contexts/arc.types";
import { TIER_LABEL } from "@/lib/futureMemory";
import { colors, radius, space } from "@/constants/theme";
import { CUES, buildIfThen, clockLabel, cueById, remindAtFor, type CueId } from "./cues";
import { QuillGlyph } from "./glyphs";

export interface BridgeCommit {
  choice: BridgeChoice;
  ifThen: IfThen | null;
  remindAt: string | null;
}

export interface BridgeChooserProps {
  offers: readonly BridgeOffer[];
  /** 'Write my own' starter phrasings (desire filled). */
  starters: readonly string[];
  /** Header after a learned proof ('Last time taught you something…'). */
  retryLine: string | null;
  /** Numeral of the chapter this bridge will weave ('II'). */
  nextNumeral: string;
  /** The bridge being replaced, when changing an open one. */
  current?: { tier: BridgeOfferTier; libraryId: string | null; text: string; ifThen: IfThen | null } | null;
  busy: boolean;
  now: () => Date;
  onCommit: (commit: BridgeCommit) => void;
  onCancel?: () => void;
}

type Pick = BridgeOfferTier;

function initialPick(offers: readonly BridgeOffer[], current: BridgeChooserProps["current"]): Pick {
  if (current) {
    if (current.tier === "own") return "own";
    const same = offers.find((o) => o.libraryId === current.libraryId);
    if (same) return same.tier;
  }
  return offers.find((o) => o.suggested)?.tier ?? offers[1]?.tier ?? "15min";
}

function initialCue(ifThen: IfThen | null | undefined): { cue: CueId | null; customWhen: string } {
  if (!ifThen) return { cue: null, customWhen: "" };
  const known = CUES.find((c) => c.when === ifThen.when);
  return known ? { cue: known.id, customWhen: "" } : { cue: "other", customWhen: ifThen.when };
}

export function BridgeChooser({ offers, starters, retryLine, nextNumeral, current, busy, now, onCommit, onCancel }: BridgeChooserProps) {
  const [pick, setPick] = useState<Pick>(() => initialPick(offers, current));
  const [ownText, setOwnText] = useState(current?.tier === "own" ? current.text.replace(/\.$/, "") : "");
  const start = initialCue(current?.ifThen);
  const [ifOpen, setIfOpen] = useState(!!current?.ifThen);
  const [cue, setCue] = useState<CueId | null>(start.cue);
  const [customWhen, setCustomWhen] = useState(start.customWhen);
  const [move, setMove] = useState(current?.ifThen?.then ?? "");

  const cueSpec = cueById(cue);
  const when = cue === "other" ? customWhen : cueSpec?.when ?? null;
  const ifThen = ifOpen ? buildIfThen(when, move) : null;
  const remindAt = ifThen ? remindAtFor(cueSpec, now()) : null;
  const ownReady = ownText.trim().length > 0;
  const ready = pick === "own" ? ownReady : offers.some((o) => o.tier === pick);

  const reminderNote = useMemo(() => {
    if (!ifOpen) return null;
    if (!cue) return "Pick the moment you are most likely to hesitate.";
    if (!move.trim()) return cueSpec?.at ? `Add your first move and Vela will remind you at ${clockLabel(new Date(remindAtFor(cueSpec, now())!))}.` : "Add your first move.";
    if (cueSpec?.at && remindAt) return `Vela will remind you at ${clockLabel(new Date(remindAt))}, in your words.`;
    return "No reminder for this one: it lives in your words.";
  }, [ifOpen, cue, move, cueSpec, remindAt, now]);

  const commit = () => {
    if (!ready || busy) return;
    const choice: BridgeChoice =
      pick === "own"
        ? { tier: "own", text: ownText.trim().slice(0, LIMITS.bridgeOwnText) }
        : { tier: pick, libraryId: offers.find((o) => o.tier === pick)!.libraryId };
    onCommit({ choice, ifThen, remindAt });
  };

  return (
    <View style={styles.zone} testID="story-action-bridge">
      <View style={styles.eyebrow}>
        <BridgeGlyph size={18} />
        <T variant="eyebrow" tone="violet">
          Today’s bridge
        </T>
      </View>
      <T variant="title" accessibilityRole="header">
        One real step, sized to your day.
      </T>
      <T variant="body" tone="muted" style={styles.lede}>
        {retryLine ?? `Pick the one that fits. Whatever happens, Vela weaves it into Chapter ${nextNumeral}.`}
      </T>

      <View style={styles.offers} accessibilityRole="radiogroup" accessibilityLabel="Today’s bridge">
        {offers.map((o) => {
          const on = pick === o.tier;
          return (
            <VellumCard
              key={o.libraryId}
              selected={on}
              onPress={() => setPick(o.tier)}
              padding="compact"
              testID={`story-bridge-${o.tier}`}
              accessibilityLabel={`${TIER_LABEL[o.tier]}${o.suggested ? ", suggested" : ""}: ${o.text}`}
            >
              <View style={styles.offerHead}>
                <T variant="eyebrow" tone={on ? "gold" : "muted"}>
                  {TIER_LABEL[o.tier]}
                </T>
                {o.suggested ? (
                  <View style={styles.suggested}>
                    <T variant="caption" strong tone="violet">
                      Suggested
                    </T>
                  </View>
                ) : null}
              </View>
              <T variant="body" tone="primary" style={styles.offerText}>
                {o.text}
              </T>
            </VellumCard>
          );
        })}

        <VellumCard
          selected={pick === "own"}
          onPress={() => setPick("own")}
          padding="compact"
          testID="story-bridge-own"
          accessibilityLabel="Write my own bridge"
        >
          <View style={styles.ownHead}>
            <QuillGlyph size={20} color={pick === "own" ? colors.gold300 : colors.ink64} />
            <T variant="body" strong tone={pick === "own" ? "primary" : "secondary"}>
              Write my own
            </T>
          </View>
        </VellumCard>

        {/* Outside the card: a pressable card can't hold a field or other buttons. */}
        {pick === "own" ? (
          <View style={styles.ownBody}>
            <TextField
              voice="words"
              value={ownText}
              onChangeText={setOwnText}
              placeholder="One small thing you can see yourself doing today"
              maxLength={LIMITS.bridgeOwnText}
              multiline
              accessibilityLabel="Your own bridge"
              testID="story-bridge-own-text"
            />
            {starters.length > 0 && !ownReady ? (
              <View style={styles.starters}>
                <T variant="caption" tone="faint">
                  Or start from one of these
                </T>
                {starters.slice(0, 3).map((s, i) => (
                  <Press
                    key={s}
                    onPress={() => setOwnText(s.replace(/\.$/, ""))}
                    accessibilityLabel={`Use: ${s}`}
                    style={styles.starter}
                    testID={`story-bridge-starter-${i}`}
                  >
                    <T variant="reading" italic tone="secondary">
                      {s}
                    </T>
                  </Press>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {ifOpen ? (
        <View style={styles.ifThen} testID="story-ifthen">
          <View style={styles.ifHead}>
            <T variant="eyebrow" tone="muted">
              If-then · optional
            </T>
            <GhostButton
              label="Remove"
              tone="muted"
              onPress={() => {
                setIfOpen(false);
                setCue(null);
                setMove("");
                setCustomWhen("");
              }}
              testID="story-ifthen-remove"
              style={styles.remove}
            />
          </View>
          <T variant="reading" tone="secondary">
            If it’s…
          </T>
          <ChipGroup
            options={CUES.map((c) => ({ value: c.id, label: c.label }))}
            value={cue}
            onChange={(v) => setCue(v)}
            testIDPrefix="story-ifthen-cue-"
            accessibilityLabel="When"
          />
          {cue === "other" ? (
            <TextField
              voice="words"
              value={customWhen}
              onChangeText={setCustomWhen}
              placeholder="after the school run"
              maxLength={LIMITS.ifThenWhen}
              accessibilityLabel="When, in your words"
              testID="story-ifthen-when"
            />
          ) : null}
          <T variant="reading" tone="secondary">
            …and I hesitate, then I
          </T>
          <TextField
            voice="words"
            value={move}
            onChangeText={setMove}
            placeholder="open the file and write one line"
            maxLength={LIMITS.ifThenThen}
            accessibilityLabel="Then I, your first move"
            testID="story-ifthen-then"
          />
          {reminderNote ? (
            <T variant="caption" tone="muted" testID="story-ifthen-note">
              {reminderNote}
            </T>
          ) : null}
        </View>
      ) : (
        <GhostButton
          label="Add an if-then"
          tone="secondary"
          icon={<Plus color={colors.ink80} size={18} strokeWidth={1.75} />}
          onPress={() => setIfOpen(true)}
          testID="story-ifthen-add"
          style={styles.addIf}
        />
      )}

      <BridgeButton
        label="Make it observable"
        onPress={commit}
        disabled={!ready}
        loading={busy}
        accessibilityHint="Sets this as today’s bridge"
        testID="story-bridge-commit"
        style={styles.cta}
      />
      {onCancel ? <GhostButton label="Keep my bridge" tone="muted" onPress={onCancel} testID="story-bridge-keep" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { gap: space.md },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  lede: { marginBottom: space.sm },
  offers: { gap: space.md },
  offerHead: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingRight: space.lg },
  suggested: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.violetLine,
    backgroundColor: colors.violetWash,
  },
  offerText: { marginTop: space.xs, paddingRight: space.base },
  ownHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  ownBody: { gap: space.md },
  starters: { gap: space.xs },
  starter: { paddingVertical: space.sm },
  ifThen: { gap: space.md, marginTop: space.sm },
  ifHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  remove: { paddingHorizontal: 0 },
  addIf: { alignSelf: "flex-start", paddingHorizontal: 0 },
  cta: { marginTop: space.sm },
});
