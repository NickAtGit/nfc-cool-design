/* Draws the mail header's wordmark PNGs from the repo's own wordmark.
   Run by hand when the wordmark changes, and commit the result:
     node build/emit-email-assets.mjs        (npm run email:assets)
   It needs headless Chrome, so it is NOT part of `npm run build`.

   Why PNG: Gmail refuses SVG and no client loads a webfont reliably, so the
   header cannot be the web's text wordmark or its SVG. Why these sources: the
   secondary logo the guideline and every console already show, ink on light
   and white on dark, tail and its shadow included.

   Each PNG is 2x its display size (WORDMARK in src/email.js) with a hairline
   halo in its own theme's card colour. On its own card the halo is invisible;
   in a client that inverts a light mail without asking (the Gmail app does),
   the halo is what keeps the ink letters from vanishing into the dark. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './guideline.mjs';
import { openPage } from './chrome.mjs';
import { palette } from '../src/email/palette.js';
import { WORDMARK } from '../src/email.js';

const SCALE = 2;
const PAD = 2;            // px at 1x around the logo, room for the halo
const HALO = 1;           // px at 1x
const SOURCES = [
  { out: WORDMARK.onLight, src: 'guideline/images/nfc-secondary-logo-black.webp', halo: palette.light.card },
  { out: WORDMARK.onDark,  src: 'guideline/images/nfc-secondary-logo-white.webp', halo: palette.dark.card },
];

/* Runs in the page: serialised, so it closes over nothing here. */
async function draw(b64, halo, W, H, pad, radius) {
  const img = new Image();
  img.src = `data:image/webp;base64,${b64}`;
  await img.decode();
  const h = H - 2 * pad, w = h * img.naturalWidth / img.naturalHeight;
  const x = (W - w) / 2, y = pad;
  const layer = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; return [c, g]; };
  const [sil, s] = layer();
  s.drawImage(img, x, y, w, h);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = halo;
  s.fillRect(0, 0, W, H);
  const [out, g] = layer();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * 2 * Math.PI;
    g.drawImage(sil, Math.cos(a) * radius, Math.sin(a) * radius);
  }
  g.drawImage(img, x, y, w, h);
  return out.toDataURL('image/png').split(',')[1];
}

const page = await openPage({ port: 9334 });
try {
  for (const { out, src, halo } of SOURCES) {
    const b64 = readFileSync(join(root, src)).toString('base64');
    const png = await page.evaluate(draw, b64, halo, WORDMARK.width * SCALE, WORDMARK.height * SCALE, PAD * SCALE, HALO * SCALE);
    const buf = Buffer.from(png, 'base64');
    writeFileSync(join(root, 'src/email', out), buf);
    console.log(`wrote src/email/${out} (${buf.length} bytes, ${WORDMARK.width * SCALE}x${WORDMARK.height * SCALE})`);
  }
} finally {
  await page.close();
}
