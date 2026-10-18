// The dream's '…' menu in the Memory Book: rename, rest and release (or wake
// a resting dream, or pick the dream that keeps weaving after Plus lapses).
// Every change goes through a sheet that says plainly what will and won't
// happen. Nothing here touches written chapters: they stay readable always.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LIMITS, isArcError, type Dream } from "@/contexts/arc.types";
import { useArc } from "@/contexts/ArcContext";
import { ConfirmSheet, GhostButton, PrimaryButton, Press, Sheet, T, TextField, UserWords, useToast } from "@/components/ui";
import { colors, motion, radius, space } from "@/constants/theme";
import type { DreamStanding } from "./DreamHeader";
import { dreamName, dreamShortName } from "./model";

export type Choice = "rename" | "rest" | "release" | "wake" | "weave";

export interface DreamMenuProps {
  dream: Dream;
  standing: DreamStanding;
  visible: boolean;
  onClose: () => void;
  isPlus: boolean;
  /** Another dream that weaves now (wake/weave would put it to rest), if any. */
  otherWeaving: Dream | null;
  hasOpenBridge: boolean;
  /** Called just before an action runs (the screen keeps this book open when Today's focus moves). */
  onAction?: (choice: Choice) => void;
}

interface Option {
  id: Choice;
  label: string;
  note: string;
  danger?: boolean;
}

function optionsFor(standing: DreamStanding): Option[] {
  const rename: Option = { id: "rename", label: "Rename", note: "A short name for Today and this book. Your words stay as written." };
  const release: Option = { id: "release", label: "Release this dream", note: "Let it go for good. Its book stays here to reread.", danger: true };
  switch (standing) {
    case "weaving":
      return [rename, { id: "rest", label: "Rest this dream", note: "Pause its chapters and reminders. Wake it any time." }, release];
    case "resting":
      return [rename, { id: "wake", label: "Wake this dream", note: "It starts weaving again from where it rested." }, release];
    case "plan-locked":
      return [rename, { id: "weave", label: "Keep this one weaving", note: "Without Plus, one dream weaves at a time." }, release];
    case "released":
      return [];
  }
}

