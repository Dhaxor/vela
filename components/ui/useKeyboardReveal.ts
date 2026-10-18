// The field you type in stays on screen (iOS). <Screen> and <Sheet> each run
// useKeyboardReveal on their scroll view: when the keyboard comes up (or
// changes height), when a field takes focus with the keyboard already up, and
// when a multiline field grows while typing, the focused TextInput is
// measured and its scroll view moves it into the band above the keyboard and
// above any dock riding on it (./keyboardReveal holds the arithmetic).
//
// Only the newest host acts (a sheet over a screen), and only for a field
// inside its own scroll view (measureLayout against the content fails for any
// other). TextField and SkyWriting call revealFocusedInput themselves, so a
// new screen's text inputs are covered by using the primitives.
//
// Elsewhere (web, Android) this is a no-op: the browser and adjustResize
// scroll a focused field into view themselves.
import { useEffect, useRef, useState, type RefObject } from "react";
import { Dimensions, Keyboard, Platform, TextInput, type KeyboardEvent, type ScrollView, type View } from "react-native";
import { HostStack, bandBottom, clampOffset, revealDelta, revealSpan, type RevealPrefer } from "./keyboardReveal";

interface Host {
  reveal: (prefer: RevealPrefer, extent?: number) => void;
}

const hosts = new HostStack<Host>();
const ON = Platform.OS === "ios";
/** A beat after focus or the keyboard's own event, so layout (the KeyboardAvoidingView, a grown field) has settled. */
const SETTLE_MS = 60;

/** Does this keyboard frame sit on the screen (a frame change while hiding ends below it)? */
function onScreen(e: KeyboardEvent): boolean {
  return e.endCoordinates.height > 0 && e.endCoordinates.screenY < Dimensions.get("screen").height - 1;
}

/**
 * Ask the newest host to bring the focused field into view. TextField and
 * SkyWriting call this on focus ('start') and as a multiline field's text
 * grows ('end', with the text's height as `extent`, so the line being written
 * is what stays in view, not the empty page under it).
 */
export function revealFocusedInput(prefer: RevealPrefer = "start", extent?: number): void {
  if (!ON) return;
  hosts.top()?.reveal(prefer, extent);
}

/** iOS: the software keyboard's height while it is up (it announces itself before it moves), else 0. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(() => (ON && Keyboard.isVisible() ? Keyboard.metrics()?.height ?? 0 : 0));
  useEffect(() => {
    if (!ON) return;
    const show = (e: KeyboardEvent) => setHeight(Math.round(e.endCoordinates.height));
    const subs = [
      Keyboard.addListener("keyboardWillShow", show),
      Keyboard.addListener("keyboardWillChangeFrame", (e) => {
        if (onScreen(e)) show(e);
      }),
      Keyboard.addListener("keyboardWillHide", () => setHeight(0)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return height;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Host instances (Fabric) measure themselves; anything else, or a failure, is null. */
type Measurable = {
  measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void;
  measureLayout?: (relativeTo: unknown, ok: (x: number, y: number, width: number, height: number) => void, fail?: () => void) => void;
};

/** A measurement that may never call back (a node gone mid-flight): give up after a beat. */
const MEASURE_MS = 400;
function measured(start: (done: (r: Rect | null) => void) => void): Promise<Rect | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: Rect | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };
    const timer = setTimeout(() => done(null), MEASURE_MS);
    try {
      start(done);
    } catch {
      done(null);
    }
  });
}
const rect = (x: number, y: number, width: number, height: number): Rect | null => (Number.isFinite(y) && Number.isFinite(height) ? { x, y, width, height } : null);

function windowRect(node: unknown): Promise<Rect | null> {
  const n = node as Measurable | null;
  if (!n?.measureInWindow) return Promise.resolve(null);
  return measured((done) => n.measureInWindow?.((x, y, width, height) => done(rect(x, y, width, height))));
}

/** Where `node` sits inside `ancestor`; null when it is not inside it. */
function rectIn(node: unknown, ancestor: unknown): Promise<Rect | null> {
  const n = node as Measurable | null;
  if (!n?.measureLayout || !ancestor) return Promise.resolve(null);
  return measured((done) =>
    n.measureLayout?.(
      ancestor,
      (x, y, width, height) => done(rect(x, y, width, height)),
      () => done(null)
    )
  );
}

