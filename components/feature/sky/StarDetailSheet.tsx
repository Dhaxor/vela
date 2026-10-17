// Tap a star, reread that day: its date, its kind (glyph and tint, never
// gold), the sentence in the user's own words, the photo if there is one,
// and the chapter it changed ('Changed Chapter IV'), which opens the reader
// where the proof is woven in gold. The anchor star opens the dream itself.
import React from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Share2 } from "@/components/glyphs/icons";
import { useArc } from "@/contexts/ArcContext";
import type { Dream, Proof } from "@/contexts/arc.types";
import { toRoman } from "@/lib/sky/numerals";
import { STAGES } from "@/lib/story/content";
import { PROOF_LABEL, StarProof } from "@/components/glyphs";
import { Press, SecondaryButton, Sheet, T, UserWords } from "@/components/ui";
import { colors, radius, space } from "@/constants/theme";
import { dayMonth, dreamDay } from "@/components/feature/today/time";
import { localDateKey } from "@/lib/progress";

export type StarSelection = { readonly kind: "anchor"; readonly season: number } | { readonly kind: "proof"; readonly proofId: string };

export interface StarDetailSheetProps {
  dream: Dream | null;
  selection: StarSelection | null;
  onClose: () => void;
  /** 'Share this star' (S4's share card). Omit to hide the button. */
  onShare?: (proofId: string) => void;
}

const ORIGIN_NOTE: Record<Proof["origin"], string | null> = {
  onboarding: "The first thing you’d already done toward this.",
  bridge: null,
  "not-today": "A ‘Not today’, kept as a lesson.",
};

function ChapterLink({ chapterId, onOpen }: { chapterId: string; onOpen: (id: string) => void }) {
  const arc = useArc();
  const meta = arc.chapterMeta(chapterId);
  if (!meta) return null;
  return (
    <Press
      onPress={() => onOpen(meta.id)}
      accessibilityRole="link"
      accessibilityLabel={`Changed Chapter ${toRoman(meta.number)}, ${STAGES[meta.stage].name}. Opens the chapter.`}
      testID="star-detail-chapter"
      pressScale={0.98}
      style={styles.link}
    >
      <View style={styles.linkText}>
        <T variant="body" tone="primary" strong>
          Changed Chapter {toRoman(meta.number)}
        </T>
        <T variant="caption" tone="muted" numberOfLines={1}>
          {meta.season > 1 ? `Season ${meta.season} · ` : ""}
          {STAGES[meta.stage].name} · woven in gold
        </T>
      </View>
      <ChevronRight color={colors.gold300} size={20} strokeWidth={1.75} />
    </Press>
  );
}

export function StarDetailSheet({ dream, selection, onClose, onShare }: StarDetailSheetProps) {
  const arc = useArc();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const proof = selection?.kind === "proof" ? arc.proof(selection.proofId) : undefined;
  const open = (chapterId: string) => {
    onClose();
    router.push({ pathname: "/story/[id]", params: { id: chapterId } });
  };

  let body: React.ReactNode = null;
  if (dream && selection?.kind === "anchor") {
    const first = arc.chapters(dream.id).find((c) => c.season === selection.season);
    const named = dream.constellations.find((c) => c.season === selection.season);
    body = (
      <>
        <View style={styles.head}>
          <StarAnchor />
          <View style={styles.headText}>
            <T variant="eyebrow" tone="gold">
              The anchor · your dream
            </T>
            <T variant="caption" tone="muted" numeric>
              Season {selection.season} · charted {dayMonth(localDateKey(new Date(dream.createdAt)))}
            </T>
          </View>
        </View>
        <UserWords variant="title" style={styles.words}>
          {dream.desire}
        </UserWords>
        {named ? (
          <T variant="body" style={styles.note}>
            Named “{named.name}” on {dayMonth(localDateKey(new Date(named.namedAt)))}.
          </T>
        ) : (
          <T variant="body" style={styles.note}>
            Every star in this figure is a step toward it.
          </T>
        )}
        {first ? <ChapterLink chapterId={first.id} onOpen={open} /> : null}
      </>
    );
  } else if (dream && proof) {
    const woven = proof.wovenInChapterId;
    const photoW = width - space.xl * 2;
    body = (
      <>
        <View style={styles.head}>
          <StarProof kind={proof.kind} size={32} />
          <View style={styles.headText}>
            <T variant="eyebrow" tone={proof.kind} testID="star-detail-kind">
              Star {proof.starIndex} · {PROOF_LABEL[proof.kind]}
            </T>
            <T variant="caption" tone="muted" numeric>
              Day {dreamDay(dream.createdAt, proof.dateKey)} · {dayMonth(proof.dateKey)}
            </T>
          </View>
        </View>
        <UserWords variant="title" style={styles.words} testID="star-detail-text">
          {proof.text}
        </UserWords>
        {proof.photoUri ? (
          <Image
            source={{ uri: proof.photoUri }}
            style={[styles.photo, { height: Math.round(Math.min(photoW, 520) * 0.62) }]}
            resizeMode="cover"
            accessibilityLabel="Your photo from that day"
            testID="star-detail-photo"
          />
        ) : null}
        {ORIGIN_NOTE[proof.origin] ? (
          <T variant="caption" tone="muted" style={styles.note}>
            {ORIGIN_NOTE[proof.origin]}
          </T>
        ) : null}
        {woven ? (
          <ChapterLink chapterId={woven} onOpen={open} />
        ) : (
          <T variant="caption" tone="muted" style={styles.note}>
            {proof.starIndex === 7 ? "The seventh star opens the next season’s first chapter." : "Kept in your sky."}
          </T>
        )}
      </>
    );
  }

  const footer =
    proof && onShare ? (
      <SecondaryButton
        label="Share this star"
        icon={<Share2 color={colors.gold300} size={18} strokeWidth={1.75} />}
        onPress={() => onShare(proof.id)}
        accessibilityHint="Makes an image of this star; your words stay off it unless you add them"
        testID="star-detail-share"
      />
    ) : undefined;

  return (
    <Sheet visible={!!selection && !!body} onClose={onClose} testID="star-detail" scroll footer={footer}>
      {body}
    </Sheet>
  );
}

/** The gold four-point anchor, matching the figure's anchor star. */
function StarAnchor() {
  return <StarProof kind="did" size={32} color={colors.gold300} />;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  headText: { flex: 1, gap: space.xxs },
  words: { marginTop: space.base },
  note: { marginTop: space.md },
  photo: { width: "100%", borderRadius: radius.md, marginTop: space.base, backgroundColor: colors.sky900 },
  link: {
    marginTop: space.lg,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldEngrave,
    backgroundColor: colors.vellum,
  },
  linkText: { flex: 1, gap: space.xxs },
});
