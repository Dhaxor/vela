// The three plan plates (yearly, monthly, lifetime) as one radio group, in the
// selected-state grammar: raised sky surface, 1.5px gold300 border and the
// 18px check badge. The billed price is the plate's largest figure; the
// yearly per-month equivalent sits under it at caption size (Guideline
// 3.1.2: never more prominent than what is charged). With no prices (web,
// offline) the plates show only how each plan bills.
import React from "react";
import { StyleSheet, View } from "react-native";
import type { PlanId } from "@/lib/purchase";
import { CheckBadge, Press, T, haptics } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { PLAN_COPY, PLAN_ORDER, type PlanPrice } from "./price";

export interface PlanPlatesProps {
  value: PlanId;
  onChange: (plan: PlanId) => void;
  prices: Readonly<Record<PlanId, PlanPrice | null>>;
  /** Show 'Best value' on yearly (only when the amounts honestly say so). */
  yearlyBestValue: boolean;
  disabled?: boolean;
}

export function PlanPlates({ value, onChange, prices, yearlyBestValue, disabled }: PlanPlatesProps) {
  const anyPrice = PLAN_ORDER.some((p) => prices[p] !== null);
  return (
    <View>
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Plans">
        {PLAN_ORDER.map((plan) => (
          <PlanPlate
            key={plan}
            plan={plan}
            price={prices[plan]}
            tag={plan === "yearly" && yearlyBestValue ? "Best value" : null}
            selected={plan === value}
            disabled={disabled}
            onPress={() => onChange(plan)}
          />
        ))}
      </View>
      <T variant="caption" tone="faint" center style={styles.note} testID="paywall-price-note">
        {anyPrice ? "Prices come from the App Store, in your currency." : "The App Store shows your price, in your currency, before you confirm."}
      </T>
    </View>
  );
}

interface PlanPlateProps {
  plan: PlanId;
  price: PlanPrice | null;
  tag: string | null;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function PlanPlate({ plan, price, tag, selected, disabled, onPress }: PlanPlateProps) {
  const copy = PLAN_COPY[plan];
  const spoken = [copy.label, copy.cadence, price ? price.billed : null, price?.perMonth ? `about ${price.perMonth} a month` : null, tag]
    .filter(Boolean)
    .join(", ");
  return (
    <Press
      testID={`plan-${plan}`}
      accessibilityRole="radio"
      accessibilityLabel={spoken}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      aria-checked={selected}
      disabled={disabled}
      pressScale={0.98}
      onPress={() => {
        if (selected) return;
        haptics.select();
        onPress();
      }}
      style={[styles.plate, selected && styles.plateOn]}
    >
      <View style={styles.highlight} />
      {selected ? <CheckBadge /> : <View style={styles.radio} />}
      <View style={styles.copy}>
        <View style={styles.labelRow}>
          <T variant="body" strong tone="primary">
            {copy.label}
          </T>
          {tag ? (
            <View style={styles.tag}>
              <T variant="caption" strong tone="gold" numberOfLines={1}>
                {tag}
              </T>
            </View>
          ) : null}
        </View>
        <T variant="caption" tone="muted" numberOfLines={2}>
          {copy.cadence}
        </T>
      </View>
      {price ? (
        <View style={styles.price}>
          <T variant="body" strong tone="primary" numeric testID={`plan-${plan}-price`}>
            {price.billed}
          </T>
          {price.perMonth ? (
            <T variant="caption" tone="muted" numeric testID={`plan-${plan}-per-month`}>
              {`≈ ${price.perMonth} a month`}
            </T>
          ) : null}
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  plate: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  plateOn: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300, borderWidth: 1.5 },
  highlight: {
    position: "absolute",
    top: 0,
    left: radius.card,
    right: radius.card,
    height: 1,
    backgroundColor: colors.highlight,
    pointerEvents: "none",
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.ink48 },
  copy: { flex: 1, gap: space.xxs },
  labelRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  tag: {
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldEngrave,
  },
  price: { alignItems: "flex-end", gap: space.xxs },
  note: { marginTop: space.md },
});
