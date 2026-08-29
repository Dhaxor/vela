// Vela Plus. The framing is the strategy: what's free stays generous and is
// said out loud — the market's paywall-slam is the thing we're not.
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { safeBack } from "@/lib/nav";
import * as Haptics from "expo-haptics";
import { X, Check, Sparkles, Infinity as InfinityIcon } from "lucide-react-native";
import { usePlus } from "@/contexts/PlusContext";
import type { PlanId } from "@/lib/purchase";
import {
  colors,
  space,
  radius,
  type,
  serif,
  accentGlow,
} from "@/constants/theme";

const BENEFITS = [
  "Unlimited living stories — one for every dream",
  "Every affirmation pack, all six areas",
  "Unlimited vision board cards",
  "All journal templates, forever",
] as const;

const PLANS: { id: PlanId; label: string; note?: string }[] = [
  { id: "yearly", label: "Yearly", note: "best value" },
  { id: "monthly", label: "Monthly" },
  { id: "lifetime", label: "Lifetime", note: "one payment" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { purchase, restore, prices } = usePlus();
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string>, failMessage: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await fn();
      if (result === "purchased") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        safeBack(router);
      } else if (result === "unavailable") {
        Alert.alert(
          "Not available yet",
          "Purchases unlock with the App Store release. Until then, everything free stays fully usable."
        );
      } else if (result === "failed") {
        Alert.alert("That didn't go through", failMessage);
      }
      // "cancelled" is a normal choice: no alert.
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={s.close}
          onPress={() => safeBack(router)}
          testID="paywall-close"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={s.badge}>
          <Sparkles size={26} color={colors.accent} />
        </View>
        <Text style={s.h1}>Vela Plus</Text>
        <Text style={s.lead}>
          Room for every dream you're holding — not just the first one.
        </Text>

        <View style={s.freeCard} testID="paywall-free-promise">
          <InfinityIcon size={16} color={colors.success} />
          <Text style={s.freeText}>
            Your story, unlimited listens, the daily ritual and journal stay
            free. Forever. That's a promise, not a trial.
          </Text>
        </View>

        <View style={s.card}>
          {BENEFITS.map((b) => (
            <View key={b} style={s.benefit}>
              <Check size={15} color={colors.accent} />
              <Text style={s.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={s.plans}>
          {PLANS.map(({ id, label, note }) => {
            const on = plan === id;
            const price = prices[id];
            return (
              <TouchableOpacity
                key={id}
                style={[s.plan, on && s.planOn]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setPlan(id);
                }}
                activeOpacity={0.85}
                testID={`plan-${id}`}
              >
                <Text style={[s.planLabel, on && s.planLabelOn]}>{label}</Text>
                {price ? (
                  <Text style={[s.planPrice, on && s.planLabelOn]}>{price}</Text>
                ) : null}
                {note ? <Text style={s.planNote}>{note}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.renewalText}>
          Monthly and yearly plans renew automatically unless cancelled at
          least 24 hours before the current period ends. Payment is charged to
          your Apple Account. Lifetime is a one-time purchase.
        </Text>
        <View style={s.legalLinks}>
          <TouchableOpacity
            onPress={() =>
              void Linking.openURL(
                "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              )
            }
            testID="paywall-terms"
            style={s.legalTap}
          >
            <Text style={s.legalText}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={s.legalDot}>•</Text>
          <TouchableOpacity
            onPress={() => void Linking.openURL("https://dhaxor.github.io/vela/privacy")}
            testID="paywall-privacy"
            style={s.legalTap}
          >
            <Text style={s.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={s.dock}>
        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.85}
          testID="paywall-buy"
          onPress={() =>
            void run(() => purchase(plan), "The purchase could not be completed.")
          }
        >
          <Text style={s.ctaText}>
            {prices[plan] ? `Unlock Plus · ${prices[plan]}` : "Unlock Plus"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            void run(restore, "No previous purchase was found for this Apple Account.")
          }
          testID="paywall-restore"
          style={s.restore}
        >
          <Text style={s.restoreText}>Restore purchases</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: 180 },
  close: {
    alignSelf: "flex-end",
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.sm,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  h1: {
    fontFamily: serif,
    fontSize: 32,
    lineHeight: 40,
    color: colors.text,
    textAlign: "center",
    marginTop: space.base,
  },
  lead: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  freeCard: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "flex-start",
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: space.base,
    marginBottom: space.md,
  },
  freeText: { ...type.caption, color: colors.success, flex: 1, lineHeight: 19 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    marginBottom: space.lg,
    gap: space.md,
  },
  benefit: { flexDirection: "row", alignItems: "center", gap: space.sm },
  benefitText: { ...type.body, color: colors.textSecondary, flex: 1 },
  plans: { flexDirection: "row", gap: space.sm },
  plan: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.base,
    alignItems: "center",
    minHeight: 84,
  },
  planOn: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  planLabel: { ...type.body, fontWeight: "600", color: colors.textSecondary },
  planLabelOn: { color: colors.accent },
  planPrice: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
  planNote: {
    ...type.caption,
    color: colors.success,
    marginTop: space.xs,
    fontWeight: "600",
  },
  renewalText: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: space.lg,
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.sm,
  },
  legalTap: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: space.xs,
  },
  legalText: { ...type.caption, color: colors.accent },
  legalDot: { ...type.caption, color: colors.textFaint },
  dock: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    alignItems: "center",
    ...accentGlow,
  },
  ctaText: { ...type.body, fontWeight: "600", color: colors.onAccent },
  restore: { alignItems: "center", marginTop: space.md, minHeight: 44, justifyContent: "center" },
  restoreText: { ...type.caption, color: colors.textMuted },
});
