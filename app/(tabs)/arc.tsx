// Hidden route (href: null) until Phase 2: S5 builds the Memory Book here.
import React from "react";
import { StyleSheet, View } from "react-native";
import { Screen, T } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import { space } from "@/constants/theme";

export default function ArcScreen() {
  return (
    <Screen scroll={false} testID="arc-screen">
      <View style={styles.center}>
        <Vignette name="sail" width={176} />
        <T variant="title" center style={styles.title}>
          Your Memory Book
        </T>
        <T variant="body" tone="muted" center>
          Every chapter, bridge and proof, kept in the order they happened.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  title: { marginTop: space.lg },
});
