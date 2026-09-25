/* Photographs every guideline email example in light and dark, at a phone
   width and a desktop width, the way a person reviews a mail before it ships.
     node build/email-shots.mjs <out-dir>        (npm run email:shots -- <out-dir>)
   Needs headless Chrome; not part of `npm run build`. The wordmark is served
   from src/email/ over a local HTTP server, because renderEmail accepts only
   an http(s) asset base, exactly as a real consumer's would be. */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { root } from './guideline.mjs';
import { openPage } from './chrome.mjs';
import { renderEmail } from '../src/email.js';
import { EXAMPLES, PLACEHOLDER_ICON_BASE, PLACEHOLDER_ICONS } from '../guideline/email-examples.mjs';

const out = resolve(process.argv[2] ?? join(root, 'site', 'email-shots'));
mkdirSync(out, { recursive: true });
const WIDTHS = [390, 800];
const SCHEMES = ['light', 'dark'];

const pages = new Map();
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pages.has(path)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pages.get(path)); }
  const m = /^\/email\/([\w@.-]+\.png)$/.exec(path);
  if (m) {
    const dir = PLACEHOLDER_ICONS.includes(m[1]) ? 'guideline/images' : 'src/email';
    try { const b = readFileSync(join(root, dir, m[1])); res.writeHead(200, { 'content-type': 'image/png' }); return res.end(b); } catch { }
  }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

for (const [slug, ex] of Object.entries(EXAMPLES)) {
  let { html, text } = renderEmail({ ...ex.options, assetBaseUrl: `${base}/email/` });
  html = html.replaceAll(PLACEHOLDER_ICON_BASE, `${base}/email/`);
  pages.set(`/${slug}.html`, html);
  writeFileSync(join(out, `${slug}.html`), html);
  writeFileSync(join(out, `${slug}.txt`), text);
}

const page = await openPage({ port: 9335 });
try {
  for (const slug of Object.keys(EXAMPLES)) {
    for (const scheme of SCHEMES) {
      for (const width of WIDTHS) {
        await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
        await page.send('Emulation.setDeviceMetricsOverride', { width, height: 300, deviceScaleFactor: 2, mobile: width < 600 });
        const loaded = page.once('Page.loadEventFired');
        await page.send('Page.navigate', { url: `${base}/${slug}.html` });
        await loaded;
        const height = await page.evaluate(async () => { await document.fonts.ready; return Math.ceil(document.documentElement.scrollHeight); });
        await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: width < 600 });
        const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const file = join(out, `${slug}-${scheme}-${width}.png`);
        writeFileSync(file, Buffer.from(data, 'base64'));
        console.log(`wrote ${file}`);
      }
    }
  }
} finally {
  await page.close();
  server.close();
}
