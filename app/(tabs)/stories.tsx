// Stories — the differentiator. P1 lands the engine; until then this is a
// guided empty state (never a blank screen, per the design skill).
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles } from "lucide-react-native";
import { colors, space, radius, type, serif, accentGlow } from "@/constants/theme";

export default function StoriesScreen() {
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.empty}>
        <View style={s.halo}>
          <Sparkles color={colors.accent} size={28} />
        </View>
        <Text style={s.title}>Your first story is waiting</Text>
        <Text style={s.body}>
          Tell Vela one thing you're calling in, and step into a story where
          it's already yours. Unlimited listens — always.
        </Text>
        <TouchableOpacity style={s.cta} activeOpacity={0.85} testID="new-story">
          <Text style={s.ctaText}>Manifest a story</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
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
    marginBottom: space.xl,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    paddingHorizontal: space.xl,
    ...accentGlow,
  },
  ctaText: { ...type.body, fontWeight: "600", color: colors.onAccent },
});
