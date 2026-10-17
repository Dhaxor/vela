// A past page, reopened: when it was sealed, what it answered, and the
// person's own words on the open sky. Script pages show their prompt;
// gratitude pages show each stem with its line.
import React from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Header, Screen, SecondaryButton, T, UserWords } from "@/components/ui";
import { AreaSign, Vignette } from "@/components/glyphs";
import { KIND_LABEL } from "@/components/feature/rituals/PastPages";
import { RitualGlyph } from "@/components/feature/rituals/RitualGlyph";
import { dayParts, timeOf } from "@/components/feature/rituals/dates";
import { useBackToRituals } from "@/components/feature/rituals/nav";
import { dreamGivenName, gratitudeLines } from "@/lib/rituals";
import { useArc } from "@/contexts/ArcContext";
import { useJournal } from "@/contexts/JournalContext";
import { colors, space } from "@/constants/theme";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const backToRituals = useBackToRituals();
  const journal = useJournal();
  const arc = useArc();
  const entry = id ? journal.entry(String(id)) : undefined;

  if (!entry) {
    return (
      <Screen testID="entry-missing" header={<Header testID="entry" />}>
        <View style={styles.missing}>
          <Vignette name="door" width={160} />
          <T variant="title" center>
            This page isn’t here
          </T>
          <T variant="body" tone="muted" center>
            It may have been replaced by a backup. Every page you keep is listed under Rituals.
          </T>
          <SecondaryButton label="Back to Rituals" onPress={backToRituals} testID="entry-missing-back" style={styles.missingCta} />
        </View>
      </Screen>
    );
  }

  const d = dayParts(entry.dateKey);
  const time = timeOf(entry.createdAt);
  const dream = entry.dreamId ? arc.dream(entry.dreamId) : undefined;
  const paragraphs = entry.text.split(/\n+/u).map((p) => p.trim()).filter(Boolean);

  return (
    <Screen testID="entry-screen" header={<Header title={KIND_LABEL[entry.kind]} testID="entry" />}>
      <View style={styles.head}>
        <View style={styles.sealRow}>
          <RitualGlyph name="seal" size={20} />
          <T variant="eyebrow" tone="muted" numeric>
            {time ? `Sealed at ${time}` : "Sealed"}
          </T>
        </View>
        <T variant="display" testID="entry-date">
          {d.long}
        </T>
        {entry.kind === "script" && entry.prompt ? (
          <T variant="title" tone="muted" testID="entry-prompt" style={styles.prompt}>
            {entry.prompt}
          </T>
        ) : null}
        <View style={styles.rule} />
      </View>

      {entry.kind === "script" ? (
        <View style={styles.page} testID="entry-text">
          {paragraphs.map((p, i) => (
            <T key={i} variant="reading">
              {p}
            </T>
          ))}
        </View>
      ) : (
        <View style={styles.page} testID="entry-text">
          {gratitudeLines(entry).map((l, i) => (
            <View key={i} style={styles.gratitude}>
              <View style={styles.stemRow}>
                <T variant="eyebrow" tone="gold" style={styles.numeral}>
                  {NUMERALS[i] ?? String(i + 1)}
                </T>
                {l.stem ? (
                  <T variant="body" tone="muted" style={styles.flex}>
                    {l.stem}
                  </T>
                ) : null}
              </View>
              <T variant="reading" style={styles.answer}>
                {l.answer}
              </T>
            </View>
          ))}
        </View>
      )}

      <View style={styles.foot}>
        {dream ? (
          <View style={styles.footRow} testID="entry-dream">
            <AreaSign focus={dream.focus} size={16} color={colors.ink48} />
            <T variant="caption" tone="muted" style={styles.flex}>
              {"Written for "}
              {dreamGivenName(dream) ?? <UserWords variant="caption">{dream.desire}</UserWords>}
            </T>
          </View>
        ) : null}
        <T variant="caption" tone="faint">
          Kept on this device. Vela remembers every page you seal.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.sm, paddingTop: space.base },
  sealRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  prompt: { marginTop: space.base },
  rule: { width: 48, height: 1, backgroundColor: colors.goldLine, marginTop: space.sm },
  page: { gap: space.base, marginTop: space.lg },
  gratitude: { gap: space.xs, marginBottom: space.sm },
  stemRow: { flexDirection: "row", alignItems: "baseline", gap: space.md },
  numeral: { width: 28 },
  answer: { marginLeft: 28 + space.md },
  flex: { flex: 1 },
  foot: { gap: space.sm, marginTop: space.xxl, paddingTop: space.base, borderTopWidth: 1, borderTopColor: colors.hairline },
  footRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingBottom: space.xxl },
  missingCta: { alignSelf: "stretch", marginTop: space.base },
});
