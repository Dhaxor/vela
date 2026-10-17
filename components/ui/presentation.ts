// One sheet on screen at a time.
//
// On iOS every RN <Modal> is a view controller presented over the root, and
// the root presents ONE at a time. A second <Modal> that asks to show while
// another is still up (or still leaving) is refused by UIKit, and RN's modal
// host never retries it (it has already marked itself presented). The sheet is
// never seen, and anything awaiting it (a confirm()) hangs for the rest of the
// session. The web build portals modals into the DOM, so it can't show this.
//
// So every root-level <Sheet> asks this presenter for its turn: it mounts its
// Modal once nothing else holds the screen and the previous one has fully left
// (plus a short settle), in the order the requests came. A sheet rendered
// inside another sheet is a nested presentation (presented by that sheet's own
// controller) and skips the queue. `hold(ms)` keeps new presentations back
// while a system sheet we don't own is leaving (the document picker).
//
// The presenter also knows which sheet is on top, so toasts can be drawn
// inside it: a toast in the root view sits UNDER a presented Modal on iOS.
//
// Pure core with injectable timers (bun-tested); `presenter` is the app's one.

export interface PresenterDeps {
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  /** Pause after a sheet has left before the next one may present. */
  settleMs: number;
}

export interface Presenter {
  /** Ask for the screen. `go` runs (once) when it is this sheet's turn. Returns a cancel for a request still waiting. */
  request(id: string, go: () => void): () => void;
  /** The sheet's Modal has left the screen: free the slot (no-op unless `id` holds it or waits for it). */
  release(id: string): void;
  /** Keep new presentations back for `ms` from now. */
  hold(ms: number): void;
  /** The root slot's holder, or null. */
  holder(): string | null;
  /** A sheet (root or nested) whose Modal is now mounted, or no longer is. */
  layerIn(id: string): void;
  layerOut(id: string): void;
  /** The top-most mounted sheet, or null when none is up. */
  top(): string | null;
  subscribe(listener: () => void): () => void;
}

export function createPresenter(deps: PresenterDeps): Presenter {
  let slot: string | null = null;
  const waiting: { id: string; go: () => void }[] = [];
  const layers: string[] = [];
  let clearAt = 0;
  let timer: unknown = null;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  const pump = () => {
    if (timer !== null) {
      deps.clearTimer(timer);
      timer = null;
    }
    if (slot !== null || waiting.length === 0) return;
    const wait = clearAt - deps.now();
    if (wait > 0) {
      timer = deps.setTimer(() => {
        timer = null;
        pump();
      }, wait);
      return;
    }
    const next = waiting.shift();
    if (!next) return;
    slot = next.id;
    next.go();
  };

  return {
    request(id, go) {
      if (slot === id) {
        // Still on screen (it was closing and reopened): it keeps its turn.
        go();
        return () => {};
      }
      const queued = waiting.find((w) => w.id === id);
      if (queued) queued.go = go;
      else waiting.push({ id, go });
      pump();
      return () => {
        const i = waiting.findIndex((w) => w.id === id);
        if (i >= 0) waiting.splice(i, 1);
      };
    },
    release(id) {
      const i = waiting.findIndex((w) => w.id === id);
      if (i >= 0) waiting.splice(i, 1);
      if (slot !== id) return;
      slot = null;
      clearAt = Math.max(clearAt, deps.now() + deps.settleMs);
      pump();
    },
    hold(ms) {
      clearAt = Math.max(clearAt, deps.now() + Math.max(0, ms));
      pump();
    },
    holder: () => slot,
    layerIn(id) {
      if (layers.includes(id)) return;
      layers.push(id);
      notify();
    },
    layerOut(id) {
      const i = layers.indexOf(id);
      if (i < 0) return;
      layers.splice(i, 1);
      notify();
    },
    top: () => (layers.length > 0 ? layers[layers.length - 1] : null),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** How long a leaving iOS Modal gets before the next one presents (after its onDismiss). */
export const IOS_SETTLE_MS = 80;
/** If iOS never reports the dismissal (a presentation it refused), free the slot after this. */
export const IOS_DISMISS_FALLBACK_MS = 700;
/** The document picker's own dismissal is still running when its promise resolves. */
export const SYSTEM_SHEET_SETTLE_MS = 500;

function isIOS(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("react-native") as typeof import("react-native")).Platform.OS === "ios";
  } catch {
    return false;
  }
}

/** The app's presenter (one root, one queue). */
export const presenter: Presenter = createPresenter({
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  get settleMs() {
    return isIOS() ? IOS_SETTLE_MS : 0;
  },
});

/** Keep the next sheet back while a system sheet (document picker, share sheet) finishes leaving. iOS only. */
export function holdForSystemSheet(ms: number = SYSTEM_SHEET_SETTLE_MS): void {
  if (isIOS()) presenter.hold(ms);
}
