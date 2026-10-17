#!/usr/bin/env node
// Load a seeded persona (scripts/shots/seeds/<persona>.json, written by
// `bun scripts/shots/seed.ts`) into the web build and, from the CLI, capture
// routes. Docs: docs/SHOTS.md.
//
// Library
//   import { launch } from './cdp.mjs';
//   import { injectPersona, gotoRoute } from './inject.mjs';
//   const page = await launch({ port: 9360 });
//   await page.viewport(430, 932, 1);
//   const info = await injectPersona(page, 'http://localhost:8094', 'maya-mid', { still: true });
//   await page.screenshot('today.png');
//   await gotoRoute(page, 'http://localhost:8094', '@reader', { persona: 'maya-mid', still: true });
//
// CLI
//   node scripts/shots/inject.mjs <persona> <route> <out.png> [<route> <out.png> …]
//     [--w 430 --h 932 | --sizes 430x932,375x667] [--scale 1] [--still] [--port 9360]
//     [--app http://localhost:8094] [--wait <testID>] [--scroll <px|end>] [--settle <ms>] [--no-rebase]
//   A route may be a path ('/arc') or a manifest route name ('@reader', '@sky', '@evidence' …).
//
// What injectPersona does
//   1. Gives the browser the seeds' timezone (Emulation.setTimezoneOverride), so
//      local day keys and the still clock (21:04 on 21 Oct 2026) line up.
//   2. Opens a non-app document on the app's origin (/favicon.ico), so no running
//      app instance can write over the seed, then clears localStorage and
//      sessionStorage and writes every key of the persona.
//   3. Without --still, shifts every date by whole days so the seed's "today"
//      (21 Oct 2026) is the real today and the loop states read the same on a
//      live clock (--no-rebase keeps the raw dates).
//   4. Loads the route (with ?still=1 in still mode; still mode is read once per
//      page load) and waits until the stores are ready, the fonts are loaded and
//      images have decoded. Uncaught errors and console.error calls are collected.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SEEDS_DIR = path.join(HERE, 'seeds');
const DAY_MS = 24 * 60 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ seeds */

let manifestCache = null;

