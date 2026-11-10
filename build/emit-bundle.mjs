/* Concatenates the four layers into dist/design.css for consumers with no
   bundler (business_card_service's Django + WhiteNoise, and the vendored
   copy for nfc-cool-website). Usage: node build/emit-bundle.mjs */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bundleEditorKit } from './editor-bundle.mjs';
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
  /* The web block editor's layer, for a console that vendors only the tokens
     and draws its own components. No tokens inside: the host has them. */
  'editor-kit.css': ['src/editor.css'],
};
mkdirSync(join(root, 'dist'), { recursive: true });
/* The two scripts travel with the bundle. They are authored, not generated,
   but a consumer vendors BUILT output only (test/guards.test.mjs), so the
   build places a stamped copy beside the CSS. */
for (const script of ['nav.js', 'theme.js']) {
  const body = `/* @nfccool/design v${version} - copied from src/${script} by build/emit-bundle.mjs, do not edit. */\n`
    + readFileSync(join(root, 'src', script), 'utf8');
  writeFileSync(join(root, 'dist', script), body);
  console.log(`wrote dist/${script} (${body.length} bytes)`);
}
/* The store badge artwork, likewise: authored in src/images, vendored from
   dist/images. Copied byte for byte; it is Apple's and Google's artwork. */
mkdirSync(join(root, 'dist', 'images'), { recursive: true });
for (const f of readdirSync(join(root, 'src', 'images'))) {
  copyFileSync(join(root, 'src', 'images', f), join(root, 'dist', 'images', f));
  console.log(`wrote dist/images/${f}`);
}
for (const [name, files] of Object.entries(BUNDLES)) {
  const out = `/* @nfccool/design v${version} - generated bundle, do not edit.\n   Layers: ${files.join(', ')} */\n\n`
    + files.map(f => `/* ===== ${f} ===== */\n` + readFileSync(join(root, f), 'utf8')).join('\n');
  writeFileSync(join(root, 'dist', name), out);
  console.log(`wrote dist/${name} (${out.length} bytes) from ${files.length} layers`);
}
/* The console's own scripts, moved here as they were. Copied byte for byte with
   no stamp, so taking them back into the console changes nothing there and the
   sync's drift check stays quiet. */
for (const f of readdirSync(join(root, 'src/editor/classic'))) {
  copyFileSync(join(root, 'src/editor/classic', f), join(root, 'dist', f));
  console.log(`wrote dist/${f}`);
}
/* The editor's parts in one classic script (see build/editor-bundle.mjs). */
const editorKit = bundleEditorKit(root, `/* @nfccool/design v${version} - generated from src/editor/*.js by build/emit-bundle.mjs, do not edit. */\n`);
writeFileSync(join(root, 'dist', 'editor-kit.js'), editorKit);
console.log(`wrote dist/editor-kit.js (${editorKit.length} bytes)`);
