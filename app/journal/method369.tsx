// 3·6·9: one phrase, written three times in the morning, six at midday and nine
// in the evening. The structure is enforced (that IS the method: each block
// holds exactly its count); the block is suggested from the clock, never
// policed. The phrase can start from the person's own dream, shaped into the
// first person ('I am so grateful that I have my own design studio…').
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { X } from "lucide-react-native";
import {
  Dock,
  GhostButton,
  Header,
  IconButton,
  PrimaryButton,
  Screen,
  T,
  UserWords,
  VellumCard,
  haptics,
  useConfirm,
  useToast,
} from "@/components/ui";
import { RitualGlyph } from "@/components/feature/rituals/RitualGlyph";
import { SealedMoment } from "@/components/feature/rituals/SealedMoment";
import { SkyWriting } from "@/components/feature/rituals/SkyWriting";
import { SLOTS_369, SLOT_LABEL, StarRows369 } from "@/components/feature/rituals/StarRows369";
import { dayParts } from "@/components/feature/rituals/dates";
import { useBackToRituals } from "@/components/feature/rituals/nav";
import { useRitualToday } from "@/components/feature/rituals/useRitualToday";
import { useJournal } from "@/contexts/JournalContext";
import { useProgress } from "@/contexts/RitualContext";
import { colors, space } from "@/constants/theme";
import { now } from "@/lib/clock";
import { localDateKey } from "@/lib/progress";
import { PHRASE_369_MAX, SLOT_CAPS, TOTAL_369, progress369, slotForHour, type Sheet369, type Slot369 } from "@/lib/journal";

const MIN_PHRASE = 3;

/** The clock's block, unless it is already full: then the first block with room. */
function suggestedSlot(sheet: Sheet369 | null): Slot369 {
  const clock = slotForHour(now().getHours());
  if (!sheet || sheet[clock].length < SLOT_CAPS[clock]) return clock;
  return SLOTS_369.find((s) => sheet[s].length < SLOT_CAPS[s]) ?? clock;
}

export default function Method369Screen() {
  const back = useBackToRituals();
  const { sheetToday, phrase369, setPhrase369, addRep } = useJournal();

  const [justSealed, setJustSealed] = useState(false);

  if (justSealed) {
    return (
      <SealedMoment
        message="All eighteen are written. Vela will remember this page."
        meta={`3 · 6 · 9 · ${dayParts(sheetToday?.dateKey ?? localDateKey(now())).long}`}
        onDone={back}
      />
    );
  }

  return sheetToday ? (
    <Practice sheet={sheetToday} addRep={addRep} setPhrase369={setPhrase369} onSealed={() => setJustSealed(true)} onClose={back} />
  ) : (
    <ChooseLine initial={phrase369} setPhrase369={setPhrase369} onClose={back} />
  );
}

function CloseHeader({ onClose }: { onClose: () => void }) {
  return (
    <Header
      back={false}
      title="3 · 6 · 9"
      right={
        <IconButton accessibilityLabel="Close" onPress={onClose} testID="m369-close">
          <X color={colors.ink80} size={22} strokeWidth={1.75} />
        </IconButton>
      }
    />
  );
}

/* ------------------------------------------------------------- choose */

