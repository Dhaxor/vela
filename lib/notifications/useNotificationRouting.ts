// Cold-start-safe notification routing (N7). A1's RootNavigator mounts
// useNotificationRouting(ready) once, where `ready` means every store is
// loaded and a profile exists (the tabs are mounted). The tap that launched
// the app arrives through useLastNotificationResponse before the navigator
// can take it, so nothing routes until `ready`; each response routes once.

import { useEffect, useRef, useState } from "react";
import type { Href } from "expo-router";
import { hrefForResponse, responseKey } from "./routing";
import { expoNotifications } from "./runtime";

/** The navigator can lag a frame behind `ready`; retry briefly instead of dropping the tap. */
const RETRY_MS = 100;
const MAX_RETRIES = 20;

const noResponse = (): null => null;

/** Chosen once per process (the platform never changes), so the hook order is stable. */
let lastResponseHook: (() => unknown) | null = null;

function useLastResponse(): unknown {
  lastResponseHook ??= expoNotifications()?.useLastNotificationResponse ?? noResponse;
  return lastResponseHook();
}

function navigate(href: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { router } = require("expo-router") as typeof import("expo-router");
    if (href === "/") router.navigate("/");
    else router.push(href as Href);
    return true;
  } catch {
    return false;
  }
}

/** Routes a notification tap to its chapter, proof form or Today once `ready` is true. Web: a no-op. */
export function useNotificationRouting(ready: boolean): void {
  const response = useLastResponse();
  const handled = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !response) return;
    const key = responseKey(response);
    if (!key || handled.current === key) return;
    const href = hrefForResponse(response);
    if (href && !navigate(href)) {
      if (attempt >= MAX_RETRIES) return;
      const retry = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
      return () => clearTimeout(retry);
    }
    handled.current = key;
    try {
      expoNotifications()?.clearLastNotificationResponse();
    } catch {
      // a stale response is still guarded by `handled`
    }
  }, [ready, response, attempt]);
}
