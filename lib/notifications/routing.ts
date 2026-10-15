// Deep links carried by every notification (N7) and their mapping back to
// router hrefs. Pure: the hook that applies them lives in
// useNotificationRouting.ts.

import type { ChapterId, DreamId } from "@/contexts/arc.types";

/** Today. */
export const APP_HOME_URL = "vela://";

/** expo-notifications' DEFAULT_ACTION_IDENTIFIER: a plain tap on the notification. */
export const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";

export function urlForChapter(chapterId: ChapterId): string {
  return `vela://story/${encodeURIComponent(chapterId)}`;
}

export function urlForEvidence(dreamId: DreamId): string {
  return `vela://evidence/${encodeURIComponent(dreamId)}`;
}

const ROUTES: Readonly<Record<string, string>> = { story: "/story/", evidence: "/evidence/" };

/** Notification `data` payload → router href ('/story/<id>', '/evidence/<id>', '/'), or null. */
export function hrefForNotificationData(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const url = (data as { url?: unknown }).url;
  if (typeof url !== "string") return null;
  const m = /^vela:\/\/\/?(.*)$/.exec(url.trim());
  if (!m) return null;
  const path = m[1].replace(/\/+$/, "");
  if (path === "") return "/";
  const [route, raw, ...rest] = path.split("/");
  const base = ROUTES[route];
  if (!base || !raw || rest.length > 0) return null;
  let id: string;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return id.trim() ? `${base}${encodeURIComponent(id)}` : null;
}

/** A notification response (the hook's value) → href for a plain tap, or null for anything else. */
export function hrefForResponse(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const r = response as { actionIdentifier?: unknown; notification?: { request?: { content?: { data?: unknown } } } };
  if (r.actionIdentifier !== DEFAULT_ACTION) return null;
  return hrefForNotificationData(r.notification?.request?.content?.data);
}

/** Stable identity of a response, so one tap routes exactly once. */
export function responseKey(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const n = (response as { notification?: { date?: unknown; request?: { identifier?: unknown } } }).notification;
  const id = n?.request?.identifier;
  return typeof id === "string" ? `${id}@${String(n?.date ?? "")}` : null;
}
