#!/usr/bin/env node
// THE PERSONA GALLERY. Every seeded persona's key screens, captured in still
// mode at each size (the top of the screen and, for long ones, its end), so a
// design pass can read the whole app as contact sheets in one go.
//
//   node scripts/shots/gallery.mjs <outDir> [persona …] [--sizes 430x932,375x667] [--port 9360] [--live]
//     env: APP_URL (http://localhost:8094), SCALE (1)
//
// Output: <outDir>/<persona>/<size>/<NN>-<name>[-end].png, plus a summary of
// any app error and of any key the app rewrote on load. Exit 1 on either.
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './cdp.mjs';
import { gotoRoute, injectPersona, listPersonas, loadManifest, scrollAll } from './inject.mjs';

/** [name, route ('@name' from the manifest or a path), capture the end too?] */
const PLAN = {
  fresh: [['onboarding', '/', false]],
  'maya-ch1': [
    ['today', '@today', true],
    ['reader', '@reader', true],
    ['sky', '@sky', false],
    ['evidence', '@evidence', false],
    ['arc', '@arc', true],
    ['rituals', '@rituals', true],
    ['scenes', '@scenes', false],
    ['lines', '@affirmations', false],
  ],
  'maya-bridge': [
    ['today', '@today', true],
    ['reader', '@reader', true],
    ['evidence', '@evidence', true],
    ['arc', '@arc', true],
  ],
  'maya-mid': [
    ['today', '@today', true],
    ['reader', '@reader', true],
    ['woven', '@woven', false],
    ['sky', '@sky', true],
    ['evidence', '@evidence', false],
    ['born', '@born', true],
    ['arc', '@arc', true],
    ['rituals', '@rituals', true],
    ['script', '@script', false],
    ['m369', '@m369', true],
    ['gratitude', '@gratitude', false],
    ['page', '@journalEntry', false],
    ['line', '@affirmation', false],
    ['lines', '@affirmations', true],
    ['scenes', '@scenes', true],
    ['paywall', '@paywall', true],
    ['settings', '@settings', true],
    ['new-dream', '@newDream', false],
  ],
  'maya-woven': [
    ['today', '@today', true],
    ['reader', '@reader', false],
  ],
  'maya-sealed': [['today', '@today', true]],
  'maya-eve': [
    ['today', '@today', true],
    ['evidence', '@evidence', true],
    ['reader', '@reader', true],
  ],
  'maya-unseeded-eve': [
    ['today', '@today', false],
    ['evidence', '@evidence', true],
    ['arc', '@arc', true],
  ],
  'maya-complete': [
    ['today', '@today', true],
    ['reader', '@reader', true],
    ['sky', '@sky', true],
    ['evidence', '@evidence', true],
    ['arc', '@arc', true],
  ],
  'maya-named': [
    ['today', '@today', true],
    ['reader', '@reader', false],
    ['sky', '@sky', true],
    ['second-sky', '@secondSky', false],
    ['second-reader', '@secondReader', true],
    ['arc', '@arc', true],
    ['rituals', '@rituals', true],
    ['scenes', '@scenes', true],
    ['paywall', '@paywall', true],
    ['settings', '@settings', false],
    ['new-dream', '@newDream', false],
  ],
  'maya-lapsed': [
    ['today', '@today', true],
    ['second-reader', '@secondReader', true],
    ['arc', '@arc', true],
    ['paywall', '/paywall?from=lapsed', false],
  ],
};

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !['--sizes', '--port'].includes(args[i - 1]));
const OUT = positional[0] || 'gallery';
const only = positional.slice(1);
const APP = process.env.APP_URL || 'http://localhost:8094';
const SCALE = Number(process.env.SCALE || 1);
const STILL = !args.includes('--live');
const SIZES = opt('--sizes', '430x932,375x667').split(',').map((s) => s.trim().split('x').map(Number));
const PORT = Number(opt('--port', process.env.CDP_PORT || 9360));

const personas = (only.length ? only : listPersonas()).filter((p) => PLAN[p]);
const manifest = loadManifest();
const page = await launch({ port: PORT });
const problems = [];
let count = 0;
try {
  for (const persona of personas) {
    const routes = manifest.personas[persona]?.routes ?? {};
    for (const [w, h] of SIZES) {
      await page.viewport(w, h, SCALE);
      const dir = path.join(OUT, persona, `${w}x${h}`);
      fs.mkdirSync(dir, { recursive: true });
      let injected = false;
      let n = 0;
      for (const [name, route, end] of PLAN[persona]) {
        if (route.startsWith('@') && !routes[route.slice(1)]) continue;
        try {
          const info = injected
            ? await gotoRoute(page, APP, route, { persona, still: STILL })
            : await injectPersona(page, APP, persona, { still: STILL, route });
          if (!injected && info.changedByApp?.length) problems.push(`${persona}: the app rewrote ${info.changedByApp.join(', ')} on load`);
          injected = true;
          for (const e of info.errors ?? []) problems.push(`${persona} ${name} ${w}x${h}: ${e}`);
          const base = path.join(dir, `${String(++n).padStart(2, '0')}-${name}`);
          await page.screenshot(`${base}.png`);
          count += 1;
          if (end) {
            await scrollAll(page, 'end');
            await new Promise((r) => setTimeout(r, 500));
            await page.screenshot(`${base}-end.png`);
            count += 1;
          }
        } catch (e) {
          problems.push(`${persona} ${name} ${w}x${h}: ${String(e.message).split('\n')[0]}`);
        }
      }
      console.log(`${persona} ${w}x${h}: ${n} screens → ${dir}`);
    }
  }
} finally {
  await page.close();
}
console.log(`\n${count} shots, ${problems.length} problem(s)`);
for (const p of problems) console.log(`  ! ${p}`);
process.exit(problems.length ? 1 : 0);
