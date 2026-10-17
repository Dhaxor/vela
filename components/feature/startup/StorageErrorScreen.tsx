// Shown by the root when a store's launch read failed (launchPhase
// 'storage-error'), so the splash never hangs. Calm, one thing to do. The
// stores keep retrying underneath; when a read succeeds the root moves on to
// the app by itself. There is no 'Try again' control: the providers retry on
// their own (lib/store/storageRead loadUntilRead) and expose no retry hook.
import React from "react";
import { StyleSheet, View } from "react-native";
import { Screen, T } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import { space } from "@/constants/theme";
import { STORAGE_ERROR_COPY } from "./launch";

export function StorageErrorScreen() {
  return (
    <Screen testID="storage-error" edges={["top", "bottom"]} contentStyle={styles.content}>
      <View style={styles.body} accessible accessibilityRole="alert" accessibilityLabel={`${STORAGE_ERROR_COPY.title} ${STORAGE_ERROR_COPY.body}`}>
        <Vignette name="sail" width={168} testID="storage-error-vignette" />
        <T variant="title" center testID="storage-error-title" style={styles.title}>
          {STORAGE_ERROR_COPY.titleLines}
        </T>
        <T variant="body" tone="secondary" center testID="storage-error-body">
          {STORAGE_ERROR_COPY.body}
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: "center" },
  body: { alignItems: "center", gap: space.md, paddingVertical: space.xxl, maxWidth: 360, alignSelf: "center" },
  title: { marginTop: space.base },
});
