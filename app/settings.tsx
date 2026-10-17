// Settings v2 (ELEVATE §0.12). Opens from the gear on Today. Seven groups, in
// the order people reach for them:
//   You · Ritual · Listening · Lock Screen privacy · Your data · Vela Plus · About
// Everything saves as it changes (no Save button on the page); edits that need
// typing or precision open a sheet with its own single action. Notifications
// are never scheduled here: the root loop effects rebuild the queue from the
// profile and progress this screen updates (CONTRACTS §11).
//
// testIDs kept from 1.0: settings-back, settings-focus-*, settings-reminders-on
// / -off (now on the reminders Switch: '-on' while off, '-off' while on, so a
// tap does what the id says), settings-upgrade, settings-restore.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { daypartAt } from "@/contexts/arc.types";
import { useProgress } from "@/contexts/RitualContext";
import { useUser } from "@/contexts/UserContext";
import type { HHmm, RitualTime, TextSize } from "@/contexts/user.types";
import { NARRATION_RATES, pickVoice, resolveBed, useNarration, voiceDisplayName, type BedId, type NarrationRate } from "@/lib/audio";
import { now } from "@/lib/clock";
import { FOCUS_AREAS, type FocusId } from "@/lib/focus";
import { getPermission, requestPermissionAtCommitment, type PermissionState } from "@/lib/notifications";
import { RHYTHM_TARGET } from "@/lib/progress";
import { ChipGroup, Header, ProgressStars, Screen, Segmented, T, useToast, type StarState } from "@/components/ui";
import { VelaMark } from "@/components/glyphs";
import { FREE_AREA_LIMIT, LEGAL_URLS, areaAllowance, areaLimitCopy, tapArea, usePlusActions } from "@/components/feature/plus";
import {
  AboutPanel,
  BACKUP_KEEPS_COPY,
  BedPicker,
  ControlRow,
  ImportSheet,
  PauseSheet,
  ProfileSheet,
  SettingsGroup,
  SettingsRow,
  SwitchRow,
  TimeSheet,
  VoiceSheet,
  formatClock,
  pauseOptions,
  resumesLabel,
  ritualTimesLabel,
  slotsFor,
  useDataActions,
  SLOT_LABEL,
  type RitualSlot,
} from "@/components/feature/settings";
import { colors, space } from "@/constants/theme";

const RITUALS: { value: RitualTime; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "both", label: "Both" },
];

const TEXT_SIZES: { value: TextSize; label: string; accessibilityLabel: string }[] = [
  { value: "S", label: "Small", accessibilityLabel: "Small text" },
  { value: "M", label: "Medium", accessibilityLabel: "Medium text" },
  { value: "L", label: "Large", accessibilityLabel: "Large text" },
];

const RHYTHM_OPTIONS = Array.from({ length: RHYTHM_TARGET.max - RHYTHM_TARGET.min + 1 }, (_, i) => {
  const n = RHYTHM_TARGET.min + i;
  return { value: String(n), label: String(n), accessibilityLabel: `${n} nights a week` };
});

const RATE_OPTIONS = NARRATION_RATES.map((r) => ({ value: r.toFixed(1), label: `${r.toFixed(1)}×`, accessibilityLabel: `Speed ${r.toFixed(1)}` }));

const DAY_STAR: Record<string, StarState> = { "shown-up": "lit", "today-open": "current", rest: "rest", future: "upcoming", paused: "rest" };

type SheetName = null | "name" | "pronunciation" | "voice" | "pause" | RitualSlot;

