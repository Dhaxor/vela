// Hidden route (href: null) until Phase 2: S6 builds the Rituals tab here.
import React from "react";
import { StyleSheet, View } from "react-native";
import { Screen, T } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import { space } from "@/constants/theme";

export default function RitualsScreen() {
  return (
    <Screen scroll={false} testID="rituals-screen">
      <View style={styles.center}>
        <Vignette name="window" width={176} />
        <T variant="title" center style={styles.title}>
          Rituals
        </T>
        <T variant="body" tone="muted" center>
          Script, 3·6·9 and gratitude, each one feeding your story.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  title: { marginTop: space.lg },
});
