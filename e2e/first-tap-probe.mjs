// Does the welcome's 'Begin' take the FIRST tap after a fresh install?
//
// The fresh-install walk saw 'Begin' miss its first tap in 2 of 6 walks
// (always the first touch the app's process received). This probe repeats the
// exact situation TRIALS times: uninstall, install 1.1, launch in a new
// session, wait for the welcome, tap 'Begin' ONCE, and see whether the focus
// step comes. Half the trials first touch a spot with nothing on it (the
// welcome's empty sky), so a lost first touch of the process lands there.
//
//   UDID=… APP=<path to Vela.app> SHOTS_DIR=… DEVICE=… TRIALS=6 node first-tap-probe.mjs
//
// Always exits 0: the result is evidence (results-probe-<device>.json), not a gate.
import { execFileSync } from "node:child_process";
import { createHarness, msg, sleep } from "./harness.mjs";

const DEVICE = process.env.DEVICE || "device";
const UDID = process.env.UDID;
const APP = process.env.APP;
const BUNDLE = process.env.BUNDLE_ID || "app.vela.manifest";
const TRIALS = Number(process.env.TRIALS || 6);
const h = createHarness({ tag: `probe-${DEVICE}`, prefix: "P", shotsDir: process.env.SHOTS_DIR || "../shots", udid: UDID, bundle: BUNDLE });
const simctl = (...a) => execFileSync("xcrun", ["simctl", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const trials = [];
for (let i = 1; i <= TRIALS; i++) {
  const warm = i % 2 === 0;
  try {
    try {
      simctl("terminate", UDID, BUNDLE);
    } catch {
      // not running
    }
    simctl("uninstall", UDID, BUNDLE);
    simctl("install", UDID, APP);
    await h.connect();
    const welcome = await h.exists("~onboarding-next", 30000);
    await sleep(6000);
    if (warm) {
      // An empty stretch of sky above the welcome's mark: nothing there takes a tap.
      await h.tapAt(h.win.width / 2, h.win.height * 0.12, "warm-up touch on empty sky");
      await sleep(1500);
    }
    const t0 = Date.now();
    await h.tap("~onboarding-next", `Begin (trial ${i})`, 5000, { scroll: false });
    const taken = await h.exists("~focus-career", 6000);
    const ms = Date.now() - t0;
    await h.shot(`trial-${i}-${taken ? "taken" : "missed"}`);
    trials.push({ trial: i, warmUpTouchFirst: warm, welcome, beginTakenFirstTap: taken, msToFocusStep: taken ? ms : null });
    h.record(`PROBE-${i}`, "INFO", `${warm ? "after a warm-up touch on empty sky" : "Begin is the process's first touch"}: Begin ${taken ? `taken (focus step in ${ms} ms)` : "MISSED"}`);
  } catch (e) {
    trials.push({ trial: i, warmUpTouchFirst: warm, error: msg(e) });
    h.record(`PROBE-${i}`, "INFO", `trial failed: ${msg(e)}`);
  } finally {
    await h.endSession();
  }
}
const first = trials.filter((t) => !t.warmUpTouchFirst && "beginTakenFirstTap" in t);
const warmed = trials.filter((t) => t.warmUpTouchFirst && "beginTakenFirstTap" in t);
const count = (ts) => `${ts.filter((t) => t.beginTakenFirstTap).length}/${ts.length}`;
h.record("PROBE-SUMMARY", "INFO", `Begin as the process's first touch: taken ${count(first)}; after a warm-up touch: taken ${count(warmed)}`, { trials });
process.exit(0);
