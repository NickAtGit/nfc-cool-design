/* @nfccool/design/shell.js: the page shell's markup, rendered from data.

   Recipe 1's signed-in side nav and recipe 3's plain top bar, written once.
   A consumer with Node calls these; a consumer without (Keel, the Django
   console) fills the templates build/emit-shell-swift.mjs and
   build/emit-shell-django.mjs generate from this very output, so the three
   cannot drift. The guideline's reference pages (build/reference-pages.mjs)
   are rendered from here too, which is what build/layout-check.mjs measures
   a product's page against.

     import { renderSideNav, renderNavLink, renderNavAccount, renderPlainHeader } from '@nfccool/design/shell.js';
     const nav = renderSideNav({
       label: 'Your account', brandHref: '/', logoBase: '/img/',
       themeToggleLabel: 'Toggle light or dark theme', menuLabel: 'Menu',
       destinations: renderNavLink({ href: '/cards', label: 'Cards', icon: '<path d="…"/>', current: true }),
       account: renderNavAccount({ name: 'Alex Rivera', email: 'alex@acme.com', href: '/account',
         signOut: { action: '/sign-out', label: 'Sign out', confirmTitle: 'Sign out?' } }),
       themeGroupLabel: 'Colour theme', themeLight: 'Light', themeDark: 'Dark',
       legal: { privacy: { label: 'Privacy', href: '…' }, terms: { label: 'Terms', href: '…' } },
     });

   Every value is escaped, text and attributes alike. Three inputs are HTML
   the caller built: `destinations` (rows from renderNavLink), `account`
   (renderNavAccount) and `signOut.fields` (hidden inputs such as a CSRF
   token). An icon is the inner paths of a 24px stroke glyph.

   The foot of the panel is fixed here, in this order and nothing else: who is
   signed in, the Light/Dark switch, Privacy · Terms (the business console,
   2026-11-21). A page cannot reorder it, because a page does not write it. */
import { escapeHtml as esc } from './email.js';

const STROKE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const HALF_CIRCLE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18V4a8 8 0 1 1 0 16z"/></svg>';
const BURGER = '<svg class="nav-toggle-icon nav-toggle-icon-open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'
  + '<svg class="nav-toggle-icon nav-toggle-icon-close" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const SIGN_OUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>';

/* Both logos are in the markup and CSS shows the one for the theme, so the
   first painted frame is right with no script. */
function brand(href, logoBase) {
  const logos = `<img class="nav-logo-on-light" src="${esc(logoBase)}nfc-secondary-logo-black.webp" alt="NFC.cool" width="600" height="148">`
    + `<img class="nav-logo-on-dark" src="${esc(logoBase)}nfc-secondary-logo-white.webp" alt="NFC.cool" width="600" height="148">`;
  return `<a class="nav-brand" href="${esc(href)}">${logos}</a>`;
}

const themeToggle = label => `<button class="nav-theme-toggle" type="button" aria-label="${esc(label)}">${HALF_CIRCLE}</button>`;

/* One destination. `current` marks the page you are on, for sight and for a
   screen reader alike. */
export function renderNavLink({ href, label, icon, current = false, count }) {
  const on = current ? ' is-active' : '';
  const aria = current ? ' aria-current="page"' : '';
  const badge = count === undefined || count === null ? '' : `<span class="nav-count">${esc(count)}</span>`;
  return `<li class="nav-item"><a class="nav-link${on}" href="${esc(href)}"${aria}>`
    + `<svg class="nav-icon" ${STROKE.replace('stroke="currentColor"', 'stroke="currentColor" stroke-width="1.8"')}>${icon}</svg>`
    + `<span class="nav-label">${esc(label)}</span>${badge}</a></li>`;
}

/* Who is signed in, and the way out. The name when there is one, else the
   address alone, carrying its own tooltip because it truncates. With an
   account page (`href`) the line is its link; without one it is inert. Sign
   out is always the icon square, asking first through ui.js's confirm, in the
   primary tone because it destroys nothing. */
export function renderNavAccount({ name, email, href, signOut }) {
  const shown = name || email || '';
  const initial = shown ? [...shown][0].toUpperCase() : '';
  const who = name && email
    ? `<span class="nav-account-name">${esc(name)}</span><span class="nav-account-email" title="${esc(email)}">${esc(email)}</span>`
    : `<span class="nav-account-name" title="${esc(shown)}">${esc(shown)}</span>`;
  const inner = `<span class="avatar avatar-sm" aria-hidden="true">${esc(initial)}</span><span class="nav-account-who">${who}</span>`;
  const line = href
    ? `<a class="nav-account-link" href="${esc(href)}">${inner}</a>`
    : `<span class="nav-account-link">${inner}</span>`;
  const { action, label, confirmTitle, fields = '' } = signOut;
  return [
    '<div class="nav-account">',
    line,
    `<form method="post" action="${esc(action)}" data-confirm-title="${esc(confirmTitle)}" data-confirm-action="${esc(label)}" data-confirm-tone="primary">`,
    ...(fields ? [fields] : []),
    `<button class="nav-account-out" type="submit" title="${esc(label)}">${SIGN_OUT}<span class="sr-only">${esc(label)}</span></button>`,
    '</form>',
    '</div>',
  ].join('\n');
}

/* Recipe 1: brand, theme icon, burger, panel. The panel holds the
   destinations and the foot, so on a phone they fold together. */
export function renderSideNav({
  id = 'app-nav', label, brandHref, logoBase, themeToggleLabel, menuLabel, destinations, account,
  themeGroupLabel, themeLight, themeDark, legal,
}) {
  const link = ({ label: text, href }) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`;
  return [
    `<nav class="nav" data-nav="side" id="${esc(id)}" aria-label="${esc(label)}">`,
    brand(brandHref, logoBase),
    themeToggle(themeToggleLabel),
    `<button class="nav-toggle" type="button" aria-controls="${esc(id)}-panel" aria-expanded="false" aria-label="${esc(menuLabel)}">${BURGER}</button>`,
    `<div class="nav-panel" id="${esc(id)}-panel">`,
    '<ul class="nav-list">',
    destinations,
    '</ul>',
    '<div class="nav-utility">',
    account,
    `<div class="nav-theme-switch" role="group" aria-label="${esc(themeGroupLabel)}">`
      + `<button type="button" data-theme-set="light" aria-pressed="false">${SUN}<span>${esc(themeLight)}</span></button>`
      + `<button type="button" data-theme-set="dark" aria-pressed="false">${MOON}<span>${esc(themeDark)}</span></button></div>`,
    `<p class="nav-legal">${link(legal.privacy)}<span aria-hidden="true"> · </span>${link(legal.terms)}</p>`,
    '</div>',
    '</div>',
    '</nav>',
  ].join('\n');
}

/* Recipe 3: a page without a session. The shell's first child, drawn as the
   nav card's bar across the top. */
export function renderPlainHeader({ brandHref, logoBase, themeToggleLabel }) {
  return [
    '<header class="app-header">',
    brand(brandHref, logoBase),
    '<span class="spacer"></span>',
    themeToggle(themeToggleLabel),
    '</header>',
  ].join('\n');
}
