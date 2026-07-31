// Who the user is and what they're calling in. Local-only — Vela has no
// accounts and no backend by design. Losing this on reinstall is acceptable;
// syncing it to a server is not.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FocusId, sanitizeFocusIds } from "@/lib/focus";

const PROFILE_KEY = "vela.profile.v1";

export type RitualTime = "morning" | "evening" | "both";

export interface Profile {
  name: string;
  focusAreas: FocusId[];
  ritual: RitualTime;
  /** How the wanting feels right now — captured at onboarding, optional. */
  mood?: string;
  createdAt: string; // ISO
}

interface UserValue {
  /** null until AsyncStorage answered — gate navigation on `ready`. */
  ready: boolean;
  profile: Profile | null;
  saveProfile: (p: Omit<Profile, "createdAt">) => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, "createdAt">>) => Promise<void>;
}

const Ctx = createContext<UserValue | null>(null);

function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    if (typeof p.name !== "string" || !p.name.trim()) return null;
    const focusAreas = sanitizeFocusIds(p.focusAreas);
    const ritual: RitualTime =
      p.ritual === "morning" || p.ritual === "evening" || p.ritual === "both"
        ? p.ritual
        : "both";
    return {
      name: p.name.trim().slice(0, 40),
      focusAreas,
      ritual,
      ...(typeof p.mood === "string" && p.mood ? { mood: p.mood.slice(0, 40) } : {}),
      createdAt:
        typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let stale = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (!stale) setProfile(parseProfile(raw));
      } catch {
        // unreadable storage = first run
      } finally {
        if (!stale) setReady(true);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const persist = useCallback(async (p: Profile) => {
    setProfile(p);
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      // in-memory state still stands for this session
    }
  }, []);

  const saveProfile = useCallback(
    async (p: Omit<Profile, "createdAt">) =>
      persist({ ...p, createdAt: new Date().toISOString() }),
    [persist]
  );

  const updateProfile = useCallback(
    async (patch: Partial<Omit<Profile, "createdAt">>) => {
      if (!profile) return;
      await persist({ ...profile, ...patch });
    },
    [profile, persist]
  );

  const value = useMemo<UserValue>(
    () => ({ ready, profile, saveProfile, updateProfile }),
    [ready, profile, saveProfile, updateProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser(): UserValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUser must be used inside UserProvider");
  return v;
}
