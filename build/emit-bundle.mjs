/* Concatenates the four layers into dist/design.css for consumers with no
   bundler (business_card_service's Django + WhiteNoise, and the vendored
   copy for nfc-cool-website). Usage: node build/emit-bundle.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { defaultBrand } = JSON.parse(readFileSync(join(root, 'src/tokens.json'), 'utf8'));
const brand = `src/brands/${defaultBrand}.css`;
/* Two bundles, because not every consumer wants the component layer.
   A page that already owns a full set of components (the public card page)
   takes the palette only; adopting L3/L4 there is a separate step, and
   loading them early would collide on .modal, .overlay and .alert-*. */
const BUNDLES = {
  'design-tokens.css': ['src/tokens.css', brand],
  'design.css': ['src/tokens.css', brand, 'src/components.css', 'src/archetypes.css'],
};
mkdirSync(join(root, 'dist'), { recursive: true });
for (const [name, files] of Object.entries(BUNDLES)) {
  const out = `/* @nfccool/design v${version} - generated bundle, do not edit.\n   Layers: ${files.join(', ')} */\n\n`
    + files.map(f => `/* ===== ${f} ===== */\n` + readFileSync(join(root, f), 'utf8')).join('\n');
  writeFileSync(join(root, 'dist', name), out);
  console.log(`wrote dist/${name} (${out.length} bytes) from ${files.length} layers`);
}
