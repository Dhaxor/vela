// You: the name the chapters speak to, and how the narrator should say it.
// One sheet, one Save. The pronunciation is used only for the spoken voice;
// the page always prints the name as written.
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GhostButton, PrimaryButton, Sheet, TextField } from "@/components/ui";
import { space } from "@/constants/theme";

export const NAME_MAX = 40;
export const PRONUNCIATION_MAX = 40;

export interface ProfileSheetProps {
  visible: boolean;
  name: string;
  pronunciation: string | null;
  /** Which field takes focus when the sheet opens. */
  focus: "name" | "pronunciation";
  onSave: (next: { name: string; pronunciation: string | null }) => void;
  onClose: () => void;
}

export function ProfileSheet({ visible, name, pronunciation, focus, onSave, onClose }: ProfileSheetProps) {
  const [draftName, setDraftName] = useState(name);
  const [draftSay, setDraftSay] = useState(pronunciation ?? "");

  useEffect(() => {
    if (!visible) return;
    setDraftName(name);
    setDraftSay(pronunciation ?? "");
  }, [visible, name, pronunciation]);

  const trimmed = draftName.trim().replace(/\s+/g, " ");
  const say = draftSay.trim().replace(/\s+/g, " ");
  const save = () => {
    if (!trimmed) return;
    onSave({ name: trimmed, pronunciation: say ? say : null });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Your name"
      subtitle="Every chapter is written to you, by name."
      testID="settings-profile-sheet"
      footer={
        <>
          <PrimaryButton label="Save" onPress={save} disabled={!trimmed} testID="settings-profile-save" />
          <GhostButton label="Cancel" tone="muted" onPress={onClose} testID="settings-profile-cancel" />
        </>
      }
    >
      <View style={styles.fields}>
        <TextField
          label="Name"
          value={draftName}
          onChangeText={setDraftName}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus={focus === "name"}
          returnKeyType="next"
          error={draftName.length > 0 && !trimmed ? "Your name can't be blank." : null}
          testID="settings-name"
        />
        <TextField
          label="Say it as"
          value={draftSay}
          onChangeText={setDraftSay}
          maxLength={PRONUNCIATION_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={focus === "pronunciation"}
          placeholder={trimmed ? `How to say “${trimmed}”` : "How to say it"}
          hint="The narrator says your name this way, for example MY-uh. Leave it empty to read it as written."
          returnKeyType="done"
          onSubmitEditing={save}
          testID="settings-pronunciation"
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.lg },
});
