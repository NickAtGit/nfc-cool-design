/* Writes dist/shell/swift/: the page shell (recipe 1's side nav, recipe 3's
   plain top bar) as plain templates for a Swift consumer (Keel), which fills
   them by string replacement exactly as it fills the mail.
   Usage: node build/emit-shell-swift.mjs (part of `npm run build`).

   Nothing here is written by hand. Each template is src/shell.js's own output,
   rendered with sentinel strings that are then swapped for placeholders, so
   Keel's nav cannot drift from the guideline's reference pages or from any
   page that calls shell.js.

   Placeholder grammar, the mail's, no logic of any kind:
   - {{name}} is a value the filler HTML-escapes;
   - {{{name}}} is finished HTML, inserted raw.
   side_nav.html: {{label}} {{brand_href}} {{asset_base}} {{theme_toggle_label}}
     {{menu_label}} {{theme_group_label}} {{theme_light}} {{theme_dark}}
     {{privacy_label}} {{privacy_href}} {{terms_label}} {{terms_href}}, plus
     {{{destinations}}} (nav_link rows joined with "\n") and {{{account}}}.
   nav_link.html, nav_link_current.html: {{href}} {{label}} {{{icon}}} (the
     inner paths of a 24px stroke glyph). The current one is aria-current.
   nav_account.html (no account page; the address alone, or the name alone):
     {{initial}} {{name}} {{sign_out_action}} {{sign_out_label}}
     {{sign_out_confirm}} {{{sign_out_fields}}} (hidden inputs, a CSRF token).
   nav_account_link.html (an account page; name and address): the same plus
     {{account_href}} and {{email}}.
   plain_header.html: {{brand_href}} {{asset_base}} {{theme_toggle_label}}.
   asset_base is the folder holding the two nav logos, ending in `/`. The ids
   are fixed (app-nav, app-nav-panel): nav.js keys the collapsed rail on it. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './guideline.mjs';
import { renderSideNav, renderNavLink, renderNavAccount, renderPlainHeader } from '../src/shell.js';

const out = join(root, 'dist/shell/swift');
mkdirSync(out, { recursive: true });

const S = k => `ZZ${k}ZZ`;

export function swap(html, pairs) {
  for (const [from, to] of pairs) {
    if (!html.includes(from)) throw new Error(`sentinel ${from} not found: src/shell.js changed shape, update this generator`);
    html = html.replaceAll(from, to);
  }
  return html;
}

/* Every template, as [shell.js output with sentinels, sentinel → placeholder].
   The Django emitter reuses the same renders with its own placeholders. */
export function shellRenders() {
  const signOut = { action: S('OUT_ACTION'), label: S('OUT_LABEL'), confirmTitle: S('OUT_CONFIRM'), fields: S('OUT_FIELDS') };
  const link = current => renderNavLink({ href: S('HREF'), label: S('LABEL'), icon: S('ICON'), current });
  return {
    side_nav: renderSideNav({
      label: S('LABEL'), brandHref: S('BRAND'), logoBase: S('ASSETS'), themeToggleLabel: S('TOGGLE'),
      menuLabel: S('MENU'), destinations: S('DESTINATIONS'), account: S('ACCOUNT'),
      themeGroupLabel: S('GROUP'), themeLight: S('LIGHT'), themeDark: S('DARK'),
      legal: { privacy: { label: S('PRIVACY'), href: S('PRIVACY_HREF') }, terms: { label: S('TERMS'), href: S('TERMS_HREF') } },
    }),
    nav_link: link(false),
    nav_link_current: link(true),
    // The avatar letter is the consumer's: shell.js would take it from the sentinel.
    nav_account: renderNavAccount({ name: S('NAME'), signOut }).replace('>Z</span>', `>${S('INITIAL')}</span>`),
    nav_account_link: renderNavAccount({ name: S('NAME'), email: S('EMAIL'), href: S('ACCOUNT_HREF'), signOut })
      .replace('>Z</span>', `>${S('INITIAL')}</span>`),
    plain_header: renderPlainHeader({ brandHref: S('BRAND'), logoBase: S('ASSETS'), themeToggleLabel: S('TOGGLE') }),
  };
}

const PLACEHOLDERS = {
  side_nav: [
    [S('DESTINATIONS'), '{{{destinations}}}'], [S('ACCOUNT'), '{{{account}}}'],
    [S('LABEL'), '{{label}}'], [S('BRAND'), '{{brand_href}}'], [S('ASSETS'), '{{asset_base}}'],
    [S('TOGGLE'), '{{theme_toggle_label}}'], [S('MENU'), '{{menu_label}}'], [S('GROUP'), '{{theme_group_label}}'],
    [S('LIGHT'), '{{theme_light}}'], [S('DARK'), '{{theme_dark}}'],
    [S('PRIVACY_HREF'), '{{privacy_href}}'], [S('PRIVACY'), '{{privacy_label}}'],
    [S('TERMS_HREF'), '{{terms_href}}'], [S('TERMS'), '{{terms_label}}'],
  ],
  nav_link: [[S('HREF'), '{{href}}'], [S('LABEL'), '{{label}}'], [S('ICON'), '{{{icon}}}']],
  nav_account: [
    [S('INITIAL'), '{{initial}}'], [S('NAME'), '{{name}}'], [S('OUT_ACTION'), '{{sign_out_action}}'],
    [S('OUT_LABEL'), '{{sign_out_label}}'], [S('OUT_CONFIRM'), '{{sign_out_confirm}}'], [S('OUT_FIELDS'), '{{{sign_out_fields}}}'],
  ],
  plain_header: [[S('BRAND'), '{{brand_href}}'], [S('ASSETS'), '{{asset_base}}'], [S('TOGGLE'), '{{theme_toggle_label}}']],
};
PLACEHOLDERS.nav_link_current = PLACEHOLDERS.nav_link;
PLACEHOLDERS.nav_account_link = [
  [S('ACCOUNT_HREF'), '{{account_href}}'], [S('EMAIL'), '{{email}}'], ...PLACEHOLDERS.nav_account,
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const renders = shellRenders();
  for (const [name, html] of Object.entries(renders)) {
    const body = swap(html, PLACEHOLDERS[name]);
    if (/ZZ[A-Z_]+ZZ/.test(body)) throw new Error(`${name}: a sentinel survived`);
    writeFileSync(join(out, `${name}.html`), body);
  }
  console.log(`wrote dist/shell/swift/ (${Object.keys(renders).length} templates)`);
}
