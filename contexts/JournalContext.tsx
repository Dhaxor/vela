// Journal: script and gratitude pages (newest first, each with a stable id so
// a past page can be opened) plus one 3·6·9 sheet per day with its phrase
// carried forward. Stored under 'vela.journal.v2'; migrated once from
// 'vela.journal.v1', which is never written.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createStoreQueue, parseJson, readRaw } from "./persist";
import { STORAGE_KEYS, V1_KEYS } from "@/lib/storageKeys";
import { now } from "@/lib/clock";
import { localDateKey } from "@/lib/progress";
import { newId } from "@/lib/store/ids";
import {
  addJournalEntry,
  addRepetition,
  emptyJournal,
  emptySheet,
  journalFromV1,
  parseJournal,
  PHRASE_369_MAX,
  type EntryKind,
  type JournalData,
  type JournalEntry,
  type Sheet369,
  type Slot369,
} from "@/lib/journal";

export type { EntryKind, JournalEntry };

export interface EntryOptions {
  readonly promptId?: string;
  readonly dreamId?: string;
}

interface JournalValue {
  ready: boolean;
  /** Newest first. */
  entries: JournalEntry[];
  /** A past page by id (/journal/entry/[id]). */
  entry: (id: string) => JournalEntry | undefined;
  /** Saves a page and returns it (null when the text is empty). */
  addEntry: (kind: EntryKind, prompt: string, text: string, opts?: EntryOptions) => Promise<JournalEntry | null>;
  /** Today's sheet, created lazily from the carried phrase. */
  sheetToday: Sheet369 | null;
  phrase369: string;
  setPhrase369: (phrase: string) => Promise<void>;
  addRep: (slot: Slot369, text: string) => Promise<boolean>;
  /** Backup: the whole journal, and replacing it. */
  exportJournal: () => JournalData;
  replaceJournal: (data: JournalData) => Promise<void>;
}

const Ctx = createContext<JournalValue | null>(null);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<JournalData>(emptyJournal);
  const ref = useRef<JournalData>(data);
  const queue = useMemo(createStoreQueue, []);

  const commit = useCallback(
    (next: JournalData) => {
      ref.current = next;
      setData(next);
      queue.enqueue({ head: [STORAGE_KEYS.journal, next] });
    },
    [queue]
  );

  useEffect(() => {
    let stale = false;
    void (async () => {
      const raw = await readRaw(STORAGE_KEYS.journal);
      let loaded = raw ? parseJournal(parseJson(raw)) : null;
      if (!loaded) {
        const v1 = await readRaw(V1_KEYS.journal);
        loaded = v1 ? journalFromV1(parseJson(v1)) : emptyJournal();
        if (v1) queue.enqueue({ head: [STORAGE_KEYS.journal, loaded] });
      }
      if (stale) return;
      ref.current = loaded;
      setData(loaded);
      setReady(true);
    })();
    return () => {
      stale = true;
    };
  }, [queue]);

  const today = localDateKey(now());
  const sheetFor = useCallback(
    (d: JournalData, day: string): Sheet369 | null =>
      d.sheet && d.sheet.dateKey === day && d.sheet.phrase === d.phrase369 ? d.sheet : d.phrase369 ? emptySheet(day, d.phrase369) : null,
    []
  );

  const addEntry = useCallback(
    async (kind: EntryKind, prompt: string, text: string, opts?: EntryOptions) => {
      const at = now();
      const entry: JournalEntry = {
        id: newId(),
        kind,
        dateKey: localDateKey(at),
        prompt,
        text: text.trim(),
        createdAt: at.toISOString(),
        ...(opts?.promptId ? { promptId: opts.promptId } : {}),
        ...(opts?.dreamId ? { dreamId: opts.dreamId } : {}),
      };
      const next = addJournalEntry(ref.current, entry);
      if (next === ref.current) return null;
      commit(next);
      return next.entries[0];
    },
    [commit]
  );

  const setPhrase369 = useCallback(
    async (phrase: string) => {
      const p = phrase.trim().slice(0, PHRASE_369_MAX);
      commit({ ...ref.current, phrase369: p, sheet: p ? emptySheet(localDateKey(now()), p) : null });
    },
    [commit]
  );

  const addRep = useCallback(
    async (slot: Slot369, text: string) => {
      const base = sheetFor(ref.current, localDateKey(now()));
      const next = base ? addRepetition(base, slot, text) : null;
      if (!next) return false;
      commit({ ...ref.current, sheet: next });
      return true;
    },
    [commit, sheetFor]
  );

  const replaceJournal = useCallback(
    async (next: JournalData) => {
      commit(parseJournal(next));
      await queue.flush();
    },
    [commit, queue]
  );

  const value = useMemo<JournalValue>(
    () => ({
      ready,
      entries: data.entries,
      entry: (id) => data.entries.find((e) => e.id === id),
      addEntry,
      sheetToday: sheetFor(data, today),
      phrase369: data.phrase369,
      setPhrase369,
      addRep,
      exportJournal: () => ref.current,
      replaceJournal,
    }),
    [ready, data, today, sheetFor, addEntry, setPhrase369, addRep, replaceJournal]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJournal(): JournalValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useJournal must be used inside JournalProvider");
  return v;
}
