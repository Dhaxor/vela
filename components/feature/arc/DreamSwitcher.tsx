// Dream switcher for the Memory Book: one pill per dream, shown only when
// there is more than one. Choosing a pill only changes which book is open
// here; it never changes which dream weaves (that is setActiveDream, behind
// the '…' menu with its consequences spelled out).
import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import type { Dream, DreamId } from "@/contexts/arc.types";
import { Press, T, haptics, useGutter } from "@/components/ui";
import { AreaSign } from "@/components/glyphs";
import { colors, hitSize, radius, space } from "@/constants/theme";
import { dreamShortName } from "./model";

export interface DreamSwitcherProps {
  dreams: readonly Dream[];
  selectedId: DreamId | null;
  onSelect: (id: DreamId) => void;
}

const STATUS_NOTE: Partial<Record<Dream["status"], string>> = { resting: "resting", released: "released" };

export function DreamSwitcher({ dreams, selectedId, onSelect }: DreamSwitcherProps) {
  const gutter = useGutter();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const spans = useRef<Record<string, { x: number; w: number }>>({});
  const offset = useRef(0);

  // Keep the open book's pill in view (it can sit past the edge on a small phone).
  const reveal = (id: DreamId | null, animated: boolean) => {
    const span = id ? spans.current[id] : undefined;
    if (!span) return;
    const left = span.x - gutter;
    const right = span.x + span.w + gutter - width;
    if (left < offset.current) scroller.current?.scrollTo({ x: Math.max(0, left), animated });
    else if (right > offset.current) scroller.current?.scrollTo({ x: right, animated });
  };
  // Runs when the open book changes (reveal reads only refs and layout).
  useEffect(() => reveal(selectedId, true), [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dreams.length < 2) return null;
  return (
    <ScrollView
      ref={scroller}
      onScroll={(e) => (offset.current = e.nativeEvent.contentOffset.x)}
      scrollEventThrottle={32}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bleed to the screen edges so pills scroll under the gutter, then pad back in.
      style={{ marginHorizontal: -gutter }}
      contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
      accessibilityRole="tablist"
      testID="arc-book-switcher"
    >
      {dreams.map((d) => {
        const on = d.id === selectedId;
        const note = STATUS_NOTE[d.status];
        const name = dreamShortName(d);
        return (
          <Press
            key={d.id}
            onLayout={(e) => {
              spans.current[d.id] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
              if (on) reveal(d.id, false);
            }}
            testID={`arc-dream-${d.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${name}${note ? `, ${note}` : ""}`}
            pressScale={0.95}
            onPress={() => {
              if (on) return;
              haptics.select();
              onSelect(d.id);
            }}
            style={[styles.pill, on && styles.on]}
          >
            <AreaSign focus={d.focus} size={16} color={on ? colors.gold300 : colors.ink64} strokeWidth={1.4} />
            <View style={styles.label}>
              <T variant="body" tone={on ? "primary" : d.status === "active" ? "secondary" : "muted"} numberOfLines={1}>
                {name}
              </T>
            </View>
            {note ? (
              <T variant="caption" tone="faint">
                {note}
              </T>
            ) : null}
          </Press>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, alignItems: "center" },
  pill: {
    minHeight: hitSize,
    maxWidth: 248,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.base,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.vellum,
  },
  on: { backgroundColor: colors.vellumRaised, borderColor: colors.gold300 },
  label: { flexShrink: 1 },
});
