// The 1.0.1 → 1.1 update test, on a real iOS simulator (ios-update-test.yml).
//
//   node update-test.mjs drive101   1.0.1: a long-time user, through the UI
//   node update-test.mjs seed       (app terminated) add what a LIFETIME owner's
//                                   device also holds: Plus cached, a second dream,
//                                   more board cards, a board photo whose stored URI
//                                   names an older container (what an App Store
//                                   update does to absolute paths)
//   node update-test.mjs verify101  1.0.1 reads the seeded store (it is valid 1.0.1 data)
//   node update-test.mjs reseed     put Plus back (1.0.1's own entitlement refresh
//                                   clears it on a simulator) and snapshot the v1 keys
//   node update-test.mjs drive11    1.1 installed over it: assert everything survived
//                                   and every 1.1 flow works on the migrated data
//   node update-test.mjs dump       (app terminated) final store, v1 keys untouched
//
// The AsyncStorage store is edited the way RNCAsyncStorage keeps it on iOS:
// <data>/Library/Application Support/<bundle>/RCTAsyncLocalStorage_V1/manifest.json,
// values over 1024 UTF-16 units in a file named md5(key), null in the manifest.
//
// Every check logs "<NAME> RESULT: PASS|FAIL|NOT-TESTABLE|INFO — detail" and is
// written to results-<phase>.json with the screenshots taken for it. A phase
// exits 1 when any of its checks FAILED or it died.
import { remote } from "webdriverio";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

let PNG = null;
try {
  ({ PNG } = await import("pngjs"));
} catch {
  // pixel checks report NOT-TESTABLE
}

const PHASE = process.argv[2] || "";
const UDID = process.env.UDID;
const BUNDLE = process.env.BUNDLE_ID || "app.vela.manifest";
const SHOTS = path.resolve(process.env.SHOTS_DIR || "../shots");
const STATE = path.resolve(process.env.STATE_DIR || path.join(SHOTS, "state"));
const SRC = path.join(SHOTS, "src");
for (const d of [SHOTS, STATE, SRC]) fs.mkdirSync(d, { recursive: true });

