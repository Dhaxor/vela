// Drives the real Vela binary on a booted iOS simulator via Appium/XCUITest.
// Two jobs: prove the flows on-device, and capture the 6.7" screenshots the
// App Store listing and the subscription review both need.
//
// Selector rule (learned on two sibling apps): prefer testIDs ("~foo").
//
// Exit code: 1 when any check FAILS or the walk dies, so ios-e2e.yml can gate
// the release on the device run (the shots and the log are still published).
import { remote } from "webdriverio";
import fs from "fs";

const UDID = process.env.UDID;
const BUNDLE = process.env.BUNDLE_ID || "app.vela.manifest";
const SHOTS = process.env.SHOTS_DIR || "shots";
fs.mkdirSync(SHOTS, { recursive: true });

let n = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[e2e]", ...a);

async function shot(driver, name) {
  try {
    const b64 = await driver.takeScreenshot();
    const file = `${SHOTS}/${String(n).padStart(2, "0")}-${name}.png`;
    fs.writeFileSync(file, Buffer.from(b64, "base64"));
    log("shot", file);
    n++;
  } catch (e) {
    log("shot-failed", name, e.message);
  }
}

async function tap(driver, selector, label, timeout = 12000) {
  try {
    const el = await driver.$(selector);
    await el.waitForExist({ timeout });
    await el.click();
    log("tapped", label);
    return true;
  } catch (e) {
    log("tap-failed", label, e.message.split("\n")[0]);
    return false;
  }
}

async function typeInto(driver, selector, text, label) {
  try {
    const el = await driver.$(selector);
    await el.waitForExist({ timeout: 10000 });
    await el.click();
    await el.setValue(text);
    log("typed", label);
    return true;
  } catch (e) {
    log("type-failed", label, e.message.split("\n")[0]);
    return false;
  }
}

