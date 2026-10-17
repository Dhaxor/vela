// What Settings > Your data says about a backup. Pure (bun-tested).
//
// - importDoneCopy: the toast after an import, from what the import really
//   did (contexts/useBackup ImportOutcome). Never 'everything is here': photos
//   are not inside a backup file, and a merge may keep this device's version
//   of a dream whose history diverged.
// - BACKUP_KEEPS_COPY: what the file holds, so nobody expects their photos in it.
// - nextImportStep: what follows reading a file. It turns on plan.differs,
//   not plan.nothingNew, so Replace stays reachable when this device is ahead
//   of the file (nothing new in it, yet Replace would change something).
import type { ImportOutcome } from "@/contexts/useBackup";
import type { ImportPlan } from "@/lib/backup";

const dreams = (n: number) => `${n} ${n === 1 ? "dream" : "dreams"}`;

/** The Export row's detail: what a backup file keeps, and what it doesn't (its own line, so 'phone.' never sits alone). */
export const BACKUP_KEEPS_COPY = "The file keeps your words, chapters, proofs, pages and progress.\nPhotos stay on this phone.";

/** The import sheet's note when this device is ahead of the file (plan.nothingNew, but it differs). */
export const DEVICE_AHEAD_COPY = "This device is ahead of this file. Merging adds nothing; Replace takes it back to the file.";

/** The file matches this device exactly (!plan.differs): nothing to import either way. */
export const NOTHING_TO_IMPORT_COPY = "This device already matches that backup. Nothing to import.";

/** The file holds no dreams, pages or Scenes while this device does (nothing to merge, and Replace would only erase). */
export const EMPTY_FILE_COPY = "That backup has no dreams, pages or Scenes in it. Nothing was changed.";

/** Shown with every toast that follows an import of a file that points at photos. */
export const PHOTOS_STAY_COPY = "Photos stay on the phone that took them.";

export interface ImportContext {
  /** The plan said the file held nothing new (this device was ahead). */
  readonly nothingNew?: boolean;
}

export function importDoneCopy(outcome: ImportOutcome, context: ImportContext = {}): string {
  const parts: string[] = [];
  if (outcome.mode === "replace") {
    parts.push("Replaced. This device now matches the backup.");
  } else {
    parts.push("Merged.");
    if (outcome.dreamsAdded > 0) parts.push(`${dreams(outcome.dreamsAdded)} added.`);
    if (outcome.dreamsUpdated > 0) parts.push(`${dreams(outcome.dreamsUpdated)} brought up to date.`);
    if (outcome.dreamsKept > 0) parts.push(`${dreams(outcome.dreamsKept)} kept this device's version.`);
    if (context.nothingNew && outcome.dreamsAdded + outcome.dreamsUpdated + outcome.dreamsKept === 0) {
      parts.push("Nothing new was in the file.");
    }
  }
  if (outcome.devicePhotos > 0) parts.push(PHOTOS_STAY_COPY);
  return parts.join(" ");
}

/** Longer toasts carry more than one sentence. */
export function importDoneDuration(outcome: ImportOutcome): number | undefined {
  return outcome.devicePhotos > 0 || outcome.dreamsKept > 0 || outcome.dreamsUpdated > 0 ? 5000 : undefined;
}

/**
 * After a file is read and planned:
 * - 'nothing-to-import': the file and this device are the same.
 * - 'empty-file': the file is empty and this device is not.
 * - 'choose': both hold data: the merge-or-replace sheet (even when this device
 *   is ahead of the file, so Replace stays reachable).
 * - 'confirm': nothing here yet: one plain confirm, then the recommended mode.
 */
export type ImportStep = "nothing-to-import" | "empty-file" | "choose" | "confirm";

export function nextImportStep(plan: Pick<ImportPlan, "differs" | "needsChoice" | "recommended">): ImportStep {
  if (!plan.differs) return "nothing-to-import";
  if (plan.needsChoice) return "choose";
  return plan.recommended === "replace" ? "confirm" : "empty-file";
}
