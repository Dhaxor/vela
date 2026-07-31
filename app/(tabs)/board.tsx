// Vision board — P4. Guided empty state until then.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LayoutGrid } from "lucide-react-native";
import { colors, space, radius, type, serif } from "@/constants/theme";

export default function BoardScreen() {
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.empty}>
        <View style={s.halo}>
          <LayoutGrid color={colors.success} size={26} />
        </View>
        <Text style={s.title}>A wall for the life ahead</Text>
        <Text style={s.body}>
          Photos, goals, and proof-in-advance. The board opens soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  halo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(127, 200, 169, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  title: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 34,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: space.md,
  },
});
