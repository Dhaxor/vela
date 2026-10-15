// Who the user is and how they like to listen (ProfileV2, contexts/user.types).
// Local-only: Vela has no accounts and no backend by design. Stored under
// 'vela.profile.v2'; on first run of 1.1 the 1.0 profile is migrated from
// 'vela.profile.v1', which is read but never written (rollback safety).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ProfileV2, RitualTime } from "./user.types";
import { createStoreQueue, parseJson, readRaw } from "./persist";
import { STORAGE_KEYS, V1_KEYS } from "@/lib/storageKeys";
import { now } from "@/lib/clock";
import { legacyReminderChoice } from "@/lib/notifications";
import { normalizeProfile, parseProfileV2, patchProfile, profileFromV1 } from "@/lib/store/profile";

export type { RitualTime };
/** 1.0 name for the profile type; every 1.0 field keeps its name and meaning. */
export type Profile = ProfileV2;

/** What onboarding provides. Everything else takes its v2 default. */
export type NewProfile = Pick<ProfileV2, "name" | "focusAreas" | "ritual"> &
  Partial<Omit<ProfileV2, "version" | "createdAt" | "name" | "focusAreas" | "ritual">>;

export type ProfilePatch = Partial<Omit<ProfileV2, "version" | "createdAt">>;

interface UserValue {
  /** false until storage answered — gate navigation on `ready`. */
  ready: boolean;
  profile: ProfileV2 | null;
  saveProfile: (p: NewProfile) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  /** Backup import: replace the whole profile (validated). */
  replaceProfile: (p: ProfileV2 | null) => Promise<void>;
}

const Ctx = createContext<UserValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<ProfileV2 | null>(null);
  const ref = useRef<ProfileV2 | null>(null);
  const queue = useMemo(createStoreQueue, []);

  const commit = useCallback(
    (next: ProfileV2 | null) => {
      ref.current = next;
      setProfile(next);
      if (next) queue.enqueue({ head: [STORAGE_KEYS.profile, next] });
      else queue.enqueue({ remove: [STORAGE_KEYS.profile] });
    },
    [queue]
  );

  useEffect(() => {
    let stale = false;
    void (async () => {
      const t = now();
      let loaded = parseProfileV2(parseJson(await readRaw(STORAGE_KEYS.profile)), t);
      let migrated = loaded ? null : profileFromV1(parseJson(await readRaw(V1_KEYS.profile)), t);
      if (migrated) {
        // Keep a 1.0 'reminders off' choice. Runs before ready, so before the first queue rebuild.
        const choice = await legacyReminderChoice();
        if (choice !== null) migrated = { ...migrated, remindersEnabled: choice };
      }
      if (stale) return;
      if (migrated) {
        loaded = migrated;
        queue.enqueue({ head: [STORAGE_KEYS.profile, migrated] });
      }
      ref.current = loaded;
      setProfile(loaded);
      setReady(true);
    })();
    return () => {
      stale = true;
    };
  }, [queue]);

  const saveProfile = useCallback(
    async (p: NewProfile) => {
      const next = normalizeProfile({ ...p, version: 2 }, now().toISOString());
      if (next) commit({ ...next, createdAt: now().toISOString() });
    },
    [commit]
  );

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (ref.current) commit(patchProfile(ref.current, patch));
    },
    [commit]
  );

  const replaceProfile = useCallback(
    async (p: ProfileV2 | null) => {
      commit(p ? normalizeProfile({ ...p }, p.createdAt) : null);
      await queue.flush();
    },
    [commit, queue]
  );

  const value = useMemo<UserValue>(
    () => ({ ready, profile, saveProfile, updateProfile, replaceProfile }),
    [ready, profile, saveProfile, updateProfile, replaceProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser(): UserValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUser must be used inside UserProvider");
  return v;
}
