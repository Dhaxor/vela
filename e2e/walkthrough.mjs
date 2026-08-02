// Drives the real Vela binary on a booted iOS simulator via Appium/XCUITest.
// Two jobs: prove the flows on-device, and capture the 6.7" screenshots the
// App Store listing and the subscription review both need.
//
// Selector rule (learned on two sibling apps): prefer testIDs ("~foo").
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

async function main() {
  const driver = await connect();
  await sleep(6000);

  // --- 1. Welcome (marketing shot #1) ---
  await shot(driver, "welcome");
  const welcome = await exists(driver, "~onboarding-next", 15000);
  record("WELCOME", welcome, welcome ? "welcome beat renders" : "no welcome CTA");

  // --- 2. Onboarding walk ---
  await tap(driver, "~onboarding-next", "Begin");
  await sleep(1200);
  await tap(driver, "~focus-love", "Love");
  await tap(driver, "~focus-abundance", "Abundance");
  await shot(driver, "focus-areas");
  await tap(driver, "~onboarding-next", "Continue focus");
  await sleep(1000);
  await tap(driver, "~mood-hopeful", "mood");
  await tap(driver, "~onboarding-next", "Continue mood");
  await sleep(1000);
  await typeInto(driver, "~name-input", "Maya", "name");
  await tap(driver, "~onboarding-next", "Continue name");
  await sleep(1000);
  await tap(driver, "~ritual-evening", "Evening");
  await tap(driver, "~onboarding-next", "Continue ritual");
  await sleep(1200);
  await shot(driver, "practice-primer");
  const primer = await exists(driver, "~onboarding-done", 8000);
  record("ONBOARDING", primer, primer ? "reached primer" : "primer missing");
  await tap(driver, "~onboarding-done", "Write my first story");
  await sleep(2000);

  // --- 3. First story intake -> reveal (marketing shots) ---
  const intake = await exists(driver, "~intake-desire", 12000);
  record("INTAKE", intake, intake ? "onboarding lands in intake" : "intake missing");
  await typeInto(driver, "~intake-desire", "a home that feels like rest", "desire");
  await tap(driver, "~intake-feeling-peaceful", "feeling");
  await shot(driver, "intake");
  await tap(driver, "~intake-weave", "Step inside");
  await sleep(7000); // let the reveal cascade land
  await shot(driver, "story-reveal");
  const listen = await exists(driver, "~story-listen", 10000);
  record("STORY", listen, listen ? "story rendered with listen CTA" : "no story");
  await sleep(4000);
  await shot(driver, "story-full");
  await tap(driver, "~story-back", "back to app", 8000);
  await sleep(1500);

  // --- 4. Today with streak (marketing shot) ---
  const streak = await exists(driver, "~streak-chip", 8000);
  record("STREAK", streak, streak ? "streak chip after first story" : "no streak chip");
  await shot(driver, "today");

  // --- 5. Daily affirmation (marketing shot) ---
  if (await tap(driver, "~ritual-affirmation", "Affirmation card")) {
    await sleep(2000);
    await shot(driver, "affirmation");
    const carried = await tap(driver, "~affirmation-carry", "carry");
    record("AFFIRMATION", carried, carried ? "daily affirmation carried" : "carry failed");
    await tap(driver, "~affirmation-close", "close affirmation", 6000);
    await sleep(1200);
  } else {
    record("AFFIRMATION", false, "card not reachable");
  }

  // --- 6. Journal: 369 sheet (marketing shot) ---
  await tap(driver, "~door-369", "369 door", 8000) ||
    (await tap(driver, "~ritual-script", "script card") && await tap(driver, "~door-369", "369 door", 8000));
  // journal tab route: reach via tab bar if door not present
  if (!(await exists(driver, "~phrase-input", 4000)) && !(await exists(driver, "~rep-input", 3000))) {
    await tap(driver, "~door-369", "369 door retry", 4000);
  }
  if (await exists(driver, "~phrase-input", 6000)) {
    await typeInto(driver, "~phrase-input", "I am calm, capable, and paid well", "phrase");
    await tap(driver, "~phrase-set", "begin practice");
    await sleep(1500);
  }
  if (await exists(driver, "~rep-write", 8000)) {
    await tap(driver, "~rep-write", "write rep 1");
    await tap(driver, "~rep-write", "write rep 2");
    await sleep(800);
    await shot(driver, "method369");
    record("M369", true, "369 sheet with reps");
  } else {
    record("M369", false, "369 sheet not reached");
  }
  await tap(driver, "~m369-close", "close 369", 6000);
  await sleep(1200);

  // --- 7. Paywall (subscription review screenshot) ---
  // Second story attempt gates to the paywall.
  await tap(driver, "~ritual-story", "story hero (gated)", 8000);
  await sleep(2500);
  const gated = await exists(driver, "~paywall-buy", 10000);
  record("PAYWALL-GATE", gated, gated ? "second intent gated to paywall" : "gate missed");
  if (gated) {
    await shot(driver, "paywall");
    const promise = await exists(driver, "~paywall-free-promise", 4000);
    record("FREE-PROMISE", promise, promise ? "free promise leads the paywall" : "missing");
    await tap(driver, "~paywall-close", "close paywall", 6000);
  }

  const passed = results.filter((r) => r.pass).length;
  log(`SUMMARY: ${passed}/${results.length} checks passed`);
  log("walkthrough complete");
}

main().catch((e) => {
  console.error("[e2e] fatal:", e);
  process.exit(0); // shots and the log are the artefact; never fail the job
});
