/* Measures a product's page against the kit's reference pages in headless
   Chrome and prints what differs. The shared parts only: what the page has
   AND the reference has is compared, by computed style and by DOM order, in
   both themes. A page's own content is never compared.

   Usage: node build/layout-check.mjs <url> [--reference console|sign-in]
            [--width 1280] [--cookie 'name=value'] [--json]
   e.g.   node build/layout-check.mjs http://localhost:8099/business/licence

   The reference is chosen from the page: a side nav means recipe 1's console
   (site/reference-console.html), a plain shell recipe 3's sign-in
   (site/reference-sign-in.html). Both are built by build/emit-guideline.mjs
   from src/shell.js and the recipes; run it first. A signed-in page needs its
   session: pass the cookie the browser holds.

   Exit 0: no difference. 1: a difference, printed as `part: reference → page`.
   2: the check itself could not run.

   What it compares, each one a fix Nico had to ask for:
   - the nav's order (brand, theme icon, burger, panel) and its foot's
     (.nav-account, theme switch, .nav-legal), and the plain bar's;
   - the avatar's colours, size and weight, the account line and sign out;
   - .card, .card-head and .card-foot spacing, and that a card's buttons sit in
     its .card-foot (a row's own action, a copy box, an empty state excepted),
     with the foot the card's last child;
   - every button by its classes and where it sits, against the same classes
     in the same place on the reference, and by computed style;
   - a value to copy is .copy-value, never a read-only input;
   - the sign-in column: its width and padding, and the h1, lead, label,
     input, hint and button sizes. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './guideline.mjs';
import { REFERENCE_PAGES } from './reference-pages.mjs';
import { openPage, CHROME } from './chrome.mjs';

const THEMES = ['light', 'dark'];

/* Runs inside the page: everything the comparison reads, as plain data. */
async function probe() {
  await document.fonts.ready;
  const NAMES = ['nav-brand', 'nav-theme-toggle', 'nav-toggle', 'nav-panel', 'nav-account', 'nav-theme-switch', 'nav-legal',
    'spacer', 'nav-list', 'nav-utility', 'nav-section', 'lead', 'field', 'auth-note'];
  const name = el => {
    const hit = NAMES.find(n => el.classList.contains(n));
    if (hit) return `.${hit}`;
    if (el.matches('[data-nav-collapse]')) return 'collapse button';
    if (el.matches('.btn')) return `button "${el.textContent.trim()}"`;
    return el.tagName.toLowerCase() + (el.className ? `.${[...el.classList].join('.')}` : '');
  };
  /* Margins, padding and gaps by their computed value, not the used one: a
     .card-foot's `margin-block-start: auto` resolves to whatever room its
     card has, which is the page's content, not its layout. */
  const SPECIFIED = /^(margin|padding)-|gap$/;
  const value = (el, p) => (SPECIFIED.test(p) && el.computedStyleMap
    ? el.computedStyleMap().get(p)?.toString() ?? ''
    : getComputedStyle(el).getPropertyValue(p)).trim();
  const style = (el, props) => el ? Object.fromEntries(props.map(p => [p, value(el, p)])) : undefined;
  const one = (sel, props) => style(document.querySelector(sel), props);
  const BOX = ['padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end',
    'margin-block-start', 'margin-block-end', 'row-gap', 'column-gap'];
  const TYPE = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'font-family'];
  const SURFACE = ['background-color', 'border-top-width', 'border-top-color', 'border-radius', 'box-shadow'];
  const out = {};

  const nav = document.querySelector('nav[data-nav="side"]');
  if (nav) {
    out['nav order'] = [...nav.children].map(name);
    const foot = nav.querySelector('.nav-utility');
    if (foot) out['nav foot order'] = [...foot.children].map(name);
    out['nav card'] = style(nav, [...SURFACE, ...BOX.slice(0, 4), 'inline-size']);
    out['nav link'] = one('nav[data-nav="side"] .nav-link', [...TYPE, ...BOX.slice(0, 4), 'border-radius', 'block-size']);
    out['nav link, current'] = one('nav[data-nav="side"] .nav-link[aria-current="page"]', ['color', 'background-color', 'font-weight']);
    out['avatar'] = one('.nav-account .avatar', ['background-color', 'color', 'font-weight', 'font-size', 'inline-size', 'block-size', 'border-radius']);
    out['account line'] = one('.nav-account', ['display', 'align-items', 'gap', 'font-size']);
    out['account name'] = one('.nav-account-name', TYPE);
    out['sign out'] = one('.nav-account-out', ['inline-size', 'block-size', 'border-radius', 'color', ...SURFACE]);
    out['theme switch'] = one('.nav-theme-switch', [...SURFACE, ...BOX.slice(0, 4), 'block-size']);
    out['legal line'] = one('.nav-legal', [...TYPE, 'text-align']);
  }

  const bar = document.querySelector('.app-shell-plain > .app-header');
  if (bar) {
    out['plain bar order'] = [...bar.children].map(name);
    out['plain bar'] = style(bar, [...SURFACE, ...BOX.slice(0, 4), 'block-size']);
    out['plain bar logo'] = one('.app-shell-plain > .app-header .nav-brand img:not([hidden])', ['block-size']);
  }

  if (document.querySelector('.card')) {
    out['card'] = one('main .card', [...SURFACE, ...BOX.slice(0, 4)]);
  }
  if (document.querySelector('.card-head')) {
    out['card head'] = one('.card-head', ['display', 'align-items', 'justify-content', ...BOX]);
    out['card head title'] = one('.card-head .panel-title', TYPE);
    out['card head sub'] = one('.card-head .sub', TYPE);
  }
  if (document.querySelector('.card-foot')) {
    out['card foot'] = one('.card-foot', ['display', 'justify-content', 'align-items', ...BOX, 'border-top-width', 'border-top-color']);
    out['card foot is the card\'s last child'] = [...document.querySelectorAll('.card-foot')]
      .filter(f => f.parentElement.closest('.card') === f.parentElement && f !== f.parentElement.lastElementChild)
      .map(f => f.closest('.card').querySelector('.panel-title')?.textContent.trim() ?? 'a card');
  }
  if (document.querySelector('.card')) {
    const allowed = '.card-foot, .list-row, .list-row-action, .copy-value, .empty-state, dialog';
    out['card buttons outside .card-foot'] = [...document.querySelectorAll('.card .btn')]
      .filter(b => !b.closest(allowed))
      .map(b => `"${b.textContent.trim()}" (${b.className})`);
    out['read-only inputs as copy boxes'] = [...document.querySelectorAll('.card input[readonly]')]
      .map(i => i.value || i.name || 'an input');
  }
  if (document.querySelector('.copy-value')) {
    out['copy box'] = one('.copy-value', [...SURFACE, ...BOX.slice(0, 4), 'display']);
  }

  /* Every button, keyed by its classes and the part of the page it sits in. */
  const PLACES = [['.card-foot', 'card foot'], ['.list-row', 'list row'], ['.copy-value', 'copy box'],
    ['.empty-state', 'empty state'], ['.auth-card', 'sign-in column'], ['.page-head', 'page head'], ['dialog', 'dialog']];
  const buttons = {};
  for (const b of document.querySelectorAll('.btn')) {
    const place = PLACES.find(([sel]) => b.closest(sel))?.[1] ?? 'elsewhere';
    const key = `${[...b.classList].sort().join(' ')} in ${place}`;
    buttons[key] ??= style(b, ['font-size', 'font-weight', 'block-size', 'padding-inline-start', 'padding-block-start',
      'border-radius', 'background-color', 'color', 'border-top-color']);
  }
  out.buttons = buttons;

  if (document.querySelector('.auth-card')) {
    out['sign-in order'] = [...document.querySelector('.auth-card').children].map(name);
    out['sign-in column'] = one('.auth-card', [...SURFACE, ...BOX, 'inline-size', 'max-inline-size']);
    out['sign-in h1'] = one('.auth-card > h1', TYPE);
    out['sign-in lead'] = one('.auth-card > .lead', TYPE);
    out['sign-in label'] = one('.auth-card .field-label', TYPE);
    out['sign-in input'] = one('.auth-card .input', [...TYPE.slice(0, 3), 'block-size', ...SURFACE]);
    out['sign-in hint'] = one('.auth-card .field-hint', TYPE);
    out['sign-in button'] = one('.auth-card .btn-block', [...TYPE.slice(0, 3), 'block-size', 'inline-size', ...SURFACE]);
  }
  out.kind = nav ? 'console' : bar ? 'sign-in' : 'unknown';
  return JSON.parse(JSON.stringify(out));
}

