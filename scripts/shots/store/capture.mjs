#!/usr/bin/env node
// THE STORE CAPTURE. Raw App Store screens for the 1.1 "Night Atlas" listing,
// taken from the local web build in still mode at the iPhone 6.9" point size
// (440 x 956 CSS px at 3x = 1320 x 2868 px), with the iPhone's safe-area
// insets emulated (62 pt top, 34 pt bottom), so every screen lays out exactly
// as it does under a real status bar and home indicator. compose.py draws the
// status bar, the device and the captions on top.
//
//   node scripts/shots/store/capture.mjs [rawDir] [--only 01,05,review] [--port 9381] [--app http://localhost:8094]
//     rawDir defaults to $VELA_STORE_RAW, else <os tmp>/vela-store-raw (never the repo)
//
// Each shot starts from a seeded persona (scripts/shots/seeds, docs/SHOTS.md),
// then drives the real UI: it opens sheets, picks a bridge, charts a proof
// through the real form (Star Birth), names the sky (Named Sky), taps through
// the Weave. Output per shot: <rawDir>/<id>.png and <id>.json (persona, url,
// the rects of named elements in CSS px for compose.py's pop-outs, and any
// app error); a shot can also save a screen it passes through on the way
// (03-proof-card, the Star Birth card that frame 3 lifts). The run exits 1 when
// a step fails or the app logs an error.
//
// Locale: the page runs as en-US (Emulation.setLocaleOverride plus
// navigator.language), so dates, times and prices read as on a US iPhone
// ('Oct 20', '$2.50'), whatever the host machine's locale is.
//
// Determinism: before the app loads, Date.now() is pinned to the still instant
// and Math.random() is a seeded PRNG, so ids and the seeds of chapters woven
// during the capture are identical on every run.
//
// Narration: headless Chrome has no speech engine, so the capture installs a
// stand-in for window.speechSynthesis before the app loads. It reports a few
// iPhone voices and "speaks" by firing each utterance's start/end events, then
// holds on the sentence named by the shot, so the reader shows its real
// narrating state (spoken sentence at full ink, dock 'Listening · m:ss left').
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch } from '../cdp.mjs';
import { collectErrors, injectPersona, loadManifest } from '../inject.mjs';