const PREFIX = { drive101: "A", verify101: "B", drive11: "C" }[PHASE] ?? "Z";
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${PHASE}]`, `+${((Date.now() - T0) / 1000).toFixed(1)}s`, ...a);
const msg = (e) => String(e?.message ?? e).split("\n")[0];
const q = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/* ------------------------------------------------------------------ the user */
const NAME = "Maya";
const DESIRE = "my own design studio, with clients who trust my eye";
const PROOF_101 = "Sent my portfolio to two studios I admire.";
const SCRIPT_101 = "It is a Tuesday and the studio door is open. Two clients sent thank you notes this week.";
const GRATITUDE_101 = ["The coffee was warm", "My sister called"];
const PHRASE_369 = "I run a studio clients trust";
const GOALS_101 = ["A sign with my name above the door", "Three clients who refer friends"];
const PROOF_11 = "Quoted my first real client and they said yes.";

// The second dream a Plus owner added in 1.0.1 (1.0.1 engine text, fixture plus-two-dreams).
const SECOND = {
  focus: "abundance",
  desire: "A home by the sea",
  feeling: "peaceful",
  title: "After the Wanting",
  usedIds: ["op9", "ar-ab6", "se10", "li-ab3", "wi7", "gr1", "cl6", "t2"],
  paragraphs: [
    { fragmentId: "op9", text: "No scramble, no dread, no list running before your feet touch the floor. Just morning, and you, and the life that answered." },
    { fragmentId: "ar-ab6", text: "You tip well. You book the trip. You breathe. Enough stopped being a ceiling and became a floor: A home by the sea." },
    { fragmentId: "se10", text: "Your own handwriting in the margin of today's list looks different lately. Rounder. Unclenched." },
    { fragmentId: "li-ab3", text: "An opportunity lands in your inbox — the paid kind, the aligned kind. They find you regularly now, like the address finally got listed." },
    { fragmentId: "wi7", text: "Someone younger watches how you move through the day and quietly adjusts their own sails. You remember being them. You'd have loved proof like you." },
    { fragmentId: "gr1", text: "Gratitude arrives on its own now, uninvited, mid-afternoon — for the ordinary furniture of a life you once begged the sky for." },
    { fragmentId: "cl6", text: "Sleep takes you gently, the way it takes people with nothing to flee. Tomorrow will rhyme with today. That's the whole plan now." },
  ],
  action: "Move one small amount toward the future you described.",
  proof: "Saved the first two hundred for the deposit.",
  proofKind: "moved",
};
const SEEDED_GOALS = ["Studio rent paid six months ahead", "A shelf of my own published work"];
const PHOTO_CAPTION = "The corner studio on Elm";
const V1_KEYS = ["vela.stories.v1", "vela.ritual.v1", "vela.profile.v1", "vela.journal.v1", "vela.board.v1"];
const PLUS_KEY = "vela.plus.v1";

/* ------------------------------------------------------------------ results */
const results = [];
let pendingShots = [];
function record(name, status, detail, extra = {}) {
  results.push({ phase: PHASE, name, status, detail, shots: pendingShots, t: +((Date.now() - T0) / 1000).toFixed(1), ...extra });
  pendingShots = [];
  log(`${name} RESULT: ${status} — ${detail}`);
  writeResults();
}
function writeResults() {
  fs.writeFileSync(path.join(SHOTS, `results-${PHASE}.json`), JSON.stringify(results, null, 2));
}
const readJSON = (name) => JSON.parse(fs.readFileSync(path.join(STATE, name), "utf8"));
const writeJSON = (name, v) => fs.writeFileSync(path.join(STATE, name), JSON.stringify(v, null, 2));

/* ------------------------------------------------------------------ host side */
function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
const simctl = (...args) => run("xcrun", ["simctl", ...args]);
const dataContainer = () => simctl("get_app_container", UDID, BUNDLE, "data");

const STORE_REL = path.join("Library", "Application Support", BUNDLE, "RCTAsyncLocalStorage_V1");
const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");
const INLINE_MAX = 1024; // RCTInlineValueThreshold, in NSString (UTF-16) units

function openStore(container = dataContainer()) {
  const dir = path.join(container, STORE_REL);
  const mf = path.join(dir, "manifest.json");
  const manifest = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : {};
  const fileOf = (key) => path.join(dir, md5(key));
  const get = (key) => {
    if (!(key in manifest)) return undefined;
    const v = manifest[key];
    if (v !== null) return v;
    return fs.existsSync(fileOf(key)) ? fs.readFileSync(fileOf(key), "utf8") : undefined;
  };
  const set = (key, value) => {
    if (value.length <= INLINE_MAX) {
      if (manifest[key] === null && fs.existsSync(fileOf(key))) fs.unlinkSync(fileOf(key));
      manifest[key] = value;
    } else {
      fs.writeFileSync(fileOf(key), value, "utf8");
      manifest[key] = null;
    }
  };
  const save = () => {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${mf}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(manifest), "utf8");
    fs.renameSync(tmp, mf);
  };
  const keys = () => Object.keys(manifest).sort();
  const all = () => Object.fromEntries(keys().map((k) => [k, get(k)]));
  return { dir, container, manifest, get, set, save, keys, all, inFile: (k) => manifest[k] === null };
}

function dumpStore(name, container) {
  try {
    const s = openStore(container);
    const out = {};
    for (const k of s.keys()) {
      const v = s.get(k);
      let parsed = v;
      try {
        parsed = JSON.parse(v);
      } catch {
        // plain string
      }
      out[k] = { storedAs: s.inFile(k) ? `file ${md5(k)}` : "inline", length: v?.length ?? null, value: parsed };
    }
    writeJSON(`store-${name}.json`, out);
    log("store dumped", name, s.keys().length, "keys");
    return s;
  } catch (e) {
    log("store dump failed", name, msg(e));
    return null;
  }
}

/** 'On My iPhone' in the simulator's Files: the LocalStorage file provider's group container. */
function onMyIPhoneDir() {
  const groups = path.join(os.homedir(), "Library/Developer/CoreSimulator/Devices", UDID, "data/Containers/Shared/AppGroup");
  if (!fs.existsSync(groups)) return null;
  for (const g of fs.readdirSync(groups)) {
    const meta = path.join(groups, g, ".com.apple.mobile_container_manager.metadata.plist");
    if (!fs.existsSync(meta)) continue;
    let id = "";
    try {
      id = run("plutil", ["-extract", "MCMMetadataIdentifier", "raw", meta]);
    } catch {
      continue;
    }
    if (id === "group.com.apple.FileProvider.LocalStorage") {
      const d = path.join(groups, g, "File Provider Storage");
      fs.mkdirSync(d, { recursive: true });
      return d;
    }
  }
  return null;
}

function newestFile(dir, test, since) {
  let best = null;
  const walk = (d, depth) => {
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (depth < 4) walk(p, depth + 1);
      } else if (test(e.name)) {
        const m = fs.statSync(p).mtimeMs;
        if (m >= since && (!best || m > best.m)) best = { p, m };
      }
    }
  };
  walk(dir, 0);
  return best?.p ?? null;
}

/** A photo whose colours the app never uses (cyan, lime, magenta bands), as the JPEG 1.0.1 copied in. */
function makeBoardJpeg(dest) {
  if (!PNG) throw new Error("pngjs missing");
  const w = 900;
  const h = 1200;
  const png = new PNG({ width: w, height: h });
  const bands = [
    [0, 200, 255],
    [120, 255, 0],
    [255, 40, 160],
  ];
  for (let y = 0; y < h; y++) {
    const [r, g, b] = bands[Math.min(2, Math.floor((y / h) * 3))];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const stripe = (x + y) % 120 < 8 ? 0.85 : 1; // a little texture
      png.data[i] = Math.round(r * stripe);
      png.data[i + 1] = Math.round(g * stripe);
      png.data[i + 2] = Math.round(b * stripe);
      png.data[i + 3] = 255;
    }
  }
  const tmp = path.join(os.tmpdir(), `board-${Date.now()}.png`);
  fs.writeFileSync(tmp, PNG.sync.write(png));
  run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "85", tmp, "--out", dest]);
  fs.copyFileSync(dest, path.join(STATE, "seeded-board-photo.jpg"));
}

/* ------------------------------------------------------------------ appium */
let driver = null;
let win = { width: 430, height: 932 };

const caps = {
  platformName: "iOS",
  "appium:automationName": "XCUITest",
  "appium:udid": UDID,
  "appium:bundleId": BUNDLE,
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

async function connect() {
  for (let i = 1; i <= 3; i++) {
    try {
      driver = await remote({
        hostname: "127.0.0.1",
        port: 4723,
        path: "/",
        logLevel: "error",
        capabilities: caps,
        connectionRetryTimeout: 900000,
        connectionRetryCount: 0,
      });
      try {
        await driver.updateSettings({ waitForIdleTimeout: 0, animationCoolOffTimeout: 0, snapshotMaxDepth: 62 });
      } catch (e) {
        log("settings failed", msg(e));
      }
      try {
        const r = await driver.getWindowRect();
        win = { width: r.width, height: r.height };
      } catch {
        // keep the default
      }
      log("session", driver.sessionId, JSON.stringify(win));
      return driver;
    } catch (e) {
      log(`session attempt ${i}/3 failed:`, msg(e));
      if (i === 3) throw e;
      await sleep(15000);
    }
  }
  return null;
}

let shotN = 0;
async function shot(name) {
  shotN++;
  const file = `${PREFIX}${String(shotN).padStart(2, "0")}-${name}.png`;
  try {
    const buf = Buffer.from(await driver.takeScreenshot(), "base64");
    fs.writeFileSync(path.join(SHOTS, file), buf);
    pendingShots.push(file);
    log("shot", file);
    return PNG ? PNG.sync.read(buf) : null;
  } catch (e) {
    log("shot-failed", name, msg(e));
    return null;
  }
}
async function source(name) {
  try {
    const xml = await driver.getPageSource();
    fs.writeFileSync(path.join(SRC, `${PREFIX}${String(shotN).padStart(2, "0")}-${name}.xml`), xml);
    return xml;
  } catch (e) {
    log("source-failed", name, msg(e));
    return "";
  }
}

async function rectOfEl(el) {
  try {
    return await driver.getElementRect(el.elementId);
  } catch {
    return null;
  }
}
async function attr(el, name) {
  try {
    return await el.getAttribute(name);
  } catch {
    return null;
  }
}
/** Navigators keep hidden duplicates mounted: prefer a visible match, then one on this screen's x range. */
async function pick(selector) {
  let els = [];
  try {
    els = await driver.$$(selector);
  } catch {
    return null;
  }
  let onScreen = null;
  let first = null;
  for (const el of els) {
    if (!el?.elementId) continue;
    first ??= el;
    const v = await attr(el, "visible");
    if (v === "true" || v === true) return el;
    if (!onScreen) {
      const r = await rectOfEl(el);
      if (r && r.width > 0 && r.x > -2 && r.x < win.width - 2) onScreen = el;
    }
  }
  return onScreen ?? first;
}
async function find(selector, timeout = 8000) {
  const end = Date.now() + timeout;
  for (;;) {
    const el = await pick(selector);
    if (el) return el;
    if (Date.now() >= end) return null;
    await sleep(400);
  }
}
const exists = async (selector, timeout = 4000) => !!(await find(selector, timeout));
async function shownNow(selector) {
  try {
    for (const el of await driver.$$(selector)) {
      const v = await attr(el, "visible");
      if (v === "true" || v === true) return true;
    }
  } catch {
    // none
  }
  return false;
}
async function labelOf(selector, timeout = 3000) {
  const el = await find(selector, timeout);
  if (!el) return null;
  return (await attr(el, "label")) || (await attr(el, "value")) || (await attr(el, "name")) || "";
}
/** The words inside a container view (its label is empty; the Text children carry them). */
async function textsUnder(selector, timeout = 3000) {
  const el = await find(selector, timeout);
  if (!el) return null;
  try {
    const out = [];
    for (const k of await el.$$('-ios predicate string:type == "XCUIElementTypeStaticText"')) {
      const l = await attr(k, "label");
      if (l) out.push(l);
    }
    if (out.length) return out.join(" | ");
  } catch {
    // fall back to the label
  }
  const own = await attr(el, "label");
  return own && own !== selector.slice(1) ? own : "";
}
async function rectOf(selector, timeout = 3000) {
  const el = await find(selector, timeout);
  return el ? rectOfEl(el) : null;
}
async function count(selectors) {
  let n = 0;
  for (const s of selectors) if (await exists(s, 1500)) n++;
  return n;
}

async function keyboardRect() {
  try {
    for (const k of await driver.$$("-ios class chain:**/XCUIElementTypeKeyboard")) {
      const r = await rectOfEl(k);
      if (r && r.height > 60 && r.y < win.height - 10) return r;
    }
  } catch {
    // no keyboard
  }
  return null;
}

async function drag(fromY, toY) {
  try {
    await driver.execute("mobile: dragFromToForDuration", {
      duration: 0.25,
      fromX: Math.round(win.width / 2),
      fromY: Math.round(fromY),
      toX: Math.round(win.width / 2),
      toY: Math.round(toY),
    });
  } catch (e) {
    log("drag-failed", msg(e));
  }
  await sleep(700);
}
/** Reveal what is below (drags stay above the keyboard: a drag on it would be a swipe-to-type). */
async function scrollDown() {
  const kb = await keyboardRect();
  const from = kb ? kb.y - 24 : win.height * 0.72;
  await drag(from, Math.max(80, from - win.height * 0.34));
}
async function scrollUp() {
  const kb = await keyboardRect();
  const to = kb ? kb.y - 24 : win.height * 0.7;
  await drag(Math.max(120, to - win.height * 0.4), to);
}

/**
 * Bring an element on screen and out from under the keyboard, a dock or the
 * tab bar: XCUITest's 'hittable' says whether a tap on it lands on it.
 */
async function ensureVisible(el) {
  let last = null;
  for (let i = 0; i < 7; i++) {
    const r = await rectOfEl(el);
    if (!r) return false;
    const kb = await keyboardRect();
    const limit = kb ? kb.y : win.height;
    const center = r.y + Math.min(r.height, 120) / 2;
    const onScreen = center > 50 && center < limit - 8;
    if (onScreen) {
      const h = await attr(el, "hittable");
      if (h === "true" || h === true || i >= 3) return true;
    }
    if (last && Math.abs(last.y - r.y) < 2 && i > 0) return onScreen; // the page no longer moves
    last = r;
    if (center <= 50) await scrollUp();
    else await scrollDown();
  }
  return false;
}

async function clearAlerts(tag) {
  for (let i = 0; i < 3; i++) {
    let text;
    try {
      text = await driver.getAlertText();
    } catch {
      return;
    }
    log("system alert", tag, JSON.stringify(text));
    try {
      await driver.execute("mobile: alert", { action: "dismiss" });
    } catch {
      try {
        await driver.dismissAlert();
      } catch {
        // nothing
      }
    }
    await sleep(800);
  }
}

async function tap(selector, label, timeout = 10000, { scroll = true } = {}) {
  let el = await find(selector, timeout);
  if (!el) {
    await clearAlerts(label);
    el = await find(selector, 1500);
  }
  if (!el) {
    log("tap-failed", label, "(not found)", selector);
    return false;
  }
  if (scroll) await ensureVisible(el);
  try {
    await el.click();
    log("tapped", label);
    return true;
  } catch (e) {
    log("tap-failed", label, msg(e));
    return false;
  }
}
async function tapIfShown(selector, label) {
  if (!(await shownNow(selector))) return false;
  return tap(selector, label, 1500, { scroll: false });
}

async function typeInto(selector, text, label) {
  const el = await find(selector, 10000);
  if (!el) {
    log("type-failed", label, "(not found)");
    return null;
  }
  await ensureVisible(el);
  try {
    await el.click();
    await sleep(400);
    await el.setValue(text);
  } catch (e) {
    log("type-failed", label, msg(e));
  }
  await sleep(300);
  const v = await attr(el, "value");
  log("typed", label, JSON.stringify(v));
  return v;
}

const byLabel = (t, type) => `-ios predicate string:${type ? `type == "${type}" AND ` : ""}label == "${q(t)}"`;
const byLabelStarts = (t, type) => `-ios predicate string:${type ? `type == "${type}" AND ` : ""}(label BEGINSWITH "${q(t)}" OR name BEGINSWITH "${q(t)}")`;
const byLabelContains = (t) => `-ios predicate string:label CONTAINS "${q(t)}"`;

async function appState() {
  try {
    return await driver.execute("mobile: queryAppState", { bundleId: BUNDLE });
  } catch {
    return -1;
  }
}
/** 4 = running in the foreground. Anything else after a step is a crash (or the app left). */
async function alive(tag) {
  const s = await appState();
  if (s === 4) return true;
  record(`CRASH-${tag}`, "FAIL", `app state ${s} (4 = foreground) after ${tag}`);
  await shot(`not-running-${tag}`);
  try {
    await driver.execute("mobile: activateApp", { bundleId: BUNDLE });
    await sleep(4000);
  } catch {
    // stays down
  }
  return false;
}

async function section(name, fn) {
  try {
    const r = await fn();
    if (r) record(name, r.status, r.detail, r.extra ?? {});
  } catch (e) {
    await shot(`${name.toLowerCase()}-error`);
    record(name, "FAIL", `error: ${msg(e)}`);
  }
  if (driver) await alive(name);
}

/** Fraction of the seeded photo's colours (cyan, lime, magenta) in a rect (points). */
function census(png, r) {
  if (!png || !r) return null;
  const s = png.width / win.width;
  const x0 = Math.max(0, Math.round(r.x * s));
  const y0 = Math.max(0, Math.round(r.y * s));
  const x1 = Math.min(png.width, Math.round((r.x + r.width) * s));
  const y1 = Math.min(png.height, Math.round((r.y + r.height) * s));
  let total = 0;
  let seeded = 0;
  let sum = 0;
  let sum2 = 0;
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      const i = (y * png.width + x) * 4;
      const R = png.data[i];
      const G = png.data[i + 1];
      const B = png.data[i + 2];
      total++;
      const l = 0.299 * R + 0.587 * G + 0.114 * B;
      sum += l;
      sum2 += l * l;
      const max = Math.max(R, G, B);
      const min = Math.min(R, G, B);
      if (max < 140 || (max - min) / max < 0.55) continue;
      const d = max - min;
      let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
      h = (h * 60 + 360) % 360;
      if ((h >= 70 && h <= 115) || (h >= 170 && h <= 205) || (h >= 315 && h <= 345)) seeded++;
    }
  }
  if (!total) return null;
  const mean = sum / total;
  return { seeded: +(seeded / total).toFixed(3), lumaMean: +mean.toFixed(1), lumaSd: +Math.sqrt(Math.max(0, sum2 / total - mean * mean)).toFixed(1) };
}

/** 'Listening · 1:23 left' → 83 (seconds), else null. */
function leftSeconds(status) {
  const m = /(\d+):(\d\d) left/.exec(status ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/* ------------------------------------------------------------------ system sheets */
const SHARE_MARKERS = /ShareSheet\.RemoteContainerView|ActivityListView|UIActivityContentView|"Save Image"|"Save to Files"|"AirDrop"/;

/** Can a tap still reach this element? (null when it is not there at all.) */
async function hittable(selector) {
  const el = await find(selector, 1500);
  if (!el) return null;
  const h = await attr(el, "hittable");
  return h === "true" || h === true;
}

/**
 * Wait for a system sheet (share sheet, document picker) over the app. Its own
 * content is a remote view that XCUITest only sometimes sees, so two signals:
 * its elements in the tree, or the app element `ref` (tappable before) no
 * longer taking taps because the sheet's presentation covers it.
 */
async function waitForSystemSheet(tag, ref, markers = SHARE_MARKERS, timeout = 14000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const xml = await source(`${tag}-probe`);
    const m = markers.exec(xml);
    if (m) return { shown: true, how: `its elements are in the accessibility tree (${m[0]})` };
    if (ref && (await hittable(ref)) === false) return { shown: true, how: `the app under it stopped taking taps ('${ref.slice(1)}' covered)` };
    await sleep(1000);
  }
  return { shown: false, how: null };
}

/** Dismiss a share sheet: its Close button when XCUITest sees it, else swipe it down until `ref` takes taps again. */
async function closeSystemSheet(ref) {
  const gone = async () => !SHARE_MARKERS.test(await source("share-close-probe")) && (ref ? (await hittable(ref)) !== false : true);
  for (const sel of [
    '-ios predicate string:type == "XCUIElementTypeButton" AND (label == "Close" OR name == "Close" OR name == "header.closeButton")',
    '-ios predicate string:type == "XCUIElementTypeButton" AND (label == "Cancel" OR name == "Cancel")',
  ]) {
    if (await tapIfShown(sel, "close the system sheet")) {
      await sleep(1500);
      if (await gone()) return true;
    }
  }
  for (const from of [0.66, 0.5, 0.8, 0.4]) {
    await drag(win.height * from, win.height * 0.99);
    await sleep(1800);
    if (await gone()) {
      log(`system sheet closed by a swipe from ${from}`);
      return true;
    }
  }
  log("the system sheet would not close");
  return false;
}

/** The current page source holds this text (XML-escaped as WDA writes it). */
async function sourceHas(text, tag) {
  const esc = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const xml = await source(tag);
  return xml.includes(esc) || xml.includes(String(text));
}

/* ------------------------------------------------------------------ 1.0.1 tab bar */
async function tab101(name) {
  const ok = await tap(byLabelStarts(name, "XCUIElementTypeButton"), `${name} tab`, 8000, { scroll: false });
  await sleep(1200);
  return ok;
}

/* ================================================================== drive101 */
async function drive101() {
  await connect();
  await sleep(5000);

  await section("A-LAUNCH-101", async () => {
    await shot("welcome");
    await source("welcome");
    const ok = await exists("~onboarding-next", 20000);
    return { status: ok ? "PASS" : "FAIL", detail: ok ? "1.0.1 opens on its welcome beat" : "no welcome CTA" };
  });

  await section("A-ONBOARDING-101", async () => {
    await tap("~onboarding-next", "Begin");
    await sleep(1200);
    await tap("~focus-career", "Career");
    await shot("focus");
    await tap("~onboarding-next", "Continue focus");
    await sleep(1000);
    const mood = await tap("~mood-hopeful", "mood: Hopeful");
    await shot("mood");
    await tap("~onboarding-next", "Continue mood");
    await sleep(1000);
    await typeInto("~name-input", NAME, "name");
    await tap("~onboarding-next", "Continue name");
    await sleep(1000);
    await tap("~ritual-evening", "Evening");
    await tap("~onboarding-next", "Continue ritual");
    await sleep(1200);
    await shot("practice-primer");
    const primer = await exists("~onboarding-done", 8000);
    await tap("~onboarding-done", "Create my future-memory arc");
    await sleep(2500);
    const ok = mood && primer;
    return { status: ok ? "PASS" : "FAIL", detail: `welcome → focus → mood (${mood ? "chosen" : "missing"}) → name → ritual → primer (${primer ? "reached" : "missing"})` };
  });

  await section("A-STORY-101", async () => {
    const intake = await exists("~intake-desire", 12000);
    await tap("~intake-focus-career", "intake focus career", 3000);
    await tap("~intake-feeling-proud", "feeling proud");
    const typed = await typeInto("~intake-desire", DESIRE, "desire");
    await shot("intake");
    await tap("~intake-weave", "Step inside");
    await sleep(9000); // the reveal cascade
    const listen = await exists("~story-listen", 10000);
    await shot("chapter-1");
    const ok = intake && listen;
    return { status: ok ? "PASS" : "FAIL", detail: `intake ${intake ? "shown" : "missing"}; desire typed ${JSON.stringify(typed)}; chapter ${listen ? "rendered" : "missing"}` };
  });

  await section("A-PROOF-101", async () => {
    if (await exists("~soft-plus-later", 3000)) await tap("~soft-plus-later", "soft Plus: Maybe later");
    const toProof = await tap("~story-record-proof", "Make it observable", 12000);
    await sleep(1500);
    await tap("~evidence-kind-did", "I did it");
    const typed = await typeInto("~evidence-note", PROOF_101, "proof");
    await shot("proof-form");
    await tap("~evidence-save", "Add to my future memory");
    const saved = await exists("~evidence-finish", 10000);
    await sleep(800);
    await shot("proof-saved");
    await tap("~evidence-finish", "Carry it forward");
    await sleep(2000);
    const ok = toProof && saved;
    return { status: ok ? "PASS" : "FAIL", detail: `proof ${JSON.stringify(typed)} ${saved ? "saved" : "NOT saved"}` };
  });

  await section("A-CHAPTER-2-101", async () => {
    const weave = await exists("~weave-next-chapter", 10000);
    await shot("today-proof-folded");
    await tap("~weave-next-chapter", "Weave chapter 2");
    await sleep(9000);
    const ch2 = await exists("~story-listen", 10000);
    await shot("chapter-2");
    await tap("~story-back", "back to Today");
    await sleep(1500);
    const chip = await exists("~streak-chip", 6000);
    await shot("today-chapter-2");
    const ok = weave && ch2;
    return { status: ok ? "PASS" : "FAIL", detail: `weave button ${weave ? "shown" : "missing"}, chapter 2 ${ch2 ? "rendered" : "missing"}, streak chip ${chip}` };
  });

  await section("A-JOURNAL-101", async () => {
    await tab101("Journal");
    await tap("~door-script", "Script door");
    const s = await typeInto("~script-input", SCRIPT_101, "script");
    await shot("script");
    await tap("~script-save", "Seal the page");
    await sleep(1500);
    await tap("~door-gratitude", "Gratitude door");
    await typeInto("~gratitude-0", GRATITUDE_101[0], "gratitude 1");
    await typeInto("~gratitude-1", GRATITUDE_101[1], "gratitude 2");
    await shot("gratitude");
    await tap("~gratitude-save", "Keep these 2");
    await sleep(1500);
    await tap("~door-369", "3·6·9 door");
    await typeInto("~phrase-input", PHRASE_369, "phrase");
    await tap("~phrase-set", "Begin practice");
    await sleep(1200);
    await tap("~rep-write", "rep 1");
    await sleep(700);
    await tap("~rep-write", "rep 2");
    await sleep(700);
    const p = await labelOf("~progress-369");
    await shot("369");
    await tap("~m369-close", "close 3·6·9");
    await sleep(1200);
    await shot("journal-pages");
    const j = JSON.parse(openStore().get("vela.journal.v1") ?? "{}");
    const kinds = (j.entries ?? []).map((e) => e.kind);
    const reps = ["morning", "afternoon", "evening"].reduce((n, k) => n + (j.sheet?.[k]?.length ?? 0), 0);
    const ok = kinds.includes("script") && kinds.includes("gratitude") && reps >= 2;
    return { status: ok ? "PASS" : "FAIL", detail: `stored pages ${JSON.stringify(kinds)}, 3·6·9 reps ${reps} (${p}); script typed ${JSON.stringify(s)}` };
  });

  await section("A-BOARD-101", async () => {
    await tab101("Board");
    let extraTaps = 0;
    for (const g of GOALS_101) {
      await tap("~board-add-goal", "add a goal card");
      await typeInto("~goal-input", g, "goal");
      // 1.0.1's board ScrollView has no keyboardShouldPersistTaps: with the keyboard up, the
      // first tap on 'Pin it' only dismisses the keyboard (a user taps twice too).
      for (let i = 0; i < 3 && (await shownNow("~goal-input")); i++) {
        await tap("~goal-save", "Pin it", 3000);
        await sleep(1200);
        if (i > 0) extraTaps++;
      }
    }
    await shot("board");
    const b = JSON.parse(openStore().get("vela.board.v1") ?? "[]");
    const ok = b.filter((c) => c.kind === "goal").length >= 2;
    return { status: ok ? "PASS" : "FAIL", detail: `stored board cards: ${b.length} (extra 'Pin it' taps needed with the keyboard up: ${extraTaps})` };
  });

  await tab101("Stories");
  await shot("stories");
  await section("A-ALIVE-101", async () => ({ status: (await appState()) === 4 ? "PASS" : "FAIL", detail: `app state ${await appState()} at the end of the 1.0.1 walk` }));
  await endSession();

  await section("A-STORE-101", async () => {
    const s = dumpStore("after-101-ui");
    const present = V1_KEYS.filter((k) => s?.get(k) !== undefined);
    const files = (s?.keys() ?? []).filter((k) => s.inFile(k));
    // RNCAsyncStorage names big values md5(key): prove this script reads the store the way the app does.
    const md5ok = files.every((k) => fs.existsSync(path.join(s.dir, md5(k))));
    const ok = present.length === V1_KEYS.length && md5ok;
    return { status: ok ? "PASS" : "FAIL", detail: `v1 keys present: ${present.join(", ")}; values in md5 files: ${files.join(", ") || "none"} (${md5ok ? "names match md5(key)" : "NAME MISMATCH"}); plus=${s?.get(PLUS_KEY)}` };
  });
}

async function endSession() {
  try {
    await driver?.deleteSession();
  } catch {
    // gone
  }
  driver = null;
}

/* ================================================================== seed */
function seed() {
  const c = dataContainer();
  const s = openStore(c);
  const stories = JSON.parse(s.get("vela.stories.v1"));
  const main = stories.intents[0];
  const mainStory = stories.stories.find((x) => x.intentId === main.id);
  const mainActions = stories.actions.filter((a) => a.intentId === main.id);
  const mainProof = mainActions.find((a) => a.state === "completed");
  const mainOpen = mainActions.find((a) => a.state !== "completed");
  const iso = (ms) => new Date(ms).toISOString();
  const id36 = (ms) => `${Math.floor(ms).toString(36)}-${crypto.randomInt(1e9).toString(36)}`;
  const tMain = Date.parse(main.createdAt);
  const now = Date.now();
  const span = Math.max(4000, now - tMain);

  // A Plus owner added a second dream after the first (1.0.1 prepends it); its proof is saved and the
  // next chapter not woven yet (the other v1 migration case).
  const t2 = tMain + span * 0.3;
  const second = { id: id36(t2), focus: SECOND.focus, desire: SECOND.desire, feeling: SECOND.feeling, createdAt: iso(t2), usedIds: SECOND.usedIds, chapter: 1 };
  const secondStory = { id: id36(t2 + 40), intentId: second.id, title: SECOND.title, paragraphs: SECOND.paragraphs, createdAt: iso(t2 + 40) };
  const secondAction = {
    id: id36(t2 + 41),
    intentId: second.id,
    storyId: secondStory.id,
    text: SECOND.action,
    state: "completed",
    createdAt: iso(t2 + 41),
    evidence: SECOND.proof,
    evidenceKind: SECOND.proofKind,
    completedAt: iso(tMain + span * 0.5),
  };
  stories.intents = [second, ...stories.intents];
  stories.stories = [secondStory, ...stories.stories];
  stories.actions = [secondAction, ...stories.actions];
  s.set("vela.stories.v1", JSON.stringify(stories));

  // More board cards than the free three, and a photo 1.0.1 copied into Documents
  // ('board-<id>.jpg') whose stored URI still names the container before an update.
  const board = JSON.parse(s.get("vela.board.v1") ?? "[]");
  const tB = tMain + span * 0.6;
  const photoId = id36(tB);
  const photoName = `board-${photoId}.jpg`;
  const docs = path.join(c, "Documents");
  fs.mkdirSync(docs, { recursive: true });
  makeBoardJpeg(path.join(docs, photoName));
  const uuid = /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  const fakeUuid = crypto.randomUUID().toUpperCase();
  const fakeContainer = c.replace(uuid, fakeUuid);
  if (fakeContainer === c) throw new Error(`no container UUID in ${c}`);
  const storedUri = `file://${fakeContainer}/Documents/${photoName}`;
  const seeded = [
    { id: photoId, kind: "photo", uri: storedUri, caption: PHOTO_CAPTION, createdAt: iso(tB) },
    { id: id36(tB + 10), kind: "goal", text: SEEDED_GOALS[0], createdAt: iso(tB + 10) },
    { id: id36(tB + 20), kind: "goal", text: SEEDED_GOALS[1], createdAt: iso(tB + 20) },
  ];
  // 1.0.1 keeps the newest card first; these are older than the two made in the UI.
  board.push(...seeded.reverse());
  s.set("vela.board.v1", JSON.stringify(board));
  s.set(PLUS_KEY, "1");
  s.save();

  const journal = JSON.parse(s.get("vela.journal.v1") ?? "{}");
  const expect = {
    container: c,
    name: JSON.parse(s.get("vela.profile.v1")).name,
    main: {
      id: main.id,
      desire: main.desire,
      storyId: mainStory?.id,
      storyTitle: mainStory?.title,
      chapter: main.chapter,
      proofId: mainProof?.id,
      proofText: mainProof?.evidence,
      openActionId: mainOpen?.id,
      openActionText: mainOpen?.text,
    },
    second: { id: second.id, desire: second.desire, storyId: secondStory.id, proofId: secondAction.id, proofText: secondAction.evidence },
    journal: (journal.entries ?? []).map((e) => ({ id: e.id, kind: e.kind, text: e.text })),
    sheet: journal.sheet ?? null,
    phrase369: journal.phrase369 ?? null,
    board: board.map((b) => ({ id: b.id, kind: b.kind, text: b.text ?? null, caption: b.caption ?? null })),
    photo: { id: photoId, file: path.join(docs, photoName), storedUri, realUri: `file://${docs}/${photoName}`, fakeUuid },
  };
  writeJSON("expect.json", expect);
  dumpStore("seeded", c);
  record("SEED", "PASS", `plus=1; second dream '${second.desire}' (${second.id}, proof saved, not woven); board ${board.length} cards incl. photo ${photoName} stored as ${storedUri} (file in the real Documents)`);
}

