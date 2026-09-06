/* Concatenates the four layers into dist/design.css for consumers with no
   bundler (business_card_service's Django + WhiteNoise, and the vendored
   copy for nfc-cool-website). Usage: node build/emit-bundle.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const files = ['src/tokens.css', 'src/brands/nfccool.css', 'src/components.css', 'src/archetypes.css'];
const out = `/* @nfccool/design v${version} - generated bundle, do not edit.\n   Source: github.com/FlineDev/nfc-cool-design */\n\n`
  + files.map(f => `/* ===== ${f} ===== */\n` + readFileSync(join(root, f), 'utf8')).join('\n');
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/design.css'), out);
console.log(`wrote dist/design.css (${out.length} bytes) from ${files.length} layers`);