/* ------------------------------------------------------------------ args */

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const VALUED = new Set(['--only', '--port', '--app']);
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const RAW = path.resolve(positional[0] || process.env.VELA_STORE_RAW || path.join(os.tmpdir(), 'vela-store-raw'));
const APP = opt('--app', process.env.APP_URL || 'http://localhost:8094');
const PORT = Number(opt('--port', process.env.CDP_PORT || 9381));
const ONLY = opt('--only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** iPhone 6.9" (16/17 Pro Max): 440 x 956 pt, @3x, safe area 62 pt top, 34 pt bottom. */
const DEVICE = { w: 440, h: 956, scale: 3, insets: { top: 62, bottom: 34, left: 0, right: 0 } };
/** The listing is en-US: dates, times and currency format as on a US iPhone. */
const LOCALE = 'en-US';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** What a shot's steps did that is worth printing (and keeping in <id>.json). */
let notes = [];
const note = (msg) => notes.push(msg);

/* ------------------------------------------------------------------ page shims (determinism, speech) */

const PAGE_SHIMS = `(() => {
  if (window.__shotSpeech) return;
  // Determinism: new ids and engine seeds come from Date.now() and Math.random()
  // (lib/store/ids). Pin both per page load, so a chapter woven during the
  // capture reads the same on every run. Still mode already pins the app clock.
  const FROZEN = Date.UTC(2026, 9, 21, 20, 4, 30);
  Date.now = () => FROZEN;
  let seed = 0x5eed1101;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const cfg = (window.__shotSpeech = { hold: null, spoken: 0 });
  const VOICES = [
    { voiceURI: 'com.apple.voice.premium.en-US.Ava', name: 'Ava (Premium)', lang: 'en-US', localService: true, default: true },
    { voiceURI: 'com.apple.voice.enhanced.en-GB.Serena', name: 'Serena (Enhanced)', lang: 'en-GB', localService: true, default: false },
    { voiceURI: 'com.apple.voice.enhanced.en-US.Evan', name: 'Evan (Enhanced)', lang: 'en-US', localService: true, default: false },
    { voiceURI: 'com.apple.voice.compact.en-US.Samantha', name: 'Samantha', lang: 'en-US', localService: true, default: false },
  ];
  class Utterance {
    constructor(text) { this.text = text || ''; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; }
    addEventListener() {}
    removeEventListener() {}
  }
  const queue = [];
  let timer = null;
  let holding = null;
  const fire = (u, type) => {
    const ev = { type, utterance: u, charIndex: 0, charLength: 0, elapsedTime: 0, name: '' };
    try { if (typeof u['on' + type] === 'function') u['on' + type](ev); } catch (e) { setTimeout(() => { throw e; }); }
  };
  const holdsHere = (u) => (cfg.hold ? u.text.toLowerCase().includes(String(cfg.hold).toLowerCase()) : true);
  const pump = () => {
    timer = null;
    if (holding) return;
    const u = queue.shift();
    if (!u) return;
    fire(u, 'start');
    if (holdsHere(u)) { holding = u; return; }
    cfg.spoken += 1;
    setTimeout(() => { fire(u, 'end'); schedule(); }, 15);
  };
  const schedule = () => { if (!timer) timer = setTimeout(pump, 15); };
  const synth = {
    get speaking() { return !!holding || queue.length > 0; },
    get pending() { return queue.length > 0; },
    paused: false,
    onvoiceschanged: null,
    getVoices: () => VOICES.slice(),
    speak(u) { queue.push(u); schedule(); },
    cancel() { queue.length = 0; holding = null; if (timer) { clearTimeout(timer); timer = null; } },
    pause() {},
    resume() {},
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true, writable: true });
})();`;

/* ------------------------------------------------------------------ driver */

const findExpr = (sel) => `(() => {
  const q = ${JSON.stringify(sel)};
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
  if (q.startsWith('text=')) {
    const needle = q.slice(5).toLowerCase();
    const onScreen = (e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    const all = [...document.querySelectorAll('div,span')].filter((e) => vis(e) && onScreen(e) && e.textContent.toLowerCase().includes(needle));
    // The deepest element that still holds the whole needle.
    return all.filter((e) => ![...e.children].some((c) => c.textContent.toLowerCase().includes(needle))).pop() || null;
  }
  return [...document.querySelectorAll(q)].find(vis) || null;
})()`;

function driver(page) {
  const sel = (idOrSel) => (/^[\[#.]|^text=/.test(idOrSel) ? idOrSel : `[data-testid="${idOrSel}"]`);
  const visible = (s) => page.eval(`!!${findExpr(sel(s))}`).catch(() => false);
  const d = {
    sel,
    visible,
    async waitFor(s, timeoutMs = 15000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        if (await visible(s)) return;
        await sleep(150);
      }
      throw new Error(`not visible: ${sel(s)}`);
    },
    async waitGone(s, timeoutMs = 10000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        if (!(await visible(s))) return;
        await sleep(150);
      }
      throw new Error(`still visible: ${sel(s)}`);
    },
    async waitUrl(re, timeoutMs = 15000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        const u = await page.eval('location.pathname + location.search').catch(() => '');
        if (re.test(u)) return u;
        await sleep(150);
      }
      throw new Error(`url never matched ${re}`);
    },
    async waitText(s, needle, timeoutMs = 15000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        const t = await page.eval(`(() => { const el = ${findExpr(sel(s))}; return el ? el.textContent : ''; })()`).catch(() => '');
        if (t.toLowerCase().includes(needle.toLowerCase())) return t;
        await sleep(150);
      }
      throw new Error(`"${needle}" never appeared in ${sel(s)}`);
    },
    /** Bring the element into view, then click its centre with real mouse events. */
    async tap(s, { settle = 450, timeoutMs = 15000 } = {}) {
      await d.waitFor(s, timeoutMs);
      await page.eval(`(() => { const el = ${findExpr(sel(s))}; el && el.scrollIntoView({ block: 'center', inline: 'center' }); })()`);
      await sleep(250);
      const c = await page.eval(`(() => { const el = ${findExpr(sel(s))}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!c) throw new Error(`no element ${sel(s)}`);
      await page.clickAt(c.x, c.y);
      await sleep(settle);
    },
    async type(s, text) {
      await d.tap(s, { settle: 200 });
      await page.type(text);
      await sleep(300);
    },
    /** Blur the focused field (no caret or focus ring in the shot). */
    async blur() {
      await page.eval('document.activeElement && document.activeElement.blur && document.activeElement.blur()');
      await sleep(250);
    },
    /**
     * Scroll the element's own scroller so its top sits `offset` CSS px below
     * the scroller's top (a negative offset counts up from the bottom edge).
     */
    async place(s, offset = 120) {
      await d.waitFor(s);
      const ok = await page.eval(`(() => {
        const el = ${findExpr(sel(s))};
        if (!el) return false;
        let sc = el.parentElement;
        while (sc) {
          const st = getComputedStyle(sc);
          if (sc.scrollHeight > sc.clientHeight + 4 && ['auto', 'scroll'].includes(st.overflowY)) break;
          sc = sc.parentElement;
        }
        if (!sc) return false;
        const er = el.getBoundingClientRect();
        const sr = sc.getBoundingClientRect();
        const off = ${Number(offset)};
        const top = er.top - sr.top + sc.scrollTop;
        sc.scrollTop = off >= 0 ? top - off : top + er.height - sc.clientHeight - off;
        return true;
      })()`);
      if (!ok) throw new Error(`no scroller for ${sel(s)}`);
      await sleep(600);
    },
    /** Scroll the element's scroller so the element's bottom sits `gap` CSS px above the top of `ref` (a dock). */
    async placeAbove(s, ref, gap = 16) {
      await d.waitFor(s);
      await d.waitFor(ref);
      const ok = await page.eval(`(() => {
        const el = ${findExpr(sel(s))};
        const ref = ${findExpr(sel(ref))};
        if (!el || !ref) return false;
        let sc = el.parentElement;
        while (sc) {
          const st = getComputedStyle(sc);
          if (sc.scrollHeight > sc.clientHeight + 4 && ['auto', 'scroll'].includes(st.overflowY)) break;
          sc = sc.parentElement;
        }
        if (!sc) return false;
        sc.scrollTop += el.getBoundingClientRect().bottom - (ref.getBoundingClientRect().top - ${Number(gap)});
        return true;
      })()`);
      if (!ok) throw new Error(`no scroller for ${sel(s)}`);
      await sleep(600);
    },
    /**
     * A list cut by the tab bar should not slice a line of text in half: scroll
     * down by the fewest px (at most `max`) so that no text or glyph straddles
     * the top edge of the bar that holds `tabSel`, nor the list's own top edge.
     * Returns the px scrolled, or a negative code when nothing fits.
     */
    async clearEdge(tabSel, max = 24) {
      const s = await page.eval(`(() => {
        const tab = ${findExpr(sel(tabSel))};
        if (!tab) return -1;
        // The list's scroller ends where the tab bar begins: that bottom edge is the cut.
        const tabTop = tab.getBoundingClientRect().top;
        const sc = [...document.querySelectorAll('div')]
          .filter((d) => {
            const r = d.getBoundingClientRect();
            return r.width > 0 && d.scrollHeight > d.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowY) && r.bottom <= tabTop + 1 && r.bottom >= tabTop - 60;
          })
          .sort((a, b) => b.clientHeight - a.clientHeight)[0];
        if (!sc) return -2;
        const edge = sc.getBoundingClientRect().bottom;
        const top = sc.getBoundingClientRect().top;
        const ink = [...sc.querySelectorAll('*')].filter((e) => {
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          if (e.tagName.toLowerCase() === 'svg') return true;
          return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        }).map((e) => e.getBoundingClientRect());
        for (let s = 0; s <= ${Number(max)}; s++) {
          const cut = (r, y) => r.top - s < y - 2 && r.bottom - s > y + 2;
          if (!ink.some((r) => cut(r, edge) || cut(r, top))) { sc.scrollTop += s; return s; }
        }
        return -3;
      })()`);
      await sleep(500);
      return s;
    },
    /** True when the element's bottom sits at least `gap` CSS px above the top of `ref` (a dock). */
    async clearOf(s, ref, gap = 12) {
      const a = await d.rect(s);
      const b = await d.rect(ref);
      return !!(a && b && a.y + a.h <= b.y - gap);
    },
    /**
     * The reader's dock is a scrim: text fades out under its top edge. Nudge the
     * page by at most `max` CSS px so the fewest lines of text sit in that fade
     * (ideally a paragraph break does), keeping `avoid` (the paragraph the shot
     * is about) fully on screen, under the header and above the dock. A
     * paragraph cut by the header (a stray last line at the top) costs as much
     * as a whole screen of lines in the fade, and a line right behind the
     * dock's status text ('Listening · 1:59 left') counts four times. Returns
     * the px scrolled.
     */
    async settleUnderDock(dockSel, { avoid = null, max = 40, band = 0.5, status = 'story-listen-status' } = {}) {
      await d.waitFor(dockSel);
      const s = await page.eval(`(() => {
        const dock = ${findExpr(sel(dockSel))};
        const avoid = ${avoid ? findExpr(sel(avoid)) : 'null'};
        if (!dock) return null;
        const scrollers = [...document.querySelectorAll('div')].filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && e.scrollHeight > e.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) && !dock.contains(e);
        });
        const sc = (avoid && scrollers.find((e) => e.contains(avoid))) || scrollers.sort((a, b) => b.clientHeight - a.clientHeight)[0];
        if (!sc) return null;
        const dr = dock.getBoundingClientRect();
        const top = sc.getBoundingClientRect().top;
        const bandTop = dr.top;
        const bandBottom = dr.top + dr.height * ${Number(band)};
        const st = ${status ? findExpr(sel(status)) : 'null'};
        const sr = st ? st.getBoundingClientRect() : null;
        const lines = [];
        const blocks = new Set();
        const walk = document.createTreeWalker(sc, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walk.nextNode())) {
          if (!n.textContent.trim() || dock.contains(n)) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) lines.push([r.top, r.bottom]);
          // The paragraph: the nearest ancestor that is not inline text.
          let b = n.parentElement;
          while (b && b !== sc && getComputedStyle(b).display === 'inline') b = b.parentElement;
          if (b && b !== sc) blocks.add(b);
        }
        const paras = [...blocks].map((b) => b.getBoundingClientRect()).filter((r) => r.height > 0).map((r) => [r.top, r.bottom]);
        const av = avoid ? avoid.getBoundingClientRect() : null;
        const lo = Math.max(-${Number(max)}, -sc.scrollTop);
        const hi = Math.min(${Number(max)}, sc.scrollHeight - sc.clientHeight - sc.scrollTop);
        let best = null;
        for (let s = lo; s <= hi; s++) {
          if (av && (av.top - s < top + 8 || av.bottom - s > dr.top - 8)) continue;
          let score = 0;
          for (const [t, b] of lines) {
            score += Math.max(0, Math.min(b - s, bandBottom) - Math.max(t - s, bandTop));
            if (sr) score += 3 * Math.max(0, Math.min(b - s, sr.bottom + 4) - Math.max(t - s, sr.top - 4));
          }
          for (const [t, b] of paras) if (t - s < top - 2 && b - s > top + 2) score += 400;
          if (!best || score < best[0] - 0.5 || (Math.abs(score - best[0]) <= 0.5 && Math.abs(s) < Math.abs(best[1]))) best = [score, s];
        }
        if (!best) return null;
        sc.scrollTop += best[1];
        return best[1] === 0 ? 0 : best[1]; // never -0 (CDP returns it as an unserializable value)
      })()`);
      await sleep(500);
      note(s === null ? `no dock scroll for ${dockSel}` : `nudged ${s} px to keep text out of the dock's fade`);
      return s;
    },
    async value(s) {
      return page.eval(`(() => { const el = ${findExpr(sel(s))}; const input = el && (el.matches('input,textarea') ? el : el.querySelector('input,textarea')); return input ? input.value : null; })()`);
    },
    /** Every scroller to y ('end' = bottom). */
    async scroll(y) {
      await page.eval(`(() => { for (const el of document.querySelectorAll('div')) {
        const st = getComputedStyle(el);
        if (el.scrollHeight > el.clientHeight + 1 && ['auto', 'scroll'].includes(st.overflowY)) el.scrollTop = ${y === 'end' ? 'el.scrollHeight' : Number(y)};
      } })()`);
      await sleep(600);
    },
    /** The narration stand-in holds on the first sentence containing `needle`. */
    async holdNarrationAt(needle) {
      await page.eval(`window.__shotSpeech && (window.__shotSpeech.hold = ${JSON.stringify(needle)})`);
    },
    async rect(s) {
      return page.eval(`(() => { const el = ${findExpr(sel(s))}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
    },
  };
  return d;
}

/* ------------------------------------------------------------------ the shots */

// Proof sentences charted through the real form (the persona's next star).
// PROOF_CH2 is in Maya's own words, not the bridge's ('Sketch the sign that will hang above the studio.'),
// so the woven quote in Chapter II reads as hers.
const PROOF_CH2 = 'Sketched three versions of the sign. The serif one won.';
const PROOF_STAR6 = 'Sent the bakery its first invoice, with my studio name on it.';
const PROOF_STAR7 = 'Hung the sign above the studio door.';

/**
 * id: output name (compose.py reads it). persona + route: the starting state.
 * run(d, page, snap): drives the UI to the captured state; snap(id, rects)
 * saves the screen it is on as another raw. rects: named elements whose CSS-px
 * boxes are saved for pop-outs.
 */
const SHOTS = [
  {
    // Frame 1: Chapter I being narrated. The spoken sentence carries Maya's own
    // words in gold; the page is back at the top so the chapter's title shows.
    id: '01-reader-narrating',
    persona: 'maya-ch1',
    route: '@chapterOne',
    async run(d) {
      await d.waitFor('story-listen');
      await d.holdNarrationAt('trust your eye');
      await d.tap('story-listen', { settle: 300 });
      await d.waitText('story-listen-status', 'Listening');
      await sleep(600);
      await d.scroll(0);
      await d.settleUnderDock('story-dock', { max: 30 });
    },
    rects: { words: 'text=own design studio with clients who trust your eye', sentence: 'text=You stand on the threshold', woven: 'story-woven', dock: 'story-dock' },
  },
  {
    // Frame 2: the end of Chapter I, the 15-minute bridge picked, the violet commitment above the dock.
    id: '02-bridge-chooser',
    persona: 'maya-ch1',
    route: '@chapterOne',
    async run(d) {
      await d.scroll('end');
      await d.waitFor('story-bridge-15min');
      await d.tap('story-bridge-15min');
      // The 'Today's bridge' heading sits just under the sticky header when the
      // whole chooser, 'Make it observable' included, still clears the dock.
      await d.place('text=Today’s bridge', 10);
      if (!(await d.clearOf('story-bridge-commit', 'story-dock', 12))) {
        note("'Today's bridge' under the header would put 'Make it observable' behind the dock; placed the button above the dock instead");
        await d.placeAbove('story-bridge-commit', 'story-dock', 20);
      }
    },
    rects: { picked: 'story-bridge-15min', commit: 'story-bridge-commit', chooser: 'story-action-bridge' },
  },
  {
    // Frame 3: a proof charted through the real form (its Star Birth card is
    // saved as 03-proof-card for the pop-out), the Weave, then Chapter II with
    // that proof woven in gold.
    id: '03-chapter-two-woven',
    persona: 'maya-bridge',
    route: '@evidence',
    async run(d, page, snap) {
      await d.waitFor('evidence-note');
      await d.tap('evidence-kind-did');
      await d.type('evidence-note', PROOF_CH2);
      await d.blur();
      await d.tap('evidence-save');
      await d.waitFor('evidence-finish', 20000);
      await d.waitText('evidence-success', 'charted');
      await snap('03-proof-card', { receipt: 'evidence-receipt', kind: 'text=I did it' });
      await d.tap('evidence-finish');
      await d.waitUrl(/^\/weave\//);
      await d.waitFor('weave-stage');
      await sleep(400);
      await d.tap('weave-stage');
      await d.waitUrl(/^\/story\//, 15000);
      await d.waitFor('story-woven');
      await d.place('story-woven', 300);
      await d.settleUnderDock('story-dock', { avoid: 'story-woven' });
    },
    rects: { woven: 'story-woven', dock: 'story-dock' },
  },
  {
    // Frame 4 (full bleed): the named sky 'The Studio' (Season 1, all 7 stars
    // lit), from the persona a month in. compose.py crops the header away.
    id: '04-sky',
    persona: 'maya-named',
    route: '@sky',
    async run(d) {
      await d.waitFor('sky-screen');
      await d.tap('sky-season-1', { settle: 900 });
      await d.waitText('sky-title', 'The Studio');
    },
    rects: { title: 'sky-title', figure: 'sky-figure', legend: 'text=Tap a star to reread' },
  },
  {
    // Frame 4's pop-out: star 4's sheet in the same sky ('Booked a call with a studio lead', changed Chapter IV).
    id: '04-sky-star',
    persona: 'maya-named',
    route: '@sky',
    async run(d) {
      await d.waitFor('sky-screen');
      await d.tap('sky-season-1', { settle: 900 });
      await d.waitText('sky-title', 'The Studio');
      await d.tap('[data-testid^="sky-figure-star-"][data-testid$="-4"]');
      await d.waitFor('star-detail-text');
      await sleep(500);
    },
    rects: { sheet: 'star-detail', chapter: 'star-detail-chapter', share: 'star-detail-share' },
  },
  {
    // Frame 5: choose a bridge, cross it, chart the proof through the real form: Star Birth.
    id: '05-star-birth',
    persona: 'maya-mid',
    route: '@reader',
    async run(d) {
      await d.scroll('end');
      await d.waitFor('story-bridge-15min');
      await d.tap('story-bridge-15min');
      await d.tap('story-bridge-commit', { settle: 900 });
      if (await d.visible('story-remind-no')) await d.tap('story-remind-no', { settle: 700 });
      await d.tap('story-record-proof');
      await d.waitUrl(/^\/evidence\//);
      await d.waitFor('evidence-note');
      await d.tap('evidence-kind-did');
      await d.type('evidence-note', PROOF_STAR6);
      await d.blur();
      await d.tap('evidence-save');
      await d.waitFor('evidence-finish', 20000);
      await d.waitText('evidence-success', 'charted');
      // The session's one ask (a soft Plus note) waits under the dock; 'Not now' keeps the frame to the ceremony.
      if (await d.visible('evidence-plus-nudge-close')) await d.tap('evidence-plus-nudge-close', { settle: 600 });
      await d.scroll(0);
    },
    rects: { receipt: 'evidence-receipt', caption: 'evidence-success', figure: 'evidence-star-birth-figure' },
  },
  {
    // Frame 6: a free listener (the same Maya as frames 5 and 7, Season 1
    // Chapter V) narrating over Night, the free soundscape, with the sleep timer
    // at 30 minutes. The voice is on her woven proof; compose.py's soundscape
    // pop-out covers the top of the page, so the woven paragraph sits low,
    // whole and clear of the dock.
    id: '06-listen',
    persona: 'maya-mid',
    route: '@reader',
    async run(d, page) {
      await d.waitFor('story-listen');
      await d.holdNarrationAt('Some of this grew');
      await d.tap('story-listen', { settle: 300 });
      await d.waitText('story-listen-status', 'Listening');
      await d.tap('story-sleep');
      await d.tap('story-sleep-30', { settle: 300 });
      // Close the sheet the way a thumb does: a tap on the scrim above it.
      await page.clickAt(DEVICE.w / 2, 140);
      await d.waitGone('story-sleep-sheet');
      await d.waitText('story-bed', 'Night');
      await d.placeAbove('story-woven', 'story-dock', 28);
      await d.settleUnderDock('story-dock', { avoid: 'story-woven', max: 30 });
    },
    rects: { dock: 'story-dock', woven: 'story-woven' },
  },
  {
    // Frame 6's pop-out: the free listener's soundscape sheet. Night is chosen;
    // Rain on Glass, Hearth and Dawn carry the app's own lock and 'Plus' pill (2.3.2).
    id: '06-listen-soundscape',
    persona: 'maya-mid',
    route: '@reader',
    async run(d) {
      await d.waitFor('story-listen');
      await d.tap('story-bed');
      await d.waitFor('story-bed-dawn');
      await d.waitText('story-bed-rain', 'Plus');
      await sleep(600);
    },
    rects: { sheet: 'story-bed-sheet', night: 'story-bed-night', rain: 'story-bed-rain', hearth: 'story-bed-hearth', dawn: 'story-bed-dawn', off: 'story-bed-off' },
  },
  {
    id: '07-arc',
    persona: 'maya-mid',
    route: '@arc',
    async run(d) {
      await d.waitFor('arc-dream-header');
      note(`cleared the tab-bar edge by ${await d.clearEdge('tab-arc', 24)} px`);
    },
    rects: { header: 'arc-dream-header', plate: '[data-testid^="arc-chapter-"]' },
  },
  {
    // Frame 8: the seventh proof through the real form, Star Birth closes the
    // figure, then 'Name this sky' with the suggested name: Named Sky.
    id: '08-named-sky',
    persona: 'maya-eve',
    route: '@evidence',
    async run(d) {
      await d.waitFor('evidence-note');
      await d.tap('evidence-kind-did');
      await d.type('evidence-note', PROOF_STAR7);
      await d.blur();
      await d.tap('evidence-save');
      await d.waitFor('evidence-sky-name', 20000);
      // The name field starts with the suggested name ('The Studio'); keep it.
      if (!(await d.value('evidence-sky-name'))) await d.type('evidence-sky-name', 'The Studio');
      await d.blur();
      await d.tap('evidence-sky-save', { settle: 900 });
      await d.waitFor('evidence-sky-title', 10000);
      if (await d.visible('evidence-plus-nudge-close')) await d.tap('evidence-plus-nudge-close', { settle: 600 });
      await d.scroll(0);
    },
    rects: { plate: 'evidence-sky-set' },
  },
  {
    id: '09-rituals',
    persona: 'maya-mid',
    route: '@rituals',
    async run(d) {
      await d.waitFor('door-script');
      note(`cleared the tab-bar edge by ${await d.clearEdge('tab-rituals', 24)} px`);
    },
    rects: { line: 'rituals-line', m369: 'door-369' },
  },
  {
    id: '10-today-sealed',
    persona: 'maya-sealed',
    route: '@today',
    async run(d) {
      await d.waitFor('today-log-sealed');
      note(`cleared the tab-bar edge by ${await d.clearEdge('tab-today', 8)} px`);
    },
    rects: { card: 'future-memory-card' },
  },
  {
    // The subscription review screenshot (App Store Connect, In-App Purchases):
    // the paywall with its plates priced. demoPrices=1 fills the plates with the
    // live US prices on the web dev build, where StoreKit never answers.
    id: 'review-paywall',
    persona: 'maya-mid',
    route: '/paywall?demoPrices=1',
    async run(d) {
      await d.waitFor('paywall-buy');
      await d.waitFor('plan-yearly-price');
      // The main Plus benefit leads, just under the header; the plans, the
      // renewal terms and Restore / Terms / Privacy stay above the buy dock.
      await d.place('text=More than one dream at a time', 4);
      if (!(await d.clearOf('text=Restore purchases', 'paywall-buy', 4))) note("'Restore purchases' sits behind the buy dock");
    },
    rects: { plans: 'paywall-plans', links: 'text=Restore purchases', buy: 'paywall-buy' },
  },
];

/* ------------------------------------------------------------------ run */

/** Screenshot the page as <rawDir>/<id>.png with its <id>.json (rects in CSS px, notes, errors). */
async function save(page, d, id, persona, rectSpec, errorsSoFar = []) {
  await page.waitForImages(6000);
  await sleep(700);
  const rects = {};
  for (const [name, s] of Object.entries(rectSpec ?? {})) rects[name] = await d.rect(s).catch(() => null);
  const file = path.join(RAW, `${id}.png`);
  await page.screenshot(file);
  const errors = [...errorsSoFar, ...(await collectErrors(page))];
  const meta = {
    id,
    persona,
    url: await page.eval('location.pathname + location.search'),
    viewport: { ...DEVICE },
    locale: LOCALE,
    anchor: loadManifest().anchor.local,
    rects,
    notes: [...notes],
    errors,
  };
  fs.writeFileSync(path.join(RAW, `${id}.json`), JSON.stringify(meta, null, 2) + '\n');
  return { id, file, errors, rects };
}

async function capture(page, shot) {
  const d = driver(page);
  await page.viewport(DEVICE.w, DEVICE.h, DEVICE.scale);
  await page.send('Emulation.setSafeAreaInsetsOverride', { insets: DEVICE.insets });
  const info = await injectPersona(page, APP, shot.persona, { still: true, route: shot.route });
  await page.eval('window.__velaErrors = []').catch(() => {});
  notes = [];
  // A shot can also save the screen it passes through on the way (a pop-out's source).
  const extra = [];
  const snap = async (id, rectSpec) => extra.push(await save(page, d, id, shot.persona, rectSpec));
  await shot.run(d, page, snap);
  const main = await save(page, d, shot.id, shot.persona, shot.rects, info.errors ?? []);
  return { ...main, extra, notes };
}

const shots = ONLY.length ? SHOTS.filter((s) => ONLY.some((o) => s.id === o || s.id.startsWith(o))) : SHOTS;
if (!shots.length) {
  console.error(`no shot matches --only ${ONLY.join(',')}. Shots: ${SHOTS.map((s) => s.id).join(', ')}`);
  process.exit(2);
}
fs.mkdirSync(RAW, { recursive: true });

const page = await launch({ port: PORT });
await page.send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_SHIMS });
// A US iPhone: Intl formats '$2.50' and 'Oct 20', not the host's 'US$2.50' and
// '20 Oct' (headless Chrome inherits the machine's locale, en-GB here), and
// navigator.language reads en-US. Both overrides last for the whole session.
await page.send('Emulation.setLocaleOverride', { locale: LOCALE });
{
  const { userAgent } = await page.send('Browser.getVersion');
  await page.send('Emulation.setUserAgentOverride', { userAgent, acceptLanguage: LOCALE });
}
const problems = [];
try {
  for (const shot of shots) {
    const t0 = Date.now();
    try {
      const { file, errors, rects, notes: said, extra } = await capture(page, shot);
      const missingIn = (r) => Object.entries(r).filter(([, v]) => !v).map(([n]) => n);
      for (const x of extra) {
        const miss = missingIn(x.rects);
        console.log(`shot ${path.basename(x.file)}  ${shot.persona}  (on the way to ${shot.id})${miss.length ? `  (no rect: ${miss.join(', ')})` : ''}`);
      }
      const missing = missingIn(rects);
      console.log(`shot ${path.basename(file)}  ${shot.persona}  ${((Date.now() - t0) / 1000).toFixed(1)}s${missing.length ? `  (no rect: ${missing.join(', ')})` : ''}`);
      for (const n of said) console.log(`  - ${n}`);
      for (const e of [...extra.flatMap((x) => x.errors), ...errors]) {
        problems.push(`${shot.id}: ${e}`);
        console.log(`  ! ${e}`);
      }
    } catch (e) {
      const msg = String(e?.message ?? e).split('\n')[0];
      problems.push(`${shot.id}: ${msg}`);
      console.log(`FAILED ${shot.id}: ${msg}`);
      try {
        await page.screenshot(path.join(RAW, `FAILED-${shot.id}.png`));
      } catch {}
    }
  }
} finally {
  await page.close();
}
console.log(`\n${shots.length} shot(s) → ${RAW}, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