/* ================================================================== verify101 */
async function verify101() {
  const exp = readJSON("expect.json");
  await connect();
  await sleep(6000);
  await shot("today-101-seeded");
  await section("B-SEED-READ-BY-101", async () => {
    await tab101("Stories");
    const stories = await count([`~story-card-${exp.main.id}`, `~story-card-${exp.second.id}`]);
    await shot("stories-101-two-dreams");
    await tab101("Board");
    await sleep(1000);
    const cards = await count(exp.board.map((b) => `~board-card-${b.id}`));
    await shot("board-101-seeded");
    await scrollDown();
    await shot("board-101-seeded-end");
    const ok = stories === 2 && cards === exp.board.length;
    return { status: ok ? "PASS" : "FAIL", detail: `1.0.1 shows ${stories}/2 dreams and ${cards}/${exp.board.length} board cards from the seeded store` };
  });
  await endSession();
  await sleep(1500);
  const plus = openStore().get(PLUS_KEY);
  record("B-PLUS-AFTER-101-RELAUNCH", "INFO", `vela.plus.v1 after 1.0.1 ran its own launch entitlement refresh on a simulator with no App Store purchase: ${JSON.stringify(plus)}`);
}

/* ================================================================== reseed */
function reseed() {
  const s = openStore();
  const before = s.get(PLUS_KEY);
  s.set(PLUS_KEY, "1");
  s.save();
  const base = {};
  for (const k of [...V1_KEYS, PLUS_KEY]) base[k] = s.get(k) ?? null;
  writeJSON("baseline-v1.json", base);
  dumpStore("before-update");
  record("RESEED", "PASS", `vela.plus.v1 ${JSON.stringify(before)} → "1"; baseline of the v1 keys saved`);
}

