import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderSideNav, renderNavLink, renderNavAccount, renderPlainHeader } from '../src/shell.js';
import { CHROME } from '../build/chrome.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const build = script => execFileSync('node', [script], { cwd: ROOT, stdio: 'pipe' });
const read = (dir, f) => readFileSync(join(ROOT, dir, f), 'utf8');
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* The filler Keel runs: {{name}} escaped, {{{name}}} raw, an unknown name an error. */
const fill = (tpl, values, raw = {}) => tpl.replace(/\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g, (_, r, v) => {
  if (r) { if (!(r in raw)) throw new Error(`no raw value for ${r}`); return raw[r]; }
  if (!(v in values)) throw new Error(`no value for ${v}`);
  return esc(values[v]);
});

const hostile = 'Tom & <Co> "x"';
const navData = {
  label: hostile, brandHref: '/business/licence', logoBase: '/design/images/', themeToggleLabel: hostile, menuLabel: hostile,
  themeGroupLabel: hostile, themeLight: hostile, themeDark: hostile,
  legal: { privacy: { label: hostile, href: 'https://privacy-policy.nfc.cool' }, terms: { label: hostile, href: 'https://nfc.cool/terms/' } },
};
const ICON = '<path d="M3 3h18"/>';

test('the side nav foot is the account, the theme switch, then Privacy and Terms, and nothing else', () => {
  const nav = renderSideNav({ ...navData, destinations: '', account: renderNavAccount({ email: 'a@b.example', signOut: { action: '/out', label: 'Sign out', confirmTitle: 'Sign out?' } }) });
  const foot = nav.slice(nav.indexOf('<div class="nav-utility">'));
  const order = [...foot.matchAll(/<(?:div|p) class="(nav-account|nav-theme-switch|nav-legal)"/g)].map(m => m[1]);
  assert.deepEqual(order, ['nav-account', 'nav-theme-switch', 'nav-legal']);
  assert.ok(!/btn-ghost|data-nav-collapse/.test(nav), 'no Sign out text button and no collapse control in the foot');
  const top = [...nav.matchAll(/class="(nav-brand|nav-theme-toggle|nav-toggle|nav-panel)"/g)].map(m => m[1]);
  assert.deepEqual(top, ['nav-brand', 'nav-theme-toggle', 'nav-toggle', 'nav-panel']);
});

test('the account line shows the address alone when there is no name, and escapes everything', () => {
  const alone = renderNavAccount({ email: '<i>@x.example', signOut: { action: '/out', label: hostile, confirmTitle: hostile } });
  assert.ok(alone.includes('<span class="nav-account-name" title="&lt;i&gt;@x.example">&lt;i&gt;@x.example</span>'));
  assert.ok(alone.includes('aria-hidden="true">&lt;</span>') && !alone.includes('<i>'));
  const named = renderNavAccount({ name: 'Ana', email: 'ana@x.example', href: '/account', signOut: { action: '/out', label: 'Out', confirmTitle: 'Out?' } });
  assert.ok(named.startsWith('<div class="nav-account">\n<a class="nav-account-link" href="/account">'));
  assert.ok(named.includes('>A</span>') && named.includes('<span class="nav-account-email" title="ana@x.example">'));
});

