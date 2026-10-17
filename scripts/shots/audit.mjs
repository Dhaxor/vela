#!/usr/bin/env node
// THE 1.1 AUDIT WALK. A fresh install on the local web build, driven through
// the whole Night Atlas loop and captured screen by screen:
//
//   First Light (6 steps, with a seed proof) → the Weave → Chapter I with the
//   seed woven in gold → choose a bridge → 'Not today' sheet → 'I crossed it'
//   → a proof → Star Birth → share card → the Weave → Chapter II with the new
//   proof woven → Today → the sky and a star's sheet → Arc → the ghost plate's
//   paywall → Rituals and each practice (Script, 3·6·9, Gratitude), Scenes,
//   Your lines → the paywall from every entry point → Settings → Today's
//   'Save for' → the sealed day.
//
// Every step asserts what it expects (a testID visible, the right words on the
// page). The run fails (exit 1) when a step fails or the app logs an error.
//
//   node scripts/shots/audit.mjs <outDir> [--sizes 430x932,375x667] [--live] [--port 9344]
//     env: APP_URL (http://localhost:8094), CDP_PORT, W, H, SCALE (1)
//
// Still mode (the default) pins the clock to 21 Oct 2026 21:04 Europe/London
// and freezes motion, so the Weave and Star Birth show their end states and
// every run is pixel-stable. --live runs on the real clock with the real
// animations (the Weave and Star Birth advance on their own).
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './cdp.mjs';
import { collectErrors, injectPersona, routeUrl, waitForApp } from './inject.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = args.find((a, i) => !a.startsWith('--') && !['--sizes', '--port'].includes(args[i - 1])) || 'audit';
const APP = process.env.APP_URL || 'http://localhost:8094';
const SCALE = Number(process.env.SCALE || 1);
const STILL = !flag('--live');
const PORT = Number(opt('--port', process.env.CDP_PORT || 9344));
const SIZES = opt('--sizes', `${process.env.W || 430}x${process.env.H || 932}`)
  .split(',')
  .map((s) => s.trim().split('x').map(Number));

const SEED = 'Bought the domain name.';
const DESIRE = 'my own design studio, with clients who trust my eye';
const PROOF = 'Sent my portfolio to two studios I admire.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tid = (id) => `[data-testid="${id}"]`;
/** The page's visible text, lower-cased, whitespace collapsed (display titles wrap with explicit line breaks). */
const PAGE_TEXT = `document.body.innerText.toLowerCase().replace(/\\s+/g, ' ')`;

/* ------------------------------------------------------------------ driver */

