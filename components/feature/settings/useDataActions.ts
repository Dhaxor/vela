// Your data: export a private backup file and import one back, through
// contexts/useBackup (which owns every store read and write). This hook only
// sequences the conversation: pick → validate → plan → (merge | replace,
// confirmed) → apply, with plain-language toasts and no Alert.alert.
//
// Sheets here follow one another (picker → ImportSheet → ConfirmSheet). iOS
// shows one presented sheet at a time; the UI Sheet queues each one until the
// last has left, and the document picker's own exit is held for here.
import { useCallback, useState } from "react";
import { useBackup } from "@/contexts/useBackup";
import { BACKUP_ERROR_COPY, type BackupFile, type ImportMode, type ImportPlan } from "@/lib/backup";
import { holdForSystemSheet, useConfirm, useToast } from "@/components/ui";
import { importDoneCopy } from "./importCopy";
import { backupSummaryLine, exportedOn } from "./time";

/**
 * After the share sheet closes. expo-sharing resolves the same way whether the
 * file was saved, sent or the sheet was cancelled, so this never claims a save.
 */
export const EXPORT_SHARED_COPY = "Your backup file is ready. If you didn't save it, export again and choose Save to Files.";

export interface PendingImport {
  readonly file: BackupFile;
  readonly plan: ImportPlan;
  readonly exportedOn: string | null;
}

export interface DataActions {
  readonly busy: "export" | "import" | "apply" | null;
  /** A file that needs the merge-or-replace choice (ImportSheet). */
  readonly pending: PendingImport | null;
  exportBackup(): Promise<void>;
  importBackup(): Promise<void>;
  choose(mode: ImportMode): Promise<void>;
  dismiss(): void;
}

export function useDataActions(): DataActions {
  const backup = useBackup();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<DataActions["busy"]>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);

  const apply = useCallback(
    async (file: BackupFile, mode: ImportMode) => {
      setBusy("apply");
      try {
        const outcome = await backup.apply(file, mode);
        toast.show({ message: importDoneCopy(outcome), tone: "proof", duration: outcome.devicePhotos > 0 || outcome.dreamsKept > 0 ? 5000 : undefined });
      } catch {
        toast.show({ message: "That backup couldn't be imported.", tone: "error" });
      } finally {
        setBusy(null);
      }
    },
    [backup, toast]
  );

  const exportBackup = useCallback(async () => {
    if (busy) return;
    setBusy("export");
    try {
      const outcome = await backup.exportToFile();
      if (outcome === "shared") toast.show({ message: EXPORT_SHARED_COPY, tone: "info", duration: 5000 });
      else if (outcome === "downloaded") toast.show({ message: "Backup downloaded.", tone: "proof" });
      else toast.show({ message: "Sharing isn't available on this device right now.", tone: "error" });
    } catch {
      toast.show({ message: "The backup couldn't be made. Nothing was changed.", tone: "error" });
    } finally {
      setBusy(null);
    }
  }, [backup, busy, toast]);

  const importBackup = useCallback(async () => {
    if (busy) return;
    setBusy("import");
    let next: { file: BackupFile; plan: ImportPlan } | null = null;
    try {
      const parsed = await backup.readFromFile();
      // The picker is still sliding away when it resolves: the next sheet waits for it.
      holdForSystemSheet();
      if (!parsed) return; // cancelled: a normal choice
      if (!parsed.ok) {
        toast.show({ message: BACKUP_ERROR_COPY[parsed.error], tone: "error", duration: 4500 });
        return;
      }
      const plan = await backup.plan(parsed.backup);
      if (plan.nothingNew) {
        toast.show("Everything in that file is already on this device.");
        return;
      }
      next = { file: parsed.backup, plan };
    } catch {
      toast.show({ message: "That file couldn't be read.", tone: "error" });
      return;
    } finally {
      setBusy(null);
    }
    if (!next) return;
    if (next.plan.needsChoice) {
      setPending({ ...next, exportedOn: exportedOn(next.file.exportedAt) });
      return;
    }
    // Nothing here yet: no choice to make, one plain confirmation.
    const ok = await confirm({
      title: "Import this backup?",
      message: `${backupSummaryLine(next.plan.incoming)}.`,
      confirmLabel: "Import",
    });
    if (ok) await apply(next.file, next.plan.recommended);
  }, [backup, busy, toast, confirm, apply]);

  const choose = useCallback(
    async (mode: ImportMode) => {
      const current = pending;
      if (!current) return;
      setPending(null);
      if (mode === "replace") {
        const ok = await confirm({
          title: "Replace what's on this device?",
          message: "This device will match the backup. Dreams, chapters and pages that exist only here will be removed.",
          confirmLabel: "Replace",
          cancelLabel: "Keep what's here",
          destructive: true,
        });
        if (!ok) return;
      }
      await apply(current.file, mode);
    },
    [pending, confirm, apply]
  );

  return { busy, pending, exportBackup, importBackup, choose, dismiss: () => setPending(null) };
}
