// Date labels for pages and scenes, in the reader's locale. LOCAL day keys
// ('2026-10-15') are parsed as local calendar days, never through UTC.

export function dateFromKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** { day: '15', month: 'Oct', weekday: 'Thursday', long: 'Thursday, October 15' } */
export function dayParts(dateKey: string): { day: string; month: string; weekday: string; long: string; short: string } {
  const date = dateFromKey(dateKey);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString(undefined, { month: "short" }),
    weekday: date.toLocaleDateString(undefined, { weekday: "long" }),
    long: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    short: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}

/** '9:30 PM' from an ISO instant, in local time. */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}
