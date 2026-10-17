// The optional photo on a proof. Picking goes through expo-image-picker
// (required lazily); ArcContext copies the picked file into the app's
// documents (lib/photos persistPhoto) when the proof is saved, and Scenes
// adds it automatically. Nothing leaves the phone.
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { ImagePlus, X } from "lucide-react-native";
import { IconButton, Press, T, useToast } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";

export interface PhotoFieldProps {
  uri: string | null;
  onChange: (uri: string | null) => void;
  testIDPrefix?: string;
}

/** Opens the photo library. Resolves the picked URI, or null when cancelled; throws when unavailable. */
export async function pickProofPhoto(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Picker = require("expo-image-picker") as typeof import("expo-image-picker");
  const res = await Picker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (res.canceled) return null;
  return res.assets?.[0]?.uri ?? null;
}

export function PhotoField({ uri, onChange, testIDPrefix = "evidence-photo" }: PhotoFieldProps) {
  const toast = useToast();
  const pick = async () => {
    try {
      const picked = await pickProofPhoto();
      if (picked) onChange(picked);
    } catch {
      toast.show({ message: "Photos aren't available on this device. Your sentence is enough.", tone: "info" });
    }
  };

  if (uri) {
    return (
      <View style={styles.row} testID={`${testIDPrefix}-preview`}>
        <Image source={{ uri }} style={styles.thumb} accessibilityIgnoresInvertColors accessible accessibilityLabel="Your proof photo" />
        <View style={styles.copy}>
          <T variant="body" tone="primary">
            Photo added
          </T>
          <T variant="caption" tone="muted">
            It joins your Scenes and stays on this phone.
          </T>
        </View>
        <IconButton accessibilityLabel="Remove photo" onPress={() => onChange(null)} testID={`${testIDPrefix}-remove`}>
          <X color={colors.ink64} size={20} strokeWidth={1.75} />
        </IconButton>
      </View>
    );
  }

  return (
    <Press
      onPress={() => void pick()}
      testID={`${testIDPrefix}-add`}
      accessibilityLabel="Add a photo, optional"
      accessibilityHint="Opens your photo library"
      style={styles.add}
    >
      <ImagePlus color={colors.ink80} size={20} strokeWidth={1.75} />
      <View style={styles.copy}>
        <T variant="body" tone="secondary">
          Add a photo
        </T>
        <T variant="caption" tone="faint">
          Optional. It stays on this phone.
        </T>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.base,
    minHeight: 64,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.violetLine,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.base },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.sky700 },
  copy: { flex: 1, gap: space.xxs },
});
