// Back that can't fall off the edge of the world. A screen reached as the
// first entry in history (deep link, cold start onto a sub-route) has nothing
// behind it — router.back() throws GO_BACK unhandled. Land on Today instead.
import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

export function safeBack(router: Router): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}
