// useBackup(): Settings > Your data (S7). Gathers every store into one
// lib/backup file and applies an import to every store, merge or replace.
// Call from a screen (below every provider).
import { useCallback, useMemo } from "react";
import { ArcError } from "./arc.types";
import { useArc } from "./ArcContext";
import { useJournal } from "./JournalContext";
import { useRitualStore } from "./RitualContext";
import { useScenes } from "./ScenesContext";
import { useUser } from "./UserContext";
import { now } from "@/lib/clock";
import {
  buildBackup,
  parseBackup,
  pickBackupText,
  planImport,
  resolveImportDetailed,
  shareBackupFile,
  summarizeBackup,
  type BackupData,
  type BackupFile,
  type ExportOutcome,
  type ImportMode,
  type ImportPlan,
  type ParsedBackup,
} from "@/lib/backup";

/** What an import did (so the toast can tell the truth). */
export interface ImportOutcome {
  readonly mode: ImportMode;
  readonly dreamsAdded: number;
  /** Dreams whose longer history in the file replaced this device's. */
  readonly dreamsUpdated: number;
  /** Merge only: dreams whose histories diverged; this device's version was kept. */
  readonly dreamsKept: number;
  /** Photos the file only points at; they show only on the phone that took them. */
  readonly devicePhotos: number;
}

function appVersion(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = (require("expo-constants") as typeof import("expo-constants")).default;
    return Constants.expoConfig?.version ?? null;
  } catch {
    return null;
  }
}

export interface BackupValue {
  /** Everything the user made, as it stands (flushes pending writes first). */
  snapshot(): Promise<BackupData>;
  /** Share sheet on iOS, a download on web. */
  exportToFile(): Promise<ExportOutcome>;
  /** Pick and validate a file. null = the user cancelled. */
  readFromFile(): Promise<ParsedBackup | null>;
  /** What importing this file would do here (show it before applying). */
  plan(backup: BackupFile): Promise<ImportPlan>;
  /**
   * Apply: 'replace' makes the file the truth; 'merge' keeps everything, adds
   * what is new and carries each shared dream's longer history. Rejects (and
   * changes nothing) when the result would not be valid.
   */
  apply(backup: BackupFile, mode: ImportMode): Promise<ImportOutcome>;
}

export function useBackup(): BackupValue {
  const arc = useArc();
  const user = useUser();
  const ritual = useRitualStore();
  const journal = useJournal();
  const scenes = useScenes();

  const snapshot = useCallback(async (): Promise<BackupData> => {
    await arc.flush();
    return {
      arcs: await arc.exportSnapshot(),
      profile: user.profile,
      progress: ritual.state,
      journal: journal.exportJournal(),
      scenes: scenes.exportScenes(),
    };
  }, [arc, user.profile, ritual.state, journal, scenes]);

  return useMemo<BackupValue>(
    () => ({
      snapshot,
      exportToFile: async () => shareBackupFile(buildBackup(await snapshot(), now(), appVersion()), now()),
      readFromFile: async () => {
        const text = await pickBackupText();
        return text === null ? null : parseBackup(text, now());
      },
      plan: async (backup) => planImport(await snapshot(), backup.data),
      apply: async (backup, mode) => {
        const resolution = resolveImportDetailed(await snapshot(), backup.data, mode);
        // Never apply (or quietly swap for 'keep mine') a result that breaks the arc's invariants.
        if (resolution.problems.length > 0) throw new ArcError("invalid-input", resolution.problems.slice(0, 3).join("; "));
        const next = resolution.data;
        // The arc first: it validates, and a rejection leaves every store untouched.
        await arc.importSnapshot(next.arcs);
        await user.replaceProfile(next.profile ?? user.profile);
        if (next.progress) await ritual.replaceProgress(next.progress);
        if (next.journal) await journal.replaceJournal(next.journal);
        if (next.scenes) await scenes.replaceScenes(next.scenes);
        return {
          mode,
          dreamsAdded: resolution.dreamsAdded,
          dreamsUpdated: resolution.dreamsUpdated,
          dreamsKept: resolution.dreamsKept,
          devicePhotos: summarizeBackup(backup.data).devicePhotos ?? 0,
        };
      },
    }),
    [snapshot, arc, user, ritual, journal, scenes]
  );
}