test('the Swift shell templates are shell.js output with the sentinels swapped', () => {
  build('build/emit-shell-swift.mjs');
  const dir = 'dist/shell/swift';
  assert.deepEqual(readdirSync(join(ROOT, dir)).sort(),
    ['nav_account.html', 'nav_account_link.html', 'nav_link.html', 'nav_link_current.html', 'plain_header.html', 'side_nav.html']);
  const signOut = { action: '/out?a=1&b=2', label: hostile, confirmTitle: hostile, fields: '<input type="hidden" name="csrf" value="t">' };
  const outValues = { sign_out_action: signOut.action, sign_out_label: hostile, sign_out_confirm: hostile };

  const link = fill(read(dir, 'nav_link_current.html'), { href: '/x?a=1&b=2', label: hostile }, { icon: ICON });
  assert.equal(link, renderNavLink({ href: '/x?a=1&b=2', label: hostile, icon: ICON, current: true }));
  assert.equal(fill(read(dir, 'nav_link.html'), { href: '/x', label: hostile }, { icon: ICON }), renderNavLink({ href: '/x', label: hostile, icon: ICON }));

  const account = fill(read(dir, 'nav_account.html'), { initial: 'T', name: hostile, ...outValues }, { sign_out_fields: signOut.fields });
  assert.equal(account, renderNavAccount({ email: hostile, signOut }));
  const accountLink = fill(read(dir, 'nav_account_link.html'),
    { initial: 'T', name: hostile, email: 'a@x.example', account_href: '/me', ...outValues }, { sign_out_fields: signOut.fields });
  assert.equal(accountLink, renderNavAccount({ name: hostile, email: 'a@x.example', href: '/me', signOut }));

  const nav = fill(read(dir, 'side_nav.html'), {
    label: hostile, brand_href: navData.brandHref, asset_base: navData.logoBase, theme_toggle_label: hostile, menu_label: hostile,
    theme_group_label: hostile, theme_light: hostile, theme_dark: hostile, privacy_label: hostile,
    privacy_href: navData.legal.privacy.href, terms_label: hostile, terms_href: navData.legal.terms.href,
  }, { destinations: link, account });
  assert.equal(nav, renderSideNav({ ...navData, destinations: link, account }));

  const header = fill(read(dir, 'plain_header.html'), { brand_href: '/', asset_base: '/img/', theme_toggle_label: hostile });
  assert.equal(header, renderPlainHeader({ brandHref: '/', logoBase: '/img/', themeToggleLabel: hostile }));

  for (const f of readdirSync(join(ROOT, dir))) {
    assert.ok(!/ZZ[A-Z_]+ZZ|\{%|\{\{\s/.test(read(dir, f)), `${f} carries a sentinel or Django syntax`);
  }
});

test('the Django shell includes carry the same markup and no Swift placeholders', () => {
  build('build/emit-shell-django.mjs');
  const dir = 'dist/shell/django';
  const files = readdirSync(join(ROOT, dir)).sort();
  assert.deepEqual(files, readdirSync(join(ROOT, 'dist/shell/swift')).sort());
  for (const f of files) {
    const body = read(dir, f);
    assert.ok(!/ZZ[A-Z_]+ZZ|\{\{\{|\{\{\w/.test(body), `${f} carries a sentinel or a Swift placeholder`);
    const swift = read('dist/shell/swift', f).replace(/\{\{\{?\w+\}\}\}?/g, '');
    const django = body.split('\n').slice(1).join('\n').replace(/\{\{ [\w|]+ \}\}|\{% [^%]+ %\}/g, '');
    assert.equal(django, swift, `${f}: the markup around the variables differs from the Swift template`);
  }
  assert.ok(read(dir, 'nav_account.html').includes('{% csrf_token %}'));
  assert.ok(read(dir, 'side_nav.html').includes('{% include destinations_template %}'));
});

/* ---------------------------------------------------------------- layout check */

const hasChrome = existsSync(CHROME);
const check = (target, ...args) => spawnSync('node', ['build/layout-check.mjs', target, ...args], {
  cwd: ROOT, encoding: 'utf8', env: { ...process.env, LAYOUT_CHECK_PORT: '9345' }, timeout: 120000,
});

/* A reference page with the drift Nico kept finding, moved into a scratch
   folder; <base> keeps its fonts and images resolving from site/. */
function drifted(file, edit) {
  const dir = mkdtempSync(join(tmpdir(), 'layout-check-'));
  const html = edit(read('site', file)).replace('<head>', `<head>\n<base href="file://${join(ROOT, 'site')}/">`);
  writeFileSync(join(dir, file), html);
  return { path: join(dir, file), done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('the layout check passes a reference page against itself', { skip: !hasChrome && 'no Chrome' }, () => {
  build('build/emit-guideline.mjs');
  for (const page of ['reference-console.html', 'reference-sign-in.html']) {
    const run = check(join(ROOT, 'site', page));
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /no difference/);
  }
});

test('the layout check names a drifted console page part by part', { skip: !hasChrome && 'no Chrome' }, () => {
  build('build/emit-guideline.mjs');
  const page = drifted('reference-console.html', html => {
    // The stylesheet's comments quote this markup too, so the cut is made in the body.
    const body = html.indexOf('<body>');
    const from = html.indexOf('<div class="nav-account">', body), to = html.indexOf('<div class="nav-theme-switch"', body);
    const legal = html.indexOf('<p class="nav-legal">', body);
    return (html.slice(0, from) + html.slice(to, legal) + html.slice(from, to) + html.slice(legal))
      .replace('</style>', '.nav-account .avatar { background: var(--color-primary-bg); }\n</style>')
      .replace('<div class="card-foot"><button class="btn btn-primary btn-sm" type="submit" form="seats">Change seats</button></div>',
        '<button class="btn btn-primary" type="submit" form="seats">Change seats</button>');
  });
  try {
    const run = check(page.path);
    assert.equal(run.status, 1, run.stdout + run.stderr);
    assert.match(run.stdout, /nav foot order: \.nav-account, \.nav-theme-switch, \.nav-legal → \.nav-theme-switch, \.nav-account, \.nav-legal/);
    assert.match(run.stdout, /avatar\.background-color: /);
    assert.match(run.stdout, /card buttons outside \.card-foot: nothing → "Change seats" \(btn btn-primary\)/);
  } finally { page.done(); }
});

test('the layout check names a drifted sign-in column', { skip: !hasChrome && 'no Chrome' }, () => {
  build('build/emit-guideline.mjs');
  const page = drifted('reference-sign-in.html', html => html
    .replace('</style>', '.auth-card > h1 { font-size: var(--text-md); }\n</style>')
    .replace('<button class="btn btn-primary btn-block"', '<button class="btn btn-secondary btn-block"'));
  try {
    const run = check(page.path);
    assert.equal(run.status, 1, run.stdout + run.stderr);
    assert.match(run.stdout, /sign-in h1\.font-size: /);
    assert.match(run.stdout, /button in sign-in column: one of \[btn btn-block btn-primary\] → btn btn-block btn-secondary/);
  } finally { page.done(); }
});
