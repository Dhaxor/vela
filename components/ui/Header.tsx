// Screen header: a back control that can't fall off the edge of history
// (safeBack lands on Today after a cold-start deep link), a centered title and
// an optional trailing control.
import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "@/components/glyphs/icons";
import { safeBack } from "@/lib/nav";
import { colors, hitSize, space } from "@/constants/theme";
import { IconButton } from "./Buttons";
import { T } from "./T";
import { useGutter } from "./Screen";

export interface HeaderProps {
  title?: string;
  /** Show the back control. Default true. */
  back?: boolean;
  /** Custom back behaviour; defaults to safeBack(router). */
  onBack?: () => void;
  backLabel?: string;
  /** Trailing control, e.g. an IconButton for '…'. */
  right?: React.ReactNode;
  testID?: string;
}

export function Header({ title, back = true, onBack, backLabel = "Back", right, testID }: HeaderProps) {
  const router = useRouter();
  const gutter = useGutter();
  // The back chevron's ink sits on the gutter line; its tap target bleeds out.
  const inset = Math.max(0, gutter - space.md);
  return (
    <View style={[styles.row, { paddingHorizontal: inset }]} testID={testID}>
      <View style={styles.side}>
        {back ? (
          <IconButton accessibilityLabel={backLabel} onPress={onBack ?? (() => safeBack(router))} testID={testID ? `${testID}-back` : "header-back"}>
            <ChevronLeft color={colors.ink80} size={26} strokeWidth={1.75} />
          </IconButton>
        ) : null}
      </View>
      <View style={styles.title}>
        {title ? (
          <T variant="body" strong tone="primary" numberOfLines={1} center accessibilityRole="header">
            {title}
          </T>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 56, flexDirection: "row", alignItems: "center" },
  side: { width: hitSize + space.sm, flexDirection: "row" },
  right: { justifyContent: "flex-end" },
  title: { flex: 1, alignItems: "center" },
});
