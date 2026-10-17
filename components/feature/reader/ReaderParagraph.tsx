// One paragraph of a chapter, on open sky.
// - The user's own words (desire and proof spans) are gold Newsreader Italic.
// - While listening, the spoken sentence is at full ink and the rest dims;
//   colour only, on nested <T> runs (ELEVATE §8), so text flow never breaks.
// - The paragraph that weaves a proof carries a gold rule and the tag
//   'Woven from your proof'.
// - On a first reading the paragraph rises in (opacity + 6px), staggered;
//   a plain fade under Reduce Motion, nothing in still mode.
import React, { memo, useEffect, useMemo } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { Press, T, drift, useMotion, type TTone } from "@/components/ui";
import { StarProof } from "@/components/glyphs";
import type { Paragraph, ProofKind } from "@/contexts/arc.types";
import type { TextSize } from "@/contexts/user.types";
import { colors, motion, space } from "@/constants/theme";
import { isUserWords, paragraphRuns, type SentenceRange } from "./segments";

export interface WovenInfo {
  readonly kind: ProofKind;
  /** 'Oct 20', or null. */
  readonly dateLabel: string | null;
}

export interface ReaderParagraphProps {
  paragraph: Paragraph;
  index: number;
  size: TextSize;
  /** The sentence being spoken, when it is in this paragraph. */
  sentence: SentenceRange | null;
  /** Narration is engaged (playing or paused mid-chapter): dim what is not being said. */
  listening: boolean;
  woven: WovenInfo | null;
  /** Rise-in delay in ms; null = no entrance. */
  riseDelay: number | null;
  onLayout?: (index: number, y: number, height: number) => void;
  /** Tap to listen from here (only while narration is engaged). */
  onListenFrom?: (index: number) => void;
}

const RISE_PX = 6;

function Rise({ delay, children }: { delay: number | null; children: React.ReactNode }) {
  const policy = useMotion();
  const animate = delay !== null && !policy.still;
  const p = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    p.value = withDelay(delay ?? 0, withTiming(1, { duration: policy.transitions ? motion.reveal : motion.state, easing: drift }));
    // Entrance runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const move = policy.transitions;
  const style = useAnimatedStyle(() =>
    move ? { opacity: p.value, transform: [{ translateY: (1 - p.value) * RISE_PX }] } : { opacity: p.value }
  );
  if (!animate) return <>{children}</>;
  return <Animated.View style={style}>{children}</Animated.View>;
}

function WovenTag({ woven }: { woven: WovenInfo }) {
  const label = woven.dateLabel ? `Woven from your proof · ${woven.dateLabel}` : "Woven from your proof";
  return (
    <View style={styles.tag} accessibilityRole="text" accessibilityLabel={label}>
      <StarProof kind={woven.kind} size={14} />
      <T variant="eyebrow" tone="gold" numeric>
        {label}
      </T>
    </View>
  );
}

function ReaderParagraphBase({ paragraph, index, size, sentence, listening, woven, riseDelay, onLayout, onListenFrom }: ReaderParagraphProps) {
  const runs = useMemo(() => paragraphRuns(paragraph.text, paragraph.spans, sentence), [paragraph.text, paragraph.spans, sentence]);
  // At rest the story reads at 80%, the woven paragraph at full ink; while listening only the spoken sentence is full.
  const base: TTone = listening ? "faint" : woven ? "primary" : "secondary";

  const text = (
    <T variant="reading" size={size} tone={base}>
      {runs.map((r) => {
        const words = isUserWords(r.kind);
        const tone: TTone = words ? "gold" : r.spoken ? "primary" : base;
        return (
          <T key={`${r.start}`} variant="reading" size={size} italic={words} tone={tone}>
            {r.text}
          </T>
        );
      })}
    </T>
  );

  const body = woven ? (
    <View style={styles.woven}>
      <View style={styles.rule} />
      {text}
    </View>
  ) : (
    text
  );

  const handleLayout = (e: LayoutChangeEvent) => onLayout?.(index, e.nativeEvent.layout.y, e.nativeEvent.layout.height);

  return (
    <View onLayout={handleLayout} style={styles.block} testID={woven ? "story-woven" : `story-paragraph-${index}`}>
      <Rise delay={riseDelay}>
        {woven ? <WovenTag woven={woven} /> : null}
        {onListenFrom ? (
          <Press
            onPress={() => onListenFrom(index)}
            pressScale={0.995}
            accessibilityLabel={paragraph.text}
            accessibilityHint="Listens from this paragraph"
            testID={`story-listen-from-${index}`}
          >
            {body}
          </Press>
        ) : (
          body
        )}
      </Rise>
    </View>
  );
}

export const ReaderParagraph = memo(ReaderParagraphBase);

const styles = StyleSheet.create({
  block: { marginBottom: space.lg },
  tag: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  woven: { paddingLeft: space.base },
  rule: {
    position: "absolute",
    left: 0,
    top: space.xs,
    bottom: space.xs,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.gold300,
    boxShadow: `0px 0px 8px ${colors.goldEngrave}`,
  },
});
