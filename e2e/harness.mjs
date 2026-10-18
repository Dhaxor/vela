// Shared Appium/XCUITest helpers for the Vela simulator tests (fresh-install.mjs).
// The same selector rules as update-test.mjs: testIDs ('~id'), a visible match
// preferred (navigators keep hidden duplicates mounted), every check recorded
// as "<NAME> RESULT: PASS|FAIL|NOT-TESTABLE|INFO — detail" into results-<tag>.json
// together with the screenshots taken for it.
import { remote } from "webdriverio";
import fs from "node:fs";
import path from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const msg = (e) => String(e?.message ?? e).split("\n")[0];
export const q = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export function createHarness({ tag, prefix, shotsDir, udid, bundle }) {
  const SHOTS = path.resolve(shotsDir);
  const SRC = path.join(SHOTS, "src");
  for (const d of [SHOTS, SRC]) fs.mkdirSync(d, { recursive: true });
  const T0 = Date.now();
  const log = (...a) => console.log(`[${tag}]`, `+${((Date.now() - T0) / 1000).toFixed(1)}s`, ...a);

  const h = {
    driver: null,
    win: { width: 430, height: 932 },
    results: [],
    pendingShots: [],
    shotN: 0,
    log,
    SHOTS,
  };

  /* ---------------------------------------------------------------- results */
  h.writeResults = () => fs.writeFileSync(path.join(SHOTS, `results-${tag}.json`), JSON.stringify(h.results, null, 2));
  h.record = (name, status, detail, extra = {}) => {
    h.results.push({ name, status, detail, shots: h.pendingShots, t: +((Date.now() - T0) / 1000).toFixed(1), ...extra });
    h.pendingShots = [];
    log(`${name} RESULT: ${status} — ${detail}`);
    h.writeResults();
  };

  /* ---------------------------------------------------------------- session */
  const caps = {
    platformName: "iOS",
    "appium:automationName": "XCUITest",
    "appium:udid": udid,
    "appium:bundleId": bundle,
    "appium:noReset": true,
    "appium:forceAppLaunch": true,
    "appium:shouldTerminateApp": true,
    "appium:newCommandTimeout": 600,
    // The first session builds WebDriverAgent on the runner (minutes).
    "appium:wdaLaunchTimeout": 600000,
    "appium:wdaConnectionTimeout": 600000,
    "appium:waitForIdleTimeout": 0,
    "appium:animationCoolOffTimeout": 0,
  };

  h.connect = async () => {
    for (let i = 1; i <= 3; i++) {
      try {
        h.driver = await remote({
          hostname: "127.0.0.1",
          port: 4723,
          path: "/",
          logLevel: "error",
          capabilities: caps,
          connectionRetryTimeout: 900000,
          connectionRetryCount: 0,
        });
        try {
          await h.driver.updateSettings({ waitForIdleTimeout: 0, animationCoolOffTimeout: 0, snapshotMaxDepth: 62 });
        } catch (e) {
          log("settings failed", msg(e));
        }
        try {
          const r = await h.driver.getWindowRect();
          h.win = { width: r.width, height: r.height };
        } catch {
          // keep the default
        }
        log("session", h.driver.sessionId, JSON.stringify(h.win));
        return h.driver;
      } catch (e) {
        log(`session attempt ${i}/3 failed:`, msg(e));
        if (i === 3) throw e;
        await sleep(15000);
      }
    }
    return null;
  };
  h.endSession = async () => {
    try {
      await h.driver?.deleteSession();
    } catch {
      // gone
    }
    h.driver = null;
  };

  /* ---------------------------------------------------------------- evidence */
  h.shot = async (name) => {
    h.shotN++;
    const file = `${prefix}${String(h.shotN).padStart(2, "0")}-${name}.png`;
    try {
      const buf = Buffer.from(await h.driver.takeScreenshot(), "base64");
      fs.writeFileSync(path.join(SHOTS, file), buf);
      h.pendingShots.push(file);
      log("shot", file);
      return file;
    } catch (e) {
      log("shot-failed", name, msg(e));
      return null;
    }
  };
  h.source = async (name) => {
    try {
      const xml = await h.driver.getPageSource();
      fs.writeFileSync(path.join(SRC, `${prefix}${String(h.shotN).padStart(2, "0")}-${name}.xml`), xml);
      return xml;
    } catch (e) {
      log("source-failed", name, msg(e));
      return "";
    }
  };
  /** The current page source holds this text (XML-escaped as WDA writes it). */
  h.sourceHas = async (text, name) => {
    const esc = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    const xml = await h.source(name);
    return xml.includes(esc) || xml.includes(String(text));
  };

  /* ---------------------------------------------------------------- elements */
  h.rectOfEl = async (el) => {
    try {
      return await h.driver.getElementRect(el.elementId);
    } catch {
      return null;
    }
  };
  h.attr = async (el, name) => {
    try {
      return await el.getAttribute(name);
    } catch {
      return null;
    }
  };
  /** Prefer a visible match, then one on this screen's x range. */
  h.pick = async (selector) => {
    let els = [];
    try {
      els = await h.driver.$$(selector);
    } catch {
      return null;
    }
    let onScreen = null;
    let first = null;
    for (const el of els) {
      if (!el?.elementId) continue;
      first ??= el;
      const v = await h.attr(el, "visible");
      if (v === "true" || v === true) return el;
      if (!onScreen) {
        const r = await h.rectOfEl(el);
        if (r && r.width > 0 && r.x > -2 && r.x < h.win.width - 2) onScreen = el;
      }
    }
    return onScreen ?? first;
  };
  h.find = async (selector, timeout = 8000) => {
    const end = Date.now() + timeout;
    for (;;) {
      const el = await h.pick(selector);
      if (el) return el;
      if (Date.now() >= end) return null;
      await sleep(400);
    }
  };
  h.exists = async (selector, timeout = 4000) => !!(await h.find(selector, timeout));
  h.shownNow = async (selector) => {
    try {
      for (const el of await h.driver.$$(selector)) {
        const v = await h.attr(el, "visible");
        if (v === "true" || v === true) return true;
      }
    } catch {
      // none
    }
    return false;
  };
  /** Every element matching, visible or not, with its label and rect. */
  h.all = async (selector) => {
    const out = [];
    try {
      for (const el of await h.driver.$$(selector)) {
        if (!el?.elementId) continue;
        out.push({ el, name: await h.attr(el, "name"), label: await h.attr(el, "label"), visible: String(await h.attr(el, "visible")) === "true", rect: await h.rectOfEl(el) });
      }
    } catch {
      // none
    }
    return out;
  };
  h.labelOf = async (selector, timeout = 3000) => {
    const el = await h.find(selector, timeout);
    if (!el) return null;
    return (await h.attr(el, "label")) || (await h.attr(el, "value")) || (await h.attr(el, "name")) || "";
  };
  h.rectOf = async (selector, timeout = 3000) => {
    const el = await h.find(selector, timeout);
    return el ? h.rectOfEl(el) : null;
  };
  /** The visible element's rect, or null when none of the matches is visible. */
  h.visibleRect = async (selector) => {
    try {
      for (const el of await h.driver.$$(selector)) {
        const v = await h.attr(el, "visible");
        if (v === "true" || v === true) return h.rectOfEl(el);
      }
    } catch {
      // none
    }
    return null;
  };

  h.keyboardRect = async () => {
    try {
      for (const k of await h.driver.$$("-ios class chain:**/XCUIElementTypeKeyboard")) {
        const r = await h.rectOfEl(k);
        if (r && r.height > 60 && r.y < h.win.height - 10) return r;
      }
    } catch {
      // no keyboard
    }
    return null;
  };

  /* ---------------------------------------------------------------- gestures */
  h.drag = async (fromY, toY, x = null) => {
    try {
      await h.driver.execute("mobile: dragFromToForDuration", {
        duration: 0.25,
        fromX: Math.round(x ?? h.win.width / 2),
        fromY: Math.round(fromY),
        toX: Math.round(x ?? h.win.width / 2),
        toY: Math.round(toY),
      });
    } catch (e) {
      log("drag-failed", msg(e));
    }
    await sleep(700);
  };
  /** Reveal what is below (drags stay above the keyboard: a drag on it would be a swipe-to-type). */
  h.scrollDown = async (frac = 0.34) => {
    const kb = await h.keyboardRect();
    const from = kb ? kb.y - 24 : h.win.height * 0.72;
    await h.drag(from, Math.max(80, from - h.win.height * frac));
  };
  h.scrollUp = async () => {
    const kb = await h.keyboardRect();
    const to = kb ? kb.y - 24 : h.win.height * 0.7;
    await h.drag(Math.max(120, to - h.win.height * 0.4), to);
  };
  /** Bring an element on screen and out from under the keyboard, a dock or the tab bar ('hittable'). */
  h.ensureVisible = async (el) => {
    let last = null;
    for (let i = 0; i < 7; i++) {
      const r = await h.rectOfEl(el);
      if (!r) return false;
      const kb = await h.keyboardRect();
      const limit = kb ? kb.y : h.win.height;
      const center = r.y + Math.min(r.height, 120) / 2;
      const onScreen = center > 50 && center < limit - 8;
      if (onScreen) {
        const hit = await h.attr(el, "hittable");
        if (hit === "true" || hit === true || i >= 3) return true;
      }
      if (last && Math.abs(last.y - r.y) < 2 && i > 0) return onScreen; // the page no longer moves
      last = r;
      if (center <= 50) await h.scrollUp();
      else await h.scrollDown();
    }
    return false;
  };
  /** Swipe the page up until the selector is on screen. */
  h.scrollUntil = async (selector, label, tries = 16) => {
    for (let i = 0; i < tries; i++) {
      const el = await h.find(selector, 700);
      if (el) {
        const r = await h.rectOfEl(el);
        if (r && r.y > 40 && r.y + Math.min(r.height, 60) < h.win.height - 90) return el;
      }
      // Above any dock (the reader's player is ~180pt tall), never on the keyboard.
      const kb = await h.keyboardRect();
      const from = Math.min(h.win.height * 0.58, kb ? kb.y - 24 : Infinity);
      await h.drag(from, Math.max(70, from - h.win.height * 0.36));
    }
    const el = await h.find(selector, 1000);
    if (!el) log("scroll-missed", label);
    return el;
  };

  h.clearAlerts = async (label) => {
    for (let i = 0; i < 3; i++) {
      let text;
      try {
        text = await h.driver.getAlertText();
      } catch {
        return;
      }
      log("system alert", label, JSON.stringify(text));
      try {
        await h.driver.execute("mobile: alert", { action: "dismiss" });
      } catch {
        try {
          await h.driver.dismissAlert();
        } catch {
          // nothing
        }
      }
      await sleep(800);
    }
  };

  h.tap = async (selector, label, timeout = 10000, { scroll = true } = {}) => {
    let el = await h.find(selector, timeout);
    if (!el) {
      await h.clearAlerts(label);
      el = await h.find(selector, 1500);
    }
    if (!el) {
      log("tap-failed", label, "(not found)", selector);
      return false;
    }
    if (scroll) await h.ensureVisible(el);
    try {
      await el.click();
      log("tapped", label);
      return true;
    } catch (e) {
      log("tap-failed", label, msg(e));
      return false;
    }
  };
  h.tapIfShown = async (selector, label) => {
    if (!(await h.shownNow(selector))) return false;
    return h.tap(selector, label, 1500, { scroll: false });
  };
  h.tapAt = async (x, y, label) => {
    try {
      await h.driver.execute("mobile: tap", { x: Math.round(x), y: Math.round(y) });
      log("tapped at", label, Math.round(x), Math.round(y));
      return true;
    } catch (e) {
      log("tap-at failed", label, msg(e));
      return false;
    }
  };
  /** Dismiss the keyboard the way a user would (tap the page above it). */
  h.hideKeyboard = async () => {
    if (!(await h.keyboardRect())) return;
    try {
      await h.driver.hideKeyboard();
    } catch {
      // some keyboards refuse; the next tap does it
    }
    await sleep(700);
  };

  h.appState = async () => {
    try {
      return await h.driver.execute("mobile: queryAppState", { bundleId: bundle });
    } catch {
      return -1;
    }
  };
  /** 4 = running in the foreground. Anything else after a step is a crash (or the app left). */
  h.alive = async (label) => {
    const s = await h.appState();
    if (s === 4) return true;
    h.record(`CRASH-${label}`, "FAIL", `app state ${s} (4 = foreground) after ${label}`);
    await h.shot(`not-running-${label}`);
    try {
      await h.driver.execute("mobile: activateApp", { bundleId: bundle });
      await sleep(4000);
    } catch {
      // stays down
    }
    return false;
  };
  h.section = async (name, fn) => {
    try {
      const r = await fn();
      if (r) h.record(name, r.status, r.detail, r.extra ?? {});
    } catch (e) {
      await h.shot(`${name.toLowerCase()}-error`);
      h.record(name, "FAIL", `error: ${msg(e)}`);
    }
    if (h.driver) await h.alive(name);
  };

  return h;
}

export const byLabel = (t, type) => `-ios predicate string:${type ? `type == "${type}" AND ` : ""}label == "${q(t)}"`;
export const byLabelContains = (t) => `-ios predicate string:label CONTAINS "${q(t)}"`;
export const byNamePrefix = (p) => `-ios predicate string:name BEGINSWITH "${q(p)}"`;
