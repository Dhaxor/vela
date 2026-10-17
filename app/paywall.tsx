// Vela Plus, the honest version (ELEVATE §0.12). The screen opens on the
// user's OWN sky, with ghost constellations for dreams not yet begun, then
// says what stays free forever BEFORE what Plus adds. Plans are plain plates
// with StoreKit's billed price; the yearly per-month figure is computed with
// Intl and set smaller than what is charged. No weekly plans, credits or trial.
//
// `?from=` sets the header: second-dream · bed · area · scenes · nudge
// (and 'reader', 'lapsed'). Once Plus is on (a Plus member, a purchase, a
// restore) the same screen becomes the thank-you state: the ghosts' anchors
// light and the one gold button leads on.
//
// testIDs kept from 1.0: paywall-close, paywall-free-promise, plan-*,
// paywall-buy, paywall-restore, paywall-terms, paywall-privacy.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { X } from "@/components/glyphs/icons";
import { useArc } from "@/contexts/ArcContext";
import { usePlus } from "@/contexts/PlusContext";
import type { PlanId } from "@/lib/purchase";
import { safeBack } from "@/lib/nav";
import { Dock, Header, IconButton, PrimaryButton, Screen, T, haptics, useToast } from "@/components/ui";
import { AreaSign } from "@/components/glyphs";
import {
  BenefitList,
  DEMO_PRICES,
  FreeForeverPanel,
  LegalFooter,
  PLAN_ORDER,
  PLUS_ON_COPY,
  PlanPlates,
  PlusSky,
  buyLabel,
  demoPricesRequested,
  orderedBenefits,
  paywallCopy,
  paywallSource,
  planPrice,
  readPlanAmounts,
  usePlusActions,
  usePlusSky,
  yearlyIsBetterValue,
  type PlanPrice,
} from "@/components/feature/plus";
import { colors, space } from "@/constants/theme";

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const source = paywallSource(params.from);
  const plus = usePlus();
  const arc = useArc();
  const toast = useToast();
  const actions = usePlusActions();
  const sky = usePlusSky();
  const win = useWindowDimensions();
  const [plan, setPlan] = useState<PlanId>("yearly");

  // Prices: StoreKit's display strings and numeric amounts; null on web.
  const demo = useMemo(demoPricesRequested, []);
  const display = demo ? DEMO_PRICES.display : plus.prices;
  const amounts = useMemo(() => (demo ? DEMO_PRICES.amounts : readPlanAmounts(plus)), [demo, plus]);
  const prices = useMemo(() => {
    const out = {} as Record<PlanId, PlanPrice | null>;
    for (const p of PLAN_ORDER) out[p] = planPrice(p, display[p], amounts[p]);
    return out;
  }, [display, amounts]);

  // The peak: Plus turns on while this screen is open (purchase or restore).
  const wasPlus = useRef(plus.isPlus);
  const [justJoined, setJustJoined] = useState(false);
  useEffect(() => {
    if (!wasPlus.current && plus.isPlus) {
      setJustJoined(true);
      haptics.success();
      toast.show({ message: "Welcome to Vela Plus.", tone: "proof" });
    }
    wasPlus.current = plus.isPlus;
  }, [plus.isPlus, toast]);

  const isPlus = plus.isPlus;
  const copy = isPlus ? { ...PLUS_ON_COPY, featured: null } : paywallCopy(source, { area: sky.area, stars: sky.stars });
  const benefits = orderedBenefits(copy.featured);
  const heroHeight = Math.round(Math.max(152, Math.min(224, win.height * 0.24)));
  const close = () => safeBack(router);
  const secondDream = isPlus && source === "second-dream" && arc.canCreateDream;

  const dock = (
    <Dock>
      {isPlus ? (
        secondDream ? (
          <PrimaryButton label="Begin a new dream" onPress={() => router.dismissTo("/story/new")} testID="paywall-begin-dream" />
        ) : (
          <PrimaryButton label={justJoined ? "Back to your sky" : "Done"} onPress={close} testID="paywall-done" />
        )
      ) : (
        <PrimaryButton
          label={buyLabel(plan, prices[plan])}
          loading={actions.busy === "buy" || actions.awaitingGrant}
          disabled={actions.busy === "restore"}
          onPress={() => void actions.buy(plan)}
          testID="paywall-buy"
          accessibilityHint={prices[plan] ? undefined : "The App Store shows the price before you confirm"}
        />
      )}
    </Dock>
  );

  return (
    <Screen
      testID="paywall"
      focus={sky.focus}
      header={
        <Header
          title="Vela Plus"
          back={false}
          testID="paywall-header"
          right={
            <IconButton accessibilityLabel="Close" onPress={close} testID="paywall-close">
              <X color={colors.ink80} size={22} strokeWidth={1.75} />
            </IconButton>
          }
        />
      }
      dock={dock}
    >
      <PlusSky dreams={sky.dreams} ghosts={sky.ghosts} open={isPlus} width={win.width} height={heroHeight} accessibilityLabel={sky.accessibilityLabel} />

      <View style={styles.intro}>
        {sky.stats && sky.focus ? (
          <View style={styles.stats} testID="paywall-stats">
            <AreaSign focus={sky.focus} size={14} color={colors.ink64} strokeWidth={1.4} />
            <T variant="eyebrow" tone="muted" numeric numberOfLines={1} style={styles.flex}>
              {sky.stats}
            </T>
          </View>
        ) : null}
        <T variant="display" accessibilityRole="header" testID="paywall-title">
          {copy.title}
        </T>
        <T variant="body" tone="secondary" testID="paywall-lead">
          {copy.lead}
        </T>
      </View>

      <View style={styles.section}>
        <FreeForeverPanel title={isPlus ? "Still free, forever" : "Free forever"} />
      </View>

      <View style={styles.section}>
        <T variant="eyebrow" style={styles.eyebrow}>
          {isPlus ? "Yours with Plus" : "What Plus adds"}
        </T>
        <BenefitList benefits={benefits} featured={copy.featured} owned={isPlus} />
      </View>

      {!isPlus ? (
        <View style={styles.section} testID="paywall-plans">
          <T variant="eyebrow" style={styles.eyebrow}>
            Choose your plan
          </T>
          <PlanPlates value={plan} onChange={setPlan} prices={prices} yearlyBestValue={yearlyIsBetterValue(amounts)} disabled={actions.busy !== null} />
        </View>
      ) : null}

      <View style={styles.section}>
        <LegalFooter
          onRestore={isPlus ? null : () => void actions.restore()}
          restoring={actions.busy === "restore"}
          showManage={isPlus && Platform.OS === "ios"}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.sm },
  stats: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xs },
  flex: { flexShrink: 1 },
  section: { marginTop: space.xl },
  eyebrow: { marginBottom: space.base },
});
