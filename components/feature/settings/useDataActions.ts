// Your data: export a private backup file and import one back, through
// contexts/useBackup (which owns every store read and write). This hook only
// sequences the conversation: pick → validate → plan → (merge | replace,
// confirmed) → apply, with plain-language toasts and no Alert.alert.
import { useCallback, useState } from "react";
import { useBackup } from "@/contexts/useBackup";
import { BACKUP_ERROR_COPY, type BackupFile, type ImportMode, type ImportPlan } from "@/lib/backup";
import { useConfirm, useToast } from "@/components/ui";
import { backupSummaryLine, exportedOn } from "./time";

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
        await backup.apply(file, mode);
        toast.show({ message: mode === "merge" ? "Backup merged. Everything is here." : "Backup restored on this device.", tone: "proof" });
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
      if (outcome === "shared") toast.show({ message: "Backup ready. Keep the file somewhere safe.", tone: "proof" });
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
