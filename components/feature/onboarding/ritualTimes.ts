// Ritual time choices for First Light. One-time setup favours a few good
// presets over a free-form picker (Settings keeps the precise control).
import type { HHmm, RitualTime } from "@/contexts/user.types";
import { DEFAULT_RITUAL_TIMES } from "@/contexts/user.types";

export type RitualSlot = "morning" | "evening";

/** Values are 'HHmm' (testID friendly); `toHHmm` turns them into the profile's 'HH:mm'. */
export const TIME_PRESETS: Record<RitualSlot, readonly string[]> = {
  morning: ["0600", "0700", "0800", "0900"],
  evening: ["2000", "2100", "2200", "2300"],
};

export const DEFAULT_PRESET: Record<RitualSlot, string> = {
  morning: fromHHmm(DEFAULT_RITUAL_TIMES.morning),
  evening: fromHHmm(DEFAULT_RITUAL_TIMES.evening),
};

export function toHHmm(preset: string): HHmm {
  return `${preset.slice(0, 2)}:${preset.slice(2, 4)}`;
}

export function fromHHmm(value: HHmm): string {
  return value.replace(":", "");
}

/** The slots a ritual choice uses. */
export function slotsFor(ritual: RitualTime | null): RitualSlot[] {
  if (ritual === "both") return ["morning", "evening"];
  return ritual ? [ritual] : [];
}

/** '8:00 AM' or '08:00', in the device's own clock style. */
export function formatPreset(preset: string): string {
  const h = Number(preset.slice(0, 2));
  const m = Number(preset.slice(2, 4));
  try {
    const twelve = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 !== false;
    return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: twelve ? "numeric" : "2-digit", minute: "2-digit" });
  } catch {
    return toHHmm(preset);
  }
}
