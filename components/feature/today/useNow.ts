// Today's clock. iOS keeps Vela suspended overnight, the tab stays mounted,
// and nothing else re-renders Today, so a render-time `now()` would keep
// showing yesterday: yesterday's loop card, greeting and date, and a 'Save
// for 21:00' aimed at an instant already past. useNow re-reads the clock
// whenever it can have moved on: the app coming back to the foreground, the
// Today tab regaining focus, each whole hour (midnight included) and any
// boundary the screen names (a sealed chapter's 'opens at').
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "expo-router";
import { now } from "@/lib/clock";
import { MAX_REFRESH_MS, nextRefreshAt } from "./time";

/** A little after the boundary, so the clock read then is past it. */
const PAST_BOUNDARY_MS = 250;

export function useNow(boundaries: readonly (string | null | undefined)[] = []): Date {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Back from the background (the overnight case).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Back on the Today tab (it never unmounts).
  const focused = useIsFocused();
  const wasFocused = useRef(focused);
  useEffect(() => {
    if (focused && !wasFocused.current) refresh();
    wasFocused.current = focused;
  }, [focused, refresh]);

  // The next hour, or an earlier boundary.
  const key = boundaries.join("|");
  useEffect(() => {
    const at = now();
    const due = nextRefreshAt(at, boundaries).getTime() - at.getTime();
    const timer = setTimeout(refresh, Math.min(MAX_REFRESH_MS, Math.max(1000, due + PAST_BOUNDARY_MS)));
    return () => clearTimeout(timer);
    // `key` stands for `boundaries`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, key, refresh]);

  return now();
}
