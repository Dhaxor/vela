// The compact 2-up rituals row under the loop card. They support the loop;
// they never compete with it, so neither card carries a filled button.
// - 'Carry a line' leads with Your lines: an identity line born from the kind
//   of the latest proof (did / moved / learned) in the dream's focus.
// - 'Reflect' offers one arc-linked scripting prompt for today.
// Keeps the 1.0 testIDs ritual-affirmation and ritual-script.
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import type { Dream } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { dailyAffirmation } from "@/lib/affirmations";
import { identityLineFor, scriptPrompts, type ScriptPrompt, type YourLine } from "@/lib/rituals";
import { T, VellumCard } from "@/components/ui";
import { colors, space } from "@/constants/theme";

/**
 * Today's two picks from the SAME rules the Rituals tab and /affirmation use
 * (lib/rituals), so the card, the Script door and the line page always agree.
 */
export function useTodayRituals(dream: Dream | null, name: string, todayKey: string): { line: YourLine | null; prompt: ScriptPrompt | null; fallback: string | null } {
  const arc = useArc();
  return useMemo(() => {
    if (!dream) return { line: null, prompt: null, fallback: null };
    const chapters = arc.chapters(dream.id);
    const heard = [...chapters].reverse().find((c) => c.heardAt) ?? null;
    const proofs = arc.proofs(dream.id);
    const prompt =
      scriptPrompts({ dateKey: todayKey, name, dream, chapter: heard, bridge: arc.openBridge(dream.id) ?? null, proof: proofs.at(-1) ?? null })[0] ?? null;
    // Before the first proof, the library's line for the day in this dream's area (as Rituals and /affirmation show).
    const line = identityLineFor(proofs, dream.focus, todayKey);
    return { line, prompt, fallback: line ? null : dailyAffirmation(todayKey, [dream.focus]).text };
  }, [arc, dream, name, todayKey]);
}

export interface RitualsRowProps {
  dream: Dream | null;
  name: string;
  todayKey: string;
  carriedToday: boolean;
  wroteToday: boolean;
}

function Done({ label }: { label: string }) {
  return (
    <View style={styles.done}>
      <Check color={colors.gold300} size={14} strokeWidth={2.25} />
      <T variant="caption" tone="muted">
        {label}
      </T>
    </View>
  );
}

export function RitualsRow({ dream, name, todayKey, carriedToday, wroteToday }: RitualsRowProps) {
  const router = useRouter();
  const picks = useTodayRituals(dream, name, todayKey);
  const line = picks.line?.text ?? picks.fallback;
  const prompt = picks.prompt;
  return (
    <View style={styles.row} testID="today-rituals">
      <VellumCard
        padding="compact"
        style={styles.card}
        onPress={() => router.push("/affirmation")}
        accessibilityLabel={`Carry a line${line ? `: ${line}` : ""}`}
        testID="ritual-affirmation"
      >
        <T variant="eyebrow" tone="muted">
          Carry a line
        </T>
        <T variant="reading" tone="primary" numberOfLines={4} style={styles.text}>
          {line ?? "A line to carry for the day ahead."}
        </T>
        {carriedToday ? <Done label="Carried today" /> : null}
      </VellumCard>
      <VellumCard
        padding="compact"
        style={styles.card}
        onPress={() => router.push(prompt ? { pathname: "/journal/script", params: { promptId: prompt.id } } : "/journal/script")}
        accessibilityLabel={`Reflect${prompt ? `: ${prompt.text}` : ""}`}
        testID="ritual-script"
      >
        <T variant="eyebrow" tone="muted">
          Reflect
        </T>
        <T variant="body" tone="secondary" numberOfLines={4} style={styles.text}>
          {prompt?.text ?? "Script a scene from inside the life you want."}
        </T>
        {wroteToday ? <Done label="Written today" /> : null}
      </VellumCard>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, alignItems: "stretch" },
  card: { flex: 1 },
  text: { marginTop: space.sm },
  done: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.md },
});
