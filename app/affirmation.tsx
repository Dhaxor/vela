// YOUR LINE, full screen on the open sky. After the first proof it is an
// identity line born from what the person did (kind × focus), with the proof
// it came from underneath; before that, the day's line from the library.
// Carrying it is the smallest ritual there is ('line-carried').
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, X } from "@/components/glyphs/icons";
import { Dock, GhostButton, Header, IconButton, PrimaryButton, Screen, SecondaryButton, T, UserWords, haptics } from "@/components/ui";
import { StarProof } from "@/components/glyphs";
import { BORN_FROM } from "@/components/feature/rituals/YourLineBlock";
import { dayParts } from "@/components/feature/rituals/dates";
import { useRitualToday } from "@/components/feature/rituals/useRitualToday";
import { useProgress } from "@/contexts/RitualContext";
import { useUser } from "@/contexts/UserContext";
import { colors, space } from "@/constants/theme";
import { dailyAffirmation } from "@/lib/affirmations";
import { focusById } from "@/lib/focus";
import { safeBack } from "@/lib/nav";

export default function AffirmationScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const { summary, recordAct } = useProgress();
  const today = useRitualToday();
  const carried = summary.doneToday.includes("line-carried");
  const close = () => safeBack(router);

  const fallback = useMemo(() => {
    if (today.line) return null;
    const a = dailyAffirmation(today.dateKey, today.focus ? [today.focus] : profile?.focusAreas ?? []);
    return { text: a.text, area: focusById(a.focus)?.label ?? "" };
  }, [today.line, today.dateKey, today.focus, profile?.focusAreas]);

  const line = today.line;
  const text = line?.text ?? fallback?.text ?? "";

  const carry = () => {
    if (carried) return close();
    haptics.success();
    recordAct("line-carried");
  };

  return (
    <Screen
      scroll={false}
      testID="affirmation-screen"
      header={
        <Header
          back={false}
          right={
            <IconButton accessibilityLabel="Close" onPress={close} testID="affirmation-close">
              <X color={colors.ink80} size={22} strokeWidth={1.75} />
            </IconButton>
          }
        />
      }
      dock={
        <Dock>
          {carried ? (
            <SecondaryButton
              label="Carried. See you tomorrow."
              icon={<Check color={colors.gold300} size={18} strokeWidth={2.25} />}
              onPress={close}
              testID="affirmation-carry"
            />
          ) : (
            <PrimaryButton label="I’ll carry this today" onPress={carry} testID="affirmation-carry" />
          )}
          <GhostButton label="Browse the library" onPress={() => router.push("/affirmations")} testID="affirmation-browse" tone="muted" />
        </Dock>
      }
    >
      <View style={styles.center}>
        {line ? (
          <View style={styles.kind}>
            <StarProof kind={line.kind} size={28} />
            <T variant="eyebrow" tone="muted" center>
              {`Your line · ${BORN_FROM[line.kind].toLowerCase()}`}
            </T>
          </View>
        ) : (
          <T variant="eyebrow" tone="muted" center>
            {`${fallback?.area ?? ""} · today`}
          </T>
        )}
        <T variant="display" center testID="affirmation-text" style={styles.line}>
          {text}
        </T>
        {line ? (
          <View style={styles.source}>
            <T variant="caption" tone="faint" center numeric>
              {`From your proof of ${dayParts(line.proof.dateKey).long}`}
            </T>
            <UserWords variant="body" center numberOfLines={2}>
              {line.proof.text}
            </UserWords>
          </View>
        ) : (
          <T variant="caption" tone="muted" center style={styles.source}>
            Your own lines are born from your first proof.
          </T>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: space.lg, paddingBottom: space.xl },
  kind: { alignItems: "center", gap: space.md },
  line: { maxWidth: 520 },
  source: { alignItems: "center", gap: space.xs, maxWidth: 420, marginTop: space.sm },
});
