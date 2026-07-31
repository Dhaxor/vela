// The daily ritual ledger: which practices were done today, and the streak
// they add up to. A day counts once any single practice is completed — the
// bar for keeping a streak alive is one quiet minute, by design.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { computeStreak, dateKey, pruneDays } from "@/lib/streak";

const STORE_KEY = "vela.ritual.v1";

export type Practice = "story" | "affirmation" | "script";

interface Persisted {
  /** Distinct local-date keys on which at least one practice happened. */
  days: string[];
  /** Practices completed on `todayKey` (resets implicitly at midnight). */
  todayKey: string;
  todayDone: Practice[];
}

interface RitualValue {
  ready: boolean;
  streak: number;
  doneToday: readonly Practice[];
  markDone: (p: Practice) => Promise<void>;
}

const Ctx = createContext<RitualValue | null>(null);

function parse(raw: string | null): Persisted {
  const empty: Persisted = { days: [], todayKey: "", todayDone: [] };
  if (!raw) return empty;
  try {
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      days: Array.isArray(p.days) ? p.days.filter((x) => typeof x === "string") : [],
      todayKey: typeof p.todayKey === "string" ? p.todayKey : "",
      todayDone: Array.isArray(p.todayDone)
        ? (p.todayDone.filter((x) =>
            ["story", "affirmation", "script"].includes(x as string)
          ) as Practice[])
        : [],
    };
  } catch {
    return empty;
  }
}

export function RitualProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Persisted>({ days: [], todayKey: "", todayDone: [] });

  useEffect(() => {
    let stale = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (!stale) setData(parse(raw));
      } catch {
        // first run
      } finally {
        if (!stale) setReady(true);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const persist = useCallback(async (next: Persisted) => {
    setData(next);
    try {
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // session state still stands
    }
  }, []);

  const markDone = useCallback(
    async (p: Practice) => {
      const today = dateKey(new Date());
      const sameDay = data.todayKey === today;
      const todayDone = sameDay ? data.todayDone : [];
      if (todayDone.includes(p) && sameDay) return;
      await persist({
        days: pruneDays([...data.days, today]),
        todayKey: today,
        todayDone: [...todayDone, p],
      });
    },
    [data, persist]
  );

  const value = useMemo<RitualValue>(() => {
    const today = dateKey(new Date());
    return {
      ready,
      streak: computeStreak(new Set(data.days), new Date()),
      doneToday: data.todayKey === today ? data.todayDone : [],
      markDone,
    };
  }, [ready, data, markDone]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRitual(): RitualValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRitual must be used inside RitualProvider");
  return v;
}
