// Text input. 'ui' voice is Instrument Sans for names and settings; 'words'
// voice is Newsreader for what the user writes about their life (desire,
// proof, scripts), with an italic placeholder. Focus = 1.5px gold300 ring and
// a soft glow; the browser's own focus outline is removed on web. On iOS the
// focused field asks its screen or sheet to keep it above the keyboard and
// the dock, also as a multiline field grows (useKeyboardReveal).
import React, { forwardRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { colors, fonts, radius, space, typeScale } from "@/constants/theme";
import { T } from "./T";
import { revealFocusedInput } from "./useKeyboardReveal";

export interface TextFieldProps extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  label?: string;
  voice?: "ui" | "words";
  hint?: string;
  error?: string | null;
  /** Show 'n / max' under the field (needs maxLength). */
  showCount?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/** RN's style types don't list 'none', but react-native-web needs it to drop the focus outline. */
const WEB_NO_OUTLINE = Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, voice = "ui", hint, error, showCount = false, style, inputStyle, multiline, value, maxLength, onFocus, onBlur, onContentSizeChange, testID, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const words = voice === "words";
  const empty = !value;
  const family = words ? (empty ? fonts.serifItalic : fonts.serif) : fonts.sans;
  const metrics = words ? typeScale.reading : typeScale.body;

  return (
    <View style={style}>
      {label ? (
        <T variant="eyebrow" style={styles.label}>
          {label}
        </T>
      ) : null}
      <View style={[styles.field, multiline && styles.multiline, focused && styles.focused, !!error && styles.error]}>
        <TextInput
          ref={ref}
          testID={testID}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          placeholderTextColor={colors.ink48}
          selectionColor={colors.gold300}
          cursorColor={colors.gold300}
          multiline={multiline}
          value={value}
          maxLength={maxLength}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(e) => {
            setFocused(true);
            revealFocusedInput("start");
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onContentSizeChange={(e) => {
            // A multiline field grows as the user writes: keep its end (the caret) in view.
            if (focused && multiline) revealFocusedInput("end");
            onContentSizeChange?.(e);
          }}
          {...rest}
          style={[
            styles.input,
            { fontFamily: family, fontSize: metrics.fontSize, lineHeight: metrics.lineHeight },
            multiline && styles.inputMultiline,
            WEB_NO_OUTLINE,
            inputStyle,
          ]}
        />
      </View>
      {error || hint || (showCount && maxLength) ? (
        <View style={styles.footer}>
          <T variant="caption" tone={error ? "danger" : "muted"} style={styles.footerText}>
            {error ?? hint ?? ""}
          </T>
          {showCount && maxLength ? (
            <T variant="caption" tone="faint" numeric>
              {`${(value ?? "").length} / ${maxLength}`}
            </T>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: space.sm },
  field: {
    minHeight: 56,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
    paddingHorizontal: space.base,
  },
  multiline: { minHeight: 128, paddingVertical: space.md, justifyContent: "flex-start" },
  focused: {
    borderColor: colors.gold300,
    boxShadow: "0px 0px 12px rgba(233, 180, 76, 0.22)",
  },
  error: { borderColor: colors.danger },
  input: { color: colors.ink100, paddingVertical: space.md, paddingHorizontal: 0 },
  inputMultiline: { minHeight: 100 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: space.sm, gap: space.base },
  footerText: { flex: 1 },
});