/* ================================================================== drive11 */
async function drive11() {
  const exp = readJSON("expect.json");
  const c = dataContainer();
  record("C-CONTAINER", "INFO", `data container after the update: ${c}; 1.0.1's: ${exp.container}; ${c === exp.container ? "the same path (simctl keeps it; the seeded photo URI names a fake older one)" : "MOVED"}`);

  // Watch the store from the host: when migration writes, and when the Plus cache changes.
  const timeline = [];
  let lastPlus;
  let lastKeys = "";
  const tWatch = Date.now();
  const poll = () => {
    try {
      const s = openStore(c);
      const p = s.get(PLUS_KEY) ?? null;
      const ks = s.keys().join(",");
      const t = Date.now() - tWatch;
      if (p !== lastPlus) {
        timeline.push({ t, plus: p });
        if (lastPlus !== undefined) log(`PLUS vela.plus.v1 ${JSON.stringify(lastPlus)} → ${JSON.stringify(p)} at +${t}ms`);
        lastPlus = p;
      }
      if (ks !== lastKeys) {
        timeline.push({ t, keys: s.keys() });
        lastKeys = ks;
      }
    } catch {
      // mid-write; next tick
    }
  };
  poll();
  const watcher = setInterval(poll, 250);

  await connect(); // the first launch of 1.1 on this device
  const tSession = Date.now() - tWatch;
  log(`session ready +${tSession}ms after the watch began`);

  await section("C-LAUNCH", async () => {
    const today = await exists("~today-screen", 30000);
    await sleep(1500);
    await shot("first-launch");
    await source("first-launch");
    const onboarding = (await exists("~onboarding", 1000)) || (await exists("~onboarding-next", 500));
    const storageError = await exists("~storage-error", 500);
    const state = await appState();
    const ok = today && !onboarding && !storageError && state === 4;
    return {
      status: ok ? "PASS" : "FAIL",
      detail: `Today ${today ? "shown" : "MISSING"}; onboarding ${onboarding ? "SHOWN AGAIN" : "not shown"}; storage-error ${storageError ? "SHOWN" : "no"}; app state ${state}`,
    };
  });

  await section("C-TODAY", async () => {
    const greeting = await labelOf("~today-greeting");
    const chip = await labelOf("~streak-chip");
    const hero = await labelOf("~proof-constellation");
    const card = await labelOf("~future-memory-card");
    const pillMain = await labelOf(`~arc-switch-${exp.main.id}`);
    const pillSecond = await labelOf(`~arc-switch-${exp.second.id}`);
    const lit = /(\d+) of 7/.exec(hero ?? "");
    const ok = (greeting ?? "").includes(exp.name) && !!pillMain && !!pillSecond && !!lit && Number(lit[1]) >= 1;
    return {
      status: ok ? "PASS" : "FAIL",
      detail: `greeting ${JSON.stringify(greeting)}; chip ${JSON.stringify(chip)}; sky ${JSON.stringify(hero)}; dream pills ${JSON.stringify(pillMain)} + ${JSON.stringify(pillSecond)}; loop card ${JSON.stringify(card)}`,
    };
  });

  let mainWeaving = false;
  await section("C-TODAY-MAIN-DREAM", async () => {
    await tap(`~arc-switch-${exp.main.id}`, "the first dream's pill", 4000, { scroll: false });
    await sleep(1800);
    const hero = await labelOf("~proof-constellation");
    const card = await labelOf("~future-memory-card");
    const crossed = await exists("~record-proof", 2500);
    const wake = !crossed && (await exists("~today-wake-dream", 1500));
    mainWeaving = crossed;
    await shot("today-first-dream");
    const bridgeKept = crossed && (card ?? "").includes((exp.main.openActionText ?? "").slice(0, 24));
    return {
      status: crossed || wake ? "PASS" : "FAIL",
      detail: `sky ${JSON.stringify(hero)}; loop card ${JSON.stringify(card)}; ${crossed ? `bridge open with 'I crossed it' (1.0.1 bridge text kept: ${bridgeKept})` : wake ? "plan-locked: 'Keep this dream weaving' (Plus is off on this simulator)" : "neither the bridge nor the wake card"}`,
    };
  });

  await section("C-SETTINGS-NAME", async () => {
    await tap("~open-settings", "Settings");
    await exists("~settings-screen", 8000);
    const name = await labelOf("~settings-name-row", 6000);
    const plusOn = await exists("~settings-plus-status", 1500);
    const plusOff = !plusOn && (await exists("~settings-upgrade", 1500));
    await shot("settings");
    await tap("~settings-back", "Settings back", 4000, { scroll: false });
    await sleep(1000);
    return {
      status: (name ?? "").includes(exp.name) ? "PASS" : "FAIL",
      detail: `name row ${JSON.stringify(name)}; Vela Plus row: ${plusOn ? "'Plus is on'" : plusOff ? "'Vela Plus' (free)" : "not found"} at +${((Date.now() - tWatch) / 1000).toFixed(1)}s`,
    };
  });

  await section("C-ARC", async () => {
    await tap("~tab-arc", "Arc tab", 8000, { scroll: false });
    await exists("~arc-screen", 8000);
    await tap(`~arc-dream-${exp.main.id}`, "Arc: the first dream", 3000, { scroll: false });
    await sleep(1500);
    const chapter = await labelOf(`~arc-chapter-${exp.main.storyId}`, 5000);
    const proof = await labelOf(`~arc-proof-${exp.main.proofId}`, 3000);
    const stage = await labelOf("~arc-season-stage", 1500);
    const stats = await labelOf("~arc-stats", 1500);
    await shot("arc-first-dream");
    if (!proof) {
      await scrollDown();
      await shot("arc-first-dream-scrolled");
    }
    const ok = !!chapter && !!proof;
    return { status: ok ? "PASS" : "FAIL", detail: `chapter plate ${JSON.stringify(chapter)}; proof node ${JSON.stringify(proof)}; ${JSON.stringify(stage)} · ${JSON.stringify(stats)}` };
  });

  await section("C-SECOND-DREAM", async () => {
    await tap(`~arc-dream-${exp.second.id}`, "Arc: the second dream", 4000, { scroll: false });
    await sleep(1500);
    const ch = await labelOf(`~arc-chapter-${exp.second.storyId}`, 5000);
    const woven = await labelOf(`~arc-chapter-${exp.second.storyId}-w`, 3000);
    const proof = await labelOf(`~arc-proof-${exp.second.proofId}`, 3000);
    const header = await labelOf("~arc-dream-name", 1500);
    await shot("arc-second-dream");
    const ok = !!ch && !!woven && !!proof;
    return {
      status: ok ? "PASS" : "FAIL",
      detail: `'${exp.second.desire}': ${JSON.stringify(header)}; its 1.0 chapter ${JSON.stringify(ch)}; the chapter migration wove from its saved proof ${JSON.stringify(woven)}; proof ${JSON.stringify(proof)}`,
    };
  });

  await section("C-RITUALS-PAGES", async () => {
    await tap("~tab-rituals", "Rituals tab", 8000, { scroll: false });
    await exists("~rituals-screen", 8000);
    await shot("rituals");
    const found = [];
    for (const e of exp.journal) {
      const el = await find(`~page-${e.id}`, 3000);
      if (el) {
        await ensureVisible(el);
        found.push({ kind: e.kind, label: await attr(el, "label") });
      }
    }
    await shot("rituals-past-pages");
    let text = null;
    const script = exp.journal.find((e) => e.kind === "script");
    if (script && (await tap(`~page-${script.id}`, "the 1.0.1 script page", 3000))) {
      await exists("~entry-text", 6000);
      await sleep(800);
      text = (await sourceHas((script?.text ?? "").slice(0, 40), "past-page-script")) ? script.text : await textsUnder("~entry-text", 2000);
      await shot("past-page-script");
      await tap("~entry-back", "page back", 4000, { scroll: false });
      await sleep(1000);
    }
    const ok = found.length === exp.journal.length && !!text && text.includes((script?.text ?? "").slice(0, 30));
    return { status: ok ? "PASS" : "FAIL", detail: `${found.length}/${exp.journal.length} 1.0.1 pages listed ${JSON.stringify(found)}; the script page reads ${JSON.stringify(text)}` };
  });

  await section("C-369", async () => {
    const door = await labelOf("~door-369", 3000);
    await tap("~door-369", "3·6·9 door");
    const p = await labelOf("~progress-369", 6000);
    const phrase = await labelOf("~m369-phrase", 1500);
    await shot("369");
    await tap("~m369-close", "close 3·6·9", 4000, { scroll: false });
    await sleep(1000);
    const n = /(\d+)/.exec(p ?? "");
    return { status: n && Number(n[1]) >= 2 ? "PASS" : "FAIL", detail: `door ${JSON.stringify(door)}; sheet ${JSON.stringify(p)}; phrase ${JSON.stringify(phrase)} (1.0.1 wrote 2 lines today)` };
  });

  await section("C-KEYBOARD-SCRIPT", async () => {
    await tap("~door-script", "Script door");
    await exists("~script-screen", 6000);
    const input = await find("~script-input", 5000);
    if (input) await input.click();
    await sleep(1500);
    const kb = await keyboardRect();
    const cta = await rectOf("~script-save", 3000);
    const fieldR = await rectOf("~script-input", 2000);
    await shot("script-keyboard");
    await tap("~script-close", "close Script", 4000, { scroll: false });
    await sleep(800);
    await clearConfirm();
    if (!kb) return { status: "NOT-TESTABLE", detail: `no software keyboard came up (CTA rect ${JSON.stringify(cta)})` };
    const ok = !!cta && cta.y >= 0 && cta.y + cta.height <= kb.y + 1;
    const seen = !!fieldR && !!cta && fieldR.y >= 60 && fieldR.y + 44 <= cta.y - 16;
    return { status: ok && seen ? "PASS" : "FAIL", detail: `'Seal the page' ${JSON.stringify(cta)} vs keyboard top ${kb.y}; the page's field ${JSON.stringify(fieldR)} ${seen ? "visible" : "HIDDEN"} above the dock` };
  });

  await section("C-SCENES-PHOTO", async () => {
    if (!(await exists("~rituals-screen", 2000))) await tap("~tab-rituals", "Rituals tab", 6000, { scroll: false });
    await tap("~rituals-scenes", "Scenes: See all");
    await exists("~scenes-screen", 8000);
    await sleep(1500);
    const cards = [];
    for (const b of exp.board) if (await exists(`~board-card-${b.id}`, 2000)) cards.push(b.id);
    await shot("scenes");
    const el = await find(`~board-card-${exp.photo.id}`, 3000);
    let grid = null;
    let r = null;
    if (el) {
      await ensureVisible(el);
      await sleep(1200);
      r = await rectOfEl(el);
      // The grid's 'Room for more' dock covers the bottom ~130pt: bring the whole card above it.
      if (r && r.y + r.height > win.height - 130) {
        await drag(win.height * 0.7, win.height * 0.7 - Math.max(80, r.y + r.height - (win.height - 150)));
        r = await rectOfEl(el);
      }
      const seen = r ? { x: r.x, y: Math.max(r.y, 60), width: r.width, height: Math.max(0, Math.min(r.y + r.height, win.height - 130) - Math.max(r.y, 60)) } : null;
      grid = census(await shot("scenes-photo-card"), seen);
    }
    // The scene sheet: its StoredPhoto is 'scene-photo', its placeholder 'scene-photo-missing'.
    let sheetPhoto = null;
    let missing = null;
    let sheetCensus = null;
    if (el && (await tap(`~board-card-${exp.photo.id}`, "open the photo scene", 3000))) {
      await exists("~scene-detail", 6000);
      await sleep(2500);
      missing = await exists("~scene-photo-missing", 1000);
      const pr = await rectOf("~scene-photo", 2000);
      sheetPhoto = !!pr;
      sheetCensus = census(await shot("scene-photo-sheet"), pr);
      if (!(await tap("~scene-save", "Done", 2000, { scroll: false }))) await tap("~scene-detail-scrim", "close the scene", 2000, { scroll: false });
      await sleep(1200);
    }
    let stored = null;
    try {
      const v2 = JSON.parse(openStore(c).get("vela.scenes.v2") ?? "null");
      stored = v2?.cards?.find((x) => x.id === exp.photo.id)?.uri ?? null;
    } catch {
      // unreadable
    }
    await tap("~scenes-back", "Scenes back", 3000, { scroll: false });
    await sleep(1000);
    const rendered = (grid?.seeded ?? 0) >= 0.2 || (sheetCensus?.seeded ?? 0) >= 0.2;
    const status = !PNG ? "NOT-TESTABLE" : rendered && !missing && cards.length === exp.board.length ? "PASS" : "FAIL";
    return {
      status,
      detail: `${cards.length}/${exp.board.length} board cards in Scenes; photo card rect ${JSON.stringify(r)} seeded-colour share ${JSON.stringify(grid)}; sheet photo ${sheetPhoto} placeholder 'kept on another phone' ${missing ? "SHOWN" : "not shown"} share ${JSON.stringify(sheetCensus)}; vela.scenes.v2 stores ${JSON.stringify(stored)} (1.0.1 stored ${exp.photo.storedUri})`,
    };
  });

  await section("C-EXPORT", async () => {
    await toToday();
    await tap("~open-settings", "Settings");
    await exists("~settings-screen", 8000);
    const tExport = Date.now() - 2000;
    const exportRow = await find("~settings-export", 8000);
    if (exportRow) await ensureVisible(exportRow);
    const refOk = await hittable("~settings-back");
    await tap("~settings-export", "Export a backup", 8000);
    const sheet = await waitForSystemSheet("export", refOk ? "~settings-back" : null);
    await shot("export-share-sheet");
    const file = newestFile(path.join(c, "Library", "Caches"), (n) => /^vela-backup-.*\.json$/.test(n), tExport);
    let placed = null;
    let summary = null;
    if (file) {
      fs.copyFileSync(file, path.join(STATE, "backup-exported.json"));
      try {
        const b = JSON.parse(fs.readFileSync(file, "utf8"));
        summary = { keys: Object.keys(b), exportedAt: b.exportedAt, appVersion: b.appVersion };
      } catch {
        // kept as is
      }
      const dir = onMyIPhoneDir();
      if (dir) {
        placed = path.join(dir, path.basename(file));
        fs.copyFileSync(file, placed);
      }
    }
    const closed = sheet.shown ? await closeSystemSheet(refOk ? "~settings-back" : null) : false;
    await shot("export-after-sheet");
    await sleep(800);
    const toast = (await sourceHas("Your backup file is ready", "export-toast")) ? "Your backup file is ready…" : await textsUnder("~toast", 2000);
    return {
      status: sheet.shown ? "PASS" : "FAIL",
      detail: `share sheet ${sheet.shown ? `presented: ${sheet.how}` : "NOT detected"}${sheet.shown ? `, ${closed ? "then closed" : "would NOT close"}` : ""}; file ${file ? path.basename(file) : "not found in Library/Caches"} ${JSON.stringify(summary)}; toast ${JSON.stringify(toast)}; copied into On My iPhone: ${placed ?? "no"}`,
      extra: { backupFile: file, placed },
    };
  });
  const exportResult = results.find((r) => r.name === "C-EXPORT");

  await section("C-CHART-PROOF", async () => {
    await tap("~settings-back", "Settings back", 4000, { scroll: false });
    await sleep(1000);
    await tap(`~arc-switch-${exp.main.id}`, "the first dream's pill", 3000, { scroll: false });
    await sleep(1500);
    let woke = false;
    if (!(await exists("~record-proof", 2000)) && (await exists("~today-wake-dream", 1500))) {
      woke = await tap("~today-wake-dream", "Keep this dream weaving");
      await sleep(2000);
    }
    await shot("today-before-proof");
    if (!(await tap("~record-proof", "I crossed it", 5000))) return { status: "FAIL", detail: `no 'I crossed it' on the first dream (woke ${woke})` };
    await exists("~evidence-screen", 8000);
    await tap("~evidence-kind-did", "I did it", 4000);
    const fieldBefore = await rectOf("~evidence-note", 3000);
    await shot("proof-form");
    const typed = await typeInto("~evidence-note", PROOF_11, "proof");
    await sleep(800);
    const kb = await keyboardRect();
    const cta = await rectOf("~evidence-save", 3000);
    const field = await rectOf("~evidence-note", 2000);
    await shot("proof-form-keyboard");
    await source("proof-form-keyboard");
    const dockOk = kb ? !!cta && cta.y >= 0 && cta.y + cta.height <= kb.y + 1 : null;
    // The words being typed: the field's first lines must sit between the header and the dock's top.
    const dockTop = cta ? cta.y - 16 : kb ? kb.y : win.height;
    const fieldSeen = !!field && field.y >= 60 && field.y + Math.min(field.height, 44) <= dockTop;
    record(
      "C-KEYBOARD-PROOF-FIELD",
      kb ? (fieldSeen ? "PASS" : "FAIL") : "NOT-TESTABLE",
      kb ? `the sentence field (before the keyboard ${JSON.stringify(fieldBefore)}) ${JSON.stringify(field)} vs the dock's top ~${Math.round(dockTop)} (keyboard top ${kb.y}): ${fieldSeen ? "visible while typing" : "HIDDEN under the dock and keyboard while the user types into it"}` : "no software keyboard"
    );
    record(
      "C-KEYBOARD-PROOF",
      kb ? (dockOk ? "PASS" : "FAIL") : "NOT-TESTABLE",
      kb ? `'Chart this proof' ${JSON.stringify(cta)} vs keyboard top ${kb.y}: ${dockOk ? "fully above the keyboard" : "COVERED"}` : `no software keyboard came up (CTA ${JSON.stringify(cta)})`
    );
    await tap("~evidence-save", "Chart this proof", 4000, { scroll: false });
    const birth = (await exists("~evidence-star-birth", 10000)) || (await exists("~evidence-birth", 2000));
    await sleep(1200);
    await shot("star-birth-flight");
    const finish = await exists("~evidence-finish", 20000);
    await sleep(800);
    await shot("star-birth");
    await clearAlerts("after Star Birth");
    return { status: birth && finish ? "PASS" : "FAIL", detail: `proof ${JSON.stringify(typed)}; Star Birth ${birth ? "shown" : "MISSING"}, 'Carry it forward' ${finish ? "shown" : "MISSING"}${woke ? " (after 'Keep this dream weaving')" : ""}` };
  });

  await section("C-SHARE-STAR", async () => {
    if (!(await tap("~evidence-share", "Share this star", 5000))) return { status: "FAIL", detail: "no 'Share this star'" };
    const sheet = await exists("~evidence-share-card", 6000);
    await sleep(1500);
    await shot("share-card-sheet");
    const tShare = Date.now() - 1000;
    const refShare = await hittable("~evidence-share-card-close");
    await tap("~evidence-share-card-share", "Share image", 5000, { scroll: false });
    const sys = await waitForSystemSheet("star-share", refShare ? "~evidence-share-card-close" : null);
    await shot("star-share-sheet");
    const fallback = await exists("~evidence-share-card-note", 1000);
    let pngInfo = null;
    const pngFile = newestFile(path.join(c, "tmp"), (n) => n.endsWith(".png"), tShare) ?? newestFile(path.join(c, "Library", "Caches"), (n) => n.endsWith(".png"), tShare);
    if (pngFile) {
      fs.copyFileSync(pngFile, path.join(SHOTS, `${PREFIX}-share-card-captured.png`));
      if (PNG) {
        const img = PNG.sync.read(fs.readFileSync(pngFile));
        const saved = win;
        win = { width: img.width, height: img.height };
        const cs = census(img, { x: 0, y: 0, width: img.width, height: img.height });
        win = saved;
        pngInfo = { file: path.basename(pngFile), width: img.width, height: img.height, lumaSd: cs?.lumaSd };
      }
    }
    const closed = sys.shown ? await closeSystemSheet(refShare ? "~evidence-share-card-close" : null) : false;
    await tap("~evidence-share-card-close", "Done (share card)", 4000, { scroll: false });
    await sleep(1200);
    record(
      "C-SHARE-PNG",
      pngInfo ? (pngInfo.width === 1080 && pngInfo.height === 1920 && (pngInfo.lumaSd ?? 0) > 8 ? "PASS" : "FAIL") : "NOT-TESTABLE",
      pngInfo ? `captured card ${pngInfo.width}x${pngInfo.height}, luma sd ${pngInfo.lumaSd} (blank ≈ 0)` : "the captured PNG was not found in the app's tmp/Caches"
    );
    return { status: sys.shown || fallback ? "PASS" : "FAIL", detail: `share card sheet ${sheet ? "shown" : "MISSING"}; system share sheet ${sys.shown ? `presented: ${sys.how}${closed ? ", then closed" : ", would NOT close"}` : "NOT detected"}${fallback ? "; fallback note shown" : ""}` };
  });

  await section("C-WEAVE-AFTER-PROOF", async () => {
    await tap("~evidence-finish", "Carry it forward", 5000, { scroll: false });
    const reader = await exists("~story-listen", 15000);
    await sleep(2500);
    const stage = await labelOf("~story-stage", 2000);
    const title = await labelOf("~story-title", 1500);
    const woven = await exists("~story-woven", 3000);
    await shot("chapter-after-proof");
    for (let i = 0; i < 3 && !(await exists("~today-screen", 1500)); i++) {
      await tap("~story-back", "reader back", 3000, { scroll: false });
      await sleep(1200);
    }
    const hero = await labelOf("~proof-constellation", 3000);
    await shot("today-after-proof");
    return { status: reader ? "PASS" : "FAIL", detail: `the Weave opened ${JSON.stringify(stage)} ${JSON.stringify(title)} (woven paragraph ${woven}); Today sky ${JSON.stringify(hero)}` };
  });

  let narrationPlaying = false;
  await section("C-NARRATION", async () => {
    await tap("~tab-arc", "Arc tab", 6000, { scroll: false });
    await tap(`~arc-dream-${exp.main.id}`, "Arc: the first dream", 3000, { scroll: false });
    await sleep(1000);
    if (!(await tap(`~arc-chapter-${exp.main.storyId}`, "open the 1.0 chapter", 5000))) return { status: "FAIL", detail: "could not open the chapter from the Arc" };
    await exists("~story-screen", 8000);
    await sleep(2500);
    const idle = await labelOf("~story-listen-status", 4000);
    await shot("reader");
    await tap("~story-listen", "Listen", 5000, { scroll: false });
    const samples = [];
    for (let i = 0; i < 8; i++) {
      await sleep(1500);
      samples.push(await labelOf("~story-listen-status", 1500));
    }
    await shot("reader-listening");
    await source("reader-listening");
    const secs = samples.map(leftSeconds).filter((x) => x !== null);
    const distinct = [...new Set(secs)];
    const advancing = distinct.length >= 2 && secs[secs.length - 1] < secs[0];
    narrationPlaying = /Listening/.test(samples[samples.length - 1] ?? "");
    if (samples.some((s) => /isn.t available/.test(s ?? ""))) return { status: "NOT-TESTABLE", detail: `narration unavailable on this simulator: ${JSON.stringify(samples)}` };
    return { status: advancing ? "PASS" : "FAIL", detail: `idle ${JSON.stringify(idle)}; while listening (every 1.5s) ${JSON.stringify(samples)} — the sentence position ${advancing ? "advances" : "does NOT advance"}` };
  });

  await section("C-NARRATION-BACKGROUND", async () => {
    if (!narrationPlaying) return { status: "NOT-TESTABLE", detail: "narration was not playing" };
    const before = await labelOf("~story-listen-status", 1500);
    const tHome = Date.now();
    await driver.execute("mobile: pressButton", { name: "home" });
    await sleep(3000);
    const s1 = await appState();
    await sleep(17000);
    const s2 = await appState();
    await driver.execute("mobile: activateApp", { bundleId: BUNDLE });
    const away = ((Date.now() - tHome) / 1000).toFixed(1);
    await sleep(700);
    const after = await labelOf("~story-listen-status", 2000);
    await shot("reader-back-from-home");
    const a = leftSeconds(before);
    const b = leftSeconds(after);
    // Paused the voice before leaving (the reader keeps playing otherwise).
    if (/Listening/.test(after ?? "")) await tap("~story-listen", "Pause", 3000, { scroll: false });
    await sleep(800);
    const progressed = a !== null && b !== null && a - b >= 10;
    const finished = /Heard to the end/.test(after ?? "");
    return {
      status: progressed || finished ? "PASS" : "FAIL",
      detail: `before Home ${JSON.stringify(before)}; app state while away ${s1} then ${s2} (3 = running in background, 2 = suspended); after ${away}s away ${JSON.stringify(after)}${a !== null && b !== null ? ` (${a - b}s of chapter spoken while away)` : ""}`,
    };
  });

  await section("C-IMPORT-REPLACE", async () => {
    if (!exportResult?.placed) return { status: "NOT-TESTABLE", detail: "no backup file could be put into On My iPhone" };
    await toToday();
    await tap("~open-settings", "Settings");
    await exists("~settings-screen", 8000);
    const refOk = await hittable("~settings-back");
    await tap("~settings-import", "Import a backup", 8000);
    const picker = await waitForSystemSheet("import-picker", refOk ? "~settings-back" : null, /DOC\.browsingRoot|name="Browse"|name="Recents"/);
    await sleep(2500);
    await shot("import-picker");
    await source("import-picker");
    log("document picker", JSON.stringify(picker));
    let picked = false;
    let usedXY = false;
    for (let i = 0; i < 6 && !picked; i++) {
      // The picker's own elements are a remote view XCUITest does not always see: its Browse tab sits bottom right.
      if (i === 2 && !(await shownNow(byLabel("Browse", "XCUIElementTypeButton")))) {
        usedXY = true;
        try {
          await driver.execute("mobile: tap", { x: Math.round(win.width * 0.695), y: Math.round(win.height * 0.946) });
          log("tapped the Browse tab by position");
        } catch (e) {
          log("Browse tap by position failed", msg(e));
        }
        await sleep(2500);
      }
      if (await tapIfShown(byLabelContains("vela-backup"), "the backup file")) {
        picked = true;
        break;
      }
      if (await tapIfShown(byLabel("On My iPhone"), "On My iPhone")) {
        await sleep(2500);
        continue;
      }
      if (await tapIfShown(byLabel("Browse", "XCUIElementTypeButton"), "Browse")) {
        await sleep(2500);
        continue;
      }
      await sleep(1500);
      await shot(`import-picker-${i}`);
      await source(`import-picker-${i}`);
    }
    if (!picked) {
      await tapIfShown(byLabel("Cancel", "XCUIElementTypeButton"), "Cancel the picker");
      return { status: "NOT-TESTABLE", detail: `the document picker ${picker.shown ? `opened (${picker.how})` : "was not detected"} but the backup in On My iPhone could not be reached through it${usedXY ? " (Browse also tapped by position)" : ""}; see the picker shots/sources` };
    }
    const sheet = await exists("~settings-import-sheet", 12000);
    await sleep(1200);
    await shot("import-sheet");
    await tap("~settings-import-choice-replace", "Replace", 4000);
    await sleep(600);
    await tap("~settings-import-replace", "Replace with backup", 4000, { scroll: false });
    const confirm = await exists("~confirm-sheet", 10000);
    await sleep(1000);
    const title = await labelOf(byLabelStarts("Replace what"), 1500);
    await shot("import-replace-confirm");
    let applied = null;
    if (confirm) {
      await tap("~confirm-sheet-confirm", "Replace (destructive confirm)", 4000, { scroll: false });
      await sleep(2500);
      applied = (await sourceHas("Replaced.", "import-toast")) ? "Replaced. …" : await textsUnder("~toast", 2000);
      await shot("import-replaced");
    }
    await tap("~settings-back", "Settings back", 4000, { scroll: false });
    await sleep(1500);
    const hero = await labelOf("~proof-constellation", 3000);
    await shot("today-after-replace");
    return {
      status: sheet && confirm ? "PASS" : "FAIL",
      detail: `picker ${picker.how ?? "?"}; import sheet ${sheet ? "shown" : "MISSING"}; Replace's confirm ${confirm ? `appeared ${JSON.stringify(title)}` : "did NOT appear"}; after Replace: toast ${JSON.stringify(applied)}, Today sky ${JSON.stringify(hero)}`,
    };
  });

  await section("C-ALIVE-END", async () => {
    const s = await appState();
    await shot("end");
    return { status: s === 4 ? "PASS" : "FAIL", detail: `app state ${s} at the end of the walk (4 = foreground)` };
  });

  clearInterval(watcher);
  poll();
  writeJSON("timeline-11.json", { sessionReadyMs: tSession, events: timeline });
  const plusEvents = timeline.filter((e) => "plus" in e);
  const firstV2 = timeline.find((e) => e.keys?.some((k) => k.includes(".v2")));
  record(
    "C-PLUS-TIMELINE",
    "INFO",
    `vela.plus.v1 over the run ${JSON.stringify(plusEvents)} (ms since the store watch began); first v2 key written at +${firstV2?.t ?? "?"}ms; session ready at +${tSession}ms`
  );
  await endSession();
}

