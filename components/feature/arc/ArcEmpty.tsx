// The Memory Book before there is a dream (a 1.0 profile with no story, or
// every dream gone after a backup import): an engraved sail, what this page
// will hold, and one gold way in. The CTA sits low, in the thumb zone.
import React from "react";
import { StyleSheet, View } from "react-native";
import { PrimaryButton, T } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import { space } from "@/constants/theme";

export function ArcEmpty({ onBegin }: { onBegin: () => void }) {
  return (
    <View style={styles.root} testID="arc-empty">
      <View style={styles.center}>
        <Vignette name="sail" width={176} />
        <T variant="eyebrow" tone="muted" style={styles.eyebrow}>
          Memory book
        </T>
        <T variant="display" center style={styles.title}>
          Your book begins with a dream
        </T>
        <T variant="body" tone="secondary" center style={styles.body}>
          Every chapter you hear, every bridge you cross and every proof you log is kept here, in the order it happened.
        </T>
      </View>
      <PrimaryButton label="Begin a dream" onPress={onBegin} testID="new-story" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingBottom: space.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: { marginTop: space.lg },
  // Breaks as 'Your book begins / with a dream' rather than leaving a widow.
  title: { marginTop: space.sm, maxWidth: 300 },
  body: { marginTop: space.md, maxWidth: 340 },
});
