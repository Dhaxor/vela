// Vela 1.1 on a FRESH install (ios-update-test.yml, job fresh-install): the
// App Review path of store/REVIEW_NOTES_1.1.md, driven like a reviewer would,
// with the 1.1 walkthrough's testIDs:
//
//   First Light with typing (desire, name, how to say it, seed) → the Weave →
//   Chapter I with the seed woven in gold → 'Write my own' and an if-then
//   (typed, then put back) → choose a bridge → 'Make it observable' → the
//   reminder ask → 'Not today' (typed, closed) → 'I crossed it' → the proof
//   typed → 'Chart this proof' → Star Birth → 'Carry it forward' → Chapter II
//   woven from the proof → Today → the sky and a star → the Arc (and its
//   VoiceOver labels, and renaming a dream) → the paywall → Rituals: Script,
//   Gratitude, 3·6·9 → Scenes compose → Settings and its name sheet.
//
// At EVERY text field (F-FIELD-*): focus it, type, then read the rects. Pass
// only when the field is fully inside its scroll view's frame, fully above
// the keyboard's top, and fully above the dock riding on the keyboard
// (testID screen-dock), with the typed words in it. A screenshot each time.
//
//   UDID=… SHOTS_DIR=… DEVICE=promax|small node fresh-install.mjs
//
// Exit 1 when any check FAILED or the walk died.
import { byNamePrefix, createHarness, msg, sleep } from "./harness.mjs";

const DEVICE = process.env.DEVICE || "device";
const h = createHarness({
  tag: `fresh-${DEVICE}`,
  prefix: "F",
  shotsDir: process.env.SHOTS_DIR || "../shots",
  udid: process.env.UDID,
  bundle: process.env.BUNDLE_ID || "app.vela.manifest",
});
const { log } = h;

/* ------------------------------------------------------------------ the reviewer */
const DESIRE = "my own design studio, with clients who trust my eye";
const NAME = "Maya";
const SAY = "MY-uh";
const SEED = "Bought the domain name.";
const OWN_BRIDGE = "Email one studio owner I admire";
const IF_WHEN = "after the school run";
const IF_THEN = "open the file and write one line";
const NOT_TODAY = "The client call ran long.";
const PROOF = "Sent my portfolio to two studios I admire.";
const SCRIPT = "The kettle clicks off. The first client of the day is early, and I am glad.";
const GRATITUDE = ["The printer answered on the first ring", "My sister called"];
const PHRASE = "I run a studio clients trust";
const SCENE = "A brass plate by the door with the studio name.";
const RENAME = "The Studio";
const PROFILE_NAME = "Maya R";
const PROFILE_SAY = "MY-uh ARR";

/* ------------------------------------------------------------------ the field check */
const fieldResults = [];

/** Of several matches (screens kept mounted), the one that holds the field. */
async function containerFor(selector, field) {
  const all = (await h.all(selector)).filter((c) => c.rect && c.rect.height > 0);
  if (!all.length) return null;
  const overlap = (r) => Math.max(0, Math.min(r.y + r.height, field.y + field.height) - Math.max(r.y, field.y));
  const holding = all.filter((c) => c.rect.x <= field.x + 1 && c.rect.x + c.rect.width >= field.x + field.width - 1);
  const pool = holding.length ? holding : all;
  pool.sort((a, b) => Number(b.visible) - Number(a.visible) || overlap(b.rect) - overlap(a.rect));
  return pool[0].rect;
}

/** The rect of the first element an XPath finds (null when none). */
async function xpathRect(xpath) {
  try {
    const el = await h.driver.$(xpath);
    if (!el?.elementId) return null;
    const r = await h.rectOfEl(el);
    return r && r.height > 0 ? r : null;
  } catch {
    return null;
  }
}

/** The dock riding on the keyboard: a visible screen-dock whose bottom sits on the keyboard's top. */
async function dockOnKeyboard(kb) {
  const docks = (await h.all("~screen-dock")).filter((d) => d.rect && d.rect.height > 0 && d.visible);
  let best = null;
  for (const d of docks) {
    const bottom = d.rect.y + d.rect.height;
    if (Math.abs(bottom - kb.y) <= 24 && (!best || d.rect.y < best.y)) best = d.rect;
  }
  return best;
}