async function measure(page, url, { width, cookie }) {
  await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.send('Network.enable');
  await page.send('Network.setExtraHTTPHeaders', { headers: cookie ? { Cookie: cookie } : {} });
  const loaded = page.once('Page.loadEventFired', 30000);
  const nav = await page.send('Page.navigate', { url });
  if (nav.errorText) throw new Error(`${url}: ${nav.errorText}`);
  await loaded;
  // Buttons and fields ease their colours, so a theme switch read at once would
  // catch them halfway.
  await page.evaluate(() => {
    const calm = document.createElement('style');
    calm.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.append(calm);
  });
  const byTheme = {};
  for (const theme of THEMES) {
    await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t); }, theme);
    byTheme[theme] = await page.evaluate(probe);
  }
  return byTheme;
}

const show = v => (Array.isArray(v) ? (v.length ? v.join(', ') : 'nothing') : v === undefined ? 'absent' : String(v));

/* Differences in the parts both pages have, one line per property. A
   difference that is the same in both themes is printed once. */
export function compare(reference, target) {
  const lines = new Map();
  const add = (theme, part, prop, ref, got) => {
    const key = `${part}${prop ? `.${prop}` : ''}: ${show(ref)} → ${show(got)}`;
    lines.set(key, [...(lines.get(key) ?? []), theme]);
  };
  for (const theme of THEMES) {
    const ref = reference[theme], got = target[theme];
    for (const part of Object.keys(ref)) {
      if (part === 'kind' || !(part in got) || got[part] === undefined || ref[part] === undefined) continue;
      if (part === 'buttons') {
        const places = new Set(Object.keys(ref.buttons).map(k => k.split(' in ')[1]));
        for (const [key, s] of Object.entries(got.buttons)) {
          const [classes, place] = key.split(' in ');
          if (!places.has(place)) continue;
          const twin = ref.buttons[key];
          if (!twin) {
            const used = Object.keys(ref.buttons).filter(k => k.endsWith(` in ${place}`)).map(k => k.split(' in ')[0]);
            add(theme, `button in ${place}`, '', `one of [${used.join(' | ')}]`, classes);
            continue;
          }
          for (const p of Object.keys(twin)) if (twin[p] !== s[p]) add(theme, `button "${classes}" in ${place}`, p, twin[p], s[p]);
        }
        continue;
      }
      if (Array.isArray(ref[part])) {
        if (JSON.stringify(ref[part]) !== JSON.stringify(got[part])) add(theme, part, '', ref[part], got[part]);
        continue;
      }
      for (const p of Object.keys(ref[part])) if (ref[part][p] !== got[part][p]) add(theme, part, p, ref[part][p], got[part][p]);
    }
  }
  return [...lines].map(([line, themes]) => (themes.length === THEMES.length ? line : `[${themes.join('+')}] ${line}`));
}

