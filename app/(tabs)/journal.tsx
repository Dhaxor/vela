// Journal — scripting, 369, gratitude. P3 lands the templates; guided empty
// state until then.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PenLine } from "lucide-react-native";
import { colors, space, radius, type, serif } from "@/constants/theme";

export default function JournalScreen() {
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.empty}>
        <View style={s.halo}>
          <PenLine color={colors.aurora} size={26} />
        </View>
        <Text style={s.title}>Write it as already done</Text>
        <Text style={s.body}>
          Scripting, the 369 method, and gratitude — guided pages arrive with
          the next stone on the path.
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
    backgroundColor: colors.auroraSoft,
    borderWidth: 1,
    borderColor: colors.auroraBorder,
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
