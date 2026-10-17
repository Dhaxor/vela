// SCRIPT: tonight's prompt (arc-linked first: 'Write the scene just after
// Chapter V ends'), a page of Newsreader on the open sky, and a seal. The
// prompt can be swapped; the page is kept with the prompt and the dream it
// was written for, then Vela says so and returns to Rituals.
import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { RefreshCw, X } from "@/components/glyphs/icons";
import { Dock, GhostButton, Header, IconButton, PrimaryButton, Screen, T, useToast } from "@/components/ui";
import { SealedMoment } from "@/components/feature/rituals/SealedMoment";
import { dayParts } from "@/components/feature/rituals/dates";
import { SkyWriting } from "@/components/feature/rituals/SkyWriting";
import { useBackToRituals } from "@/components/feature/rituals/nav";
import { useRitualToday } from "@/components/feature/rituals/useRitualToday";
import { scriptPromptById, type ScriptPrompt } from "@/lib/rituals";
import { useJournal } from "@/contexts/JournalContext";
import { useProgress } from "@/contexts/RitualContext";
import { colors, space } from "@/constants/theme";
import { ENTRY_TEXT_MAX } from "@/lib/journal";
import { STAGES, type StageId } from "@/lib/story/content";
import { toRoman } from "@/lib/story/text";

const MIN_CHARS = 3;

export default function ScriptScreen() {
  const back = useBackToRituals();
  const toast = useToast();
  const { addEntry } = useJournal();
  const { recordAct } = useProgress();
  const today = useRitualToday();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sealed, setSealed] = useState(false);

  // Today's 'Reflect' card opens this page on the prompt it showed (?promptId=…).
  const { promptId } = useLocalSearchParams<{ promptId?: string }>();
  const { prompts, askedFromLatest } = useMemo<{ prompts: readonly ScriptPrompt[]; askedFromLatest: boolean }>(() => {
    const list = today.prompts;
    if (!promptId) return { prompts: list, askedFromLatest: false };
    const at = list.findIndex((p) => p.id === promptId);
    if (at >= 0) return { prompts: [list[at], ...list.slice(0, at), ...list.slice(at + 1)], askedFromLatest: false };
    // Today's card may name the newest chapter before it is heard; fill the prompt the same way.
    const asked = scriptPromptById(String(promptId), { ...today.scriptContext, chapter: today.latestChapter });
    return asked ? { prompts: [asked, ...list], askedFromLatest: true } : { prompts: list, askedFromLatest: false };
  }, [today.prompts, today.scriptContext, today.latestChapter, promptId]);
  const prompt = prompts.length > 0 ? prompts[index % prompts.length] : null;
  const ready = text.trim().length >= MIN_CHARS;
  const chapter = askedFromLatest && index % prompts.length === 0 ? today.latestChapter : today.heardChapter;

  const save = async () => {
    if (!ready || busy || !prompt) return;
    setBusy(true);
    const entry = await addEntry("script", prompt.text, text, { promptId: prompt.id, dreamId: prompt.dreamId ?? undefined });
    if (!entry) {
      setBusy(false);
      toast.show({ message: "That page was empty, so nothing was kept.", tone: "error" });
      return;
    }
    recordAct("ritual-saved");
    setSealed(true);
  };

  if (sealed) {
    return <SealedMoment meta={`Script · ${dayParts(today.dateKey).long}`} onDone={back} />;
  }

  const eyebrow = prompt?.arc
    ? chapter
      ? `Chapter ${toRoman(chapter.number)} · ${STAGES[chapter.stage as StageId]?.name ?? ""}`
      : "Linked to your story"
    : "Today’s prompt";

  return (
    <Screen
      testID="script-screen"
      header={
        <Header
          back={false}
          title="Script"
          right={
            <IconButton accessibilityLabel="Close" onPress={back} testID="script-close">
              <X color={colors.ink80} size={22} strokeWidth={1.75} />
            </IconButton>
          }
        />
      }
      dock={
        <Dock>
          <PrimaryButton label="Seal the page" onPress={() => void save()} disabled={!ready} loading={busy} testID="script-save" />
        </Dock>
      }
    >
      <View style={styles.prompt}>
        <T variant="eyebrow" tone={prompt?.arc ? "gold" : "muted"} numberOfLines={1}>
          {eyebrow}
        </T>
        <T variant="title" testID="script-prompt">
          {prompt?.text ?? "Write a scene from inside the life you want, as if it already happened."}
        </T>
        {prompts.length > 1 ? (
          <GhostButton
            label="Another prompt"
            icon={<RefreshCw color={colors.ink64} size={16} strokeWidth={1.75} />}
            onPress={() => setIndex((i) => i + 1)}
            testID="script-another"
            tone="muted"
            style={styles.another}
          />
        ) : null}
      </View>
      <SkyWriting
        value={text}
        onChangeText={setText}
        placeholder="Begin anywhere. Present tense helps."
        maxLength={ENTRY_TEXT_MAX}
        minHeight={240}
        autoFocus
        accessibilityLabel="Your page"
        testID="script-input"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: space.sm, paddingTop: space.base, marginBottom: space.lg },
  another: { alignSelf: "flex-start", marginLeft: -space.md },
});
