/* Builds the shareable review page from kitchen-sink/index.html:
   inlines the four layers, swaps the local fonts for the one font host the
   Artifact CSP admits, and adds the prefers-color-scheme layer the artifact
   host needs for viewers whose theme is "system" (an un-stamped root).
   Usage: node build/emit-artifact.mjs <output.html> */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
if (!out) { console.error('usage: node build/emit-artifact.mjs <output.html>'); process.exit(1); }
const r = f => readFileSync(join(root, f), 'utf8');

const html = r('kitchen-sink/index.html');
const tokens = JSON.parse(r('src/tokens.json'));
const layers = ['src/tokens.css', 'src/brands/nfccool.css', 'src/components.css', 'src/archetypes.css']
  .map(f => `/* ===== ${f} ===== */\n` + r(f)).join('\n');

const dark = Object.entries(tokens.brands.nfccool.dark)
  .filter(([k]) => !k.startsWith('$')).map(([k, v]) => `      --${k}: ${v};`).join('\n');
const systemDark = `
/* Viewer theme "system" leaves the root un-stamped, so the dark palette has to
   be reachable through prefers-color-scheme too. An explicit light choice wins. */
@media (prefers-color-scheme: dark) {
   :root:not([data-theme="light"]) {
${dark}
      --brand-gradient:
         radial-gradient(ellipse 85% 55% at 50% 50%, rgba(255, 199, 9, 0.10) 0%, transparent 70%),
         linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg) 100%);
   }
   :root:not([data-theme="light"]) .hero-band::before,
   :root:not([data-theme="light"]) .hero-strip::before,
   :root:not([data-theme="light"]) .feature-banner::before,
   :root:not([data-theme="light"]) .final-cta::before { display: none; }
}`;

let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const style = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'))
  .replace(/@font-face\s*\{[^}]*\}\s*/g, '');

// the artifact cannot fetch a sibling file, so the behaviour script is inlined
body = body.replace(
  '<script type="module" src="../src/nav.js"></script>',
  '<script type="module">\n' + r('src/nav.js').replace(/import\.meta\?\.url\?\.includes\('no-auto'\)/, 'false').replace(/<\/script/gi, '<\\/script') + '\n</script>');

body = body
  .replace('<button type="button" id="ks-theme">Dark</button>', '<button type="button" id="ks-theme"></button>')
  .replace('<button type="button" id="ks-dir">RTL</button>', '<button type="button" id="ks-dir"></button>')
  .replace('  renderTables(); renderType(); bp();',
`  themeBtn.textContent = root.getAttribute('data-theme') === 'dark' ? 'Light' : 'Dark';
  dirBtn.textContent = root.getAttribute('dir') === 'rtl' ? 'LTR' : 'RTL';
  renderTables(); renderType(); bp();`);

const stamp = `<script>
(function(){var r=document.documentElement;
 if(!r.getAttribute('data-theme')){r.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');}
 if(!r.getAttribute('dir')){r.setAttribute('dir','ltr');}})();
</script>`;

writeFileSync(out, `<title>NFC.cool Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&family=Caveat:wght@400;700&display=swap">
<style>
${layers}
${systemDark}
/* ---- review-page chrome ---- */
${style}
</style>
${stamp}
${body}`);
console.log(`wrote ${out}`);