function ChooseLine({ initial, setPhrase369, onClose }: { initial: string; setPhrase369: (p: string) => Promise<void>; onClose: () => void }) {
  const today = useRitualToday();
  const [draft, setDraft] = useState(initial);
  const ready = draft.trim().length >= MIN_PHRASE;

  return (
    <Screen
      testID="m369-choose"
      header={<CloseHeader onClose={onClose} />}
      dock={
        <Dock>
          <PrimaryButton label="Begin the practice" onPress={() => void setPhrase369(draft)} disabled={!ready} testID="phrase-set" />
        </Dock>
      }
    >
      <View style={styles.intro}>
        <T variant="eyebrow">Choose your phrase</T>
        <T variant="display">One phrase, eighteen times.</T>
        <T variant="body" tone="muted">
          Write it three times in the morning, six at midday and nine in the evening. Present tense, as if it is already true.
        </T>
      </View>

      {today.suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <T variant="eyebrow" tone="muted">
            {today.dream ? "From your dream" : "To begin with"}
          </T>
          {today.suggestions.map((s, i) => (
            <VellumCard
              key={s.id}
              padding="compact"
              selected={draft.trim() === s.text}
              onPress={() => setDraft(s.text)}
              testID={`suggest-369-${i}`}
              accessibilityLabel={`Use this phrase: ${s.text}`}
            >
              <T variant="reading" tone={draft.trim() === s.text ? "primary" : "secondary"} style={styles.suggestionText}>
                {s.text}
              </T>
            </VellumCard>
          ))}
        </View>
      ) : null}

      <View style={styles.own}>
        <T variant="eyebrow" tone="muted">
          Or in your own words
        </T>
        <SkyWriting
          value={draft}
          onChangeText={setDraft}
          placeholder="I am paid well for work I love."
          maxLength={PHRASE_369_MAX}
          minHeight={56}
          accessibilityLabel="Your phrase"
          testID="phrase-input"
        />
        <T variant="caption" tone="faint" numeric style={styles.count}>
          {`${draft.length} / ${PHRASE_369_MAX}`}
        </T>
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------- practice */

interface PracticeProps {
  sheet: Sheet369;
  addRep: (slot: Slot369, text: string) => Promise<boolean>;
  setPhrase369: (p: string) => Promise<void>;
  onSealed: () => void;
  onClose: () => void;
}

function Practice({ sheet, addRep, setPhrase369, onSealed, onClose }: PracticeProps) {
  const { recordAct } = useProgress();
  const confirm = useConfirm();
  const toast = useToast();
  const [slot, setSlot] = useState<Slot369>(() => suggestedSlot(sheet));
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<TextInput>(null);

  const p = progress369(sheet);
  const written = sheet[slot];
  const cap = SLOT_CAPS[slot];
  const slotFull = written.length >= cap;

  // A sheet that rolls over at midnight starts from the clock's block again.
  useEffect(() => {
    setSlot(suggestedSlot(sheet));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.dateKey]);

  const write = async () => {
    if (slotFull || busy) return;
    setBusy(true);
    const ok = await addRep(slot, line.trim() || sheet.phrase);
    setBusy(false);
    if (!ok) return;
    haptics.select();
    setLine("");
    recordAct("ritual-saved");
    // Keep writing: the next repetition starts where the last one ended.
    setTimeout(() => input.current?.focus(), 0);
    const done = p.done + 1;
    if (done >= TOTAL_369) onSealed();
    else if (written.length + 1 >= cap) toast.show({ message: `${SLOT_LABEL[slot]} is complete. ${TOTAL_369 - done} to go today.`, tone: "proof" });
  };

  const changeLine = async () => {
    const ok =
      p.done === 0 ||
      (await confirm({
        title: "Choose a new phrase?",
        message: `Today’s ${p.done} written lines belong to this phrase, so the count starts again from zero.`,
        confirmLabel: "Choose a new phrase",
        cancelLabel: "Keep this phrase",
      }));
    if (ok) await setPhrase369("");
  };

  return (
    <Screen
      testID="m369-practice"
      header={<CloseHeader onClose={onClose} />}
      dock={
        <Dock>
          {p.complete ? (
            <PrimaryButton label="Back to Rituals" onPress={onClose} testID="m369-done" />
          ) : (
            <PrimaryButton
              label={slotFull ? "This block is complete" : `Write it · ${written.length + 1} of ${cap}`}
              onPress={() => void write()}
              disabled={slotFull}
              loading={busy}
              testID="rep-write"
            />
          )}
        </Dock>
      }
    >
      <View style={styles.phrase}>
        <T variant="eyebrow">Today’s phrase</T>
        <UserWords variant="title" testID="m369-phrase">
          {sheet.phrase}
        </UserWords>
        <T variant="caption" tone="muted" numeric testID="progress-369">
          {p.complete ? "All 18 written today" : `${p.done} of ${p.total} written today`}
        </T>
      </View>

      <StarRows369 bySlot={p.bySlot} selected={p.complete ? null : slot} onSelect={p.complete ? undefined : setSlot} />

      {p.complete ? (
        <View style={styles.complete} testID="complete-369">
          <RitualGlyph name="seal" size={56} />
          <View style={styles.completeText}>
            <T variant="title">All eighteen, written.</T>
            <T variant="body" tone="muted">
              The phrase is doing its quiet work now. See you tomorrow.
            </T>
          </View>
        </View>
      ) : (
        <View style={styles.writing}>
          <T variant="eyebrow" tone={slotFull ? "muted" : "gold"} numeric>
            {slotFull ? `${SLOT_LABEL[slot]} · complete` : `${SLOT_LABEL[slot]} · line ${written.length + 1} of ${cap}`}
          </T>
          {slotFull ? (
            <T variant="body" tone="muted">
              {`Every ${SLOT_LABEL[slot].toLowerCase()} line is written. Choose another block above when its hour comes.`}
            </T>
          ) : (
            <SkyWriting
              ref={input}
              value={line}
              onChangeText={setLine}
              onSubmitEditing={() => void write()}
              returnKeyType="done"
              // Return writes the line: submitBehavior on native (keeps focus), blurOnSubmit for react-native-web.
              submitBehavior="submit"
              blurOnSubmit
              placeholder={sheet.phrase}
              maxLength={PHRASE_369_MAX + 40}
              accessibilityLabel="Write the phrase"
              testID="rep-input"
            />
          )}
        </View>
      )}

      {written.length > 0 && !p.complete ? (
        <View style={styles.written} testID="m369-written">
          {written.map((t, i) => (
            <View key={`${slot}-${i}`} style={styles.writtenRow}>
              <T variant="caption" tone="gold" numeric style={styles.writtenNum}>
                {String(i + 1)}
              </T>
              <T variant="reading" tone="muted" style={styles.writtenText}>
                {t}
              </T>
            </View>
          ))}
        </View>
      ) : null}

      <GhostButton label="Choose a new phrase" onPress={() => void changeLine()} testID="phrase-change" tone="muted" style={styles.change} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.sm, paddingTop: space.base },
  suggestions: { gap: space.md, marginTop: space.xl },
  suggestionText: { paddingRight: space.lg },
  own: { gap: space.sm, marginTop: space.xl },
  count: { alignSelf: "flex-end" },
  phrase: { gap: space.sm, paddingTop: space.base, marginBottom: space.lg },
  writing: { gap: space.sm, marginTop: space.lg },
  complete: { flexDirection: "row", alignItems: "center", gap: space.base, marginTop: space.lg },
  completeText: { flex: 1, gap: space.xs },
  written: { gap: space.xs, marginTop: space.lg, paddingLeft: space.xs },
  writtenRow: { flexDirection: "row", gap: space.md },
  writtenNum: { width: 16, paddingTop: space.xs },
  writtenText: { flex: 1 },
  change: { marginTop: space.xl },
});