/** scripts/shots/seeds/_manifest.json: anchor, timezone, and per persona its Today state, ids and routes. */
export function loadManifest() {
  if (!manifestCache) {
    const file = path.join(SEEDS_DIR, '_manifest.json');
    if (!fs.existsSync(file)) throw new Error('No seeds yet. Run: bun scripts/shots/seed.ts');
    manifestCache = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return manifestCache;
}

export function listPersonas() {
  return Object.keys(loadManifest().personas);
}

/** The persona's localStorage snapshot: { key: rawString }. */
export function loadSeed(persona) {
  if (!/^[a-z0-9-]+$/.test(persona)) throw new Error(`bad persona name '${persona}'`);
  const file = path.join(SEEDS_DIR, `${persona}.json`);
  if (!fs.existsSync(file)) throw new Error(`unknown persona '${persona}'. Known: ${listPersonas().join(', ')}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * '@reader' → that persona's route from the manifest; '/arc' or 'arc' → '/arc'.
 * Git Bash (MSYS) rewrites a bare '/arc' argument into 'C:/Program Files/Git/arc';
 * that rewrite is undone here, so the CLI works from any shell.
 */
export function resolveRoute(route, persona) {
  if (!route) return '/';
  const msys = /^[A-Za-z]:[\\/](?:.*[\\/])?Git([\\/].*)?$/i.exec(route);
  if (msys) return (msys[1] || '/').replace(/\\/g, '/');
  if (!route.startsWith('@')) return route.startsWith('/') ? route : `/${route}`;
  const name = route.slice(1);
  const routes = persona ? loadManifest().personas[persona]?.routes : null;
  if (!routes || !routes[name]) {
    throw new Error(`route '${route}' is not defined for persona '${persona}'. Defined: ${routes ? Object.keys(routes).map((r) => '@' + r).join(' ') : 'none'}`);
  }
  return routes[name];
}

/* ------------------------------------------------------------------ rebase */

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local 'YYYY-MM-DD' of an instant in a timezone. */
export function dateKeyIn(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** UTC offset of an instant in a timezone, in minutes (BST → 60). */
function offsetMinutes(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(new Date(ms));
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(tz);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

const shiftKey = (key, days) => new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Shift an ISO instant by whole local days, keeping its local wall time across DST. */
function shiftIso(iso, days, timeZone) {
  const ms = Date.parse(iso);
  let next = ms + days * DAY_MS;
  next += (offsetMinutes(ms, timeZone) - offsetMinutes(next, timeZone)) * 60000;
  return new Date(next).toISOString();
}

function shiftValue(v, days, timeZone) {
  if (typeof v === 'string') {
    if (ISO_RE.test(v)) return shiftIso(v, days, timeZone);
    if (KEY_RE.test(v)) return shiftKey(v, days);
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => shiftValue(x, days, timeZone));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shiftValue(x, days, timeZone)]));
  return v;
}

/** Every ISO instant and 'YYYY-MM-DD' key inside the JSON values moves by `days` whole days. Raw (non-JSON) values stay. */
export function rebaseStorage(storage, days, timeZone) {
  if (!days) return { ...storage };
  const out = {};
  for (const [key, raw] of Object.entries(storage)) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      out[key] = raw;
      continue;
    }
    out[key] = parsed && typeof parsed === 'object' ? JSON.stringify(shiftValue(parsed, days, timeZone)) : raw;
  }
  return out;
}

/** Days from the seed's anchor day to today in the seeds' timezone (0 on 21 Oct 2026). */
export function rebaseDays(now = new Date()) {
  const { anchor, timezone } = loadManifest();
  return Math.round((Date.parse(`${dateKeyIn(now, timezone)}T00:00:00Z`) - Date.parse(`${anchor.dateKey}T00:00:00Z`)) / DAY_MS);
}

/* ------------------------------------------------------------------ browser */

function stillOf(appUrl, opts) {
  if (typeof opts.still === 'boolean') return opts.still;
  const q = new URL(appUrl).searchParams.get('still');
  return q !== null && ['1', 'true', 'yes'].includes(q.toLowerCase());
}

/** Absolute URL of a route on the app, with ?still=1 when still. */
export function routeUrl(appUrl, route, still) {
  const base = new URL(appUrl);
  const url = new URL(route || base.pathname || '/', base.origin);
  if (still) url.searchParams.set('still', '1');
  return url.toString();
}

const ERROR_HOOK = `(() => {
  if (window.__velaErrors) return;
  window.__velaErrors = [];
  const push = (m) => { if (window.__velaErrors.length < 50) window.__velaErrors.push(String(m).slice(0, 400)); };
  addEventListener('error', (e) => push('error: ' + (e.message || e.error)));
  addEventListener('unhandledrejection', (e) => push('unhandled: ' + ((e.reason && e.reason.message) || e.reason)));
  const ce = console.error.bind(console);
  console.error = (...a) => { push('console.error: ' + a.map((x) => (x && x.message) || String(x)).join(' ')); ce(...a); };
})();`;

const prepared = new WeakSet();

async function prepare(page) {
  if (prepared.has(page)) return;
  const { timezone } = loadManifest();
  try {
    await page.send('Emulation.setTimezoneOverride', { timezoneId: timezone });
  } catch (e) {
    if (!/already/i.test(String(e.message))) throw e;
  }
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: ERROR_HOOK });
  prepared.add(page);
}

/** Wait until the app rendered real content (RootNavigator renders nothing before every store is ready). */
export async function waitForApp(page, { waitFor, timeoutMs = 45000, settleMs = 900 } = {}) {
  await page.waitFor(
    `(() => {
      if (!document.fonts || document.fonts.status !== 'loaded') return false;
      const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return [...document.querySelectorAll('[data-testid]')].some(visible) && document.body.innerText.trim().length > 0;
    })()`,
    timeoutMs,
  );
  if (waitFor) {
    const sel = /^[\[#.]/.test(waitFor) ? waitFor : `[data-testid="${waitFor}"]`;
    await page.waitFor(`[...document.querySelectorAll(${JSON.stringify(sel)})].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })`, timeoutMs);
  }
  await page.waitForImages(8000);
  await sleep(settleMs);
}

/** Full page load of a route (storage untouched) and wait for the app. */
export async function gotoRoute(page, appUrl, route, opts = {}) {
  const still = stillOf(appUrl, opts);
  await prepare(page);
  const url = routeUrl(appUrl, resolveRoute(route, opts.persona), still);
  await page.goto(url, 300);
  await waitForApp(page, { waitFor: opts.waitFor, settleMs: opts.settleMs ?? (still ? 700 : 1500) });
  return { url, still, errors: await collectErrors(page) };
}

export async function collectErrors(page) {
  try {
    return (await page.eval('window.__velaErrors || []')) ?? [];
  } catch {
    return [];
  }
}

/**
 * Clear storage, write the persona, load the route and wait for the app.
 * opts: { route = '/', still (default: ?still in appUrl), rebase (default true; ignored when still), waitFor, settleMs }
 * Returns { persona, url, still, rebasedDays, keys, changedByApp, errors }.
 */
export async function injectPersona(page, appUrl, persona, opts = {}) {
  const still = stillOf(appUrl, opts);
  // Still mode pins the clock to the anchor, so only a live clock is rebased.
  const rebase = !still && opts.rebase !== false;
  const { timezone } = loadManifest();
  const days = rebase ? rebaseDays() : 0;
  const storage = rebaseStorage(loadSeed(persona), days, timezone);
  await prepare(page);

  // A non-app document on the same origin: nothing can write storage while we replace it.
  const origin = new URL(appUrl).origin;
  await page.goto(`${origin}/favicon.ico`, 100);
  const written = await page.eval(`(() => {
    localStorage.clear();
    sessionStorage.clear();
    const kv = ${JSON.stringify(storage)};
    for (const k of Object.keys(kv)) localStorage.setItem(k, kv[k]);
    return localStorage.length;
  })()`);
  if (written !== Object.keys(storage).length) throw new Error(`wrote ${written} of ${Object.keys(storage).length} keys`);

  const nav = await gotoRoute(page, appUrl, opts.route ?? new URL(appUrl).pathname ?? '/', { ...opts, persona, still });

  // Did the app rewrite any seeded key on load (a repair or a migration)? Informational.
  const now = await page.eval(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])))`);
  const after = JSON.parse(now);
  const changedByApp = Object.keys({ ...storage, ...after }).filter((k) => storage[k] !== after[k]);
  return { persona, url: nav.url, still, rebasedDays: days, keys: written, changedByApp, errors: nav.errors };
}

