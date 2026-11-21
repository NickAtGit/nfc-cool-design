# Recipes: a page in one shot

The point of this package is that a page on any NFC.cool property is ASSEMBLED,
not designed. The system owns the shell, the page head, every surface, every
control and every piece of feedback. A page owns two things: its content, and
the layout of whatever is unique to it (a grid of album tiles, a mosaic of
photos). If you are about to write CSS for anything else, stop: either the
class exists, or it is missing from the system and belongs here first.

Each recipe below is complete markup. Copy it, replace the words, keep the
classes. The guideline site (`npm run build`, then `site/index.html`) renders
every piece in both themes, so anything you see there you can use verbatim.

## The rules a page cannot break

1. **No literals.** Colours, lengths, radii, shadows, fonts and durations are
   tokens (`var(--…)`). The guards in every consumer fail on a literal.
2. **No physical properties.** `margin-inline`, `inset-inline-start`,
   `padding-block`; never `left`, `margin-right`, `text-align: left`. Every
   page renders in RTL.
3. **The four breakpoints only**: 600, 768, 900, 1200 px. A layout question
   that needs a fifth is a layout question to ask differently.
4. **The page's name is in the content**, in a `.page-head`. Never in the bar,
   never with a back arrow in the bar. A page below a list or a section
   carries a crumb above its title, and that is its only way back: no back
   button in the header, no "Back to …" at the foot.
