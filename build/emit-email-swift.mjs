/* Writes dist/email/swift/: the mail layout and one file per block as plain
   templates for a Swift consumer (Keel), which fills them by string replacement.
   Usage: node build/emit-email-swift.mjs (part of `npm run build`).

   Nothing here is written by hand. Each template is src/email.js's own output,
   rendered with sentinel strings that are then swapped for placeholders, so the
   Swift mail cannot drift from the JavaScript one (same tables, inline styles,
   dark overrides, palette). The PNGs are the ones emit-email-django.mjs writes.

   Placeholder grammar, no logic of any kind:
   - {{name}} is a value the filler has already HTML-escaped;
   - {{{blocks}}} is the finished block HTML, inserted raw.
   layout.html: {{lang}} {{title}} {{preheader}} {{heading}} {{asset_base}}
   {{font_base}} {{{blocks}}} {{footer_product}} {{footer_reason}}. asset_base and
   font_base are absolute https folders ending in `/`; the Titillium Web rules are
   always on. The header is the NFC.cool wordmark; there is no footer link row.
   blocks/*.html: one table row each (no trailing newline; the filler joins the rows
   with "\n" to get {{{blocks}}}). {{gap}} is its top gap in px, which depends on
   the block before it: read it from gaps.json (gaps[previousType][type], "start"
   for the first block), generated from renderEmail's own rule. text, intro,
   footnote, note take {{text}}; button and link_fallback take {{label}} and
   {{href}} (an http(s) URL the filler has checked); store_badges takes
   {{ios_url}}, {{android_url}} and {{asset_base}}; divider takes nothing. Unlike
   renderEmail, nothing validates a link or writes a plain-text part. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './guideline.mjs';
import { renderEmail, renderBlock, blockGap } from '../src/email.js';

const tpl = join(root, 'dist/email/swift');
const blocksDir = join(tpl, 'blocks');
mkdirSync(blocksDir, { recursive: true });

const S = k => `ZZ${k}ZZ`;
const URL_ = k => `https://zz.invalid/${S(k)}`;
// renderEmail accepts only a BCP 47 tag, so the language sentinel is letters.
const LANG = 'qqz';

function swap(html, pairs) {
  for (const [from, to] of pairs) {
    if (!html.includes(from)) throw new Error(`sentinel ${from} not found: src/email.js changed shape, update this generator`);
    html = html.replaceAll(from, to);
  }
  return html;
}

let { html } = renderEmail({
  title: S('TITLE'), heading: S('HEADING'), preheader: S('PREHEADER'), lang: LANG,
  assetBaseUrl: `${URL_('ASSETS')}/`,
  fontBaseUrl: `${URL_('FONTS')}/`,
  blocks: [{ type: 'text', text: S('CONTENT') }],
  footer: { product: S('PRODUCT'), reason: S('REASON') },
});
const contentRow = new RegExp(`<tr><td[^>]*><p class="em-t"[^>]*>${S('CONTENT')}</p></td></tr>`);
if (!contentRow.test(html)) throw new Error('content row not found: src/email.js changed shape, update this generator');
html = html.replace(contentRow, '{{{blocks}}}');
html = swap(html, [
  [`lang="${LANG}"`, 'lang="{{lang}}"'],
  [S('TITLE'), '{{title}}'],
  [S('PREHEADER'), '{{preheader}}'],
  [S('HEADING'), '{{heading}}'],
  [`${URL_('ASSETS')}/`, '{{asset_base}}'],
  [`${URL_('FONTS')}/`, '{{font_base}}'],
  [S('PRODUCT'), '{{footer_product}}'],
  [S('REASON'), '{{footer_reason}}'],
]);

const files = { 'layout.html': html };

const row = inner => `<tr><td align="left" style="padding-top:{{gap}}px">${inner}</td></tr>`;
const text = [[S('TEXT'), '{{text}}']];
const BLOCKS = {
  'text.html':          [{ type: 'text', text: S('TEXT') }, text],
  'intro.html':         [{ type: 'intro', text: S('TEXT') }, text],
  'button.html':        [{ type: 'button', label: S('LABEL'), href: URL_('HREF') }, [[S('LABEL'), '{{label}}'], [URL_('HREF'), '{{href}}']]],
  'link_fallback.html': [{ type: 'link-fallback', label: S('LABEL'), href: URL_('HREF') }, [[S('LABEL'), '{{label}}'], [URL_('HREF'), '{{href}}']]],
  'note.html':          [{ type: 'note', text: S('TEXT') }, text],
  'footnote.html':      [{ type: 'footnote', text: S('TEXT') }, text],
  'divider.html':       [{ type: 'divider' }, []],
  'store_badges.html':  [{ type: 'store-badges', ios: URL_('IOS'), android: URL_('ANDROID') }, [[URL_('IOS'), '{{ios_url}}'], [URL_('ANDROID'), '{{android_url}}'], [`${URL_('ASSETS')}/`, '{{asset_base}}']]],
};
for (const [name, [block, pairs]] of Object.entries(BLOCKS)) {
  files[`blocks/${name}`] = row(swap(renderBlock(block, { assetBaseUrl: `${URL_('ASSETS')}/` }), pairs));
}

const types = Object.values(BLOCKS).map(([block]) => block.type);
const gaps = {};
for (const prev of ['start', ...types]) {
  gaps[prev] = Object.fromEntries(types.map(t => [t, blockGap({ type: t }, prev === 'start' ? null : { type: prev })]));
}
files['gaps.json'] = `${JSON.stringify(gaps, null, 2)}\n`;

for (const [name, body] of Object.entries(files)) writeFileSync(join(tpl, name), body);
console.log(`wrote dist/email/swift/ (${Object.keys(files).length} templates)`);
