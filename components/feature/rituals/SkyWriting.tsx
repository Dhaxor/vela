// Writing on the open sky (ELEVATE §2.4a): no box, Newsreader at the reading
// size, an italic placeholder, and a gold margin rule that lights while the
// page has focus. The practice pages (Script, 3·6·9, Gratitude) write here.
// Like TextField, the page being written stays above the keyboard and the
// dock on iOS (revealFocusedInput), also as it grows line by line.
import React, { forwardRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { revealFocusedInput } from "@/components/ui";
import { colors, fonts, space, typeScale } from "@/constants/theme";

export interface SkyWritingProps extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  /** Minimum writing height (multiline pages). */
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
}

/** RN's types don't list 'none', but react-native-web needs it to drop the focus outline. */
const WEB_NO_OUTLINE = Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

export const SkyWriting = forwardRef<TextInput, SkyWritingProps>(function SkyWriting(
  { minHeight, style, value, multiline = true, onFocus, onBlur, onContentSizeChange, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const empty = !value;
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.rule, focused && styles.ruleOn]} />
      <TextInput
        ref={ref}
        value={value}
        multiline={multiline}
        placeholderTextColor={colors.ink48}
        selectionColor={colors.gold300}
        cursorColor={colors.gold300}
        textAlignVertical="top"
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
          if (focused && multiline) revealFocusedInput("end");
          onContentSizeChange?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          { fontFamily: empty ? fonts.serifItalic : fonts.serif },
          minHeight ? { minHeight } : null,
          WEB_NO_OUTLINE,
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: space.base },
  rule: { width: 1.5, borderRadius: 1, backgroundColor: colors.hairline },
  ruleOn: { backgroundColor: colors.gold300, boxShadow: "0px 0px 8px rgba(233, 180, 76, 0.45)" },
  input: {
    ...typeScale.reading,
    flex: 1,
    color: colors.ink100,
    paddingVertical: space.xs,
    paddingHorizontal: 0,
  },
});
