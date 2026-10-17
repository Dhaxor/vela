// RITUALS (ELEVATE §0.11, §3.4): the three practices as doors, 'Your line'
// born from proof, Scenes, and every past page. Supporting rituals, kept
// deliberately small and wired into the story (Guideline 4.3): the Script
// prompt talks about YOUR chapter, 3·6·9 starts from YOUR dream, and Your
// line comes from what you actually did.
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, T, haptics, useToast } from "@/components/ui";
import { PastPages } from "@/components/feature/rituals/PastPages";
import { RitualDoor } from "@/components/feature/rituals/RitualDoor";
import { ScenesStrip } from "@/components/feature/rituals/ScenesStrip";
import { YourLineBlock } from "@/components/feature/rituals/YourLineBlock";
import { gratitudeDeck } from "@/lib/rituals";
import { useRitualToday } from "@/components/feature/rituals/useRitualToday";
import { useArc } from "@/contexts/ArcContext";
import { useJournal } from "@/contexts/JournalContext";
import { useProgress } from "@/contexts/RitualContext";
import { useScenes } from "@/contexts/ScenesContext";
import { useUser } from "@/contexts/UserContext";
import { space } from "@/constants/theme";
import { dailyAffirmation } from "@/lib/affirmations";
import { focusById } from "@/lib/focus";
import { progress369 } from "@/lib/journal";
import { toRoman } from "@/lib/story/text";

export default function RitualsScreen() {
  const router = useRouter();
  const toast = useToast();
  const arc = useArc();
  const { profile } = useUser();
  const journal = useJournal();
  const scenes = useScenes();
  const { summary, recordAct } = useProgress();
  const today = useRitualToday();

  const p369 = journal.sheetToday ? progress369(journal.sheetToday) : null;
  const pagesToday = journal.entries.filter((e) => e.dateKey === today.dateKey);
  const scriptToday = pagesToday.some((e) => e.kind === "script");
  const gratitudeToday = pagesToday.some((e) => e.kind === "gratitude");
  const carried = summary.doneToday.includes("line-carried");
  const prompt = today.prompts[0] ?? null;
  const stem = useMemo(() => gratitudeDeck(today.dateKey)[0], [today.dateKey]);

  const fallback = useMemo(() => {
    if (today.line) return null;
    const a = dailyAffirmation(today.dateKey, today.focus ? [today.focus] : profile?.focusAreas ?? []);
    return { text: a.text, area: focusById(a.focus)?.label ?? "Today" };
  }, [today.line, today.dateKey, today.focus, profile?.focusAreas]);

  const carry = () => {
    if (carried) return;
    haptics.success();
    recordAct("line-carried");
    toast.show({ message: "Carried. It’s yours for today.", tone: "proof" });
  };

  // Name the chapter only while it is the story's current one (a new season's unheard Chapter I says 'your story').
  const latest = today.latestChapter;
  const chapter = latest?.heardAt ? latest : null;

  return (
    <Screen testID="rituals-screen">
      <View style={styles.head}>
        <T variant="display" accessibilityRole="header">
          Rituals
        </T>
        <T variant="body" tone="muted">
          {chapter ? `Three quiet practices around Chapter ${toRoman(chapter.number)}.` : "Three quiet practices around your story."}
        </T>
      </View>

      <View style={styles.doors}>
        <RitualDoor
          glyph="script"
          title="Script"
          eyebrow={prompt?.arc ? "Linked to your story" : "Today’s prompt"}
          line={prompt?.text ?? "Write a scene from inside the life you want."}
          lineVoice="words"
          status={scriptToday ? "Sealed today" : undefined}
          done={scriptToday}
          onPress={() => router.push("/journal/script")}
          testID="door-script"
          accessibilityHint="Opens today’s scripting page"
        />
        <RitualDoor
          glyph="369"
          title="3 · 6 · 9"
          eyebrow="One phrase, 18 times"
          line={journal.phrase369 ? `“${journal.phrase369}”` : "Three times in the morning, six at midday, nine in the evening."}
          lineVoice={journal.phrase369 ? "words" : "ui"}
          status={p369 ? (p369.complete ? "All 18" : `${p369.done} / ${p369.total}`) : undefined}
          done={!!p369?.complete}
          lit={p369?.done ?? 0}
          onPress={() => router.push("/journal/method369")}
          testID="door-369"
          accessibilityHint="Opens the 3·6·9 sheet"
        />
        <RitualDoor
          glyph="gratitude"
          title="Gratitude"
          eyebrow="Three good things"
          line={stem?.text ?? "Three lines, no ceremony."}
          lineVoice="words"
          status={gratitudeToday ? "Kept today" : undefined}
          done={gratitudeToday}
          onPress={() => router.push("/journal/gratitude")}
          testID="door-gratitude"
          accessibilityHint="Opens today’s gratitude page"
        />
      </View>

      <View style={styles.section}>
        <YourLineBlock
          line={today.line}
          fallback={fallback}
          carried={carried}
          onCarry={carry}
          onOpen={() => router.push("/affirmation")}
          onLibrary={() => router.push("/affirmations")}
        />
      </View>

      <View style={styles.section}>
        <ScenesStrip
          cards={scenes.cards}
          proofFor={(id) => (id ? arc.proof(id) ?? null : null)}
          onOpenAll={() => router.push("/scenes")}
          onOpenCard={(id) => router.push({ pathname: "/scenes", params: { open: id } })}
          onAdd={() => router.push({ pathname: "/scenes", params: { add: "1" } })}
        />
      </View>

      <View style={styles.section}>
        <PastPages entries={journal.entries} onOpen={(id) => router.push({ pathname: "/journal/entry/[id]", params: { id } })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.xs, paddingTop: space.lg, marginBottom: space.lg },
  doors: { gap: space.md },
  section: { marginTop: space.xl },
});
