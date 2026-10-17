// The reader's two non-reading states, designed rather than blank:
// - ReaderLoading: the chapter's plate is known (its meta is in the index) but
//   its text is still coming from storage: show the plate and a few faint
//   lines of 'ink' instead of a spinner.
// - ReaderMissing: a link to a chapter that isn't here (rewritten away,
//   released, a stale notification). A window onto the night, one way back.
import React from "react";
import { StyleSheet, View } from "react-native";
import { PrimaryButton, T } from "@/components/ui";
import { ChapterNumeral, Vignette } from "@/components/glyphs";
import { colors, radius, space } from "@/constants/theme";

export function ReaderLoading({ number, title }: { number: number | null; title: string | null }) {
  return (
    <View style={styles.loading} testID="story-loading" accessibilityLabel="Opening the chapter" accessibilityRole="progressbar">
      {number ? <ChapterNumeral value={number} variant="display" ruled /> : null}
      {title ? (
        <T variant="display" center tone="muted" style={styles.loadingTitle}>
          {title}
        </T>
      ) : null}
      <View style={styles.lines}>
        {[100, 92, 96, 64].map((w, i) => (
          <View key={i} style={[styles.line, { width: `${w}%` }]} />
        ))}
      </View>
    </View>
  );
}

export function ReaderMissing({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.missing} testID="story-missing">
      <Vignette name="window" width={200} />
      <T variant="title" center style={styles.missingTitle} accessibilityRole="header">
        This chapter has drifted off.
      </T>
      <T variant="body" tone="muted" center>
        It may have been rewritten or let go. Everything you did is still in your sky.
      </T>
      <PrimaryButton label="Go back" onPress={onBack} testID="story-back-missing" style={styles.missingCta} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", paddingTop: space.lg },
  loadingTitle: { marginTop: space.base },
  lines: { alignSelf: "stretch", gap: space.base, marginTop: space.xxl },
  line: { height: 10, borderRadius: radius.xs, backgroundColor: colors.hairline },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingBottom: space.huge },
  missingTitle: { marginTop: space.lg },
  missingCta: { marginTop: space.lg },
});
