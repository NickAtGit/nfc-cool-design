/* Headless Chrome over the DevTools Protocol with nothing but Node's global
   WebSocket and fetch: no puppeteer, no install step. Used by the two email
   tools (build/emit-email-assets.mjs, build/email-shots.mjs), never by
   `npm run build`, which has to run on a machine with no browser.

   Two traps, both already paid for on this machine:
   - `--headless=old`. The new headless mode hangs on screenshots here.
   - `Emulation.setEmulatedMedia` is the only way to get a dark scheme:
     headless Chrome ignores the OS appearance. */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CHROME = process.env.CHROME
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitFor(url, ms) {
  const deadline = Date.now() + ms;
  for (;;) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error(`Chrome never answered on ${url}`);
    await new Promise(r => setTimeout(r, 120));
  }
}

/* Launches Chrome, opens one page, and hands back `send` for that page.
   Call `close()` when done: it kills Chrome and removes the profile. */
export async function openPage({ port = 9333 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'design-chrome-'));
  const child = spawn(CHROME, [
    '--headless=old', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--disable-extensions',
    '--force-color-profile=srgb', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  await waitFor(`http://127.0.0.1:${port}/json/version`, 30000);
  const targets = await waitFor(`http://127.0.0.1:${port}/json/list`, 5000);
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('cannot open the page socket')); });
  let next = 1;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(String(ev.data));
    if (m.id !== undefined) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (p) m.error ? p.reject(new Error(`${p.method}: ${m.error.message}`)) : p.resolve(m.result);
    } else for (const fn of listeners.get(m.method) ?? []) fn(m.params);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = next++;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = (method, ms = 15000) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), ms);
    const list = listeners.get(method) ?? [];
    const fn = p => { clearTimeout(t); listeners.set(method, (listeners.get(method) ?? []).filter(f => f !== fn)); resolve(p); };
    listeners.set(method, [...list, fn]);
  });
  /* Evaluates an async function in the page and returns its value. */
  const evaluate = async (fn, ...args) => {
    const r = await send('Runtime.evaluate', {
      expression: `(${fn.toString()})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const close = async () => {
    try { ws.close(); } catch { /* already gone */ }
    const exited = new Promise(r => child.once('exit', r));
    child.kill('SIGKILL');
    await exited;
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* the OS cleans tmp */ }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  return { send, once, evaluate, close };
}