/** Scroll every scrollable container (RN-web ScrollViews are divs) to y ('end' = bottom). */
export async function scrollAll(page, y) {
  await page.eval(`(() => { for (const d of document.querySelectorAll('div')) {
    const s = getComputedStyle(d);
    if (d.scrollHeight > d.clientHeight + 40 && ['auto', 'scroll'].includes(s.overflowY)) d.scrollTop = ${y === 'end' ? 'd.scrollHeight' : Number(y)};
  } })()`);
  await sleep(500);
}

/* ------------------------------------------------------------------ CLI */

function parseArgs(argv) {
  const opts = { w: 430, h: 932, scale: 1, still: false, port: Number(process.env.CDP_PORT || 9360), app: process.env.APP_URL || 'http://localhost:8094' };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--still') opts.still = true;
    else if (a === '--no-rebase') opts.rebase = false;
    else if (a === '--w') opts.w = Number(val());
    else if (a === '--h') opts.h = Number(val());
    else if (a === '--scale') opts.scale = Number(val());
    else if (a === '--port') opts.port = Number(val());
    else if (a === '--app') opts.app = val();
    else if (a === '--wait') opts.waitFor = val();
    else if (a === '--scroll') opts.scroll = val();
    else if (a === '--settle') opts.settleMs = Number(val());
    else if (a === '--sizes') opts.sizes = val().split(',').map((s) => s.trim().split('x').map(Number));
    else if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    else pos.push(a);
  }
  return { opts, pos };
}