async function exists(driver, selector, timeout = 6000) {
  try {
    const el = await driver.$(selector);
    await el.waitForExist({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function textOf(driver, selector, timeout = 4000) {
  try {
    const el = await driver.$(selector);
    await el.waitForExist({ timeout });
    return (await el.getText()) || (await el.getAttribute("label")) || "";
  } catch {
    return "";
  }
}

/**
 * Back out of the reader until Today shows. The stack after the loop is
 * [(tabs), Chapter I, Chapter II] (the proof form is replaced by the Weave,
 * the Weave by Chapter II), so one Back lands on Chapter I, not Today.
 */
async function backToToday(driver, tries = 4) {
  for (let i = 0; i < tries; i++) {
    if (await exists(driver, "~streak-chip", 1500)) return true;
    if (!(await tap(driver, "~story-back", `back ${i + 1}`, 6000))) break;
    await sleep(1200);
  }
  return exists(driver, "~streak-chip", 6000);
}

const caps = {
  platformName: "iOS",
  "appium:automationName": "XCUITest",
  "appium:udid": UDID,
  "appium:bundleId": BUNDLE,
  "appium:newCommandTimeout": 300,
  // Cold WDA on a GitHub runner has been measured at 311s.
  "appium:wdaLaunchTimeout": 600000,
  "appium:wdaConnectionTimeout": 600000,
  "appium:shouldTerminateApp": true,
};

async function connect() {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await remote({
        hostname: "127.0.0.1",
        port: 4723,
        path: "/",
        logLevel: "error",
        capabilities: caps,
      });
    } catch (e) {
      log(`session attempt ${attempt}/4 failed:`, (e.message || "").split("\n")[0]);
      if (attempt === 4) throw e;
      await sleep(45000);
    }
  }
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  log(`${name} RESULT: ${pass ? "PASS" : "FAIL"} — ${detail}`);
}

/** Swipe the page up until the selector exists (the reader's bridge sits after the last paragraph). */
async function scrollTo(driver, selector, label, tries = 14) {
  for (let i = 0; i < tries; i++) {
    if (await exists(driver, selector, 800)) return true;
    try {
      await driver.execute("mobile: swipe", { direction: "up", velocity: 2500 });
    } catch (e) {
      log("swipe-failed", label, (e.message || "").split("\n")[0]);
    }
    await sleep(500);
  }
  const found = await exists(driver, selector, 1500);
  if (!found) log("scroll-missed", label);
  return found;
}

// The 1.1 'Night Atlas' review path (CONTRACTS §20, docs/SHOTS.md):
// First Light (6 steps, with the optional seed proof) → the Weave → Chapter I
// with the seed woven in gold → choose a bridge → 'I crossed it' → a proof →
// Star Birth → the Weave → Chapter II → Today → Your line → Rituals 3·6·9 →
// the Arc ghost plate's paywall.
async function main() {
  const driver = await connect();
  await sleep(6000);

  // --- 1. Welcome (marketing shot #1) ---
  await shot(driver, "welcome");
  const welcome = await exists(driver, "~onboarding-next", 15000);
  record("WELCOME", welcome, welcome ? "welcome beat renders" : "no welcome CTA");

  // --- 2. First Light: focus, own words, name, ritual, seed ---
  await tap(driver, "~onboarding-next", "Begin");
  await sleep(1200);
  await tap(driver, "~focus-career", "Career");
  await shot(driver, "focus-areas");
  await tap(driver, "~onboarding-next", "Continue focus");
  await sleep(1000);
  await typeInto(driver, "~onboarding-desire", "my own design studio, with clients who trust my eye", "desire");
  await tap(driver, "~onboarding-feeling-proud", "feeling");
  await shot(driver, "own-words");
  await tap(driver, "~onboarding-next", "Continue words");
  await sleep(1000);
  await typeInto(driver, "~name-input", "Maya", "name");
  await tap(driver, "~onboarding-next", "Continue name");
  await sleep(1000);
  await tap(driver, "~ritual-evening", "Evening");
  await tap(driver, "~onboarding-next", "Continue ritual");
  await sleep(1200);
  await typeInto(driver, "~onboarding-seed", "Bought the domain name.", "seed proof");
  await shot(driver, "seed");
  const seed = await exists(driver, "~onboarding-done", 8000);
  record("ONBOARDING", seed, seed ? "reached the seed step" : "seed step missing");
  await tap(driver, "~onboarding-done", "Weave Chapter I");

  // --- 3. The Weave → Chapter I with the seed woven in gold ---
  await sleep(1300);
  await shot(driver, "weave");
  const listen = await exists(driver, "~story-listen", 15000); // the Weave opens Chapter I on its own (~2.75s)
  record("CHAPTER-I", listen, listen ? "the Weave landed on Chapter I" : "no reader");
  await sleep(1500);
  await shot(driver, "chapter-one");
  const woven = await scrollTo(driver, "~story-woven", "woven paragraph", 6);
  record("WOVEN", woven, woven ? "the seed proof is woven in gold" : "no woven paragraph");
  if (woven) await shot(driver, "chapter-one-woven");

  // --- 4. Choose a bridge → 'I crossed it' → a proof → Star Birth ---
  const chooser = await scrollTo(driver, "~story-bridge-15min", "bridge chooser");
  if (chooser) {
    await tap(driver, "~story-bridge-15min", "15-minute bridge");
    await shot(driver, "bridge-chooser");
    await tap(driver, "~story-bridge-commit", "Make it observable");
    await sleep(1500);
    // The notification ask at commitment (iOS, permission undetermined): decline for the walk.
    if (await exists(driver, "~story-remind-no", 2500)) await tap(driver, "~story-remind-no", "Not now");
  }
  const crossed = await scrollTo(driver, "~story-record-proof", "I crossed it", 6);
  record("BRIDGE", crossed, crossed ? "bridge committed" : "bridge not committed");
  await tap(driver, "~story-record-proof", "I crossed it");
  await sleep(1500);
  await tap(driver, "~evidence-kind-did", "I did it");
  await typeInto(driver, "~evidence-note", "Sent my portfolio to two studios I admire.", "proof");
  await shot(driver, "proof-form");
  await tap(driver, "~evidence-save", "Chart this proof");
  await sleep(2600); // the flight, the landing, the caption
  const birth = await exists(driver, "~evidence-finish", 12000);
  record("STAR-BIRTH", birth, birth ? "Star Birth finished" : "no Star Birth");
  await shot(driver, "star-birth");

  // --- 5. The Weave → Chapter II (the proof highlighted) ---
  await tap(driver, "~evidence-finish", "Carry it forward");
  const ch2 = await exists(driver, "~story-listen", 15000);
  record("CHAPTER-II", ch2, ch2 ? "Chapter II woven from the proof" : "no Chapter II");
  await sleep(1500);
  await shot(driver, "chapter-two");
  // Back returns through Chapter I to Today (REVIEW_NOTES_1.1).
  const today = await backToToday(driver);

  // --- 6. Today (marketing shot) ---
  const chip = today && (await exists(driver, "~streak-chip", 8000));
  record("TODAY", chip, chip ? "nights and stars chip on Today" : "no chip (still in the reader?)");
  await shot(driver, "today");

  // --- 7. Your line (marketing shot) ---
  if (await tap(driver, "~ritual-affirmation", "Carry a line")) {
    await sleep(2000);
    await shot(driver, "your-line");
    const carried = await tap(driver, "~affirmation-carry", "carry");
    record("LINE", carried, carried ? "line carried" : "carry failed");
    await tap(driver, "~affirmation-close", "close line", 6000);
    await sleep(1200);
  } else {
    record("LINE", false, "card not reachable");
  }

  // --- 8. Rituals: 3·6·9 (marketing shot) ---
  await tap(driver, "~tab-rituals", "Rituals tab", 8000);
  await sleep(1200);
  await tap(driver, "~door-369", "369 door", 8000);
  if (await exists(driver, "~suggest-369-0", 4000)) await tap(driver, "~suggest-369-0", "suggested phrase");
  else if (await exists(driver, "~phrase-input", 3000)) await typeInto(driver, "~phrase-input", "I am calm, capable, and paid well", "phrase");
  if (await exists(driver, "~phrase-set", 3000)) await tap(driver, "~phrase-set", "begin practice");
  await sleep(1200);
  if (await exists(driver, "~rep-write", 8000)) {
    const before = await textOf(driver, "~progress-369");
    // The Write button saves what is in the field, so type the phrase each time.
    for (let rep = 1; rep <= 2; rep++) {
      await typeInto(driver, "~rep-input", "I am calm, capable, and paid well", `rep ${rep}`);
      await tap(driver, "~rep-write", `write rep ${rep}`);
      await sleep(600);
    }
    await sleep(400);
    await shot(driver, "method369");
    const after = await textOf(driver, "~progress-369");
    const written = /^(\d+) of/.exec(after);
    const was = /^(\d+) of/.exec(before);
    const moved = !!written && Number(written[1]) >= (was ? Number(was[1]) : 0) + 2;
    record("M369", moved, moved ? `369 sheet: '${after}'` : `reps not counted ('${before}' → '${after}')`);
  } else {
    record("M369", false, "369 sheet not reached");
  }
  await tap(driver, "~m369-close", "close 369", 6000);
  await sleep(1200);

  // --- 9. Paywall (subscription review screenshot): the Arc ghost plate ---
  await tap(driver, "~tab-arc", "Arc tab", 8000);
  await sleep(1500);
  await scrollTo(driver, "~new-story", "ghost plate", 8);
  await tap(driver, "~new-story", "A second dream (gated)", 8000);
  await sleep(2500);
  const gated = await exists(driver, "~paywall-buy", 10000);
  record("PAYWALL-GATE", gated, gated ? "second dream gated to paywall" : "gate missed");
  if (gated) {
    await shot(driver, "paywall");
    const promise = await exists(driver, "~paywall-free-promise", 4000);
    record("FREE-PROMISE", promise, promise ? "free forever panel on the paywall" : "missing");
    await tap(driver, "~paywall-close", "close paywall", 6000);
  }

  const passed = results.filter((r) => r.pass).length;
  log(`SUMMARY: ${passed}/${results.length} checks passed`);
  log("walkthrough complete");
  return results.filter((r) => !r.pass).map((r) => r.name);
}

main().then(
  (failed) => {
    if (failed.length > 0) {
      console.error(`[e2e] FAILED checks: ${failed.join(", ")}`);
      process.exit(1);
    }
    process.exit(0);
  },
  (e) => {
    console.error("[e2e] fatal:", e);
    process.exit(1); // the shots and the log are still published by the workflow's always() step
  }
);