5. **Controls are the brand's.** A customer's own colour (an album's accent,
   an organisation's brand) appears on its own band or tile, never on a
   button, a link or a chip.
6. **Every empty state carries its action.** A sentence with no door is a
   dead end.
7. **Both themes, always.** `data-theme` is stamped on `<html>` before first
   paint by `theme.js`; a page never reads `prefers-color-scheme` itself.

## Recipe 1: a console page with a list

The signed-in shell. The nav is the business console's: a floating column at
`xl` and up, a stacked rail from `md`, and below `md` a sticky bar whose burger
drops the panel under it. One markup for all three. The list takes the whole
column.

Do not type the nav. `src/shell.js` renders it (`renderSideNav`, with
`renderNavLink` per destination and `renderNavAccount` for the foot), and a
consumer without Node fills the templates generated from that same output:
`dist/shell/swift/` (Keel) or `dist/shell/django/` (see "Wiring it in each
consumer"). The markup below is what they produce.

```html
<div class="app-shell">
  <nav class="nav" data-nav="side" id="app-nav" aria-label="Your account">
    <a class="nav-brand" href="/">
      <img class="nav-logo-on-light" src="/img/nfc-secondary-logo-black.webp" alt="NFC.cool" width="600" height="148">
      <img class="nav-logo-on-dark"  src="/img/nfc-secondary-logo-white.webp" alt="NFC.cool" width="600" height="148">
    </a>
    <button class="nav-theme-toggle" type="button" aria-label="Toggle light or dark theme">…half-circle svg…</button>
    <button class="nav-toggle" type="button" aria-controls="app-nav-panel" aria-expanded="false" aria-label="Menu">
      <svg class="nav-toggle-icon nav-toggle-icon-open" …>…</svg>
      <svg class="nav-toggle-icon nav-toggle-icon-close" …>…</svg>
    </button>
    <div class="nav-panel" id="app-nav-panel">
      <ul class="nav-list">
        <li class="nav-item"><a class="nav-link is-active" href="/cards" aria-current="page"><svg class="nav-icon" …/><span class="nav-label">Cards</span><span class="nav-count">12</span></a></li>
        <li class="nav-item"><a class="nav-link" href="/members"><svg class="nav-icon" …/><span class="nav-label">Members</span></a></li>
      </ul>
      <div class="nav-utility">
        <div class="nav-account">
          <a class="nav-account-link" href="/account"><span class="avatar avatar-sm" aria-hidden="true">A</span>
            <span class="nav-account-who"><span class="nav-account-name">Alex Rivera</span><span class="nav-account-email">alex@acme.com</span></span></a>
          <form method="post" action="/sign-out" data-confirm-title="Sign out?" data-confirm-action="Sign out" data-confirm-tone="primary">
            <button class="nav-account-out" type="submit" title="Sign out">…log-out svg…<span class="sr-only">Sign out</span></button>
          </form>
        </div>
        <div class="nav-theme-switch" role="group" aria-label="Colour theme">
          <button type="button" data-theme-set="light" aria-pressed="false">…sun svg…<span>Light</span></button>
          <button type="button" data-theme-set="dark"  aria-pressed="false">…moon svg…<span>Dark</span></button>
        </div>
        <p class="nav-legal"><a href="https://nfc.cool/privacy" target="_blank" rel="noopener">Privacy</a><span aria-hidden="true"> · </span><a href="https://nfc.cool/terms" target="_blank" rel="noopener">Terms</a></p>
      </div>
    </div>
  </nav>

  <div class="app-main">
    <div class="page-head">
      <div class="page-head-text">
        <h1>Cards</h1>
        <span class="sub">12 cards across 4 members.</span>
      </div>
      <div class="actions"><a class="btn btn-primary btn-sm" href="/cards/new">New card</a></div>
    </div>

    <main>
      <div class="grid-cards">
        <a class="card card-interactive" href="/cards/1">…</a>
        <a class="card card-interactive" href="/cards/2">…</a>
      </div>
    </main>
  </div>
</div>

<!-- Once per page, outside the content and outside anything a swap replaces:
     the one feedback channel and the one confirm, in the page's language. -->
<div class="toast" data-toast role="status" aria-live="polite" data-close-label="Close" hidden></div>
<dialog class="dialog" data-confirm-dialog aria-labelledby="confirm-title">
  <h2 class="dialog-title" id="confirm-title"></h2>
  <p class="dialog-text"></p>
  <div class="dialog-actions">
    <form method="dialog"><button class="btn btn-secondary" autofocus>Cancel</button></form>
    <button class="btn btn-danger btn-primary" type="button" data-confirm-go>Remove</button>
  </div>
</dialog>
<script type="module" src="/assets/design/nav.js"></script>
<script type="module" src="/assets/design/ui.js"></script>
```

A message from the server after a redirect is that toast, rendered with its
text and tone (`class="toast toast-success"`, `<span class="toast-text">Saved.</span>`,
no `hidden`); `ui.js` gives it its close button and its five seconds. A row's
destructive action asks first by naming the thing on its form:

```html
<form method="post" action="/tokens/7/revoke"
      data-confirm-title="Revoke ‘e2e loop’?" data-confirm-detail="It stops working at once."
      data-confirm-action="Revoke">
  <button class="btn btn-danger btn-quiet btn-sm">Revoke</button>
</form>
```

Sign out is the same, on its link or form, with `data-confirm-tone="primary"`
because it destroys nothing.

What the page may add: the rule that arranges ITS tiles (a `grid-template-
columns` on its own list, stepping 2, 3, 4 across at 768 and 900). Nothing
about the card, the head, the nav or the gutter: the shell owns the gutter,
and `main` states no width and no inset.

The foot of the panel is, in this order and nothing else: `.nav-account`, the
theme switch, `.nav-legal` (the business console, 2026-11-21). Who is signed
in is always `.nav-account`: the
person (avatar letter, name, address; the address alone when there is no
name) and sign out as the icon square beside it. Never a "Sign out" text
button: that is what a page built from an older copy of this recipe did.

The order inside the nav is not negotiable: brand, theme icon, burger, panel.
The panel holds the destinations AND the utilities, so on a phone they fold
together and on a desktop the utilities sit at the foot of the column. (The
bar mode is the opposite: its utilities sit OUTSIDE the panel, before the
burger, so Sign in stays visible on a phone.)

## Recipe 2: a console page with a form

Same shell. The page head and the cards share `.form-narrow`, the system's
reading measure, starting at the column's edge like a list page, so a label on
a wide screen is never a foot away from its control and the title does not
jump sideways between pages. A page one level down carries the crumb.

```html
<div class="app-main">
  <div class="page-head form-narrow">
    <div class="page-head-text">
      <a class="crumb" href="/cards"><svg …><path d="M15 5l-7 7 7 7"/></svg><span><span class="sr-only">Back to </span>Cards</span></a>
      <h1>Card settings</h1>
      <span class="sub">Alex Rivera</span>
    </div>
  </div>
  <!-- A thing with several pages: its tabs, under its head. -->
  <nav class="section-nav form-narrow" aria-label="This card">
    <a href="/cards/1">Details</a>
    <a href="/cards/1/settings" aria-current="page">Settings</a>
  </nav>

  <main class="form-narrow">
    <form class="panel" method="post">
      <div class="panel-header"><h2 class="panel-title">Name</h2></div>
      <div class="panel-body stack">
        <div class="field">
          <label class="field-label" for="name">Display name</label>
          <input class="input" id="name" name="name" value="Alex Rivera">
          <p class="field-hint">What appears on the card.</p>
        </div>
        <div class="field">
          <label class="field-label" for="vis">Visibility</label>
          <select class="select" id="vis" name="visibility"><option>Public</option><option>Private</option></select>
        </div>
        <label class="switch-row"><span>Show on the team page</span><input class="switch" type="checkbox" checked></label>
      </div>
      <div class="panel-footer">
        <a class="btn btn-secondary btn-sm" href="/cards">Cancel</a>
        <button class="btn btn-primary btn-sm" type="submit">Save</button>
      </div>
    </form>
  </main>
</div>
```

"Saved." after the post is the toast from recipe 1, not something drawn in the
page. An error on a field: `aria-invalid="true"` on the control and a
`.field-error` under it. A standing problem with the page (a domain that will
not verify): `.alert alert-danger`. A destructive action: `.btn btn-danger`,
asking first with `data-confirm-*` and naming what goes.

## Recipe 3: an empty state, a refusal, a 404

One shape for all three. It always carries its action.

```html
<div class="card">
  <div class="empty-state">
    <p class="empty-state-title">No cards yet</p>
    <p>Make the first one and assign it to a teammate.</p>
    <a class="btn btn-primary" href="/cards/new">New card</a>
  </div>
</div>
```

The button says "New card" because that is the title of the page it opens: one
word per thing. An empty LIST inside a page keeps its own titled card, so the
page has the same cards whether or not they are empty, and says "No X yet."
plus the next step:

```html
<div class="card">
  <div class="card-head"><div class="card-head-text"><h2 class="panel-title">Domains</h2></div></div>
  <div class="empty-state"><p>No domains yet. Add one above and we'll show the two DNS records to set.</p></div>
</div>
```

A filtered list that comes back empty: "No leads match this filter." and a
"Clear filters" link to the bare list.

A page without a session (a refusal, sign-in, a link someone opened, a
storefront) wears `.app-shell app-shell-plain` minus the nav: an
`.app-header` (brand, `.spacer`, `.nav-theme-toggle`) as the shell's first
child, drawn as the nav card's bar across the top, then the `.app-main`
column, centred under it, with the page head and the content. The bar is
`renderPlainHeader` in `src/shell.js` (`plain_header.html` in `dist/shell/`):

```html
<div class="app-shell app-shell-plain">
  <header class="app-header">
    <a class="nav-brand" href="/">…both logos…</a>
    <span class="spacer"></span>
    <button class="nav-theme-toggle" type="button" aria-label="Toggle light or dark theme">…</button>
  </header>
  <div class="app-main">
    <div class="page-head form-narrow">…</div>
    <main class="form-narrow">…</main>
  </div>
</div>
```

## Recipe 4: a marketing page

The bar nav, the hero band, sections, and the closing call.

```html
<nav class="nav" data-nav="bar" id="site-nav" aria-label="Site">
  <a class="nav-brand" href="/">…both logos…</a>
  <div class="nav-panel" id="site-nav-panel">
    <ul class="nav-list">
      <li class="nav-item"><a class="nav-link" href="/support">Support</a></li>
    </ul>
  </div>
  <div class="nav-utility">
    <a class="btn btn-secondary btn-sm" href="/signin">Sign in</a>
    <button class="nav-theme-toggle" type="button" aria-label="Toggle light or dark theme">…</button>
  </div>
  <button class="nav-toggle" type="button" aria-controls="site-nav-panel" aria-expanded="false" aria-label="Menu">…</button>
</nav>

<header class="hero-band">
  <div class="container hero-split">
    <div>
      <p class="eyebrow">Photo albums on a tag</p>
      <h1>Tap. Add a photo. Done.</h1>
      <p>…one sentence…</p>
      <div class="cluster"><a class="btn btn-primary btn-lg" href="/signup">Start an album</a></div>
    </div>
    <div class="hero-visual">…</div>
  </div>
</header>

<section class="section">
  <div class="container">
    <h2 class="section-title">How it works</h2>
    <div class="feature-grid">
      <div class="feature-card"><span class="feature-num">1</span><h3 class="feature-title">…</h3><p class="feature-desc">…</p></div>
    </div>
  </div>
</section>

<section class="section section-alt final-cta"><div class="container">…</div></section>
```

## Recipe 5: a transactional email

A mail is data. The renderer owns the tables, the inline styles, dark mode,
Outlook, escaping and the plain-text part; a template owns words and links.

```ts
import { renderEmail } from "@nfccool/design/email.js";

export function albumDeletedMail(m: { albumTitle: string; deletedBy: string; purgeDay: string; restoreUrl: string }) {
  return renderEmail({
    assetBaseUrl: "https://moments.example.com/email/", // hosts wordmark-on-light.png + wordmark-on-dark.png
    preheader: `Any owner can restore it until ${m.purgeDay}.`,
    heading: "Your album was deleted",
    blocks: [
      { type: "quote", text: m.albumTitle },
      { type: "text", text: `${m.deletedBy} deleted it. It is hidden now and will be erased for good on ${m.purgeDay}.` },
      { type: "button", label: "Restore the album", href: m.restoreUrl },
      { type: "link-fallback", href: m.restoreUrl },
      { type: "note", text: "After that date the memories, media and comments are permanently deleted." },
    ],
    footer: {
      product: "Moments by NFC.cool",
      reason: "You got this because you own this album.",
      links: [{ label: "Terms", href: "https://moments.example.com/terms" }, { label: "Privacy", href: "https://moments.example.com/privacy" }],
    },
  }); // → { html, text }: send both as multipart/alternative
}
```

The blocks: `text` (a string, or runs: `["Restore it ", { text: "here", href }]`,
`{ text, strong: true }`), `button`, `link-fallback` (`label` to translate
"Or copy this link:"), `note`, `quote`, `divider`, and for account mail
`intro` (16/26 opener), `footnote` (14/21 muted closer) and
`store-badges: { ios, android }` (needs `assetBaseUrl`; the option
`storeBadges: { ios, android }` appends it last). Options: `lang`, `dir`
(`"rtl"` flips every side), `fontBaseUrl`, `title`, `brand: { name, wordmark: false, href, logo, showName }`,
`footer: { product, reason, address, links }`.

- **One button.** Put `link-fallback` right after it for any link that signs
  someone in or resets something; the plain text does not repeat it.
- **Links are http(s) or mailto.** Anything else throws a `TypeError`, so a
  bad link fails the send loudly instead of shipping a dead button.
- **Host the two PNGs** from `@nfccool/design/email/` at a stable public https
  folder and never delete an old one. No `assetBaseUrl`, or
  `brand: { wordmark: false }`, gives a text header.
- **A product's own logo**: `brand: { name: "Moments", logo: { src, srcDark,
  width: 40, height: 40, alt: "" } }` puts the product's app icon (2x PNGs it
  hosts itself, absolute http(s)) with its name beside it in place of the
  wordmark; `showName: false` shows the icon alone. Keep the footer's
  `product: "Moments by NFC.cool"`.
- **The brand face**: host `titillium-web-{400,600,700}-latin.woff2` in one
  https folder and pass it as `fontBaseUrl` (Django: `email_font_base` in the
  context, ending in `/`). The rules sit behind Outlook's `<!--[if !mso]>`
  guard, so Outlook for Windows keeps its system font instead of Times New
  Roman, and links get `font-kerning: none`. Unset, the system stack stays.
- **Django** (no Node): vendor `dist/email/django/` as `templates/nfccool_email/`
  and `dist/email/*.png` into static files, then

  ```django
  {% extends "nfccool_email/layout.html" %}
  {% block preheader %}This link works once and expires in an hour.{% endblock %}
  {% block heading %}Set a new password{% endblock %}
  {% block content %}
    {% include "nfccool_email/text.html" with text="Tap the button to choose a new password." %}
    {% include "nfccool_email/button.html" with label="Choose a new password" href=reset_url %}
    {% include "nfccool_email/link_fallback.html" with href=reset_url %}
  {% endblock %}
  {% block footer_reason %}You got this because someone asked to reset the password for this address.{% endblock %}
  ```

  with `email_title` and `email_asset_base` (absolute, ending in `/`) in the
  context, plus `email_font_base` for the brand face. Besides the block
  partials above there are `intro.html`, `footnote.html` (both `with text=`)
  and `store_badges.html` (`with ios_url=… android_url=…`, PNGs from
  `email_asset_base`). `gap=` on an include overrides the space above a block. Keep a
  `.txt` template beside it for the plain part.
- **Review it**: `npm run email:shots -- <dir>` renders the guideline examples
  in both schemes at 390 and 800px.

## Wiring it in each consumer

**MomentoMarks (Astro).** `layouts/AppShell.astro` IS recipe 1 and 2: a page
passes `title`, `current`, an optional `backHref`/`backLabel` for the crumb,
`nav={…}` (the session), and `narrow` for a form page. A narrow page puts
`class="form-narrow"` on its own `<main>`; a list page puts nothing. The
page's `<style>` holds layout for its own tiles and nothing else; the guards
in `apps/web/test/` fail a page that restates a surface, a colour or a
length. `Base.astro` imports the four layers, inlines `theme.js`, loads
`nav.js`.

**business_card_service (Django).** `base_dashboard.html` is recipe 1 with
these renames: `.console` is `.app-shell`, `.sidebar` is `nav[data-nav="side"]`,
`.sidebar-menu` is `.nav-panel`, `.main` is `.app-main`, `.me` sits in
`.nav-utility`, `.console-plain` is `.app-shell-plain` (recipe 3). The
dashboard's own CSS then keeps only what no other product has (the org switch,
the card preview).

**Keel (Vapor, no npm).** The status page is recipe 1 from the vendored full
bundle. Its mail uses `dist/email/swift/`, vendored as
`Server/Resources/Email/`: `layout.html`, one `blocks/<type>.html` per block
and `gaps.json`, plus the four PNGs in `Server/Public/email/`. Generated from
`src/email.js` by `build/emit-email-swift.mjs`, so it cannot drift from the
Django or JavaScript mail. Keel fills by plain string replacement: `{{name}}`
is a value it has already HTML-escaped, `{{{blocks}}}` is raw. A block file is
one table row with `{{gap}}` (read `gaps[previousType][type]`, `"start"` for
the first block; types use hyphens, files underscores) and `{{text}}`,
`{{label}}`/`{{href}}` or `{{ios_url}}`/`{{android_url}}`/`{{asset_base}}`.
Join the rows with `"\n"`. Keel must check links are http(s) itself and write
its own plain-text part.

The licence pages' shell is generated the same way: `dist/shell/swift/`
(from `src/shell.js` by `build/emit-shell-swift.mjs`) vendored as
`Server/Sources/KeelServer/Licences/Resources/Shell/`, bundled with the target
and filled by `KitShell` with the mail's filler. `side_nav.html` takes
`{{{destinations}}}` (rows of `nav_link.html` / `nav_link_current.html`, joined
with `"\n"`) and `{{{account}}}` (`nav_account.html`, the address alone, or
`nav_account_link.html` with an account page); `plain_header.html` is recipe
3's bar. The header comment of `build/emit-shell-swift.mjs` lists every
placeholder. Keel writes no nav or bar markup of its own, so the foot's order
and classes change here and reach Keel with the next vendoring.

**The shell in Django.** `dist/shell/django/` is the same six files as
includes (`{{ name }}` variables, `{% csrf_token %}` in the sign-out form, the
destinations and the account as `{% include destinations_template %}` /
`{% include account_template %}`). The console does not use them yet: its
sidebar is `.sidebar`/`.me`/`.theme-switch`/`.sidebar-legal` from its own
`dashboard.css`, so adopting them means vendoring `dist/design.css` and moving
its nav onto the kit's classes first.

**nfc-cool-website (SiteKit).** Recipe 4, with the vendored `dist/design.css`.

## Before you ship a page

- Walk it at 375, 768, 900 and 1200 px. The nav is a bar, a rail, a rail, a
  column; the page head's actions drop under the title below 600.
- Both themes, via the switch AND via the system setting.
- `dir="rtl"` on `<html>`: nothing is pinned to a physical side.
- Tab through it: one focus ring, the burger announces `aria-expanded`, the
  active destination is `aria-current="page"`.
- `npm test` here and the consumer's guards there. Green means it is the
  system's page.
- `npm run layout:check -- <url>` (below) against the running page.

## Checking a page against the system

`build/layout-check.mjs` opens a page in headless Chrome beside the kit's own
reference page and compares what the two share, by computed style and DOM
order, in both themes: the nav's order and its foot's, the avatar's colours
and size, the account line, `.card`, `.card-head` and `.card-foot` spacing, a
card's buttons outside its `.card-foot` or a foot that is not the card's last
child, every button by its classes in its place (card foot, list row, copy
box, sign-in column…) and by its computed size and colour, a read-only input
used as a copy box, and the sign-in column's width, h1, lead, label, input,
hint and button. A page's own content is never compared.

```sh
node build/emit-guideline.mjs        # writes site/reference-console.html and site/reference-sign-in.html
node build/layout-check.mjs http://localhost:8099/business/licence
node build/layout-check.mjs https://keel.example/business/licence --cookie 'keel_licence_session=…'
node build/layout-check.mjs page.html --reference console --width 1280 --json
```

A side nav picks the console reference (recipe 1 around recipe 5's cards), a
plain shell the sign-in one (recipe 3); `--reference` overrides it. A
signed-in page needs its session cookie. It prints one line per difference,
`part.property: reference → page`, with `[light]` or `[dark]` when only one
theme differs, and exits 1 on any difference (0 when there is none, 2 when it
could not run). Margins, padding and gaps are compared by their computed
value, so a `.card-foot`'s `margin-block-start: auto` is `auto` on both sides
whatever room its card has. Set `CHROME` if Chrome is not in
`/Applications`. `test/shell.test.mjs` runs it on the references and on
drifted copies of them.

## Recipe 5: an account or billing page

What a signed-in owner manages about one thing they pay for (a team's billing,
a licence): the business console's billing page, assembled. The page states no
width: the shell owns it. Every button of a card is in its `.card-foot`.

Order the cards by whether they can grow:

1. Cards of a FIXED size (the plan, the seats, a link) come first, in PAIRS in
   `.grid-2` (one column on a phone; the two cards of a row end on one line).
   A fixed card without a partner takes a full row.
2. Cards that GROW with data (devices, members, invoices) come last, each a
   full-width row of its own, one under the other. Never pair a list with a
   fixed card: the row stretches to the list and leaves the neighbour mostly
   empty (Nico, Keel's licence page 2026-11-21: "let them grow independently
   without creating empty space in the neighbor box").

```html
<main class="stack">
  <div class="grid-2">
    <div class="card">
      <div class="card-head"><div class="card-head-text"><h2 class="panel-title">Licence</h2></div><span class="pill pill-success">Active</span></div>
      <dl class="facts">
        <div><dt>Seats in use</dt><dd>3 / 5</dd></div>
        <div><dt>Paid until</dt><dd>31 Dec 2026</dd></div>
      </dl>
      <div class="card-foot">
        <form method="post" action="/cancel" data-confirm-title="Cancel this licence?" data-confirm-detail="It works until 31 Dec 2026." data-confirm-action="Cancel licence">
          <button class="btn btn-danger btn-sm" type="submit">Cancel licence</button>
        </form>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-head-text">
        <h2 class="panel-title">Change seats<button type="button" class="info-tip" aria-label="About Change seats" aria-describedby="tip-seats">…circle and i…<span class="info-tip-bubble" id="tip-seats" role="tooltip">Added seats are charged now; removed seats are credited.</span></button></h2>
      </div></div>
      <form class="stack" id="seats" method="post" action="/seats" data-confirm-tone="primary" data-confirm-title="Change the seats?" data-confirm-action="Change seats">
        <div class="stepper">
          <button type="button" aria-label="One seat fewer"><svg …><path d="M5 12h14"/></svg></button>
          <input type="number" name="seats" inputmode="numeric" min="3" value="5" aria-label="Seats">
          <button type="button" aria-label="One seat more"><svg …><path d="M12 5v14M5 12h14"/></svg></button>
        </div>
        <p class="field-hint">3 in use, so 3 is the lowest.</p>
      </form>
      <div class="card-foot"><button class="btn btn-primary btn-sm" type="submit" form="seats">Change seats</button></div>
    </div>
  </div>
  <div class="card">…a fixed card without a partner: head, sentence, then .card-foot…</div>
  <div class="card">…devices: the first list, full width…</div>
  <div class="card">
    <div class="card-head"><div class="card-head-text"><h2 class="panel-title">Payment and invoices<button type="button" class="info-tip" …>…</button></h2></div></div>
    <ul class="list-rows">…one row per invoice, its own action at the row's end…</ul>
    <div class="card-foot"><a class="btn btn-secondary btn-sm" href="…">Payment method</a></div>
  </div>
</main>
```

The rules this recipe exists for, each one a fix someone had to ask for:

- A card's buttons are in its `.card-foot`, never in the head, never between
  its sentence and its content. A row of a list keeps its own action at the
  row's end (`.list-row-action`).
- A number of seats is `.stepper`, never a bare number input in an
  `.input-group`.
- Every form whose post comes back to the same page carries
  `data-keep-scroll`, so saving, renaming or freeing a seat lands where the
  person was instead of at the top, and redirects carry no `#fragment`, which
  would scroll on its own.
- A list row is never edited in place. Renaming a row (or any one small
  value) is the kit's form dialog: `.dialog` rendered `open` with
  `data-open-on-load`, its field between the text and the actions, Cancel a
  link back to the page. The row's menu links to the page with the dialog
  (`?rename=<id>`), so it works without script, and carries
  `data-open-dialog` plus the row's values, so with script it opens in place
  and the page does not move.
- A value shown to be copied (a link, a token) is `.copy-value` with a
  `btn-secondary btn-sm` Copy inside, never a read-only `.input` in an
  `.input-group`: that reads as a field to type into.
- Status is a `.pill` in the head, never a row of the facts.
- A card's explanation (what it does, a rule read once, what a press costs)
  is an `.info-tip` beside its `.panel-title`, never a `.sub` sentence under
  it. A `.sub` in a card head is only for status, data, or the reason
  something is blocked ("This link was made before…", "The licence ends on
  …"), and so is anything with a link in it, which a bubble cannot hold.
- Card actions are `btn-sm`: the card's main one `btn-primary`, others
  `btn-secondary`, a destructive one the outlined `btn-danger`.
  `btn-danger btn-quiet` is only for a destructive action at the end of a list
  row; in a card it reads as loose text.
- Cancelling sits in the plan card's foot, asks first and names the date it
  ends; once cancelled, the same place offers to keep it.
