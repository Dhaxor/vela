// Leaving a practice page: back to the Rituals tab, whichever way the page was
// reached (the tab's doors, Today's 'Reflect' card, or a cold start).
import { useCallback } from "react";
import { useRouter } from "expo-router";

export function useBackToRituals(): () => void {
  const router = useRouter();
  return useCallback(() => {
    // dismissTo pops the stack down to the tabs and shows Rituals; with no
    // history (a deep link) it replaces this page with the tab instead.
    router.dismissTo("/rituals");
  }, [router]);
}
