import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { renderEmail, renderBlock, WORDMARK, EMAIL_ASSETS } from '../src/email.js';
import { palette } from '../src/email/palette.js';
import { EXAMPLES } from '../guideline/email-examples.mjs';
import { ratio, AA } from './contrast-math.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const tokens = JSON.parse(read('src/tokens.json'));
const brand = tokens.brands[tokens.defaultBrand];
const BASE = 'https://assets.example.com/email/';
const render = (o = {}) => renderEmail({ heading: 'Hello', blocks: [], ...o });
const all = Object.values(EXAMPLES).map(e => ({ ...e, out: renderEmail({ ...e.options, assetBaseUrl: BASE }) }));

/* ---------------------------------------------------------------- escaping */

const NASTY = `<script>alert("x")</script> & 'Tom's' "album"`;

test('every string is escaped: heading, text, quote, note, button, footer, preheader', () => {
  const { html } = render({
    heading: NASTY, preheader: NASTY, title: NASTY,
    blocks: [
      { type: 'text', text: NASTY },
      { type: 'quote', text: NASTY },
      { type: 'note', text: [NASTY, { text: NASTY, strong: true }, { text: NASTY, href: 'https://x.example/' }] },
      { type: 'button', label: NASTY, href: 'https://x.example/?a=1&b=2' },
      { type: 'link-fallback', href: 'https://x.example/?a=1&b=2', label: NASTY },
    ],
    footer: { product: NASTY, reason: NASTY, address: NASTY, links: [{ label: NASTY, href: 'https://x.example/' }] },
    brand: { name: NASTY },
  });
  assert.ok(!html.includes('<script>'), 'a raw <script> reached the mail');
  assert.ok(!html.includes(`"x"`), 'a raw double quote from the data reached the mail');
  assert.ok(!html.includes(`'Tom's'`), 'a raw single quote from the data reached the mail');
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;Tom&#39;s&#39;'), 'expected the escaped form');
  assert.ok(html.includes('href="https://x.example/?a=1&amp;b=2"'), 'an ampersand in a link must be escaped in the attribute');
  assert.ok(!/&(?!(amp|lt|gt|quot|#\d+|nbsp|zwnj|middot);)/.test(html), 'a bare ampersand reached the mail');
});

test('the brand name is escaped in the alt text of the wordmark', () => {
  const { html } = render({ assetBaseUrl: BASE, brand: { name: '"><img src=x onerror=alert(1)>' } });
  assert.ok(!html.includes('<img src=x'), 'markup escaped the alt attribute');
  assert.ok(html.includes('alt="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"'));
});

/* ---------------------------------------------------------------- links */

const BAD = ['javascript:alert(1)', 'JavaScript:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)',
  'data:text/html,<b>x</b>', 'vbscript:x', '/relative/path', '//evil.example/x', 'https:/x', 'https://',
  'https://x.example/a"onmouseover="alert(1)', 'https://x.example/ a', 'mailto:', '', null, undefined];

for (const href of BAD) {
  test(`a link to ${JSON.stringify(href)} is refused everywhere a link can go`, () => {
    const places = [
      { blocks: [{ type: 'button', label: 'Go', href }] },
      { blocks: [{ type: 'link-fallback', href }] },
      { blocks: [{ type: 'text', text: [{ text: 'here', href }] }] },
      { blocks: [{ type: 'note', text: [{ text: 'here', href }] }] },
      { footer: { links: [{ label: 'Terms', href }] } },
      { footer: { reason: [{ text: 'settings', href }] } },
      ...(href === undefined ? [] : [{ brand: { href } }]),
    ];
    for (const o of places) assert.throws(() => render(o), TypeError, JSON.stringify(o));
  });
}

test('http, https and mailto links are accepted', () => {
  for (const href of ['http://x.example/', 'https://x.example/a?b=c#d', 'mailto:support@nfc.cool', 'HTTPS://X.EXAMPLE/']) {
    assert.doesNotThrow(() => render({ blocks: [{ type: 'button', label: 'Go', href }] }), href);
  }
});

test('the asset base must be an absolute http(s) URL', () => {
  for (const bad of ['javascript:x/', '/email/', 'email/', 'https://x.example/"onerror="x']) {
    assert.throws(() => render({ assetBaseUrl: bad }), TypeError, bad);
  }
  const { html } = render({ assetBaseUrl: 'https://x.example/email' });
  assert.ok(html.includes('src="https://x.example/email/wordmark-on-light.png"'), 'a missing trailing slash is added');
});

test('an unknown block type, a missing heading or a bad dir is refused', () => {
  assert.throws(() => render({ blocks: [{ type: 'html', html: '<b>x</b>' }] }), TypeError);
  assert.throws(() => renderEmail({ blocks: [] }), TypeError);
  assert.throws(() => render({ dir: 'up' }), TypeError);
  assert.throws(() => render({ lang: 'en"><x' }), TypeError);
});

/* ---------------------------------------------------------------- plain text */

test('the plain-text part carries every block, in order', () => {
  for (const { title, options, out } of all) {
    const { text } = out;
    assert.ok(text.startsWith(`${options.heading}\n\n`), `${title}: the heading opens the text part`);
    let at = 0;
    const expect = [];
    const words = runs => (Array.isArray(runs) ? runs : [runs]).map(r => {
      if (typeof r === 'string' || !('href' in r)) return r.text ?? r;
      return r.href === r.text || r.href === `mailto:${r.text}` ? r.text : `${r.text} (${r.href})`;
    }).join('');
    options.blocks.forEach((b, i) => {
      const prev = options.blocks[i - 1];
      if (b.type === 'text' || b.type === 'note') expect.push(words(b.text));
      if (b.type === 'quote') expect.push(`“${words(b.text)}”`);
      if (b.type === 'button') expect.push(`${b.label}: ${b.href}`);
      if (b.type === 'link-fallback' && !(prev?.type === 'button' && prev.href === b.href)) expect.push(b.href);
      if (b.type === 'divider') expect.push('----');
    });
    const f = options.footer ?? {};
    for (const k of ['product', 'reason', 'address']) if (f[k]) expect.push(words(f[k]));
    for (const l of f.links ?? []) expect.push(`${l.label}: ${l.href}`);
    for (const piece of expect) {
      const i = text.indexOf(piece, at);
      assert.ok(i >= 0, `${title}: text part is missing, or has out of order: ${piece}`);
      at = i + piece.length;
    }
    assert.ok(!/<[a-z/!]/i.test(text), `${title}: markup in the text part`);
  }
});

test('an inline link reads as "label (url)" in plain text, and the fallback is not doubled', () => {
  const { text } = render({ blocks: [
    { type: 'text', text: ['Restore it ', { text: 'here', href: 'https://x.example/r' }, '.'] },
    { type: 'button', label: 'Sign in', href: 'https://x.example/s' },
    { type: 'link-fallback', href: 'https://x.example/s' },
  ] });
  assert.ok(text.includes('Restore it here (https://x.example/r).'));
  assert.equal(text.split('https://x.example/s').length - 1, 1, 'the button already carries the URL');
});

/* ---------------------------------------------------------------- colour */

const tokenValues = new Set([...Object.values(brand.light), ...Object.values(brand.dark)].map(v => String(v).toUpperCase()));
const colours = s => [...s.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g)]
  .map(m => m[0]).filter(c => !/^#\d+$/.test(c) || /[a-f]/i.test(c));
const htmlColours = html => colours(html.replace(/&#\d+;/g, ''));

test('every colour in a rendered mail is a token value', () => {
  for (const { title, out } of all) {
    const stray = htmlColours(out.html).filter(c => !tokenValues.has(c.toUpperCase()));
    assert.deepEqual([...new Set(stray)], [], `${title}: colour not from src/tokens.json`);
  }
});

test('every colour in the email palette and email.css is a token value', () => {
  for (const theme of ['light', 'dark']) {
    for (const [role, v] of Object.entries(palette[theme])) {
      assert.ok(tokenValues.has(v.toUpperCase()), `${theme}.${role} = ${v} is not a token value`);
    }
  }
  const stray = colours(read('src/email.css')).filter(c => !tokenValues.has(c.toUpperCase()));
  assert.deepEqual(stray, [], 'src/email.css carries a colour not from src/tokens.json');
});

test('the mail carries both palettes: light inline, dark in the scheme query and for Outlook.com', () => {
  const { html } = all[0].out;
  for (const v of Object.values(palette.light)) assert.ok(html.includes(v) || v === palette.light.quoteBar || v === palette.light.rule,
    `light ${v} missing`);
  const dark = html.slice(html.indexOf('@media (prefers-color-scheme: dark)'));
  for (const [role, v] of Object.entries(palette.dark)) assert.ok(dark.includes(v), `dark ${role} ${v} missing from the dark block`);
  assert.match(html, /<meta name="color-scheme" content="light dark">/);
  assert.match(html, /<meta name="supported-color-schemes" content="light dark">/);
  assert.match(html, /\[data-ogsc\] \.em-h\{color:/);
  assert.match(html, /\[data-ogsb\] \.em-card\{background-color:/);
});

test('no custom property reaches a mail client', () => {
  for (const { title, out } of all) assert.ok(!out.html.includes('var('), `${title}: var( in the mail`);
  assert.ok(!read('src/email.css').includes('var('), 'var( in src/email.css');
  assert.ok(!read('src/email/palette.js').includes('var('), 'var( in the palette');
});

/* Every pair a mail actually paints, in both themes, at 4.5:1. The mail
   button has no recorded exception: it is read at rest only. */
const PAIRS = [
  ['heading', 'card'], ['text', 'card'], ['muted', 'card'], ['link', 'card'],
  ['muted', 'page'], ['buttonFg', 'buttonBg'], ['heading', 'quoteBg'], ['link', 'quoteBg'],
];
for (const theme of ['light', 'dark']) {
  for (const [fg, bg] of PAIRS) {
    test(`email contrast: ${theme} ${fg} on ${bg}`, () => {
      const P = palette[theme];
      const r = ratio(P[fg], P[bg]);
      assert.ok(r >= AA, `${P[fg]} on ${P[bg]} is ${r.toFixed(2)}:1, needs ${AA}:1`);
    });
  }
}

/* ---------------------------------------------------------------- structure */

test('a mail is tables and inline styles, with a hidden preheader, 560px wide', () => {
  const { html } = all[0].out;
  assert.ok(!/<(div|p|a|td|img|h1)\b(?![^>]*\bstyle=)[^>]*>/.test(html.replace(/<div role="article"[^>]*>/, '').replace(/<td>/g, '<td style="">')),
    'an element without inline style');
  assert.match(html, /max-width:560px/);
  assert.match(html, /<!--\[if mso\]><table role="presentation" width="560"/, 'Outlook desktop gets a fixed-width table');
  assert.match(html, /display:none;[^"]*mso-hide:all[^"]*">This link works once/, 'the preheader is hidden');
  assert.match(html, /mso-text-raise/, 'the button is bulletproof in Outlook desktop');
  assert.ok(!/class="[^"]*"[^>]*class=/.test(html), 'an element with two class attributes');
});

test('dir and lang reach the document, and rtl flips every side', () => {
  const { html } = render({ lang: 'ar', dir: 'rtl', blocks: [{ type: 'quote', text: 'x' }] });
  assert.match(html, /<html lang="ar" dir="rtl"/);
  assert.match(html, /border-right:3px solid/);
  assert.ok(!/border-left:3px/.test(html), 'the quote edge must move to the right');
  assert.ok(!/align="left"/.test(html), 'nothing is aligned to the left in rtl');
  assert.match(render().html, /<html lang="en" dir="ltr"/);
});

test('without an asset base the header is the brand name in text', () => {
  const { html } = render({ brand: { name: 'Momento Marks' } });
  assert.ok(!html.includes('<img'), 'no image without a host for it');
  assert.match(html, />Momento Marks<\/span>/);
  assert.ok(!render({ assetBaseUrl: BASE, brand: { wordmark: false } }).html.includes('<img'));
  assert.match(render({ assetBaseUrl: BASE }).html, /alt="NFC\.cool"/);
});

/* The wordmark PNGs are the size the renderer declares, at 2x. */
test('the wordmark PNGs are 2x the size the renderer draws them at', () => {
  for (const f of EMAIL_ASSETS) {
    const b = readFileSync(new URL(`../src/email/${f}`, import.meta.url));
    assert.equal(b.toString('latin1', 1, 4), 'PNG', `${f} is not a PNG`);
    assert.equal(b.readUInt32BE(16), WORDMARK.width * 2, `${f} width`);
    assert.equal(b.readUInt32BE(20), WORDMARK.height * 2, `${f} height`);
  }
});

/* A git install runs no build, so everything the renderer loads is in git and
   exported: the module, its types, its palette, its images. */
test('the renderer and everything it loads ship in git and in the exports', () => {
  const pkg = JSON.parse(read('package.json'));
  const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: ROOT }).toString().split('\n'));
  const needed = ['src/email.js', 'src/email.d.ts', 'src/email/palette.js', ...EMAIL_ASSETS.map(f => `src/email/${f}`)];
  const untracked = needed.filter(f => !tracked.has(f));
  assert.deepEqual(untracked, [], 'not committed');
  assert.deepEqual(pkg.exports['./email.js'], { types: './src/email.d.ts', default: './src/email.js' });
  for (const f of EMAIL_ASSETS) assert.equal(pkg.exports[`./email/${f}`], `./src/email/${f}`);
  for (const imp of read('src/email.js').matchAll(/^import .* from '(.+)';$/gm)) {
    assert.match(imp[1], /^\.\//, `src/email.js imports ${imp[1]}: it must have no dependencies`);
  }
});

/* ---------------------------------------------------------------- product logo */

const LOGO = { src: 'https://m.example.com/email/icon-light.png', srcDark: 'https://m.example.com/email/icon-dark.png', width: 40, height: 40, alt: '' };
const withLogo = (brand = {}, o = {}) => render({ assetBaseUrl: BASE, brand: { name: 'Moments', logo: LOGO, ...brand }, ...o });

test('a product logo replaces the wordmark, with the name beside it, vertically centred', () => {
  const { html } = withLogo();
  assert.ok(!html.includes('wordmark-on-light.png'), 'the wordmark must go when a logo is given');
  assert.match(html, /<img class="em-logo em-wm-light em-h" src="https:\/\/m\.example\.com\/email\/icon-light\.png" width="40" height="40" alt=""/);
  assert.match(html, /<div class="em-wm-dark" style="display:none;[^"]*mso-hide:all"><img class="em-logo" src="https:\/\/m\.example\.com\/email\/icon-dark\.png"/);
  assert.match(html, /border-radius:9px/, 'corners at 22% of the width');
  assert.match(html, /<td class="em-brand-name" valign="middle" style="vertical-align:middle;padding-left:12px"><span class="em-h" style="[^"]*font-size:20px[^"]*font-weight:700[^"]*">Moments<\/span><\/td>/);
  assert.match(html, /<td class="em-brand-icon" valign="middle" style="vertical-align:middle/);
  const dark = html.slice(html.indexOf('@media (prefers-color-scheme: dark)'));
  assert.match(dark, /\.em-logo\{border-color:#30363D !important\}/, 'the hairline repaints in dark');
});

test('showName: false shows the icon alone; no name, no name cell', () => {
  assert.ok(!withLogo({ showName: false }).html.includes('em-brand-name'));
  assert.ok(!withLogo({ name: undefined }).html.includes('em-brand-name'));
  assert.ok(withLogo({ showName: true }).html.includes('em-brand-name'));
});

test('a logo without srcDark has no dark swap', () => {
  const { html } = withLogo({ logo: { ...LOGO, srcDark: undefined } });
  assert.ok(!html.includes('icon-dark.png'));
  assert.match(html, /<img class="em-logo em-h" src="https:\/\/m\.example\.com\/email\/icon-light\.png"/);
  assert.ok(!/<div class="em-wm-dark"/.test(html));
});

test('the logo header is escaped, flips in rtl, and becomes a link with brand.href', () => {
  const { html } = withLogo({ name: NASTY, logo: { ...LOGO, alt: NASTY, src: 'https://m.example.com/i.png?a=1&b=2' }, href: 'https://m.example.com/' });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('alt="&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('src="https://m.example.com/i.png?a=1&amp;b=2"'));
  assert.equal(html.split('<a href="https://m.example.com/" style="text-decoration:none">').length - 1, 2, 'icon and name both link');
  assert.match(withLogo({}, { dir: 'rtl' }).html, /class="em-brand-name" valign="middle" style="vertical-align:middle;padding-right:12px"/);
});

test('logo URLs are absolute http(s) images, sizes are whole px, alt is a string', () => {
  const BAD_SRC = ['javascript:alert(1)', 'data:image/png;base64,AAAA', '/email/icon.png', '//x.example/i.png',
    'mailto:a@b.c', 'https://x.example/a"onerror="x', 'https://x.example/ a', '', null];
  for (const src of BAD_SRC) {
    assert.throws(() => withLogo({ logo: { ...LOGO, src } }), TypeError, `src ${src}`);
    if (src !== null) assert.throws(() => withLogo({ logo: { ...LOGO, srcDark: src } }), TypeError, `srcDark ${src}`);
  }
  for (const n of [0, -1, 1.5, '40', 601, NaN, undefined]) {
    assert.throws(() => withLogo({ logo: { ...LOGO, width: n } }), TypeError, `width ${n}`);
    assert.throws(() => withLogo({ logo: { ...LOGO, height: n } }), TypeError, `height ${n}`);
  }
  assert.throws(() => withLogo({ logo: { ...LOGO, alt: undefined } }), TypeError);
  assert.throws(() => withLogo({ logo: 'https://x.example/i.png' }), TypeError);
  assert.doesNotThrow(() => withLogo({ logo: { ...LOGO, src: 'http://localhost:4400/email/app-icon-light.png' } }));
});

test('the plain-text part is the same with or without a logo', () => {
  const o = all[0].options;
  const plain = renderEmail({ ...o, assetBaseUrl: BASE }).text;
  assert.equal(renderEmail({ ...o, assetBaseUrl: BASE, brand: { name: 'Moments', logo: LOGO } }).text, plain);
  assert.equal(renderEmail({ ...o, brand: { name: 'Moments', logo: LOGO, showName: false } }).text, plain);
});

/* ---------------------------------------------------------------- Django */

test('the Django templates are the renderer\'s own markup with no placeholder left', () => {
  execFileSync('node', ['build/emit-email-django.mjs'], { cwd: ROOT, stdio: 'pipe' });
  const dir = new URL('../dist/email/django/', import.meta.url);
  const files = readdirSync(dir);
  for (const f of ['layout.html', 'text.html', 'button.html', 'link_fallback.html', 'note.html', 'quote.html', 'divider.html', 'footer_link.html']) {
    assert.ok(files.includes(f), `${f} missing`);
  }
  for (const f of files) {
    const body = readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!/ZZ[A-Z]+ZZ|zz\.invalid/.test(body), `${f} still carries a placeholder`);
  }
  const layout = readFileSync(new URL('layout.html', dir), 'utf8');
  for (const b of ['title', 'preheader', 'heading', 'content', 'footer_product', 'footer_reason', 'footer_links']) {
    assert.equal(layout.split(`{% block ${b} %}`).length - 1, 1, `layout must carry {% block ${b} %} once`);
  }
  assert.ok(layout.includes('{{ email_asset_base }}wordmark-on-light.png'));
  assert.equal(layout.split('{% block header %}').length - 1, 1, 'layout must carry {% block header %} once');
  const head = layout.slice(layout.indexOf('{% block header %}'), layout.indexOf('{% endblock %}', layout.indexOf('{% block header %}')));
  assert.ok(head.startsWith('{% block header %}{% if email_logo_src %}'), 'the logo header is chosen by email_logo_src');
  assert.ok(head.indexOf('{% else %}') < head.indexOf('wordmark-on-light.png'), 'the wordmark is the fallback');
  for (const v of ['email_logo_src', 'email_logo_src_dark', 'email_logo_width', 'email_logo_height', 'email_brand_name']) {
    assert.ok(head.includes(`{{ ${v} }}`), `the header uses {{ ${v} }}`);
  }
  assert.match(head, /\{% if email_logo_src_dark %\}<!--\[if !mso\]>/, 'the dark icon only when there is one');
  assert.match(head, /\{% if email_brand_name %\}<td class="em-brand-name"/, 'the name cell only when there is a name');
  assert.ok(head.includes('border-radius:{% widthratio email_logo_width 100 22 %}px'));
  const button = readFileSync(new URL('button.html', dir), 'utf8');
  assert.ok(button.includes('href="{{ href }}"') && button.includes('{{ label }}'));
  assert.ok(button.includes(renderBlock({ type: 'button', label: 'L', href: 'https://x.example/' }).split('href=')[0]),
    'the partial is the renderer\'s own markup');
});

/* ---------------------------------------------------------------- examples */

/* The guideline's examples are MomentoMarks copy and follow its rule. */
test('the guideline examples carry no em dash', () => {
  for (const { title, out } of all) {
    assert.ok(!out.text.includes('—') && !out.html.includes('—') && !out.html.includes('&mdash;'), `${title} has an em dash`);
  }
});