type ScrollInternals = { getInnerViewRef?: () => unknown; getNativeScrollRef?: () => unknown };

export interface KeyboardRevealOptions {
  /** The scroll view whose content holds the fields. */
  scrollRef: RefObject<ScrollView | null>;
  /** This host is on screen and may move its content (a focused screen, an open sheet). */
  active: boolean;
  /** Something that rides on the keyboard over the scroll view's bottom (a Dock), when it shows. */
  coverRef?: RefObject<View | null>;
  /** The cover is hidden right now (a dock that steps aside while typing). */
  coverHidden?: boolean;
  /** The cover's height: when it changes with the keyboard up (a dock that grows a line), the last reveal runs again. */
  coverHeight?: number;
}

/**
 * Keep the focused text field inside `scrollRef` above the keyboard and the
 * cover. A host with no scroll view (a short sheet) still registers, so the
 * screen under it never moves for the sheet's fields.
 */
export function useKeyboardReveal({ scrollRef, active, coverRef, coverHidden = false, coverHeight }: KeyboardRevealOptions): void {
  // Read at measure time: a dock stepping aside as the keyboard rises must not re-subscribe mid-show.
  const coverAside = useRef(coverHidden);
  coverAside.current = coverHidden;
  const again = useRef<(() => void) | null>(null);
  useEffect(() => {
    again.current?.();
  }, [coverHeight]);
  useEffect(() => {
    if (!ON || !active) return;
    let keyboardTop: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let seq = 0;

    const run = async (prefer: RevealPrefer, extent?: number) => {
      const mine = ++seq;
      if (keyboardTop === null || hosts.top() !== host) return;
      const scroll = scrollRef.current as (ScrollView & ScrollInternals) | null;
      const input = TextInput.State.currentlyFocusedInput();
      const inner = scroll?.getInnerViewRef?.();
      const native = scroll?.getNativeScrollRef?.();
      if (!scroll || !input || !inner || !native) return;
      const [inContent, field, view, content, cover] = await Promise.all([
        rectIn(input, inner),
        windowRect(input),
        windowRect(native),
        windowRect(inner),
        coverRef?.current && !coverAside.current ? windowRect(coverRef.current) : Promise.resolve(null),
      ]);
      // Not this host's field, or the page moved on while measuring.
      if (mine !== seq || !inContent || !field || !view || !content || keyboardTop === null) return;
      const coverTop = cover && cover.height > 0 && cover.y < view.y + view.height ? cover.y : null;
      const delta = revealDelta(revealSpan(field, prefer, extent), { top: view.y, bottom: bandBottom(keyboardTop, view.y + view.height, coverTop) }, { prefer });
      if (Math.abs(delta) < 1) return;
      const offset = inContent.y - (field.y - view.y);
      const target = clampOffset(offset + delta, content.height, view.height);
      if (Math.abs(target - offset) < 1) return;
      scroll.scrollTo({ y: target, animated: true });
    };

    let last: { prefer: RevealPrefer; extent?: number } = { prefer: "start" };
    const host: Host = {
      reveal: (prefer, extent) => {
        last = { prefer, extent };
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          void run(prefer, extent);
        }, SETTLE_MS);
      },
    };
    hosts.push(host);
    again.current = () => {
      if (keyboardTop !== null) host.reveal(last.prefer, last.extent);
    };

    const shown = (e: KeyboardEvent) => {
      keyboardTop = e.endCoordinates.screenY;
      host.reveal("start");
    };
    const subs = [
      Keyboard.addListener("keyboardDidShow", shown),
      Keyboard.addListener("keyboardDidChangeFrame", (e) => {
        if (onScreen(e)) shown(e);
      }),
      Keyboard.addListener("keyboardWillHide", () => {
        keyboardTop = null;
      }),
    ];
    // The keyboard can already be up when this host appears (a screen pushed, or a sheet opened, mid-typing).
    if (Keyboard.isVisible()) {
      const m = Keyboard.metrics();
      if (m) keyboardTop = m.screenY;
    }

    return () => {
      subs.forEach((s) => s.remove());
      hosts.remove(host);
      again.current = null;
      if (timer) clearTimeout(timer);
      seq++;
    };
  }, [active, scrollRef, coverRef]);
}