export default function SettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { profile, updateProfile } = useUser();
  const progress = useProgress();
  const plusActions = usePlusActions();
  const data = useDataActions();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  // Below ~400pt the week's stars move under the caption so the label never wraps.
  const wide = useWindowDimensions().width >= 400;
  // Free areas are capped (Plus opens all six). Taken once per visit, so an accidental untick can be undone.
  const areaRoom = useRef<{ plus: boolean; allowance: number } | null>(null);
  if (profile && areaRoom.current?.plus !== plusActions.isPlus) {
    areaRoom.current = { plus: plusActions.isPlus, allowance: areaAllowance(profile.focusAreas, plusActions.isPlus) };
  }

  // Voices for the Listening group (an idle narration controller: it never speaks here).
  const narration = useNarration(null, { daypart: daypartAt(now()), rate: profile?.rate ?? 0.9, voiceId: profile?.voiceId ?? null });
  const voice = pickVoice(narration.voices, profile?.voiceId ?? null);

  useEffect(() => {
    let live = true;
    void getPermission().then((p) => {
      if (live) setPermission(p);
    });
    return () => {
      live = false;
    };
  }, []);

  const version = useMemo(() => Constants.expoConfig?.version ?? null, []);

  if (!profile) {
    return <Screen header={<Header title="Settings" testID="settings" />} testID="settings-screen" />;
  }

  const save = (patch: Parameters<typeof updateProfile>[0]) => void updateProfile(patch);
  const times = ritualTimesLabel(profile.ritual, profile.ritualTimes);
  const summary = progress.summary;
  const bed = resolveBed(profile.bed, plusActions.isPlus);
  const close = () => setSheet(null);

  /* ---------------------------------------------------------- reminders */
  const setReminders = async (on: boolean) => {
    await updateProfile({ remindersEnabled: on });
    if (!on) {
      toast.show("Reminders off. Your sky waits quietly.");
      return;
    }
    // Turning reminders on is a commitment moment: ask the OS once (N6).
    const result = await requestPermissionAtCommitment();
    setPermission(result);
    if (result === "granted") toast.show({ message: `Reminders at ${times}.`, tone: "proof" });
    else if (result === "denied") toast.show({ message: "Notifications are off for Vela in iOS Settings, so reminders can't arrive yet.", tone: "error", duration: 5000 });
    else if (result === "unavailable") toast.show("Reminders arrive on iPhone. This preview can't send them.");
  };

  const allowNow = async () => {
    const result = await requestPermissionAtCommitment();
    setPermission(result);
    if (result === "granted") toast.show({ message: `Reminders at ${times}.`, tone: "proof" });
    else if (result === "denied") toast.show({ message: "Notifications stay off. You can allow them any time in iOS Settings.", duration: 4500 });
  };

  const reminderDetail = !profile.remindersEnabled
    ? "Off. Your sky waits quietly."
    : summary.paused
      ? `At ${times}, after the pause.`
      : permission === "denied"
        ? `At ${times}. Allow notifications for Vela in iOS Settings.`
        : `At ${times}.`;

  /* -------------------------------------------------------------- pause */
  const options = pauseOptions(now());
  const onPauseSwitch = (on: boolean) => {
    if (on) {
      setSheet("pause");
      return;
    }
    progress.resume();
    toast.show({ message: "Your sky is back. Welcome home.", tone: "proof" });
  };

  /* -------------------------------------------------------------- areas */
  const allowance = areaRoom.current?.allowance ?? areaAllowance(profile.focusAreas, plusActions.isPlus);
  const pickArea = (area: FocusId) => {
    const tap = tapArea(profile.focusAreas, area, allowance);
    if (tap.kind === "keep-one") toast.show("Keep at least one area.");
    else if (tap.kind === "plus")
      toast.show({
        message: areaLimitCopy(allowance),
        action: { label: "Vela Plus", onPress: () => router.push({ pathname: "/paywall", params: { from: "area" } }) },
      });
    else save({ focusAreas: tap.areas });
  };
  // The chip that was tapped: the one added or the one removed.
  const setAreas = (next: FocusId[]) => {
    const tapped = next.find((a) => !profile.focusAreas.includes(a)) ?? profile.focusAreas.find((a) => !next.includes(a));
    if (tapped) pickArea(tapped);
  };

  const weekStates = summary.week.days.map((d) => DAY_STAR[d.state] ?? "upcoming");
  const weekStars = (
    <ProgressStars states={weekStates} accessibilityLabel={`This week: ${summary.week.shownUp} of ${summary.week.target} nights`} testID="settings-week" />
  );

  return (
    <Screen header={<Header title="Settings" testID="settings" />} testID="settings-screen">
      {/* ------------------------------------------------------------ You */}
      <SettingsGroup title="You" first testID="settings-you">
        <SettingsRow label="Name" value={profile.name} onPress={() => setSheet("name")} testID="settings-name-row" accessibilityHint="Edit your name" />
        <SettingsRow
          label="Say my name as"
          value={profile.pronunciation ?? "As written"}
          detail="For the narrator only."
          onPress={() => setSheet("pronunciation")}
          testID="settings-pronunciation-row"
        />
        <ControlRow
          label="Your areas"
          detail={
            plusActions.isPlus
              ? "Every area is open with Plus. These shape your lines and prompts."
              : allowance > FREE_AREA_LIMIT
                ? "Lines and prompts for these areas stay free. Plus opens all six."
                : "Lines and prompts for up to three areas are free. Plus opens all six."
          }
        >
          <ChipGroup
            multiple
            options={FOCUS_AREAS.map((f) => ({ value: f.id, label: f.label }))}
            value={profile.focusAreas}
            onChange={setAreas}
            testIDPrefix="settings-focus-"
            accessibilityLabel="Your areas"
          />
        </ControlRow>
      </SettingsGroup>

      {/* --------------------------------------------------------- Ritual */}
      <SettingsGroup title="Ritual" testID="settings-ritual">
        <ControlRow label="When you read">
          <Segmented options={RITUALS} value={profile.ritual} onChange={(ritual) => save({ ritual })} testID="settings-ritual-time" accessibilityLabel="Ritual" />
        </ControlRow>
        {slotsFor(profile.ritual).map((slot) => (
          <SettingsRow
            key={slot}
            label={`${SLOT_LABEL[slot]} chapter`}
            value={formatClock(profile.ritualTimes[slot])}
            onPress={() => setSheet(slot)}
            testID={`settings-time-${slot}`}
          />
        ))}
        <SwitchRow
          label="Reminders"
          detail={reminderDetail}
          value={profile.remindersEnabled}
          onValueChange={(on) => void setReminders(on)}
          switchTestID={profile.remindersEnabled ? "settings-reminders-off" : "settings-reminders-on"}
          testID="settings-reminders"
        />
        {profile.remindersEnabled && permission === "undetermined" ? (
          <SettingsRow
            label="Allow notifications"
            detail="So reminders can reach you. iOS asks once."
            onPress={() => void allowNow()}
            testID="settings-reminders-allow"
          />
        ) : null}
        <ControlRow
          label="Weekly rhythm"
          detail={`${summary.week.target} nights a week. Rest nights never count against you.`}
          aside={wide ? weekStars : undefined}
        >
          {wide ? null : weekStars}
          <Segmented
            options={RHYTHM_OPTIONS}
            value={String(summary.week.target)}
            onChange={(v) => progress.setRhythmTarget(Number(v))}
            testID="settings-rhythm"
            accessibilityLabel="Nights a week"
          />
        </ControlRow>
        <SwitchRow
          label="Pause my sky"
          detail={summary.paused && summary.pausedUntil ? `Paused. ${resumesLabel(summary.pausedUntil)}.` : "Rest up to 30 nights. Every star stays."}
          value={summary.paused}
          onValueChange={onPauseSwitch}
          switchTestID="settings-pause"
          testID="settings-pause-row"
        />
      </SettingsGroup>

      {/* ------------------------------------------------------ Listening */}
      <SettingsGroup title="Listening" testID="settings-listening">
        <SettingsRow
          label="Voice"
          value={voice ? voiceDisplayName(voice) : "This device's voice"}
          onPress={() => setSheet("voice")}
          testID="settings-voice"
        />
        <ControlRow label="Speed">
          <Segmented
            options={RATE_OPTIONS}
            value={profile.rate.toFixed(1)}
            onChange={(v) => save({ rate: Number(v) as NarrationRate })}
            testID="settings-rate"
            accessibilityLabel="Narration speed"
          />
        </ControlRow>
        <ControlRow label="Text size">
          <Segmented options={TEXT_SIZES} value={profile.textSize} onChange={(textSize) => save({ textSize })} testID="settings-textsize" accessibilityLabel="Chapter text size" />
          <T variant="reading" size={profile.textSize} tone="secondary" testID="settings-textsize-preview">
            The studio lights are still on when you lock the door.
          </T>
        </ControlRow>
        <ControlRow label="Soundscape" detail={plusActions.isPlus ? "Plays softly under every chapter." : "Night plays under every chapter, free. Plus adds three more."}>
          <BedPicker
            value={bed}
            isPlus={plusActions.isPlus}
            onChange={(next: BedId) => save({ bed: next, bedOn: true })}
            onLocked={() => router.push({ pathname: "/paywall", params: { from: "bed" } })}
          />
        </ControlRow>
      </SettingsGroup>

      {/* ---------------------------------------------- Lock Screen privacy */}
      <SettingsGroup title="Lock Screen privacy" testID="settings-privacy-group">
        <SwitchRow
          label="Keep my words off the Lock Screen"
          detail={
            profile.lockScreenPrivate
              ? "Reminders use calm, neutral words. Your dream and proofs stay inside the app."
              : "Reminders may quote your dream and your proofs."
          }
          value={profile.lockScreenPrivate}
          onValueChange={(on) => save({ lockScreenPrivate: on })}
          switchTestID="settings-lockscreen-private"
        />
      </SettingsGroup>

      {/* ------------------------------------------------------ Your data */}
      <SettingsGroup
        title="Your data"
        caption="A backup is a file you keep. Vela has no servers, so this is how your sky moves to a new phone."
        testID="settings-data"
      >
        <SettingsRow
          label="Export a backup"
          detail={BACKUP_KEEPS_COPY}
          onPress={() => void data.exportBackup()}
          loading={data.busy === "export"}
          testID="settings-export"
        />
        <SettingsRow
          label="Import a backup"
          detail="Merge it with this device, or replace what's here."
          onPress={() => void data.importBackup()}
          loading={data.busy === "import" || data.busy === "apply"}
          testID="settings-import"
        />
      </SettingsGroup>

      {/* ------------------------------------------------------ Vela Plus */}
      <SettingsGroup title="Vela Plus" testID="settings-plus">
        {plusActions.isPlus ? (
          <SettingsRow
            icon={<VelaMark size={28} color={colors.ink80} />}
            label="Plus is on"
            detail="Thank you. Every dream can weave at once."
            onPress={() => router.push("/paywall")}
            testID="settings-plus-status"
          />
        ) : (
          <SettingsRow
            icon={<VelaMark size={28} color={colors.ink80} />}
            label="Vela Plus"
            detail="Room for more than one dream, every soundscape and area, unlimited Scenes."
            onPress={() => router.push("/paywall")}
            testID="settings-upgrade"
          />
        )}
        {plusActions.isPlus && Platform.OS === "ios" ? (
          <SettingsRow label="Manage subscription" onPress={() => void Linking.openURL(LEGAL_URLS.manageSubscriptions)} testID="settings-manage" />
        ) : null}
        <SettingsRow
          label="Restore purchases"
          onPress={() => void plusActions.restore()}
          loading={plusActions.busy === "restore"}
          testID="settings-restore"
        />
      </SettingsGroup>

      {/* ---------------------------------------------------------- About */}
      <AboutPanel version={version} />
      <View style={styles.end} />

      {/* --------------------------------------------------------- sheets */}
      <ProfileSheet
        visible={sheet === "name" || sheet === "pronunciation"}
        focus={sheet === "pronunciation" ? "pronunciation" : "name"}
        name={profile.name}
        pronunciation={profile.pronunciation}
        onClose={close}
        onSave={(next) => {
          save(next);
          close();
          toast.show({ message: "Saved. The next chapter will use it.", tone: "proof" });
        }}
      />
      {(["morning", "evening"] as const).map((slot) => (
        <TimeSheet
          key={slot}
          visible={sheet === slot}
          slot={slot}
          value={profile.ritualTimes[slot]}
          onClose={close}
          onSave={(value: HHmm) => {
            save({ ritualTimes: { ...profile.ritualTimes, [slot]: value } });
            close();
            toast.show({ message: `${SLOT_LABEL[slot]} chapter at ${formatClock(value)}.`, tone: "proof" });
          }}
        />
      ))}
      <VoiceSheet
        visible={sheet === "voice"}
        voices={narration.voices}
        selectedId={voice?.identifier ?? null}
        onClose={close}
        onPick={(voiceId) => save({ voiceId })}
      />
      <PauseSheet
        visible={sheet === "pause"}
        options={options}
        onClose={close}
        onPick={(o) => {
          progress.pauseUntil(o.until);
          close();
          toast.show({ message: `Paused. ${resumesLabel(o.until)}.`, tone: "proof" });
        }}
      />
      <ImportSheet
        visible={data.pending !== null}
        plan={data.pending?.plan ?? null}
        exportedOn={data.pending?.exportedOn ?? null}
        busy={data.busy === "apply"}
        onClose={data.dismiss}
        onChoose={(mode) => void data.choose(mode)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  end: { height: space.xl },
});
