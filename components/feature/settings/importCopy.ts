// What the toast says after an import, from what the import really did
// (contexts/useBackup ImportOutcome). Never 'everything is here': photos are
// not inside a backup file, and a merge may keep this device's version of a
// dream whose history diverged. Pure (bun-tested).
import type { ImportOutcome } from "@/contexts/useBackup";

const dreams = (n: number) => `${n} ${n === 1 ? "dream" : "dreams"}`;

export function importDoneCopy(outcome: ImportOutcome): string {
  const parts: string[] = [];
  if (outcome.mode === "replace") parts.push("Backup restored on this device.");
  else {
    const added = outcome.dreamsAdded > 0 ? ` ${dreams(outcome.dreamsAdded)} added.` : "";
    parts.push(`Backup merged.${added}`);
    if (outcome.dreamsKept > 0) parts.push(`${dreams(outcome.dreamsKept)} kept this device's version.`);
  }
  if (outcome.devicePhotos > 0) parts.push("Photos show only on the phone that took them.");
  return parts.join(" ");
}
