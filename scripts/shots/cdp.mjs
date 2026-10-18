// Minimal Chrome DevTools Protocol driver (no dependencies): launches the
// installed Chrome headless and exposes just what the screenshot scripts need.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Profiles a crashed or killed run could not delete; they pile up in %TEMP% and fill the disk. */
function sweepStaleProfiles(maxAgeMs = 60 * 60 * 1000) {
  const tmp = os.tmpdir();
  for (const name of fs.readdirSync(tmp)) {
    if (!name.startsWith('ws-shots-')) continue;
    const dir = path.join(tmp, name);
    try {
      if (Date.now() - fs.statSync(dir).mtimeMs > maxAgeMs) fs.rmSync(dir, { recursive: true, force: true });
    } catch { /* in use by a live run */ }
  }
}

export async function launch({ port = 9333 } = {}) {
  sweepStaleProfiles();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-shots-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--disk-cache-size=1', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--force-color-profile=srgb', '--disable-extensions', '--mute-audio', '--font-render-hinting=none',
    'about:blank',
  ], { stdio: 'ignore' });

  let pageTarget;
  for (let i = 0; i < 80 && !pageTarget; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      pageTarget = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
    if (!pageTarget) await sleep(250);
  }
  if (!pageTarget) throw new Error('Chrome did not start');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} ${msg.error.data ?? ''}`));
      else resolve(msg.result);
    } else if (msg.method && listeners.has(msg.method)) {
      for (const fn of listeners.get(msg.method)) fn(msg.params);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const once = (method) => new Promise((resolve) => {
    const fn = (p) => { listeners.get(method).delete(fn); resolve(p); };
    if (!listeners.has(method)) listeners.set(method, new Set());
    listeners.get(method).add(fn);
  });

  await send('Page.enable');
  await send('Runtime.enable');

  const page = {
    send,
    async viewport(width, height, scale = 3) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
      await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    },
    async goto(url, settleMs = 1500) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url });
      await Promise.race([loaded, sleep(20000)]);
      await sleep(settleMs);
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(expression, timeoutMs = 20000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        try { if (await page.eval(expression)) return true; } catch { /* page reloading */ }
        await sleep(250);
      }
      throw new Error(`timed out waiting for: ${expression}`);
    },
    /**
     * Center of the first VISIBLE element matching a CSS selector (or with that
     * exact text), in CSS px. Navigators keep hidden screens mounted with 0×0
     * rects, so a bare querySelector can land on a stale duplicate.
     */
    async centerOf(selectorOrText) {
      const expr = `(() => {
        const q = ${JSON.stringify(selectorOrText)};
        const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        let el = null;
        try { el = [...document.querySelectorAll(q)].find(visible) || null; } catch {}
        if (!el) {
          const all = [...document.querySelectorAll('div,span,a,button')].filter(e => e.offsetParent !== null && e.children.length === 0 && e.textContent.trim() === q);
          el = all[all.length - 1] || null;
        }
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`;
      return page.eval(expr);
    },
    async click(selectorOrText) {
      const c = await page.centerOf(selectorOrText);
      if (!c) throw new Error(`no element for ${selectorOrText}`);
      await page.clickAt(c.x, c.y);
    },
    async clickAt(x, y) {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, pointerType: 'mouse' });
      }
    },
    async type(text) {
      await send('Input.insertText', { text });
    },
    async waitForImages(timeoutMs = 15000) {
      await page.waitFor(`[...document.images].every(i => i.complete)`, timeoutMs).catch(() => {});
    },
    async screenshot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async close() {
      try { ws.close(); } catch {}
      const exited = new Promise((r) => proc.once('exit', r));
      proc.kill();
      await Promise.race([exited, sleep(5000)]);
      for (let i = 0; i < 20; i++) {
        await sleep(250);
        try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { /* Chrome still exiting */ }
      }
    },
  };
  return page;
}
