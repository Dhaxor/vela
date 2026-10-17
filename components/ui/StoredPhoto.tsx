// A photo Vela stored by URI (a proof photo, a Scene, a 1.0 board photo). The
// file itself never travels in a backup, so on a restored phone the URI can
// point at nothing. Then the frame stays and shows a quiet placeholder: a
// small window vignette and 'Photo kept on another phone' where it fits
// (storedPhotoLayout), never a broken image or an empty hole.
//
// Use it wherever a STORED photo URI renders. A photo just picked (the proof
// form, a new Scene) is on this phone and can stay a plain Image.
import React, { useState } from "react";
import { Image, StyleSheet, View, type ImageProps, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Vignette } from "@/components/glyphs/Vignette";
import { colors, space } from "@/constants/theme";
import { T } from "./T";
import { MISSING_PHOTO_COPY, missingPhotoLayout } from "./storedPhotoLayout";

export interface StoredPhotoProps extends Omit<ImageProps, "source" | "style" | "onError"> {
  uri: string;
  style?: StyleProp<ImageStyle>;
  /** Also called when the photo could not be shown. */
  onMissing?: () => void;
  /** The image keeps this testID; the placeholder is `${testID}-missing`. */
  testID?: string;
}

/** Image-only style keys a View must not carry. */
function frameStyle(style: StyleProp<ImageStyle>): ViewStyle {
  const flat = { ...(StyleSheet.flatten(style) ?? {}) } as Record<string, unknown>;
  delete flat.resizeMode;
  delete flat.tintColor;
  delete flat.overlayColor;
  delete flat.objectFit;
  return flat as ViewStyle;
}

export function StoredPhoto({ uri, style, onMissing, testID, accessibilityLabel, ...rest }: StoredPhotoProps) {
  // Keyed by URI: a new photo in the same slot gets its own chance to load.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  if (failedUri !== uri) {
    return (
      <Image
        {...rest}
        source={{ uri }}
        style={style}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        onError={() => {
          setFailedUri(uri);
          onMissing?.();
        }}
      />
    );
  }

  const layout = box ? missingPhotoLayout(box.width, box.height) : null;
  return (
    <View
      style={[styles.missing, frameStyle(style)]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!box || Math.round(width) !== Math.round(box.width) || Math.round(height) !== Math.round(box.height)) setBox({ width, height });
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}. ${MISSING_PHOTO_COPY}` : MISSING_PHOTO_COPY}
      testID={testID ? `${testID}-missing` : "stored-photo-missing"}
    >
      {layout ? (
        <>
          <Vignette name="window" width={layout.vignette} color={colors.ink48} />
          {layout.caption ? (
            <T variant="caption" tone="faint" center numberOfLines={2} style={styles.caption}>
              {layout.captionText}
            </T>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  missing: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.sky900,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  caption: { marginTop: space.sm, paddingHorizontal: space.md },
});
