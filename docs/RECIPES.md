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
   never with a back arrow in the bar. A page one level down carries a crumb
   above its title.
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
        <div class="nav-theme-switch" role="group" aria-label="Colour theme">
          <button type="button" data-theme-set="light" aria-pressed="false">…sun svg…<span>Light</span></button>
          <button type="button" data-theme-set="dark"  aria-pressed="false">…moon svg…<span>Dark</span></button>
        </div>
        <button class="btn btn-ghost btn-sm" type="button">Sign out</button>
        <button class="btn btn-ghost btn-sm" type="button" data-nav-collapse aria-label="Collapse navigation">…svg…</button>
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
<script type="module" src="/assets/design/nav.js"></script>
```

What the page may add: the rule that arranges ITS tiles (a `grid-template-
columns` on its own list, stepping 2, 3, 4 across at 768 and 900). Nothing
about the card, the head, the nav or the gutter: the shell owns the gutter,
and `main` states no width and no inset.

The order inside the nav is not negotiable: brand, theme icon, burger, panel.
The panel holds the destinations AND the utilities, so on a phone they fold
together and on a desktop the utilities sit at the foot of the column. (The
bar mode is the opposite: its utilities sit OUTSIDE the panel, before the
burger, so Sign in stays visible on a phone.)

## Recipe 2: a console page with a form

Same shell. The page head and the cards share `.form-narrow`, the system's
reading measure centred in the column, so a label on a wide screen is never a
foot away from its control. A page one level down carries the crumb.

```html
<div class="app-main">
  <div class="page-head form-narrow">
    <div class="page-head-text">
      <a class="crumb" href="/cards"><svg …><path d="M15 5l-7 7 7 7"/></svg>Cards</a>
      <h1>Card settings</h1>
      <span class="sub">Changes go live as soon as you save.</span>
    </div>
  </div>

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

    <div class="alert alert-success" role="status"><span><b class="alert-title">Saved.</b> Your card is live.</span></div>
  </main>
</div>
```

An error on a field: `aria-invalid="true"` on the control and a `.field-error`
under it. A page-level failure: `.alert alert-danger`. A destructive action:
`.btn btn-danger`, behind a confirmation that names what goes.

## Recipe 3: an empty state, a refusal, a 404

One shape for all three. It always carries its action.

```html
<div class="card">
  <div class="empty-state">
    <p class="empty-state-title">No cards yet</p>
    <p>Create your first card and assign it to a teammate.</p>
    <a class="btn btn-primary" href="/cards/new">Create a card</a>
  </div>
</div>
```

A refused render (no session, not a member) wears the same `.app-shell` and
`.app-main` column, minus the nav: put an `.app-header` (brand, `.spacer`,
`.nav-theme-toggle`) at the top of the column so the logo and the theme
control are still there, then the page head, then the empty state.

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
"Or copy this link:"), `note`, `quote`, `divider`. Options: `lang`, `dir`
(`"rtl"` flips every side), `title`, `brand: { name, wordmark: false, href, logo, showName }`,
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
  context. `gap=` on an include overrides the space above a block. Keep a
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
`.nav-utility`, `.console-plain` is a refused render (recipe 3). The
dashboard's own CSS then keeps only what no other product has (the org switch,
the card preview).

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