/** Back out of stack screens to the Today tab. */
async function toToday() {
  for (let i = 0; i < 5; i++) {
    if (await shownNow("~today-screen")) return true;
    if (await tapIfShown("~tab-today", "Today tab")) {
      await sleep(1200);
      continue;
    }
    let backed = false;
    for (const b of ["~story-back", "~settings-back", "~scenes-back", "~entry-back", "~evidence-back", "~sky-back"]) {
      if (await tapIfShown(b, b.slice(1))) {
        backed = true;
        break;
      }
    }
    if (!backed) break;
    await sleep(1200);
  }
  return shownNow("~today-screen");
}

async function clearConfirm() {
  if (await exists("~confirm-sheet", 800)) await tap("~confirm-sheet-confirm", "confirm", 1500, { scroll: false });
}

/* ================================================================== dump */
function dump() {
  const s = dumpStore("final");
  if (!s) {
    record("D-V1-KEYS-UNTOUCHED", "FAIL", "the store could not be read after 1.1 ran");
    return;
  }
  const base = readJSON("baseline-v1.json");
  const changed = V1_KEYS.filter((k) => (s?.get(k) ?? null) !== base[k]);
  record("D-V1-KEYS-UNTOUCHED", changed.length === 0 ? "PASS" : "FAIL", changed.length === 0 ? "every v1 key is byte-identical after 1.1 ran (rollback-safe)" : `changed: ${changed.join(", ")}`);
  const v2 = (s?.keys() ?? []).filter((k) => !V1_KEYS.includes(k));
  record("D-STORE-AFTER-11", "INFO", `keys now: ${v2.join(", ")}; vela.plus.v1=${JSON.stringify(s?.get(PLUS_KEY))}`);
  try {
    const raw = path.join(STATE, "raw-final");
    fs.mkdirSync(raw, { recursive: true });
    for (const f of fs.readdirSync(s.dir)) fs.copyFileSync(path.join(s.dir, f), path.join(raw, f));
  } catch (e) {
    log("raw copy failed", msg(e));
  }
}

/* ================================================================== main */
const PHASES = { drive101, seed, verify101, reseed, drive11, dump };
const fn = PHASES[PHASE];
if (!fn) {
  console.error(`unknown phase '${PHASE}' (${Object.keys(PHASES).join(", ")})`);
  process.exit(2);
}
let died = null;
try {
  await fn();
} catch (e) {
  died = e;
  console.error(`[${PHASE}] fatal:`, e);
  if (driver) await shot("fatal");
  record(`${PREFIX}-FATAL`, "FAIL", msg(e));
} finally {
  await endSession();
}
const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL");
log(`SUMMARY ${PHASE}: ${pass} pass, ${fail.length} fail, ${results.length - pass - fail.length} other`);
writeResults();
process.exit(died || fail.length ? 1 : 0);