interface Spec {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

function confirmFor(choice: Exclude<Choice, "rename">, p: Pick<DreamMenuProps, "isPlus" | "otherWeaving" | "hasOpenBridge">): Spec {
  const other = p.otherWeaving ? `“${dreamShortName(p.otherWeaving).replace(/…$/, "")}”` : null;
  switch (choice) {
    case "rest":
      return {
        title: "Rest this dream?",
        message: [
          "It stops weaving for now: no new chapters and no reminders for it.",
          p.hasOpenBridge ? "Its open bridge waits quietly." : null,
          "Every chapter and star stays here, and you can wake it any time.",
          p.isPlus ? null : "Resting it frees your one weaving dream, so you can begin another.",
        ]
          .filter(Boolean)
          .join(" "),
        confirmLabel: "Rest this dream",
        cancelLabel: "Keep it weaving",
      };
    case "release":
      return {
        title: "Release this dream?",
        message: [
          p.hasOpenBridge
            ? "This is for good. It stops weaving, its open bridge closes, and it can't be woven again."
            : "This is for good. It stops weaving and can't be woven again.",
          "Every chapter and proof stays in your Memory Book to reread.",
          p.isPlus ? null : "It also frees your one weaving dream.",
        ]
          .filter(Boolean)
          .join(" "),
        confirmLabel: "Release it",
        cancelLabel: "Keep it",
        destructive: true,
      };
    case "wake":
      return {
        title: "Wake this dream?",
        message:
          !p.isPlus && other
            ? `It starts weaving again where it rested. Without Plus one dream weaves at a time, so ${other} will rest. Its book stays open.`
            : "It starts weaving again where it rested, with its own chapters and reminders.",
        confirmLabel: "Wake this dream",
        cancelLabel: "Not now",
      };
    case "weave":
      return {
        title: "Keep this dream weaving?",
        message: `Without Plus, one dream weaves at a time. This one picks up where it left off${
          other ? `, and ${other} waits, still readable, until Plus returns` : ""
        }.`,
        confirmLabel: "Weave this one",
        cancelLabel: "Not now",
      };
  }
}

const DONE: Record<Exclude<Choice, "rename">, string> = {
  rest: "Resting. Wake it any time from its menu.",
  release: "Released. Its book stays here.",
  wake: "Awake. It weaves again.",
  weave: "This dream keeps weaving.",
};

export function DreamMenu({ dream, standing, visible, onClose, isPlus, otherWeaving, hasOpenBridge, onAction }: DreamMenuProps) {
  const arc = useArc();
  const toast = useToast();
  const [sheet, setSheet] = useState<Choice | null>(null);
  // The last confirm stays mounted after it closes, so it can slide away.
  const [lastConfirm, setLastConfirm] = useState<Exclude<Choice, "rename"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(dream.label ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Let the menu sheet leave before the next one rises (two iOS modals can't present at once).
  const open = (choice: Choice) => {
    onClose();
    if (choice === "rename") setName(dream.label ?? "");
    else setLastConfirm(choice);
    timer.current = setTimeout(() => setSheet(choice), motion.state + 40);
  };
  const close = () => setSheet(null);

  const run = async (choice: Choice, task: () => Promise<void>, done: string) => {
    setBusy(true);
    onAction?.(choice);
    try {
      await task();
      close();
      toast.show({ message: done, tone: "info" });
    } catch (e) {
      // Actions reject with a typed ArcError and leave state untouched.
      const code = isArcError(e) ? e.code : null;
      const message =
        code === "plan-limit"
          ? "Without Plus, one dream weaves at a time."
          : choice === "rename" && code === "invalid-input"
            ? "That name didn't take. Try a shorter one."
            : "That didn't work. Nothing changed.";
      toast.show({ message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const confirmChoice = lastConfirm;
  const spec = confirmChoice ? confirmFor(confirmChoice, { isPlus, otherWeaving, hasOpenBridge }) : null;
  const action = (choice: Exclude<Choice, "rename">) => {
    switch (choice) {
      case "rest":
        return () => arc.restDream(dream.id);
      case "release":
        return () => arc.releaseDream(dream.id);
      case "wake":
      case "weave":
        return () => arc.setActiveDream(dream.id);
    }
  };

  const trimmed = name.trim();
  const suggestion = arc.suggestConstellationName(dream.id);

  return (
    <>
      <Sheet visible={visible} onClose={onClose} title={dreamName(dream) ?? "This dream"} testID="arc-menu-sheet">
        <UserWords variant="caption" numberOfLines={2} style={styles.words}>
          {dream.desire}
        </UserWords>
        <View style={styles.options}>
          {optionsFor(standing).map((o, i) => (
            <Press
              key={o.id}
              onPress={() => open(o.id)}
              pressScale={0.98}
              style={[styles.option, i > 0 && styles.optionRule]}
              testID={`arc-menu-${o.id}`}
              accessibilityLabel={`${o.label}. ${o.note}`}
            >
              <T variant="body" strong tone={o.danger ? "danger" : "primary"}>
                {o.label}
              </T>
              <T variant="caption" tone="muted" style={styles.note}>
                {o.note}
              </T>
            </Press>
          ))}
        </View>
        <GhostButton label="Close" tone="muted" onPress={onClose} testID="arc-menu-close" style={styles.closeBtn} />
      </Sheet>

      <Sheet
        visible={sheet === "rename"}
        onClose={close}
        title="Name this dream"
        subtitle="The name shows here and on Today. Your own words and every chapter stay as written."
        scroll
        testID="arc-rename"
        footer={
          <>
            <PrimaryButton
              label="Save name"
              disabled={trimmed.length === 0 || trimmed === (dream.label ?? "")}
              loading={busy}
              onPress={() => void run("rename", () => arc.renameDream(dream.id, trimmed), `Renamed “${trimmed}”.`)}
              testID="arc-rename-save"
            />
            {dream.label ? (
              <GhostButton
                label="Use my own words instead"
                onPress={() => void run("rename", () => arc.renameDream(dream.id, null), "Back to your own words.")}
                testID="arc-rename-clear"
              />
            ) : (
              <GhostButton label="Cancel" tone="muted" onPress={close} testID="arc-rename-cancel" />
            )}
          </>
        }
      >
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder={suggestion || "The Studio"}
          maxLength={LIMITS.dreamLabel}
          showCount
          autoCapitalize="words"
          returnKeyType="done"
          testID="arc-rename-input"
        />
      </Sheet>

      {spec && confirmChoice ? (
        <ConfirmSheet
          visible={sheet === confirmChoice}
          title={spec.title}
          message={spec.message}
          confirmLabel={spec.confirmLabel}
          cancelLabel={spec.cancelLabel}
          destructive={spec.destructive}
          onCancel={close}
          onConfirm={() => void run(confirmChoice, action(confirmChoice), DONE[confirmChoice])}
          testID={`arc-${confirmChoice}`}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  words: { marginBottom: space.base },
  options: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.vellum },
  option: { paddingHorizontal: space.base, paddingVertical: space.md, minHeight: 64, justifyContent: "center" },
  optionRule: { borderTopWidth: 1, borderTopColor: colors.hairline },
  note: { marginTop: space.xxs },
  closeBtn: { marginTop: space.sm },
});
