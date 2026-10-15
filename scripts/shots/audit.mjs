// Walks a fresh user through every Vela screen on the local web build and
// captures each one. Used for design audits and as the base for store shots.
//
//   node scripts/shots/audit.mjs <outDir>      (APP_URL, SCALE, W, H, CDP_PORT optional)
import path from 'node:path';
import { launch } from './cdp.mjs';

const APP = process.env.APP_URL || 'http://localhost:8094';
const OUT = process.argv[2] || 'audit';
const SCALE = Number(process.env.SCALE || 1);
const W = Number(process.env.W || 430);
const H = Number(process.env.H || 932);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tid = (id) => `[data-testid="${id}"]`;
const has = (t) => `document.body.innerText.includes(${JSON.stringify(t)})`;

const page = await launch({ port: Number(process.env.CDP_PORT || 9344) });
await page.viewport(W, H, SCALE);
let n = 0;
const shot = async (name) => {
  await sleep(900);
  const f = path.join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`);
  await page.screenshot(f);
  console.log('shot', f);
};
const step = async (label, fn) => {
  try { await fn(); } catch (e) { console.log(`! ${label}: ${e.message.split('\n')[0]}`); }
};
const click = async (sel) => { await page.click(sel); await sleep(500); };
const typeInto = async (sel, text) => { await page.click(sel); await sleep(150); await page.type(text); await sleep(300); };
const scrollAll = (y) => page.eval(`(() => { for (const d of document.querySelectorAll('div')) {
  if (d.scrollHeight > d.clientHeight + 40 && ['auto','scroll'].includes(getComputedStyle(d).overflowY)) d.scrollTop = ${y}; } })()`);
const go = async (route, waitText) => {
  await page.goto(`${APP}${route}`, 1200);
  if (waitText) await page.waitFor(has(waitText), 20000).catch(() => {});
};

await go('/');
await page.eval('localStorage.clear()');
await go('/', 'Begin');
await shot('onboarding-0-welcome');
await step('ob1', async () => { await click(tid('onboarding-next')); await shot('onboarding-1-focus-empty');
  await click(tid('focus-abundance')); await click(tid('focus-career')); await shot('onboarding-1-focus'); await click(tid('onboarding-next')); });
await step('ob2', async () => { await click(tid('mood-hopeful')); await shot('onboarding-2-mood'); await click(tid('onboarding-next')); });
await step('ob3', async () => { await typeInto(tid('name-input'), 'Maya'); await shot('onboarding-3-name'); await click(tid('onboarding-next')); });
await step('ob4', async () => { await click(tid('ritual-both')); await shot('onboarding-4-ritual'); await click(tid('onboarding-next')); });
await step('ob5', async () => { await shot('onboarding-5-practice'); await click(tid('onboarding-done')); await sleep(1500); });
await step('intake', async () => {
  await shot('intake-empty');
  await click(tid('intake-focus-career'));
  await typeInto(tid('intake-desire'), 'my own design studio, with clients who trust my eye');
  await click('[data-testid^="intake-feeling-"]');
  await shot('intake-filled');
  await click(tid('intake-weave'));
  await sleep(4500);
});
await step('story', async () => {
  await shot('story-top');
  await scrollAll(700); await shot('story-mid');
  await scrollAll(99999); await shot('story-end');
});
await step('soft-plus', async () => {
  if (await page.eval(`!!document.querySelector('${tid('soft-plus')}')`)) { await shot('soft-plus'); await click(tid('soft-plus-later')); }
});
await step('evidence', async () => {
  const sel = (await page.eval(`!!document.querySelector('${tid('story-record-proof')}')`)) ? tid('story-record-proof') : tid('story-action-bridge');
  await click(sel); await sleep(1200);
  await shot('evidence-empty');
  await click('[data-testid^="evidence-kind-"]');
  await typeInto(tid('evidence-note'), 'Sent my portfolio to two studios I admire.');
  await shot('evidence-filled');
  await click(tid('evidence-save')); await sleep(1500);
  await shot('evidence-success');
});
await step('today', async () => { await go('/', 'Today'); await shot('today-top'); await scrollAll(600); await shot('today-mid'); await scrollAll(99999); await shot('today-end'); });
await step('stories', async () => { await go('/stories'); await shot('stories'); });
await step('journal', async () => { await go('/journal'); await shot('journal'); });
await step('script', async () => { await go('/journal/script'); await shot('journal-script'); });
await step('369', async () => { await go('/journal/method369'); await shot('journal-369'); });
await step('gratitude', async () => { await go('/journal/gratitude'); await shot('journal-gratitude'); });
await step('board', async () => { await go('/board'); await shot('board'); });
await step('affirmations', async () => { await go('/affirmations'); await shot('affirmations'); });
await step('affirmation', async () => { await go('/affirmation'); await shot('affirmation'); });
await step('paywall', async () => { await go('/paywall'); await shot('paywall'); await scrollAll(99999); await shot('paywall-end'); });
await step('settings', async () => { await go('/settings'); await shot('settings'); });
await page.close();
