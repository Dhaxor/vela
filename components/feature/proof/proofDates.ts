// 'Today' / 'Yesterday' / '14 October' for a proof's local date key.
import { daysBetween } from "@/lib/progress";
import { formatCardDate } from "@/lib/share/cardModel";

export function whenLabel(dateKey: string, todayKey: string): string {
  const full = formatCardDate(dateKey);
  if (!full) return "";
  const diff = daysBetween(dateKey, todayKey);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dateKey.slice(0, 4) === todayKey.slice(0, 4) ? full.replace(/ \d{4}$/u, "") : full;
}
