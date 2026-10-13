/* Writes the guideline as a static site: site/index.html plus one page per
   section, with the fonts and images beside them. Usage: node build/emit-guideline.mjs */
import { mkdirSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { root, renderSite } from './guideline.mjs';
import { EMAIL_ASSETS } from '../src/email.js';

const out = join(root, 'site');
for (const d of ['fonts', 'images']) mkdirSync(join(out, d), { recursive: true });
const pages = renderSite();
for (const [file, html] of pages) writeFileSync(join(out, file), html);
for (const d of ['fonts', 'images']) {
  for (const f of readdirSync(join(root, 'guideline', d))) copyFileSync(join(root, 'guideline', d, f), join(out, d, f));
}
/* The store badges ship in the package (src/images) and the archetype pages
   show them from beside the pages, as a consumer would. */
for (const f of readdirSync(join(root, 'src/images'))) copyFileSync(join(root, 'src/images', f), join(out, 'images', f));
/* The Email section's frames load the mail wordmark from beside the pages. */
for (const f of EMAIL_ASSETS) copyFileSync(join(root, 'src/email', f), join(out, 'images', f));
console.log(`wrote site/ (${pages.size} pages)`);