/**
 * Focus a field, type, and prove the user sees it: inside its scroll view,
 * above the keyboard's top, above the dock. The user taps the field where it
 * is (scrolling to it first if it is below the fold, as anyone would).
 */
async function fieldCheck(name, selector, text, { container = "~screen-scroll", dock = true, clear = false } = {}) {
  const id = `F-FIELD-${name}`;
  await h.section(id, async () => {
    const el = await h.find(selector, 12000);
    if (!el) {
      await h.shot(`${name}-missing`);
      return { status: "FAIL", detail: `field ${selector} not found` };
    }
    await h.ensureVisible(el);
    const before = await h.rectOfEl(el);
    try {
      await el.click();
    } catch (e) {
      log("focus tap failed", name, msg(e));
    }
    await sleep(1500); // the keyboard rises (~0.35 s), then the page moves the field into view
    const focusedAt = await h.rectOfEl(el);
    try {
      if (clear) await el.clearValue();
      await el.addValue(text);
    } catch (e) {
      log("type failed", name, msg(e));
    }
    await sleep(1400);
    const kb = await h.keyboardRect();
    const r = await h.rectOfEl(el);
    const value = String((await h.attr(el, "value")) ?? "");
    // The field's own scroll view (its ancestor in the tree), and that screen's dock (the scroll view's sibling).
    const fid = selector.slice(1);
    const cid = container.slice(1);
    const own = `//*[@name="${fid}"]/ancestor::*[@name="${cid}"][1]`;
    const box = r ? (await xpathRect(own)) ?? (await containerFor(container, r)) : null;
    const dk = dock && kb ? (await xpathRect(`${own}/following-sibling::*[@name="screen-dock"][1]`)) ?? (await dockOnKeyboard(kb)) : null;
    await h.shot(`field-${name}`);
    await h.source(`field-${name}`);
    const typed = value.includes(text.slice(0, Math.min(18, text.length)));
    if (!kb) return { status: "FAIL", detail: `no software keyboard came up for ${selector} (field ${JSON.stringify(r)})` };
    if (!r) return { status: "FAIL", detail: `field ${selector} has no rect after typing` };
    const top = box ? box.y : 0;
    const limits = [kb.y, box ? box.y + box.height : Infinity, dk ? dk.y : Infinity];
    const bottom = Math.min(...limits);
    const inside = r.y >= top - 1 && r.y + r.height <= bottom + 1;
    const above = r.y + r.height <= kb.y + 1;
    const clearOfDock = !dk || r.y + r.height <= dk.y + 1;
    const ok = inside && above && clearOfDock && typed;
    const facts = {
      device: DEVICE,
      window: h.win,
      field: r,
      fieldBeforeFocus: before,
      fieldAfterFocus: focusedAt,
      keyboardTop: kb.y,
      dockTop: dk ? dk.y : null,
      scrollView: box,
      bandBottom: bottom,
      value,
    };
    fieldResults.push({ name, ok, ...facts });
    const where = `field y ${Math.round(r.y)}–${Math.round(r.y + r.height)} (h ${Math.round(r.height)}); scroll view ${box ? `${Math.round(box.y)}–${Math.round(box.y + box.height)}` : "?"}; dock top ${dk ? Math.round(dk.y) : dock ? "none on the keyboard" : "n/a (sheet or stepped aside)"}; keyboard top ${Math.round(kb.y)}`;
    return {
      status: ok ? "PASS" : "FAIL",
      detail: `${where}; ${inside ? "inside the band" : "OUTSIDE the band"}, ${above ? "above the keyboard" : "UNDER the keyboard"}, ${clearOfDock ? "clear of the dock" : "UNDER the dock"}; typed ${typed ? "ok" : `MISSING (value ${JSON.stringify(value)})`}; before focus y ${before ? Math.round(before.y) : "?"}`,
      extra: { facts },
    };
  });
}

/* ------------------------------------------------------------------ navigation */
async function backToToday(tries = 5) {
  for (let i = 0; i < tries; i++) {
    if (await h.shownNow("~today-screen")) return true;
    if (await h.tapIfShown("~tab-today", "Today tab")) {
      await sleep(1200);
      continue;
    }
    let backed = false;
    for (const b of ["~story-back", "~settings-back", "~scenes-back", "~entry-back", "~evidence-back", "~sky-back", "~paywall-close"]) {
      if (await h.tapIfShown(b, b.slice(1))) {
        backed = true;
        break;
      }
    }
    if (!backed) break;
    await sleep(1300);
  }
  return h.exists("~today-screen", 4000);
}