function parse(argv) {
  const opts = { width: 1280, reference: undefined, cookie: undefined, json: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reference') opts.reference = argv[++i];
    else if (a === '--width') opts.width = Number(argv[++i]);
    else if (a === '--cookie') opts.cookie = argv[++i];
    else if (a === '--json') opts.json = true;
    else rest.push(a);
  }
  if (rest.length !== 1 || !Number.isFinite(opts.width) || (opts.reference && !['console', 'sign-in'].includes(opts.reference))) {
    throw new Error('usage: node build/layout-check.mjs <url> [--reference console|sign-in] [--width 1280] [--cookie name=value] [--json]');
  }
  const target = /^[a-z]+:\/\//i.test(rest[0]) ? rest[0] : pathToFileURL(rest[0]).href;
  return { ...opts, target };
}

async function main() {
  let opts;
  try { opts = parse(process.argv.slice(2)); } catch (e) { console.error(e.message); return 2; }
  if (!existsSync(CHROME)) { console.error(`no Chrome at ${CHROME}; set CHROME`); return 2; }
  const refFile = kind => join(root, 'site', kind === 'console' ? REFERENCE_PAGES.console : REFERENCE_PAGES.signIn);
  for (const kind of ['console', 'sign-in']) {
    if (!existsSync(refFile(kind))) { console.error(`${refFile(kind)} is missing: run node build/emit-guideline.mjs`); return 2; }
  }
  const page = await openPage({ port: Number(process.env.LAYOUT_CHECK_PORT ?? 9334) });
  try {
    const target = await measure(page, opts.target, opts);
    const kind = opts.reference ?? target.light.kind;
    if (kind === 'unknown') { console.error(`${opts.target}: neither a side nav nor a plain shell, so no reference fits`); return 2; }
    const reference = await measure(page, pathToFileURL(refFile(kind)).href, { width: opts.width });
    const diffs = compare(reference, target);
    if (opts.json) console.log(JSON.stringify({ reference: kind, width: opts.width, differences: diffs }, null, 2));
    else {
      const shared = Object.keys(reference.light).filter(p => p !== 'kind' && target.light[p] !== undefined);
      console.log(`${opts.target}\n  against the ${kind} reference at ${opts.width}px, light and dark`);
      console.log(`  compared: ${shared.join(', ')}`);
      if (diffs.length) console.log(`\n${diffs.length} difference${diffs.length === 1 ? '' : 's'} (reference → page):\n${diffs.map(d => `  ${d}`).join('\n')}`);
      else console.log('\nno difference');
    }
    return diffs.length ? 1 : 0;
  } catch (e) {
    console.error(e.message);
    return 2;
  } finally {
    await page.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
