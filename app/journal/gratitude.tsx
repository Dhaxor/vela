// GRATITUDE: three stems from the 48, three lines on the open sky, one seal.
// The lightest page in the app. Any stem can be swapped for the next one in
// today's deck; at least one line keeps the page.
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { RefreshCw, X } from "@/components/glyphs/icons";
import { Dock, Header, IconButton, PrimaryButton, Screen, T, haptics, useToast } from "@/components/ui";
import { SealedMoment } from "@/components/feature/rituals/SealedMoment";
import { SkyWriting } from "@/components/feature/rituals/SkyWriting";
import { dayParts } from "@/components/feature/rituals/dates";
import { useBackToRituals } from "@/components/feature/rituals/nav";
import { gratitudeDeck, gratitudePage, nextStem } from "@/lib/rituals";
import { useJournal } from "@/contexts/JournalContext";
import { useProgress } from "@/contexts/RitualContext";
import { colors, space } from "@/constants/theme";
import { now } from "@/lib/clock";
import { localDateKey } from "@/lib/progress";

const LINE_MAX = 280;

export default function GratitudeScreen() {
  const back = useBackToRituals();
  const toast = useToast();
  const { addEntry } = useJournal();
  const { recordAct } = useProgress();
  const dateKey = localDateKey(now());
  const deck = useMemo(() => gratitudeDeck(dateKey), [dateKey]);
  const [stems, setStems] = useState(() => deck.slice(0, 3));
  const [lines, setLines] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [sealed, setSealed] = useState(false);

  const filled = lines.filter((l) => l.trim().length > 0).length;

  const swap = (i: number) => {
    haptics.select();
    setStems((cur) => cur.map((s, j) => (j === i ? nextStem(deck, cur, i) : s)));
  };

  const save = async () => {
    if (filled === 0 || busy) return;
    setBusy(true);
    const page = gratitudePage(stems, lines);
    const entry = await addEntry("gratitude", page.prompt, page.text, { promptId: page.promptId });
    if (!entry) {
      setBusy(false);
      toast.show({ message: "Write one line to keep the page.", tone: "error" });
      return;
    }
    recordAct("ritual-saved");
    setSealed(true);
  };

  if (sealed) {
    return <SealedMoment meta={`Gratitude · ${dayParts(dateKey).long}`} onDone={back} />;
  }

  return (
    <Screen
      testID="gratitude-screen"
      header={
        <Header
          back={false}
          title="Gratitude"
          right={
            <IconButton accessibilityLabel="Close" onPress={back} testID="gratitude-close">
              <X color={colors.ink80} size={22} strokeWidth={1.75} />
            </IconButton>
          }
        />
      }
      dock={
        <Dock>
          <PrimaryButton
            label={filled === 0 ? "Write one line to keep the page" : filled === 3 ? "Seal all three" : `Seal ${filled === 1 ? "this line" : "these two"}`}
            onPress={() => void save()}
            disabled={filled === 0}
            loading={busy}
            testID="gratitude-save"
          />
        </Dock>
      }
    >
      <View style={styles.intro}>
        <T variant="eyebrow">Three good things</T>
        <T variant="body" tone="muted">
          A line each is plenty. Small and true beats grand.
        </T>
      </View>
      {stems.map((stem, i) => (
        <View key={`${i}-${stem.id}`} style={styles.block}>
          <View style={styles.stemRow}>
            <T variant="eyebrow" tone="gold" numeric style={styles.numeral}>
              {["I", "II", "III"][i]}
            </T>
            <T variant="title" style={styles.stem} testID={`gratitude-stem-${i}`}>
              {stem.text}
            </T>
            <IconButton accessibilityLabel={`Another stem for line ${i + 1}`} onPress={() => swap(i)} testID={`gratitude-swap-${i}`}>
              <RefreshCw color={colors.ink48} size={18} strokeWidth={1.75} />
            </IconButton>
          </View>
          <SkyWriting
            value={lines[i]}
            onChangeText={(t) => setLines((prev) => prev.map((x, j) => (j === i ? t : x)))}
            placeholder="In a line…"
            maxLength={LINE_MAX}
            minHeight={56}
            autoFocus={i === 0}
            accessibilityLabel={stem.text}
            testID={`gratitude-${i}`}
            style={styles.writing}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.xs, paddingTop: space.base, marginBottom: space.sm },
  block: { marginTop: space.xl, gap: space.sm },
  stemRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  numeral: { width: 28, paddingTop: space.xs },
  stem: { flex: 1 },
  writing: { marginLeft: 28 + space.md },
});
