import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { renderEmail, renderBlock, blockGap, WORDMARK, EMAIL_ASSETS } from '../src/email.js';
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

/* Every pair a mail actually paints, in both themes, at 4.5:1. One recorded
   exception, the day button: white on the filled primary, the web's own blue
   (Nico, 2026-11-03, docs/GUIDELINE.md). It may not get any lower. */
const PAIRS = [
  ['heading', 'card'], ['text', 'card'], ['muted', 'card'], ['link', 'card'],
  ['muted', 'page'], ['buttonFg', 'buttonBg'], ['heading', 'quoteBg'], ['link', 'quoteBg'],
];
const DAY_BUTTON_FLOOR = 3.4;
for (const theme of ['light', 'dark']) {
  for (const [fg, bg] of PAIRS) {
    test(`email contrast: ${theme} ${fg} on ${bg}`, () => {
      const P = palette[theme];
      const r = ratio(P[fg], P[bg]);
      const need = theme === 'light' && fg === 'buttonFg' ? DAY_BUTTON_FLOOR : AA;
      assert.ok(r >= need, `${P[fg]} on ${P[bg]} is ${r.toFixed(2)}:1, needs ${need}:1`);
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
  for (const f of [WORDMARK.onLight, WORDMARK.onDark]) {
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

/* ---------------------------------------------------------------- transactional additions */

const IOS = 'https://apps.apple.com/app/id1249686798';
const ANDROID = 'https://play.google.com/store/apps/details?id=cool.nfc';
const FONTS = 'https://cdn.example.com/static/fonts/Titillium/';

test('fontBaseUrlAddsTitilliumBehindOutlookGuard', () => {
  const { html } = render({ fontBaseUrl: FONTS });
  assert.ok(html.includes('<!--[if !mso]><!-->\n<style type="text/css">'), 'the webfont rules sit behind the Outlook guard');
  for (const w of [400, 600, 700]) {
    assert.ok(html.includes(`font-weight: ${w}; font-display: swap; src: url('${FONTS}titillium-web-${w}-latin.woff2') format('woff2')`), `weight ${w}`);
  }
  assert.ok(html.includes(".em-h, .em-t, .em-m, .em-a, .em-btn-a { font-family: 'Titillium Web',-apple-system"));
  assert.ok(html.includes('.em-a { font-kerning: none; }'));
  assert.ok(html.indexOf('<!--[if !mso]><!-->') < html.indexOf('@font-face') && html.indexOf('@font-face') < html.indexOf('<!--<![endif]-->'));
  assert.ok(!render({ fontBaseUrl: FONTS.slice(0, -1) }).html.includes('Troubleshoot') && render({ fontBaseUrl: FONTS.slice(0, -1) }).html.includes(`${FONTS}titillium-web-700-latin.woff2`), 'a missing trailing slash is added');
});

test('noFontBaseUrlLeavesTheSystemStack', () => {
  const { html } = render();
  assert.ok(!html.includes('Titillium') && !html.includes('@font-face') && !html.includes('font-kerning'));
});

test('fontBaseUrl must be absolute https', () => {
  for (const bad of ['http://x.example/f/', '/static/fonts/', 'javascript:alert(1)']) {
    assert.throws(() => render({ fontBaseUrl: bad }), TypeError, bad);
  }
});

test('storeBadgesUsePngsNotSvg', () => {
  const { html, text } = render({ assetBaseUrl: BASE, storeBadges: { ios: IOS, android: ANDROID } });
  assert.ok(html.includes(`src="${BASE}store-app-store.png"`) && html.includes(`src="${BASE}store-google-play.png"`));
  assert.ok(!/\.svg/i.test(html), 'Gmail blocks SVG');
  assert.ok(html.includes('alt="Download on the App Store" width="120" height="40"') && html.includes('alt="Get it on Google Play" width="133" height="40"'));
  assert.ok(html.includes(`href="${IOS}"`) && html.includes(`href="${ANDROID}"`));
  assert.ok(text.includes(`App Store: ${IOS}`) && text.includes(`Google Play: ${ANDROID}`));
  const asBlock = render({ assetBaseUrl: BASE, blocks: [{ type: 'store-badges', ios: IOS, android: ANDROID }] });
  assert.equal(asBlock.html, html, 'the option and the block are the same mail');
  assert.throws(() => render({ storeBadges: { ios: IOS, android: ANDROID } }), TypeError, 'badges need hosted PNGs');
  assert.throws(() => render({ assetBaseUrl: BASE, storeBadges: { ios: 'javascript:x', android: ANDROID } }), TypeError);
});

test('introAndFootnoteMatchTheConsoleStyles', () => {
  const { html, text } = render({ blocks: [{ type: 'intro', text: 'Hi' }, { type: 'footnote', text: 'Bye' }] });
  assert.ok(html.includes('<p class="em-t" style="margin:0;font-family:' ) && html.includes('font-size:16px;line-height:26px;color:#495057">Hi</p>'));
  assert.ok(html.includes('font-size:14px;line-height:21px;color:#666D74">Bye</p>'));
  assert.ok(html.includes('padding-top:16px"><p class="em-t"') && html.includes('padding-top:20px"><p class="em-m"'));
  assert.ok(text.includes('Hi\n\nBye'));
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
  assert.ok(layout.includes('{% if email_font_base %}<!--[if !mso]><!-->') && layout.includes('{{ email_font_base }}titillium-web-700-latin.woff2'), 'the webfont is switched by email_font_base');
  assert.ok(files.includes('store_badges.html'), 'store_badges.html missing');
  const badges = readFileSync(new URL('store_badges.html', dir), 'utf8');
  assert.ok(badges.includes('href="{{ ios_url }}"') && badges.includes('href="{{ android_url }}"') && badges.includes('{{ email_asset_base }}store-app-store.png') && badges.includes('{{ email_asset_base }}store-google-play.png'));
  for (const f of ['intro.html', 'footnote.html']) assert.ok(files.includes(f), `${f} missing`);
  const button = readFileSync(new URL('button.html', dir), 'utf8');
  assert.ok(button.includes('href="{{ href }}"') && button.includes('{{ label }}'));
  assert.ok(button.includes(renderBlock({ type: 'button', label: 'L', href: 'https://x.example/' }).split('href=')[0]),
    'the partial is the renderer\'s own markup');
});

/* ---------------------------------------------------------------- Swift */

const swiftDir = new URL('../dist/email/swift/', import.meta.url);
const SWIFT_BLOCKS = ['text', 'intro', 'button', 'link_fallback', 'note', 'footnote', 'divider', 'store_badges'];
const buildSwift = () => execFileSync('node', ['build/emit-email-swift.mjs'], { cwd: ROOT, stdio: 'pipe' });
const fill = (tpl, values) => tpl.replace('{{{blocks}}}', () => values.blocks ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!(k in values)) throw new Error(`no value for {{${k}}}`);
  return values[k];
});

test('swiftLayoutHasEveryPlaceholderOnce', () => {
  buildSwift();
  const layout = readFileSync(new URL('layout.html', swiftDir), 'utf8');
  assert.equal(layout.split('{{{blocks}}}').length - 1, 1, '{{{blocks}}} once');
  // title sits in <title> and aria-label, lang on <html> and the article, the asset folder on both wordmarks, the font folder on the three faces.
  const expected = { lang: 2, title: 2, preheader: 1, heading: 1, asset_base: 2, font_base: 3, footer_product: 1, footer_reason: 1 };
  const found = {};
  for (const [, k] of layout.matchAll(/(?<!\{)\{\{(\w+)\}\}(?!\})/g)) found[k] = (found[k] ?? 0) + 1;
  assert.deepEqual(found, expected);
  assert.ok(layout.includes('<title>{{title}}</title>') && layout.includes('{{asset_base}}wordmark-on-light.png') && layout.includes('{{font_base}}titillium-web-700-latin.woff2'));
  assert.ok(!/ZZ[A-Z]+ZZ|zz\.invalid|qqz/.test(layout), 'no sentinel left');
});

test('swiftBlocksAreTheJsBlocksWithSentinelsSwapped', () => {
  buildSwift();
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = 'https://assets.example.com/email/', F = 'https://assets.example.com/fonts/';
  const raw = 'Tom & <Co> "x"';
  const blocks = [
    { type: 'text', text: raw }, { type: 'intro', text: raw },
    { type: 'button', label: raw, href: 'https://x.example/a?b=1&c=2' },
    { type: 'link-fallback', label: raw, href: 'https://x.example/a?b=1&c=2' },
    { type: 'note', text: raw }, { type: 'footnote', text: raw }, { type: 'divider' },
    { type: 'store-badges', ios: 'https://apps.example/ios', android: 'https://play.example/a' },
  ];
  const js = renderEmail({
    title: raw, heading: raw, preheader: raw, lang: 'de', assetBaseUrl: A, fontBaseUrl: F, blocks,
    footer: { product: raw, reason: raw },
  }).html;
  const file = n => readFileSync(new URL(n, swiftDir), 'utf8');
  const v = { text: esc(raw), label: esc(raw), href: esc('https://x.example/a?b=1&c=2'), ios_url: 'https://apps.example/ios', android_url: 'https://play.example/a', asset_base: A };
  const gaps = JSON.parse(file('gaps.json'));
  const rows = blocks.map((b, i) => fill(file(`blocks/${b.type.replace('-', '_')}.html`), { ...v, gap: String(gaps[blocks[i - 1]?.type ?? 'start'][b.type]) })).join('\n');
  const out = fill(file('layout.html'), {
    lang: 'de', title: esc(raw), preheader: esc(raw), heading: esc(raw), asset_base: A, font_base: F,
    footer_product: esc(raw), footer_reason: esc(raw), blocks: rows,
  });
  assert.equal(out, js);
  for (const prev of Object.keys(JSON.parse(file('gaps.json')))) {
    for (const b of blocks) {
      assert.equal(JSON.parse(file('gaps.json'))[prev][b.type], blockGap(b, prev === 'start' ? null : { type: prev }));
    }
  }
});

test('noDjangoSyntaxInSwiftOutput', () => {
  buildSwift();
  const files = ['layout.html', ...SWIFT_BLOCKS.map(b => `blocks/${b}.html`)];
  assert.deepEqual(readdirSync(new URL('blocks/', swiftDir)).sort(), SWIFT_BLOCKS.map(b => `${b}.html`).sort());
  for (const f of files) {
    const body = readFileSync(new URL(f, swiftDir), 'utf8');
    assert.ok(!/\{%|\s%\}|\{#|\|default|\{\{\s|\s\}\}/.test(body), `${f} carries Django syntax`);
    assert.ok(!/ZZ[A-Z]+ZZ|zz\.invalid/.test(body), `${f} carries a sentinel`);
    for (const [, k] of body.matchAll(/(?<!\{)\{\{(\w+)\}\}(?!\})/g)) {
      assert.ok(['lang', 'title', 'preheader', 'heading', 'asset_base', 'font_base', 'footer_product', 'footer_reason', 'text', 'label', 'href', 'gap', 'ios_url', 'android_url'].includes(k), `${f}: unknown placeholder ${k}`);
    }
  }
});

/* ---------------------------------------------------------------- examples */

/* The guideline's examples are MomentoMarks copy and follow its rule. */
test('the guideline examples carry no em dash', () => {
  for (const { title, out } of all) {
    assert.ok(!out.text.includes('—') && !out.html.includes('—') && !out.html.includes('&mdash;'), `${title} has an em dash`);
  }
});
