// Journal persistence: script & gratitude entries as an append-only list,
// plus one 369 sheet per day (phrase carried forward day to day). Local-only,
// like everything in Vela.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addRepetition,
  emptySheet,
  Sheet369,
  Slot369,
} from "@/lib/journal";
import { dateKey } from "@/lib/streak";

const STORE_KEY = "vela.journal.v1";
const MAX_ENTRIES = 500;

export type EntryKind = "script" | "gratitude";

export interface JournalEntry {
  id: string;
  kind: EntryKind;
  dateKey: string;
  /** The prompt (script) or stems (gratitude, joined) the entry answered. */
  prompt: string;
  text: string;
  createdAt: string;
}

interface Persisted {
  entries: JournalEntry[];
  /** Today's (or the most recent) 369 sheet. One at a time, by design. */
  sheet: Sheet369 | null;
  /** The intention phrase carried between days. */
  phrase369: string;
}

interface JournalValue {
  ready: boolean;
  entries: JournalEntry[];
  addEntry: (kind: EntryKind, prompt: string, text: string) => Promise<void>;
  /** Today's sheet — created lazily from the carried phrase. */
  sheetToday: Sheet369 | null;
  phrase369: string;
  setPhrase369: (phrase: string) => Promise<void>;
  addRep: (slot: Slot369, text: string) => Promise<boolean>;
}

const Ctx = createContext<JournalValue | null>(null);

const newId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

function parse(raw: string | null): Persisted {
  const empty: Persisted = { entries: [], sheet: null, phrase369: "" };
  if (!raw) return empty;
  try {
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      entries: Array.isArray(p.entries) ? (p.entries as JournalEntry[]) : [],
      sheet: p.sheet && typeof p.sheet === "object" ? (p.sheet as Sheet369) : null,
      phrase369: typeof p.phrase369 === "string" ? p.phrase369 : "",
    };
  } catch {
    return empty;
  }
}

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Persisted>({ entries: [], sheet: null, phrase369: "" });

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

  const addEntry = useCallback(
    async (kind: EntryKind, prompt: string, text: string) => {
      const entry: JournalEntry = {
        id: newId(),
        kind,
        dateKey: dateKey(new Date()),
        prompt,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      await persist({
        ...data,
        entries: [entry, ...data.entries].slice(0, MAX_ENTRIES),
      });
    },
    [data, persist]
  );

  const today = dateKey(new Date());
  const sheetToday =
    data.sheet && data.sheet.dateKey === today && data.sheet.phrase === data.phrase369
      ? data.sheet
      : data.phrase369
        ? emptySheet(today, data.phrase369)
        : null;

  const setPhrase369 = useCallback(
    async (phrase: string) => {
      const p = phrase.trim().slice(0, 80);
      await persist({ ...data, phrase369: p, sheet: p ? emptySheet(today, p) : null });
    },
    [data, persist, today]
  );

  const addRep = useCallback(
    async (slot: Slot369, text: string) => {
      const base = sheetToday;
      if (!base) return false;
      const next = addRepetition(base, slot, text);
      if (!next) return false;
      await persist({ ...data, sheet: next });
      return true;
    },
    [data, persist, sheetToday]
  );

  const value = useMemo<JournalValue>(
    () => ({
      ready,
      entries: data.entries,
      addEntry,
      sheetToday,
      phrase369: data.phrase369,
      setPhrase369,
      addRep,
    }),
    [ready, data.entries, data.phrase369, addEntry, sheetToday, setPhrase369, addRep]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJournal(): JournalValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useJournal must be used inside JournalProvider");
  return v;
}
