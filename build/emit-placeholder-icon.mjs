/* Draws the neutral app icon the guideline's product-logo mail example shows,
   so the design system never carries a real product's art. Run by hand and
   commit the result:  node build/emit-placeholder-icon.mjs
   Writes guideline/images/placeholder-icon-{light,dark}.png at 80x80, the 2x
   of the 40px a product logo is drawn at in a mail. Needs headless Chrome. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './guideline.mjs';
import { openPage } from './chrome.mjs';

const SIZE = 80;
/* Every colour a token, like every other generator here. */
const tokens = JSON.parse(readFileSync(join(root, 'src/tokens.json'), 'utf8'));
const { light: T, dark: K } = tokens.brands[tokens.defaultBrand];
const VARIANTS = {
  light: { top: T['color-bg-card'], bottom: T['color-border'], glyph: T['color-text-secondary'], dot: T['color-link'] },
  dark: { top: K['color-border'], bottom: K['color-bg-alt'], glyph: K['color-text-secondary'], dot: K['color-accent'] },
};

/* Runs in the page: serialised, so it closes over nothing here. A square
   (the mail rounds its corners), a soft vertical fill, two plain shapes. */
async function draw(v, S) {
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, v.top); bg.addColorStop(1, v.bottom);
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const u = S / 80;
  g.fillStyle = v.glyph;
  g.beginPath(); g.roundRect(18 * u, 26 * u, 44 * u, 32 * u, 7 * u); g.fill();
  g.fillStyle = v.dot;
  g.beginPath(); g.arc(40 * u, 42 * u, 8 * u, 0, 2 * Math.PI); g.fill();
  return c.toDataURL('image/png').split(',')[1];
}

const page = await openPage({ port: 9336 });
try {
  for (const [name, v] of Object.entries(VARIANTS)) {
    const buf = Buffer.from(await page.evaluate(draw, v, SIZE), 'base64');
    const file = `guideline/images/placeholder-icon-${name}.png`;
    writeFileSync(join(root, file), buf);
    console.log(`wrote ${file} (${buf.length} bytes)`);
  }
} finally {
  await page.close();
}
