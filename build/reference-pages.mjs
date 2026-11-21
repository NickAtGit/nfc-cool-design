/* The reference pages: recipe 1's signed-in shell around recipe 5's account
   page, and recipe 3's plain shell around the sign-in column, each rendered
   from the package alone (src/shell.js for the shell, the recipes' markup for
   the content). build/emit-guideline.mjs writes them into site/ beside the
   guideline, and build/layout-check.mjs measures a product's page against
   them. They are what "the system's page" means, in a form a browser can
   compute. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, LOCAL_FONTS, layersCSS, navScript, uiScript } from './guideline.mjs';
import { renderSideNav, renderNavLink, renderNavAccount, renderPlainHeader } from '../src/shell.js';

export const REFERENCE_PAGES = Object.freeze({ console: 'reference-console.html', signIn: 'reference-sign-in.html' });

/* The base every consumer's page head carries before the bundle's
   components: no default margins, block images, the brand face. */
const PAGE_BASE = `*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
img { max-inline-size:100%; block-size:auto; display:block; }
a { text-decoration:none; color:var(--color-link-text); }
body { font-family:var(--font-sans); background:var(--color-bg); color:var(--color-text); line-height:var(--leading-body); -webkit-font-smoothing:antialiased; }`;

const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const MEMBERS = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>';
const CARD = '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>';

function page(title, body) {
  const r = f => readFileSync(join(root, f), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${title} · Reference</title>
<script>${r('src/theme.js')}</script>
<style>
${LOCAL_FONTS}
${layersCSS()}
${PAGE_BASE}
</style>
</head>
<body>
${body}
${navScript()}
${uiScript()}
</body>
</html>
`;
}

const CHROME = {
  logoBase: 'images/', themeToggleLabel: 'Toggle light or dark theme',
};

function consolePage() {
  const nav = renderSideNav({
    ...CHROME, label: 'Your account', brandHref: '#', menuLabel: 'Menu',
    destinations: [
      renderNavLink({ href: '#', label: 'Licence', icon: MEMBERS, current: true }),
      renderNavLink({ href: '#', label: 'Cards', icon: CARD }),
    ].join('\n'),
    account: renderNavAccount({
      email: 'it@acme.example',
      signOut: { action: '#', label: 'Sign out', confirmTitle: 'Sign out?', fields: '<input type="hidden" name="csrf" value="reference">' },
    }),
    themeGroupLabel: 'Colour theme', themeLight: 'Light', themeDark: 'Dark',
    legal: { privacy: { label: 'Privacy', href: 'https://privacy-policy.nfc.cool' }, terms: { label: 'Terms', href: 'https://nfc.cool/terms/' } },
  });
  return page('Licence', `<div class="app-shell">
${nav}
<div class="app-main">
<div class="page-head">
<div class="page-head-text">
<h1>Licence</h1>
<span class="sub">Acme GmbH</span>
</div>
</div>
<main class="stack">
<div class="grid-2">
<div class="card">
<div class="card-head"><div class="card-head-text"><h2 class="panel-title">Licence</h2></div><span class="pill pill-success">Active</span></div>
<dl class="facts">
<div><dt>Seats in use</dt><dd>3 / 5</dd></div>
<div><dt>Paid until</dt><dd>31 Dec 2026</dd></div>
</dl>
<div class="card-foot">
<form method="post" action="#" data-confirm-title="Cancel this licence?" data-confirm-detail="It works until 31 Dec 2026." data-confirm-action="Cancel licence">
<button class="btn btn-danger btn-sm" type="submit">Cancel licence</button>
</form>
</div>
</div>
<div class="card">
<div class="card-head"><div class="card-head-text"><h2 class="panel-title">Change seats</h2><p class="sub">Added seats are charged now; removed seats are credited.</p></div></div>
<form class="stack" id="seats" method="post" action="#" data-confirm-tone="primary" data-confirm-title="Change the seats?" data-confirm-action="Change seats">
<div class="stepper">
<button type="button" aria-label="One seat fewer"><svg ${SVG}><path d="M5 12h14"/></svg></button>
<input type="number" name="seats" inputmode="numeric" min="3" value="5" aria-label="Seats">
<button type="button" aria-label="One seat more"><svg ${SVG}><path d="M12 5v14M5 12h14"/></svg></button>
</div>
<p class="field-hint">3 in use, so 3 is the lowest.</p>
</form>
<div class="card-foot"><button class="btn btn-primary btn-sm" type="submit" form="seats">Change seats</button></div>
</div>
</div>
<div class="card">
<div class="card-head"><div class="card-head-text"><h2 class="panel-title">Licence link</h2><p class="sub">Whoever opens it on a phone with the app takes a seat.</p></div></div>
<div class="copy-value"><code>https://keel.example/business/l/reference</code><button class="btn btn-secondary btn-sm" type="button">Copy</button></div>
<div class="card-foot"><button class="btn btn-secondary btn-sm" type="button">Replace link</button></div>
</div>
<div class="card">
<div class="card-head"><div class="card-head-text"><h2 class="panel-title">Devices</h2><p class="sub">3 of 5 seats in use.</p></div></div>
<ul class="list-rows">
<li class="list-row"><span class="list-row-title">iPhone 15 Pro</span><span class="list-row-meta">Since 2 Nov 2026</span>
<form class="list-row-action" method="post" action="#" data-confirm-title="Free this seat?" data-confirm-action="Free seat"><button class="btn btn-danger btn-quiet btn-sm" type="submit">Free seat</button></form></li>
</ul>
</div>
</main>
</div>
</div>
<div class="toast" data-toast role="status" aria-live="polite" data-close-label="Close" hidden></div>
<dialog class="dialog" data-confirm-dialog aria-labelledby="confirm-title">
<h2 class="dialog-title" id="confirm-title"></h2>
<p class="dialog-text"></p>
<div class="dialog-actions">
<form method="dialog"><button class="btn btn-secondary" autofocus>Cancel</button></form>
<button class="btn btn-danger btn-primary" type="button" data-confirm-go>Remove</button>
</div>
</dialog>`);
}

function signInPage() {
  return page('Sign in', `<div class="app-shell app-shell-plain">
${renderPlainHeader({ ...CHROME, brandHref: '#' })}
<div class="app-main">
<main>
<div class="auth-card">
<h1>Your licence page</h1>
<p class="lead">See who has a seat, free one, change the count or send a new link.</p>
<form method="post" action="#">
<div class="field">
<label class="field-label" for="email">Contact email</label>
<input class="input" id="email" name="email" type="email" autocomplete="email" required>
<p class="field-hint">The address that holds the licence. We send a sign-in link to it.</p>
</div>
<button class="btn btn-primary btn-block" type="submit">Email me a sign-in link</button>
</form>
</div>
</main>
</div>
</div>`);
}

export function renderReferencePages() {
  return new Map([[REFERENCE_PAGES.console, consolePage()], [REFERENCE_PAGES.signIn, signInPage()]]);
}