function driver(page, outDir) {
  let n = 0;
  const failures = [];
  const errors = [];
  const shots = [];

  /** First visible element for a selector (navigators keep hidden duplicates mounted). */
  const findExpr = (sel) => `(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
    return [...document.querySelectorAll(${JSON.stringify(sel)})].find(vis) || null;
  })()`;
  const visible = async (sel) => page.eval(`!!${findExpr(sel)}`).catch(() => false);
  const sel = (idOrSel) => (/^[\[#.]/.test(idOrSel) ? idOrSel : tid(idOrSel));

  const api = {
    failures,
    errors,
    shots,
    sel,
    visible: (id) => visible(sel(id)),
    async waitFor(id, timeoutMs = 15000) {
      const s = sel(id);
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        if (await visible(s)) return;
        await sleep(200);
      }
      throw new Error(`not visible: ${s}`);
    },
    async waitGone(id, timeoutMs = 10000) {
      const s = sel(id);
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        if (!(await visible(s))) return;
        await sleep(200);
      }
      throw new Error(`still visible: ${s}`);
    },
    async waitText(text, timeoutMs = 15000) {
      const end = Date.now() + timeoutMs;
      const needle = text.toLowerCase().replace(/\s+/g, ' ');
      while (Date.now() < end) {
        if (await page.eval(`${PAGE_TEXT}.includes(${JSON.stringify(needle)})`).catch(() => false)) return;
        await sleep(200);
      }
      throw new Error(`text not on the page: "${text}"`);
    },
    async hasText(text) {
      return page.eval(`${PAGE_TEXT}.includes(${JSON.stringify(text.toLowerCase().replace(/\s+/g, ' '))})`).catch(() => false);
    },
    async url() {
      return page.eval('location.pathname + location.search');
    },
    async waitUrl(re, timeoutMs = 15000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        const u = await api.url().catch(() => '');
        if (re.test(u)) return u;
        await sleep(200);
      }
      throw new Error(`url never matched ${re} (at ${await api.url().catch(() => '?')})`);
    },
    /** Scroll the element into the middle of its scroller, then click its centre. */
    async tap(id, { timeoutMs = 15000, settle = 450 } = {}) {
      const s = sel(id);
      await api.waitFor(s, timeoutMs);
      const c = await page.eval(`(() => {
        const el = ${findExpr(s)};
        if (!el) return null;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      if (!c) throw new Error(`no element ${s}`);
      await sleep(250);
      const again = await page.eval(`(() => { const el = ${findExpr(s)}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await page.clickAt((again ?? c).x, (again ?? c).y);
      await sleep(settle);
    },
    async type(id, text) {
      await api.tap(id, { settle: 200 });
      await page.type(text);
      await sleep(300);
    },
    /** Scroll every scroller to y ('end' = bottom), or the element with this testID into view. */
    async scroll(to) {
      if (typeof to === 'string' && to !== 'end') {
        const s = sel(to);
        await api.waitFor(s);
        await page.eval(`(() => { const el = ${findExpr(s)}; el && el.scrollIntoView({ block: 'center' }); })()`);
      } else {
        await page.eval(`(() => { for (const d of document.querySelectorAll('div')) {
          const st = getComputedStyle(d);
          if (d.scrollHeight > d.clientHeight + 40 && ['auto', 'scroll'].includes(st.overflowY)) d.scrollTop = ${to === 'end' ? 'd.scrollHeight' : Number(to)};
        } })()`);
      }
      await sleep(600);
    },
    /** The first visible element's rect (CSS px), or null. */
    async rect(id) {
      return page.eval(`(() => { const el = ${findExpr(sel(id))}; if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; })()`);
    },
    /** Fail unless `id` sits in the first view: on screen, and starting (or, `whole`, ending) above `above` (the dock or the tab bar). */
    async inFirstView(id, above, whole = false) {
      const r = await api.rect(id);
      if (!r) throw new Error(`not on screen: ${id}`);
      const limit = above ? (await api.rect(above))?.top ?? Infinity : await page.eval('innerHeight');
      const vw = await page.eval('innerWidth');
      if (r.left < -1 || r.right > vw + 1) throw new Error(`${id} runs off the screen (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
      if (r.top >= limit) throw new Error(`${id} starts below ${above ?? 'the fold'} (top ${Math.round(r.top)} ≥ ${Math.round(limit)})`);
      if (whole && r.bottom > limit + 1) throw new Error(`${id} is cut off by ${above ?? 'the fold'} (bottom ${Math.round(r.bottom)} > ${Math.round(limit)})`);
    },
    async shot(name) {
      await page.waitForImages(4000);
      await sleep(STILL ? 500 : 900);
      const f = path.join(outDir, `${String(++n).padStart(2, '0')}-${name}.png`);
      await page.screenshot(f);
      shots.push(f);
      console.log(`  shot ${path.basename(f)}`);
      return f;
    },
    /** Full page load of a route (still param kept), then wait for the app. */
    async go(route, waitFor) {
      await api.drainErrors(`before ${route}`);
      await page.goto(routeUrl(APP, route, STILL), 300);
      await waitForApp(page, { waitFor, settleMs: STILL ? 600 : 1400 });
    },
    /** Move the page's collected errors into the run's list. */
    async drainErrors(where) {
      const list = await collectErrors(page);
      await page.eval('window.__velaErrors = []').catch(() => {});
      for (const e of list) errors.push(`${where}: ${e}`);
    },
    async step(label, fn) {
      console.log(`- ${label}`);
      try {
        await fn();
        await api.drainErrors(label);
      } catch (e) {
        const msg = String(e?.message ?? e).split('\n')[0];
        failures.push(`${label}: ${msg}`);
        console.log(`  ! FAILED ${msg}`);
        try {
          await api.shot(`FAILED-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
        } catch {}
      }
    },
    /** Let the persist queues write (they wait out ceremonies), before a full reload. */
    async settleStorage(ms = 1600) {
      let last = '';
      const end = Date.now() + 8000;
      while (Date.now() < end) {
        const now = await page.eval('JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k).length]))');
        if (now === last) return;
        last = now;
        await sleep(ms / 2);
      }
    },
  };
  return api;
}

/* ------------------------------------------------------------------ the walk */

async function walk(page, w, h) {
  const outDir = SIZES.length > 1 ? path.join(OUT, `${w}x${h}`) : OUT;
  fs.mkdirSync(outDir, { recursive: true });
  const a = driver(page, outDir);
  await page.viewport(w, h, SCALE);
  console.log(`\n== ${w}x${h} ${STILL ? 'still' : 'live'} → ${outDir}`);

  await a.step('fresh install', async () => {
    const info = await injectPersona(page, APP, 'fresh', { still: STILL, route: '/', waitFor: 'onboarding-next' });
    if (info.keys !== 0) throw new Error(`storage not empty (${info.keys} keys)`);
  });

  /* ---- First Light ---- */
  await a.step('onboarding: welcome', async () => {
    await a.waitText('Your story is written on this phone');
    await a.shot('onboarding-1-welcome');
    await a.tap('onboarding-next');
  });
  await a.step('onboarding: focus', async () => {
    await a.waitFor('focus-career');
    await a.shot('onboarding-2-focus-empty');
    await a.tap('focus-career');
    await a.shot('onboarding-2-focus');
    await a.tap('onboarding-next');
  });
  await a.step('onboarding: your own words', async () => {
    await a.type('onboarding-desire', DESIRE);
    await a.tap('onboarding-feeling-proud');
    await a.shot('onboarding-3-words');
    await a.tap('onboarding-next');
  });
  await a.step('onboarding: name', async () => {
    await a.type('name-input', 'Maya');
    await a.shot('onboarding-4-name');
    await a.tap('onboarding-next');
  });
  await a.step('onboarding: ritual', async () => {
    await a.tap('ritual-evening');
    await a.shot('onboarding-5-ritual');
    await a.tap('onboarding-next');
  });
  await a.step('onboarding: seed proof', async () => {
    await a.type('onboarding-seed', SEED);
    await a.shot('onboarding-6-seed');
    await a.tap('onboarding-done');
  });

  /* ---- The Weave → Chapter I ---- */
  await a.step('weave → Chapter I', async () => {
    await a.waitUrl(/^\/weave\//);
    await a.waitFor('weave-stage');
    if (STILL) {
      await a.waitFor('weave-hint');
      await a.shot('weave-1-end');
      await a.tap('weave-stage');
    } else {
      await sleep(1100);
      await a.shot('weave-1-mid');
    }
    await a.waitUrl(/^\/story\//, 15000);
    await a.waitFor('story-listen');
    await a.waitText('Maya');
    // Every player control fits the screen (at 320pt the row used to clip 'Voice').
    for (const id of ['story-listen', 'story-voice']) await a.inFirstView(id);
    await a.shot('chapter-1-top');
  });
  await a.step('Chapter I: the seed woven in gold', async () => {
    await a.waitText('Woven from your proof');
    await a.waitText(SEED.replace(/\.$/, ''));
    // The woven paragraph (testID story-woven) carries the gold proof and its tag.
    await a.scroll('story-woven');
    await a.shot('chapter-1-woven');
  });
  await a.step('Chapter I: choose a bridge', async () => {
    await a.scroll('end');
    await a.waitFor('story-bridge-15min');
    await a.shot('chapter-1-chooser');
    await a.tap('story-bridge-15min');
    await a.tap('story-bridge-commit');
    await a.waitFor('story-record-proof');
    await a.scroll('story-record-proof');
    await a.shot('chapter-1-bridge-open');
  });
  await a.step("reader: 'Not today' sheet", async () => {
    await a.tap('story-not-today');
    await a.waitFor('story-not-today-sheet-note');
    await a.shot('chapter-1-not-today');
    await a.tap('story-not-today-sheet-cancel');
    await a.waitGone('story-not-today-sheet-note');
  });

  /* ---- Proof → Star Birth → the Weave → Chapter II ---- */
  await a.step("'I crossed it' → proof form", async () => {
    await a.tap('story-record-proof');
    await a.waitUrl(/^\/evidence\//);
    await a.waitFor('evidence-note');
    // The one required field is in the first view, above 'Chart this proof' (ELEVATE §8's 375×667 gate).
    await a.inFirstView('evidence-note', 'evidence-dock');
    await a.shot('evidence-1-form');
    await a.tap('evidence-kind-did');
    await a.type('evidence-note', PROOF);
    await a.shot('evidence-2-filled');
  });
  await a.step('proof → Star Birth', async () => {
    await a.tap('evidence-save');
    await a.waitFor('evidence-success', 20000);
    await a.waitFor('evidence-finish', 20000);
    await a.waitText('charted');
    await a.shot('evidence-3-star-birth');
  });
  await a.step('Star Birth: share card', async () => {
    await a.tap('evidence-share');
    await a.waitFor('evidence-share-card-card');
    await a.shot('evidence-4-share-card');
    await a.tap('evidence-share-card-close');
    await a.waitGone('evidence-share-card-card');
  });
  await a.step("'Carry it forward' → the Weave → Chapter II", async () => {
    await a.tap('evidence-finish');
    await a.waitUrl(/^\/weave\//);
    await a.waitFor('weave-stage');
    if (STILL) {
      await a.shot('weave-2-end');
      await a.tap('weave-stage');
    }
    await a.waitUrl(/^\/story\//, 15000);
    await a.waitFor('story-listen');
    await a.shot('chapter-2-top');
    // The proof is woven in the second person ('the day you sent your portfolio…').
    await a.waitText('portfolio to two studios');
    await a.waitText('Woven from your proof');
    // The woven paragraph (testID story-woven) carries the gold proof and its tag.
    await a.scroll('story-woven');
    await a.shot('chapter-2-woven');
  });

  /* ---- Today, the sky, Arc ---- */
  await a.step('Today (Chapter II waiting)', async () => {
    await a.tap('story-back');
    if (!(await a.visible('today-screen').catch(() => false))) {
      await sleep(800);
      if (!(await a.visible('today-screen'))) await a.go('/', 'today-screen');
    }
    await a.waitFor('future-memory-card');
    await a.waitText('2 stars');
    // Today's one filled CTA clears the tab bar on arrival, and the week strip stays on screen.
    let cta = null;
    for (const id of ['today-enter-chapter', 'today-choose-bridge', 'weave-next-chapter', 'record-proof']) if (!cta && (await a.visible(id))) cta = id;
    if (!cta) throw new Error("no filled CTA on Today's loop card");
    await a.inFirstView(cta, '[data-testid="tab-today"]', true);
    await a.inFirstView('today-rhythm');
    await a.shot('today-1-top');
    await a.scroll('end');
    await a.shot('today-1-end');
    await a.scroll(0);
  });
  await a.step('the sky → a star', async () => {
    await a.tap('today-hero');
    await a.waitUrl(/^\/sky\//);
    await a.waitFor('sky-screen');
    await a.shot('sky-1');
    await a.tap('[data-testid^="sky-figure-star-"][data-testid$="-2"]');
    await a.waitFor('star-detail-text');
    await a.waitText(PROOF.replace(/\.$/, ''));
    await a.shot('sky-2-star');
    await a.tap('star-detail-share');
    await a.waitFor('share-card-card', 8000);
    await a.shot('sky-3-share');
    await a.tap('share-card-close');
    await a.waitGone('share-card-card');
    await a.tap('sky-toggle-list');
    await a.waitFor('sky-list');
    await a.shot('sky-4-list');
    await a.tap('sky-back');
    await a.waitFor('today-screen');
  });
  await a.step('Arc', async () => {
    await a.tap('tab-arc');
    await a.waitFor('arc-screen');
    await a.waitFor('arc-dream-header');
    await a.shot('arc-1-top');
    await a.scroll('end');
    await a.shot('arc-2-end');
  });
  await a.step("Arc ghost plate → paywall (second dream)", async () => {
    await a.tap('new-story');
    await a.waitUrl(/^\/paywall/);
    await a.waitFor('paywall-title');
    await a.waitText('second dream');
    await a.shot('paywall-from-arc');
    await a.tap('paywall-close');
    await a.waitFor('arc-screen');
  });

  /* ---- Rituals ---- */
  await a.step('Rituals', async () => {
    await a.tap('tab-rituals');
    await a.waitFor('rituals-screen');
    await a.waitFor('door-script');
    await a.shot('rituals-1-top');
    await a.scroll(560);
    await a.shot('rituals-2-mid');
    await a.scroll('end');
    await a.shot('rituals-3-end');
    await a.scroll(0);
  });
  await a.step('Script: write and seal', async () => {
    await a.tap('door-script');
    await a.waitFor('script-input');
    await a.type('script-input', 'The kettle clicks off. The first client of the day is early, and I am glad.');
    await a.shot('script-1-written');
    await a.tap('script-save');
    await a.waitFor('sealed-done');
    await a.shot('script-2-sealed');
    await a.tap('sealed-done');
    await a.waitFor('rituals-screen');
  });
  await a.step('3·6·9: choose a phrase, write a line', async () => {
    await a.tap('door-369');
    await a.waitFor('m369-close');
    await a.shot('m369-1-choose');
    if (await a.visible('suggest-369-0')) {
      await a.tap('suggest-369-0');
      if (await a.visible('phrase-set')) await a.tap('phrase-set');
    }
    await a.waitFor('rep-input');
    await a.type('rep-input', 'I am so proud that I opened my own design studio.');
    await a.tap('rep-write');
    await a.waitFor('progress-369');
    await a.shot('m369-2-written');
    await a.tap('m369-close');
    await a.waitFor('rituals-screen');
  });
  await a.step('Gratitude: write and seal', async () => {
    await a.tap('door-gratitude');
    await a.waitFor('gratitude-0');
    await a.type('gratitude-0', 'The printer answered on the first ring.');
    await a.shot('gratitude-1-written');
    await a.tap('gratitude-save');
    await a.waitFor('sealed-done');
    await a.shot('gratitude-2-sealed');
    await a.tap('sealed-done');
    await a.waitFor('rituals-screen');
  });
  await a.step('Past pages → a page', async () => {
    await a.scroll('end');
    await a.tap('[data-testid^="page-"]');
    await a.waitUrl(/^\/journal\/entry\//);
    await a.shot('page-entry');
    await a.go('/rituals', 'rituals-screen');
  });
  await a.step('Your line: carry it', async () => {
    await a.tap('rituals-carry');
    await a.waitFor('rituals-carried');
    await a.shot('rituals-4-carried');
  });
  await a.step('Scenes: a written scene', async () => {
    // An empty strip offers 'Open Scenes'; with scenes it ends in an 'Add a scene' frame.
    if (await a.visible('rituals-scene-add')) await a.tap('rituals-scene-add');
    else await a.tap('rituals-scenes-open');
    await a.waitUrl(/^\/scenes/);
    if (!(await a.visible('scene-choose-goal'))) {
      await a.shot('scenes-0-empty');
      await a.tap(await a.visible('scenes-first-goal') ? 'scenes-first-goal' : 'board-add-goal');
    } else {
      await a.shot('scenes-1-choose');
      await a.tap('scene-choose-goal');
    }
    await a.waitFor('goal-input');
    await a.type('goal-input', 'A brass plate by the door with the studio name.');
    await a.shot('scenes-2-compose');
    await a.tap('goal-save');
    await a.waitGone('goal-input');
    await a.waitText('A brass plate by the door');
    await a.shot('scenes-3-grid');
  });
  await a.step('Your lines: today and the library', async () => {
    await a.go('/affirmation', 'affirmation-text');
    await a.shot('lines-1-today');
    await a.tap('affirmation-browse');
    await a.waitFor('library-screen');
    await a.shot('lines-2-library');
  });

  /* ---- Paywall from every entry point ---- */
  for (const from of ['general', 'second-dream', 'bed', 'area', 'scenes', 'nudge', 'lapsed']) {
    await a.step(`paywall (${from})`, async () => {
      await a.go(from === 'general' ? '/paywall' : `/paywall?from=${from}`, 'paywall-title');
      await a.waitFor('paywall-buy');
      await a.shot(`paywall-${from}`);
      if (from === 'general') {
        await a.scroll('end');
        await a.waitFor('paywall-restore');
        await a.shot('paywall-general-end');
      }
    });
  }

  /* ---- Settings ---- */
  await a.step('Settings', async () => {
    await a.go('/settings', 'settings-screen');
    await a.shot('settings-1-top');
    await a.scroll(700);
    await a.shot('settings-2-mid');
    await a.scroll('end');
    await a.waitFor('settings-version');
    await a.shot('settings-3-end');
    await a.scroll(0);
    await a.tap('settings-time-evening');
    await a.waitFor('settings-time-sheet');
    await a.shot('settings-4-time');
    await a.tap('settings-time-cancel');
  });

  /* ---- Today: 'Save for' → sealed ---- */
  await a.step("Today: 'Save for' → sealed", async () => {
    await a.go('/', 'future-memory-card');
    if (await a.visible('today-save-for')) {
      await a.shot('today-2-woven');
      await a.tap('today-save-for');
      await a.waitFor('today-log-sealed');
      await a.shot('today-3-sealed');
    } else {
      await a.shot('today-2');
    }
  });

  await a.drainErrors('end');
  return { outDir, failures: a.failures, errors: a.errors, shots: a.shots };
}

/* ------------------------------------------------------------------ main */

const page = await launch({ port: PORT });
const results = [];
try {
  for (const [w, h] of SIZES) results.push({ size: `${w}x${h}`, ...(await walk(page, w, h)) });
} finally {
  await page.close();
}

let bad = 0;
console.log('\n== audit summary');
for (const r of results) {
  console.log(`${r.size}: ${r.shots.length} shots, ${r.failures.length} failed step(s), ${r.errors.length} app error(s) → ${r.outDir}`);
  for (const f of r.failures) console.log(`  FAIL ${f}`);
  for (const e of r.errors) console.log(`  ERROR ${e}`);
  bad += r.failures.length + r.errors.length;
}
process.exit(bad ? 1 : 0);
