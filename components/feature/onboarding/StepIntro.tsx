// The head of every First Light step: an optional eyebrow, one Display line
// (the question) and a short lead. Display 32 + body 17 keeps the step to two
// sizes; the gap below is 2× the gap inside, so the head reads as one group.
import React from "react";
import { StyleSheet, View } from "react-native";
import { T } from "@/components/ui";
import { space } from "@/constants/theme";

export interface StepIntroProps {
  eyebrow?: React.ReactNode;
  title: string;
  lead?: string;
  testID?: string;
}

export function StepIntro({ eyebrow, title, lead, testID }: StepIntroProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      {eyebrow ? <View style={styles.eyebrow}>{eyebrow}</View> : null}
      <T variant="display" accessibilityRole="header">
        {title}
      </T>
      {lead ? <T style={styles.lead}>{lead}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.xl },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  lead: { marginTop: space.md },
});