async function closeSheetByScrim(label) {
  // The scrim is everything above the panel: tap near the top of the screen.
  await h.tapAt(h.win.width / 2, Math.max(60, h.win.height * 0.07), label);
  await sleep(1200);
}

/* ================================================================== the walk */
async function main() {
  await h.connect();
  await sleep(5000);

  await h.section("F-LAUNCH", async () => {
    const welcome = await h.exists("~onboarding-next", 30000);
    await h.shot("welcome");
    await h.source("welcome");
    const storageError = await h.exists("~storage-error", 500);
    return { status: welcome && !storageError ? "PASS" : "FAIL", detail: `fresh install opens on the welcome beat: ${welcome}; storage error ${storageError}; window ${JSON.stringify(h.win)}` };
  });

  /* ---- 1-4. First Light, typing every field ---- */
  await h.section("F-ONBOARDING-FOCUS", async () => {
    await h.tap("~onboarding-next", "Begin");
    await sleep(1200);
    const area = await h.tap("~focus-career", "Career");
    await h.shot("focus");
    await h.tap("~onboarding-next", "Continue (focus)");
    await sleep(1200);
    return { status: area ? "PASS" : "FAIL", detail: `Career ${area ? "chosen" : "NOT found"}` };
  });
  await fieldCheck("desire", "~onboarding-desire", DESIRE);
  await h.section("F-ONBOARDING-WORDS", async () => {
    const feeling = await h.tap("~onboarding-feeling-proud", "feeling: proud");
    await h.shot("own-words");
    await h.tap("~onboarding-next", "Continue (words)");
    await sleep(1200);
    const name = await h.exists("~name-input", 6000);
    return { status: feeling && name ? "PASS" : "FAIL", detail: `feeling ${feeling ? "chosen" : "NOT tapped"}; the name step ${name ? "is next" : "did NOT open"}` };
  });
  await fieldCheck("name", "~name-input", NAME);
  await fieldCheck("pronunciation", "~pronunciation-input", SAY);
  await h.section("F-ONBOARDING-RITUAL", async () => {
    await h.tap("~onboarding-next", "Continue (name)");
    await sleep(1200);
    const evening = await h.tap("~ritual-evening", "Evening");
    await h.shot("ritual");
    await h.tap("~onboarding-next", "Continue (ritual)");
    await sleep(1300);
    const seed = await h.exists("~onboarding-seed", 6000);
    return { status: evening && seed ? "PASS" : "FAIL", detail: `Evening ${evening}; the seed step ${seed ? "is next" : "did NOT open"}` };
  });
  await fieldCheck("seed", "~onboarding-seed", SEED);

  /* ---- 5. The Weave → Chapter I, the seed in gold ---- */
  await h.section("F-WEAVE-CHAPTER-I", async () => {
    await h.tap("~onboarding-done", "Weave Chapter I", 8000, { scroll: false });
    await sleep(1200);
    await h.shot("weave");
    const reader = await h.exists("~story-listen", 20000);
    await sleep(1500);
    await h.shot("chapter-one");
    const woven = await h.scrollUntil("~story-woven", "woven paragraph", 12);
    await sleep(600);
    const gold = woven ? await h.sourceHas("Woven from your proof", "chapter-one-woven") : false;
    const seedText = woven ? await h.sourceHas("Bought the domain name", "chapter-one-woven-2") : false;
    await h.shot("chapter-one-woven");
    const ok = reader && !!woven && gold && seedText;
    return { status: ok ? "PASS" : "FAIL", detail: `the Weave opened Chapter I: ${reader}; the gold paragraph ${woven ? "found" : "MISSING"}, tagged 'Woven from your proof' ${gold}, quotes the seed ${seedText}` };
  });

  /* ---- 6. Today's bridge: write my own and an if-then (typed, then put back), choose 15 minutes, commit ---- */
  await h.section("F-BRIDGE-CHOOSER", async () => {
    const chooser = await h.scrollUntil("~story-bridge-15min", "bridge chooser");
    await h.shot("bridge-chooser");
    const own = chooser ? await h.tap("~story-bridge-own", "Write my own") : false;
    await sleep(800);
    return { status: chooser && own ? "PASS" : "FAIL", detail: `chooser ${chooser ? "reached" : "NOT reached"}; 'Write my own' ${own}` };
  });
  await fieldCheck("own-bridge", "~story-bridge-own-text", OWN_BRIDGE, { dock: false });
  await h.section("F-READER-DOCK-ASIDE", async () => {
    // While typing in the reader, the player steps aside (it has nothing to do with typing).
    const kb = await h.keyboardRect();
    const play = kb ? await h.shownNow("~story-listen") : null;
    const hit = kb ? await h.find("~story-listen", 1000) : null;
    const hittable = hit ? String(await h.attr(hit, "hittable")) : "absent";
    return { status: !kb ? "NOT-TESTABLE" : !play || hittable !== "true" ? "PASS" : "FAIL", detail: kb ? `keyboard up: the player's play disc visible=${play}, hittable=${hittable}` : "no keyboard" };
  });
  await h.section("F-IFTHEN-OPEN", async () => {
    const add = await h.tap("~story-ifthen-add", "Add an if-then");
    await sleep(700);
    const other = await h.tap("~story-ifthen-cue-other", "cue: Other");
    await sleep(700);
    return { status: add && other ? "PASS" : "FAIL", detail: `if-then ${add ? "opened" : "NOT opened"}; cue 'Other' ${other}` };
  });
  await fieldCheck("ifthen-when", "~story-ifthen-when", IF_WHEN, { dock: false });
  await fieldCheck("ifthen-then", "~story-ifthen-then", IF_THEN, { dock: false });
  await h.section("F-BRIDGE-COMMIT", async () => {
    await h.shot("ifthen-typed");
    await h.tap("~story-ifthen-remove", "Remove the if-then");
    await sleep(800);
    await h.tap("~story-bridge-15min", "15-minute bridge");
    await sleep(600);
    await h.shot("bridge-chosen");
    const commit = await h.tap("~story-bridge-commit", "Make it observable");
    await sleep(2000);
    const ask = await h.exists("~story-remind-no", 5000);
    if (ask) {
      await h.shot("reminder-ask");
      await h.tap("~story-remind-no", "Not now", 3000, { scroll: false });
      await sleep(1500);
    }
    await h.clearAlerts("after the bridge");
    const crossed = await h.scrollUntil("~story-record-proof", "I crossed it", 8);
    await h.shot("bridge-open");
    return {
      status: commit && !!crossed ? "PASS" : "FAIL",
      detail: `'Make it observable' ${commit}; the reminder ask ${ask ? "shown ('Not now' chosen)" : "not shown"}; 'I crossed it' ${crossed ? "waiting" : "MISSING"}`,
    };
  });

  /* ---- the reader's 'Not today' sheet (typed, closed) ---- */
  await h.section("F-READER-NOT-TODAY-OPEN", async () => {
    const open = await h.tap("~story-not-today", "Not today");
    const sheet = await h.exists("~story-not-today-sheet-note", 6000);
    await sleep(800);
    return { status: open && sheet ? "PASS" : "FAIL", detail: `'Not today' sheet ${sheet ? "open" : "NOT open"}` };
  });
  await fieldCheck("reader-not-today", "~story-not-today-sheet-note", NOT_TODAY, { container: "~story-not-today-sheet-scroll", dock: false });
  await h.section("F-READER-NOT-TODAY-CLOSE", async () => {
    await h.tap("~story-not-today-sheet-cancel", "Close the sheet", 4000);
    await sleep(1500);
    const gone = !(await h.shownNow("~story-not-today-sheet-note"));
    return { status: gone ? "PASS" : "FAIL", detail: `sheet closed without saving: ${gone}` };
  });

  /* ---- 7. 'I crossed it' → the proof, typed ---- */
  await h.section("F-PROOF-FORM", async () => {
    const tapped = await h.tap("~story-record-proof", "I crossed it");
    const form = await h.exists("~evidence-note", 10000);
    await h.tap("~evidence-kind-did", "I did it");
    await sleep(600);
    await h.shot("proof-form");
    return { status: tapped && form ? "PASS" : "FAIL", detail: `proof form ${form ? "open" : "NOT open"}` };
  });
  await h.section("F-PROOF-NOT-TODAY-OPEN", async () => {
    const open = await h.tap("~evidence-bridge-not-today", "Not today (proof form)");
    const sheet = await h.exists("~evidence-not-today-sheet-note", 6000);
    await sleep(800);
    return { status: open && sheet ? "PASS" : "FAIL", detail: `the form's 'Not today' sheet ${sheet ? "open" : "NOT open"}` };
  });
  await fieldCheck("proof-not-today", "~evidence-not-today-sheet-note", NOT_TODAY, { container: "~evidence-not-today-sheet-scroll", dock: false });
  await h.section("F-PROOF-NOT-TODAY-CLOSE", async () => {
    await h.tap("~evidence-not-today-sheet-cancel", "Close the sheet", 4000);
    await sleep(1600);
    const gone = !(await h.shownNow("~evidence-not-today-sheet-note"));
    return { status: gone ? "PASS" : "FAIL", detail: `sheet closed without saving: ${gone}` };
  });
  // The results-4 regression (C17/C18): the sentence field under the dock while typing.
  await fieldCheck("proof", "~evidence-note", PROOF);

  /* ---- 8. 'Chart this proof' → Star Birth ---- */
  await h.section("F-STAR-BIRTH", async () => {
    const cta = await h.rectOf("~evidence-save", 2000);
    const kb = await h.keyboardRect();
    const ctaOk = !kb || (!!cta && cta.y + cta.height <= kb.y + 1);
    await h.tap("~evidence-save", "Chart this proof", 4000, { scroll: false });
    const birth = (await h.exists("~evidence-star-birth", 12000)) || (await h.exists("~evidence-success", 2000));
    await sleep(1800);
    await h.shot("star-birth-flight");
    const finish = await h.exists("~evidence-finish", 20000);
    await sleep(800);
    const xml = await h.source("star-birth");
    const charted = /Proof 2 · charted/i.test(xml);
    await h.shot("star-birth");
    await h.clearAlerts("after Star Birth");
    const ok = ctaOk && birth && finish && charted;
    return { status: ok ? "PASS" : "FAIL", detail: `'Chart this proof' ${ctaOk ? "above the keyboard" : `COVERED (${JSON.stringify(cta)} vs ${kb?.y})`}; Star Birth ${birth}; 'Proof 2 · Charted' ${charted}; 'Carry it forward' ${finish}` };
  });

  /* ---- 9. 'Carry it forward' → Chapter II woven from the proof ---- */
  await h.section("F-CHAPTER-II", async () => {
    await h.tap("~evidence-finish", "Carry it forward", 5000, { scroll: false });
    const reader = await h.exists("~story-listen", 20000);
    await sleep(2500);
    await h.shot("chapter-two");
    const woven = await h.scrollUntil("~story-woven", "woven paragraph (II)", 12);
    await sleep(600);
    const xml = await h.source("chapter-two-woven");
    const gold = xml.includes("Woven from your proof");
    const quoted = /portfolio to two studios/i.test(xml);
    await h.shot("chapter-two-woven");
    const ok = reader && !!woven && gold && quoted;
    return { status: ok ? "PASS" : "FAIL", detail: `Chapter II ${reader ? "open" : "MISSING"}; 'Woven from your proof' ${gold}; it carries the proof ('portfolio to two studios') ${quoted}` };
  });

  /* ---- 10. Today, the sky and a star ---- */
  await h.section("F-TODAY", async () => {
    const today = await backToToday();
    await sleep(1200);
    const chip = await h.labelOf("~streak-chip", 4000);
    const hero = await h.labelOf("~today-hero", 2000);
    await h.shot("today");
    const ok = today && /2 stars/.test(chip ?? "");
    return { status: ok ? "PASS" : "FAIL", detail: `Today ${today ? "shown" : "NOT reached"}; chip ${JSON.stringify(chip)}; sky ${JSON.stringify(hero)}` };
  });
  await h.section("F-SKY-STAR", async () => {
    await h.tap("~today-hero", "Open sky", 6000);
    const sky = await h.exists("~sky-screen", 8000);
    await sleep(1500);
    await h.shot("sky");
    const stars = (await h.all(byNamePrefix("sky-figure-star-"))).filter((s) => s.rect && s.rect.width > 0);
    stars.sort((a, b) => Number(String(a.name).split("-").pop()) - Number(String(b.name).split("-").pop()));
    const newest = stars[stars.length - 1];
    let words = null;
    if (newest) {
      try {
        await newest.el.click();
      } catch (e) {
        log("star tap failed", msg(e));
      }
      await sleep(1600);
      words = await h.labelOf("~star-detail-text", 5000);
      await h.shot("star-sheet");
      await closeSheetByScrim("close the star sheet");
    }
    await h.tap("~sky-back", "Sky back", 4000, { scroll: false });
    await sleep(1000);
    const ok = sky && stars.length >= 2 && /portfolio/.test(words ?? "");
    return { status: ok ? "PASS" : "FAIL", detail: `sky ${sky}; ${stars.length} lit stars (${stars.map((s) => s.name).join(", ")}); the newest star reads ${JSON.stringify(words)}` };
  });

  /* ---- the Arc: chapters, proofs, VoiceOver labels, renaming a dream ---- */
  await h.section("F-ARC", async () => {
    await h.tap("~tab-arc", "Arc tab", 8000, { scroll: false });
    const arc = await h.exists("~arc-screen", 8000);
    await sleep(1500);
    await h.shot("arc");
    const stats = await h.labelOf("~arc-stats", 3000);
    const proofs = (await h.all(byNamePrefix("arc-proof-"))).filter((p) => !String(p.name).startsWith("arc-proof-photo-"));
    const labels = proofs.map((p) => p.label ?? "");
    // '1 chapter, 2 proofs, 1 night.': each noun singular exactly when its count is 1.
    const m = /^(\d+) (chapters?), (\d+) (proofs?), (\d+) (nights?)\.$/.exec(stats ?? "");
    const statsOk = !!m && [1, 3, 5].every((i) => (Number(m[i]) === 1) === !m[i + 1].endsWith("s"));
    const singularOk = statsOk;
    const dotsOk = labels.length > 0 && labels.every((l) => !/\.\.(?!\.)/.test(l) && !/[!?…]\./.test(l));
    await h.scrollDown(0.4);
    await h.shot("arc-scrolled");
    return {
      status: arc && statsOk && singularOk && dotsOk ? "PASS" : "FAIL",
      detail: `ledger VoiceOver label ${JSON.stringify(stats)} (${statsOk && singularOk ? "counts agree with nouns" : "WRONG plural"}); proof labels ${JSON.stringify(labels)} (${dotsOk ? "one closing mark each" : "DOUBLED mark or none found"})`,
    };
  });
  await h.section("F-ARC-RENAME-OPEN", async () => {
    await h.drag(h.win.height * 0.3, h.win.height * 0.75); // back to the top
    const menu = await h.tap("~arc-menu", "Dream options", 5000);
    await sleep(1200);
    const rename = await h.tap("~arc-menu-rename", "Rename", 5000, { scroll: false });
    await sleep(1600);
    const sheet = await h.exists("~arc-rename-input", 6000);
    return { status: menu && rename && sheet ? "PASS" : "FAIL", detail: `menu ${menu}; rename sheet ${sheet ? "open" : "NOT open"}` };
  });
  await fieldCheck("dream-name", "~arc-rename-input", RENAME, { container: "~arc-rename-scroll", dock: false });
  await h.section("F-ARC-RENAME-CLOSE", async () => {
    await h.tap("~arc-rename-cancel", "Cancel rename", 4000);
    await sleep(1500);
    return { status: (await h.shownNow("~arc-rename-input")) ? "FAIL" : "PASS", detail: "rename sheet closed without saving" };
  });

  /* ---- the paywall (the Arc's ghost plate) ---- */
  await h.section("F-PAYWALL", async () => {
    const plate = await h.scrollUntil("~new-story", "ghost plate", 10);
    if (plate) await h.tap("~new-story", "A second dream (paywall)", 4000);
    const buy = await h.exists("~paywall-buy", 10000);
    await sleep(1500);
    await h.shot("paywall");
    const promise = await h.exists("~paywall-free-promise", 3000);
    const restore = await h.scrollUntil("~paywall-restore", "Restore purchases", 8);
    const manage = await h.exists("~paywall-manage", 800);
    await h.shot("paywall-end");
    await h.tap("~paywall-close", "Close the paywall", 4000, { scroll: false });
    await sleep(1300);
    const ok = buy && promise && !!restore && !manage;
    return { status: ok ? "PASS" : "FAIL", detail: `plans ${buy}; free-forever panel ${promise}; 'Restore purchases' ${!!restore}; 'Manage subscription' ${manage ? "SHOWN to a free user" : "not shown"}` };
  });

  /* ---- Rituals: Script, Gratitude, 3·6·9 ---- */
  await h.section("F-RITUALS", async () => {
    await h.tap("~tab-rituals", "Rituals tab", 8000, { scroll: false });
    const ok = await h.exists("~rituals-screen", 8000);
    await sleep(1000);
    await h.shot("rituals");
    await h.tap("~door-script", "Script");
    const page = await h.exists("~script-input", 8000);
    return { status: ok && page ? "PASS" : "FAIL", detail: `Rituals ${ok}; Script page ${page}` };
  });
  await fieldCheck("script", "~script-input", SCRIPT);
  await h.section("F-SCRIPT-SEAL", async () => {
    await h.tap("~script-save", "Seal the page", 4000, { scroll: false });
    const sealed = await h.exists("~sealed-done", 8000);
    await sleep(800);
    await h.shot("script-sealed");
    await h.tap("~sealed-done", "Done (sealed)", 4000, { scroll: false });
    await sleep(1300);
    await h.tap("~door-gratitude", "Gratitude");
    const page = await h.exists("~gratitude-0", 8000);
    return { status: sealed && page ? "PASS" : "FAIL", detail: `script sealed ${sealed}; Gratitude page ${page}` };
  });
  await fieldCheck("gratitude-1", "~gratitude-0", GRATITUDE[0]);
  await fieldCheck("gratitude-2", "~gratitude-1", GRATITUDE[1]);
  await h.section("F-GRATITUDE-SEAL", async () => {
    await h.tap("~gratitude-save", "Keep these", 4000, { scroll: false });
    const sealed = await h.exists("~sealed-done", 8000);
    await sleep(800);
    await h.shot("gratitude-sealed");
    await h.tap("~sealed-done", "Done (sealed)", 4000, { scroll: false });
    await sleep(1300);
    await h.tap("~door-369", "3·6·9");
    const phrase = await h.exists("~phrase-input", 8000);
    return { status: sealed && phrase ? "PASS" : "FAIL", detail: `gratitude sealed ${sealed}; 3·6·9 phrase page ${phrase}` };
  });
  await fieldCheck("369-phrase", "~phrase-input", PHRASE);
  await h.section("F-369-BEGIN", async () => {
    const set = await h.tap("~phrase-set", "Begin practice", 4000);
    const rep = await h.exists("~rep-input", 8000);
    return { status: set && rep ? "PASS" : "FAIL", detail: `phrase set ${set}; practice ${rep}` };
  });
  await fieldCheck("369-line", "~rep-input", PHRASE);
  await h.section("F-369-WRITE", async () => {
    await h.tap("~rep-write", "Write it", 4000, { scroll: false });
    await sleep(1200);
    const p = await h.labelOf("~progress-369", 4000);
    await h.shot("369-written");
    await h.tap("~m369-close", "close 3·6·9", 4000, { scroll: false });
    await sleep(1300);
    return { status: /^1 of 18/.test(p ?? "") ? "PASS" : "FAIL", detail: `progress ${JSON.stringify(p)}` };
  });

  /* ---- Scenes: compose a written scene ---- */
  await h.section("F-SCENES-OPEN", async () => {
    if (!(await h.exists("~rituals-screen", 2000))) await h.tap("~tab-rituals", "Rituals tab", 4000, { scroll: false });
    const entry = (await h.scrollUntil("~rituals-scene-add", "Add a scene", 3)) ? "~rituals-scene-add" : "~rituals-scenes-open";
    await h.tap(entry, "Scenes");
    await sleep(1800);
    if (await h.exists("~scene-choose-goal", 3000)) await h.tap("~scene-choose-goal", "Write a scene", 3000, { scroll: false });
    else if (await h.exists("~scenes-first-goal", 2000)) await h.tap("~scenes-first-goal", "Write a scene (first)");
    else {
      await h.tap("~board-add-goal", "Add a scene");
      await sleep(1200);
      await h.tap("~scene-choose-goal", "Write a scene", 3000, { scroll: false });
    }
    await sleep(1600);
    const sheet = await h.exists("~goal-input", 6000);
    return { status: sheet ? "PASS" : "FAIL", detail: `Scenes compose sheet ${sheet ? "open" : "NOT open"} (entry ${entry.slice(1)})` };
  });
  await fieldCheck("scene", "~goal-input", SCENE, { container: "~scene-new-scroll", dock: false });
  await h.section("F-SCENES-PIN", async () => {
    await h.tap("~goal-save", "Pin it", 4000);
    await sleep(2000);
    const pinned = await h.sourceHas("A brass plate by the door", "scenes-grid");
    await h.shot("scenes-grid");
    await h.tapIfShown("~scenes-back", "Scenes back");
    await sleep(1000);
    return { status: pinned ? "PASS" : "FAIL", detail: `the written scene ${pinned ? "is in Scenes" : "is NOT in Scenes"}` };
  });

  /* ---- Settings and its name sheet ---- */
  await h.section("F-SETTINGS", async () => {
    await backToToday();
    await h.tap("~open-settings", "Settings", 6000);
    const screen = await h.exists("~settings-screen", 8000);
    await sleep(1000);
    const name = await h.labelOf("~settings-name-row", 4000);
    const manage = await h.exists("~settings-manage", 800);
    await h.shot("settings");
    await h.tap("~settings-name-row", "Name row");
    await sleep(1600);
    const sheet = await h.exists("~settings-name", 6000);
    return { status: screen && sheet && !manage && (name ?? "").includes(NAME) ? "PASS" : "FAIL", detail: `Settings ${screen}; name row ${JSON.stringify(name)}; 'Manage subscription' ${manage ? "SHOWN" : "not shown"} (free user); name sheet ${sheet}` };
  });
  await fieldCheck("settings-name", "~settings-name", PROFILE_NAME, { container: "~settings-profile-sheet-scroll", dock: false, clear: true });
  await fieldCheck("settings-pronunciation", "~settings-pronunciation", PROFILE_SAY, { container: "~settings-profile-sheet-scroll", dock: false, clear: true });
  await h.section("F-SETTINGS-CLOSE", async () => {
    await h.tap("~settings-profile-cancel", "Cancel", 4000);
    await sleep(1500);
    const closed = !(await h.shownNow("~settings-name"));
    await h.shot("settings-after-sheet");
    await h.tap("~settings-back", "Settings back", 4000, { scroll: false });
    await sleep(1000);
    return { status: closed ? "PASS" : "FAIL", detail: `name sheet closed without saving: ${closed}` };
  });

  await h.section("F-ALIVE-END", async () => {
    const s = await h.appState();
    await h.shot("end");
    return { status: s === 4 ? "PASS" : "FAIL", detail: `app state ${s} at the end of the walk (4 = foreground)` };
  });

  const passed = fieldResults.filter((f) => f.ok).length;
  h.record("F-FIELDS-SUMMARY", passed === fieldResults.length && fieldResults.length > 0 ? "PASS" : "FAIL", `${passed}/${fieldResults.length} text fields stayed in view while typing on ${DEVICE} ${JSON.stringify(h.win)}`, { fields: fieldResults });
}

let died = null;
try {
  await main();
} catch (e) {
  died = e;
  console.error("[fresh] fatal:", e);
  if (h.driver) await h.shot("fatal");
  h.record("F-FATAL", "FAIL", msg(e));
} finally {
  await h.endSession();
}
const pass = h.results.filter((r) => r.status === "PASS").length;
const fail = h.results.filter((r) => r.status === "FAIL");
log(`SUMMARY fresh-${DEVICE}: ${pass} pass, ${fail.length} fail, ${h.results.length - pass - fail.length} other`);
for (const f of fail) log(`  FAILED ${f.name}: ${f.detail}`);
h.writeResults();
process.exit(died || fail.length ? 1 : 0);
