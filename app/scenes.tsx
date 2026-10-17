// SCENES (the former vision board): pictures and written scenes of the life
// ahead, captioned, each optionally attached to a dream. Photos from proofs
// join on their own and never count toward the free limit; hand-added scenes
// past the free three open the paywall. The 1.0 board testIDs live here now.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ImagePlus, PenLine } from "@/components/glyphs/icons";
import { Chip, Dock, GhostButton, Header, IconButton, PrimaryButton, Screen, T, haptics, holdForSystemSheet, useGutter, useToast } from "@/components/ui";
import { Vignette } from "@/components/glyphs";
import { NewSceneSheet, SceneSheet, type Composer } from "@/components/feature/rituals/SceneSheets";
import { SceneTile } from "@/components/feature/rituals/SceneTile";
import { dreamName } from "@/lib/rituals";
import { useArc } from "@/contexts/ArcContext";
import { usePlus } from "@/contexts/PlusContext";
import { useScenes } from "@/contexts/ScenesContext";
import { colors, motion, space } from "@/constants/theme";
import { userSceneCount, type SceneCard } from "@/lib/store/scenes";

type Filter = "all" | string;

export default function ScenesScreen() {
  const router = useRouter();
  const toast = useToast();
  const gutter = useGutter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ open?: string; add?: string }>();
  const arc = useArc();
  const plus = usePlus();
  const scenes = useScenes();

  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const handledParams = useRef(false);

  const dreams = useMemo(() => arc.dreams.filter((d) => d.status !== "released"), [arc.dreams]);
  const defaultDreamId = arc.activeDream && arc.activeDream.status !== "released" ? arc.activeDream.id : dreams[0]?.id ?? null;
  const cards = useMemo(() => (filter === "all" ? scenes.cards : scenes.cards.filter((c) => c.dreamId === filter)), [filter, scenes.cards]);
  const handAdded = userSceneCount({ version: 2, cards: scenes.cards, importedProofIds: [] });
  const open = openId ? scenes.cards.find((c) => c.id === openId) ?? null : null;
  const proofFor = (c: SceneCard | null) => (c && c.kind === "photo" && c.proofId ? arc.proof(c.proofId) ?? null : null);

  // Arriving from the Rituals strip: open a card, or start a new scene.
  useEffect(() => {
    if (handledParams.current || !scenes.ready) return;
    handledParams.current = true;
    if (params.open && scenes.cards.some((c) => c.id === params.open)) setOpenId(String(params.open));
    else if (params.add) {
      if (scenes.canAddScene) setComposer({ kind: "choose" });
      else router.push({ pathname: "/paywall", params: { from: "scenes" } });
    }
  }, [params.open, params.add, scenes.ready, scenes.cards, scenes.canAddScene, router]);

  const gate = (): boolean => {
    if (scenes.canAddScene) return true;
    router.push({ pathname: "/paywall", params: { from: "scenes" } });
    return false;
  };

  const pickPhoto = async () => {
    if (!gate()) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Picker = require("expo-image-picker") as typeof import("expo-image-picker");
      const res = await Picker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      // The library is still sliding away: the caption sheet waits its turn (one presented sheet at a time on iOS).
      holdForSystemSheet();
      const uri = res.canceled ? null : res.assets?.[0]?.uri ?? null;
      if (uri) setComposer({ kind: "photo", uri });
    } catch {
      toast.show({ message: "Vela couldn’t open your photos on this device.", tone: "error" });
    }
  };

  const writeScene = () => {
    if (gate()) setComposer({ kind: "goal" });
  };

  // From the chooser sheet: let it leave before the picker (or the next sheet) arrives.
  const afterChooser = (fn: () => void) => {
    setComposer(null);
    setTimeout(fn, motion.state + 60);
  };

  const pinned = (card: SceneCard | null) => {
    if (!card) {
      setComposer(null);
      router.push({ pathname: "/paywall", params: { from: "scenes" } });
      return;
    }
    haptics.success();
    setComposer(null);
    toast.show({ message: "Pinned to Scenes.", tone: "proof" });
  };

  const tileW = Math.floor((Math.min(width, 640) - gutter * 2 - space.md) / 2);
  const columns: [SceneCard[], SceneCard[]] = [[], []];
  cards.forEach((c, i) => columns[i % 2].push(c));
  const empty = scenes.cards.length === 0;

  return (
    <Screen
      testID="scenes-screen"
      header={
        <Header
          title="Scenes"
          testID="scenes"
          right={
            <IconButton accessibilityLabel="Write a scene" onPress={writeScene} testID="board-add-goal" variant="vellum">
              <PenLine color={colors.gold300} size={18} strokeWidth={1.75} />
            </IconButton>
          }
        />
      }
      dock={
        empty ? undefined : (
          <Dock>
            <PrimaryButton
              label={scenes.canAddScene ? "Add a photo" : "Room for more with Plus"}
              icon={scenes.canAddScene ? <ImagePlus color={colors.onGold} size={20} strokeWidth={1.75} /> : undefined}
              onPress={() => void pickPhoto()}
              testID="board-add-photo"
            />
          </Dock>
        )
      }
    >
      {empty ? (
        <View style={styles.empty} testID="scenes-empty">
          <Vignette name="window" width={176} />
          <T variant="title" center>
            Pin the first scene
          </T>
          <T variant="body" tone="muted" center>
            A picture of the life you are walking toward, or a few words of it. Photos from your proofs join here on their own.
          </T>
          <View style={styles.emptyActions}>
            <PrimaryButton
              label="Pin your first photo"
              icon={<ImagePlus color={colors.onGold} size={20} strokeWidth={1.75} />}
              onPress={() => void pickPhoto()}
              testID="board-first-photo"
            />
            <GhostButton label="Write a scene instead" onPress={writeScene} testID="scenes-first-goal" />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.intro}>
            <T variant="body" tone="muted">
              Pictures of the life you’re walking toward. Photos from your proofs join on their own.
            </T>
            {!plus.isPlus ? (
              <T variant="caption" tone={scenes.canAddScene ? "faint" : "gold"} numeric testID="scenes-limit">
                {scenes.canAddScene
                  ? `${handAdded} of ${plus.sceneLimit} free scenes pinned · proof photos are always free`
                  : `All ${plus.sceneLimit} free scenes pinned · Plus makes room for more`}
              </T>
            ) : null}
          </View>

          {dreams.length > 1 ? (
            <View style={styles.filters} accessibilityRole="radiogroup" accessibilityLabel="Show scenes for">
              <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} role="radio" testID="scenes-filter-all" />
              {dreams.map((d) => (
                <Chip key={d.id} label={dreamName(d)} selected={filter === d.id} onPress={() => setFilter(d.id)} role="radio" testID={`scenes-filter-${d.id}`} />
              ))}
            </View>
          ) : null}

          {cards.length === 0 ? (
            <T variant="body" tone="muted" style={styles.none} testID="scenes-filter-empty">
              Nothing attached to this dream yet. Open a scene to attach it.
            </T>
          ) : (
            <View style={styles.grid}>
              {columns.map((col, ci) => (
                <View key={ci} style={[styles.col, { width: tileW }]}>
                  {col.map((card) => {
                    // The dream line only says something when there is more than one dream.
                    const dream = card.dreamId && dreams.length > 1 ? arc.dream(card.dreamId) : undefined;
                    return (
                      <SceneTile
                        key={card.id}
                        card={card}
                        width={tileW}
                        proof={proofFor(card)}
                        dream={dream ? { name: dreamName(dream), focus: dream.focus } : null}
                        detail
                        onPress={() => setOpenId(card.id)}
                        testID={`board-card-${card.id}`}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <SceneSheet
        card={open}
        proof={proofFor(open)}
        dreams={dreams}
        onClose={() => setOpenId(null)}
        onSave={async (id, caption, dreamId) => {
          const card = scenes.cards.find((c) => c.id === id);
          if (card && caption.trim() !== (card.kind === "photo" ? card.caption : card.text)) await scenes.setCaption(id, caption);
          if (card && dreamId !== card.dreamId) await scenes.attach(id, dreamId);
          setOpenId(null);
        }}
        onRemove={(id) => {
          setOpenId(null);
          void scenes.removeCard(id);
          toast.show({ message: "Removed from Scenes." });
        }}
      />

      <NewSceneSheet
        composer={composer}
        dreams={dreams}
        defaultDreamId={defaultDreamId}
        onClose={() => setComposer(null)}
        onPickPhoto={() => afterChooser(() => void pickPhoto())}
        onWrite={() => afterChooser(writeScene)}
        onSavePhoto={async (uri, caption, dreamId) => pinned(await scenes.addPhoto(uri, caption, { dreamId }))}
        onSaveGoal={async (text, dreamId) => pinned(await scenes.addGoal(text, { dreamId }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.sm, paddingTop: space.sm, marginBottom: space.lg },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg },
  grid: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  col: { gap: space.lg },
  none: { marginTop: space.lg },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingBottom: space.xxl },
  emptyActions: { alignSelf: "stretch", gap: space.sm, marginTop: space.base },
});