const USAGE = `usage: node scripts/shots/inject.mjs <persona> <route> <out.png> [<route> <out.png> …]
         [--w 430 --h 932 | --sizes 430x932,375x667] [--scale 1] [--still] [--port 9360]
         [--app http://localhost:8094] [--wait <testID>] [--scroll <px|end>] [--settle <ms>] [--no-rebase]
personas: `;

/** `--list [persona]`: each persona's Today state, chip and route names. */
function printList(persona) {
  const m = loadManifest();
  const ids = persona ? [persona] : Object.keys(m.personas);
  console.log(`anchor ${m.anchor.local} ${m.timezone} (still clock); live runs rebase by ${rebaseDays()} day(s)`);
  for (const id of ids) {
    const p = m.personas[id];
    if (!p) throw new Error(`unknown persona '${id}'`);
    const t = p.today;
    const state = t.kind === 'chapter-waiting' ? `${t.kind}(${t.heard ? 'heard' : 'unheard'})` : t.kind === 'resting' ? `${t.kind}(${t.reason})` : t.kind;
    console.log(`\n${id}  ${state}  ${p.chip}${p.plus ? '  Plus' : ''}\n  ${p.description}`);
    for (const [name, route] of Object.entries(p.routes)) console.log(`  @${name.padEnd(13)} ${route}`);
  }
}

async function cli(argv) {
  if (argv[0] === '--list') {
    printList(argv[1]);
    return 0;
  }
  const { opts, pos } = parseArgs(argv);
  const [persona, ...rest] = pos;
  if (!persona || rest.length === 0 || rest.length % 2 !== 0) {
    let known = '(run bun scripts/shots/seed.ts first)';
    try {
      known = listPersonas().join(', ');
    } catch {}
    console.error(USAGE + known);
    return 2;
  }
  loadSeed(persona);
  const shots = [];
  for (let i = 0; i < rest.length; i += 2) shots.push({ route: resolveRoute(rest[i], persona), out: rest[i + 1] });
  const sizes = opts.sizes ?? [[opts.w, opts.h]];

  const { launch } = await import(pathToFileURL(path.join(HERE, 'cdp.mjs')).href);
  const page = await launch({ port: opts.port });
  let failed = 0;
  try {
    for (const [w, h] of sizes) {
      await page.viewport(w, h, opts.scale);
      let injected = false;
      for (const shot of shots) {
        const out = sizes.length > 1 ? shot.out.replace(/(\.png)?$/i, `-${w}x${h}.png`) : shot.out;
        try {
          const info = injected
            ? { ...(await gotoRoute(page, opts.app, shot.route, { ...opts, persona })), persona }
            : await injectPersona(page, opts.app, persona, { ...opts, route: shot.route });
          injected = true;
          if (opts.scroll !== undefined) await scrollAll(page, opts.scroll);
          await page.screenshot(path.resolve(out));
          const extra = [
            info.rebasedDays ? `rebased ${info.rebasedDays}d` : null,
            info.changedByApp?.length ? `app wrote: ${info.changedByApp.join(', ')}` : null,
            info.errors?.length ? `${info.errors.length} error(s)` : null,
          ].filter(Boolean);
          console.log(`shot ${out}  ${w}x${h}${opts.scale !== 1 ? `@${opts.scale}x` : ''}  ${info.url}${extra.length ? `  [${extra.join('; ')}]` : ''}`);
          for (const e of info.errors ?? []) console.log(`  ! ${e}`);
        } catch (e) {
          failed += 1;
          console.error(`FAILED ${shot.route} → ${out}: ${String(e.message).split('\n')[0]}`);
        }
      }
    }
  } finally {
    await page.close();
  }
  return failed ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  cli(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(String(e.message || e));
      process.exit(1);
    },
  );
}
