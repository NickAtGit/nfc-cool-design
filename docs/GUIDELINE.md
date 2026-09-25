# The NFC.cool Design Framework

One system, three web properties: the marketing site (`nfc-cool-website`), the
business card service (`business_card_service`), and MomentoMarks.

The rule the whole thing hangs on is **same skeleton, own accent**. Layout,
spacing, typography, component shapes and motion are identical across brands.
Colour is the only thing a brand owns.

---

## The four layers

| Layer | File | Owns | May contain a literal |
|---|---|---|---|
| 1. Primitives | `src/tokens.css` | space, type ramp, tracking, measures, radius, elevation, motion, focus ring | no colour, no typeface |
| 2. Brand | `src/brands/<id>.css` | colour, typeface, gradient | yes, this is where literals live |
| 3. Components | `src/components.css` | buttons, form controls, surfaces, data, feedback, overlay, header tiers | no |
| 4. Archetypes | `src/archetypes.css` | the marketing sections | no |

Layers 1, 3 and 4 are brand-neutral. A second brand is a new file in
`src/brands/`, selected with `data-brand` on `<html>`. It is never a fork.

**Layers 1 and 2 are generated.** `src/tokens.json` is the source of truth;
`build/emit-css.mjs` writes `tokens.css`, every `brands/*.css`, `email.css` and
`email/palette.js`.
Editing those outputs by hand is a drift bug and `npm test` fails on it.

---

## Rules

1. **No literal colour outside layer 2.** A hex or `rgba()` in a component means
   that component cannot be re-skinned, which is how a shared system dies.
2. **No length above a hairline outside the scale.** Borders and CSS triangles
   may be raw px. Everything else uses `--space-*`, `--radius-*` or a `clamp()`
   already in the ramp.
3. **Four breakpoints.** `sm 600`, `md 768`, `lg 900`, `xl 1200`. `min-width`
   uses the value, `max-width` uses the value minus one. Nothing else.
4. **Never darken a brand colour to pass a contrast check.** Brand values are
   fixed by the app icon and the store listings. Carry the text instead: a
   shadow, a scrim, or a different foreground. Only non-brand colours are free
   to move.
5. **Every colour token exists in both themes.** A token defined only in light
   silently inherits the wrong value in dark.
6. **Contrast is a test, not a review note.** Body text 4.5:1, non-text
   indicators and large text 3:1, asserted for every pair in
   `test/contrast.test.mjs`.
7. **Dark mode is `[data-theme]`, resolved before first paint.** One
   `localStorage` key, one attribute, one synchronous head script. Never
   `prefers-color-scheme` in a component rule. The script is `src/theme.js`,
   inlined in `<head>`; it also drives the nav's theme controls and records the
   focus modality (`data-focus`). Consumers do not write their own.
8. **Logical properties everywhere.** `margin-inline`, `inset-inline-start`,
   `border-inline-start`. Arabic is a shipping locale, not a future problem.

---

## The decisions this system encodes

**The mode flip is deliberate.** Interactive elements are brand blue in light
mode and brand yellow in dark. Yellow is never text on a light surface. This is
the existing site's behaviour, kept, and made to pass.

**`--color-link` and `--color-link-text` are different tokens.** The first is the
interactive hue for borders, chevrons, icons and hover fills, where 3:1 is the
bar. The second carries actual link text, where 4.5:1 is. On the live site one
token does both jobs at 3.99:1, and its hover state is *lighter* at 2.60:1, so
hovering a link today makes it harder to read.

**The brand gradient is the app's, and the shadow is how it is carried.**
`#1A60CE → #128CF0`, dark at the top and light at the bottom, is the iOS app's
`appThemeGradient`. The web band matches what the product actually renders.

Four other definitions exist and none of them is canonical:

| value | where it lives | why not |
|---|---|---|
| `#137BD9 → #00A2F3` | the website until now | same family, lighter; white fails at the bottom |
| `#00A2F3 → #137BD9` | `NFC_Gradient.png` in the manual | the same colours mirrored; reads as oriented for a square logo frame, not a wide band |
| `#3878D1 → #45A1ED` | the dashboard, auth pages and all six emails | the manual's two flat *palette swatches* ramped together, which is not the brand gradient |
| `#4074B9` | every icon SVG in the manual | **retired.** Not a brand colour. Icons reused from the manual take `--color-link` or `currentColor` |

White clears AA at the top stop and stays above the large-text floor at the
bottom, so `--on-brand-text-shadow` carries body copy over the lower half. The
gradient and its compensation are both tokens and travel together;
`test/contrast.test.mjs` pins them, so changing either is deliberate.

**The interactive colours are the gradient stops themselves.** Not tints derived
from them. `--color-link-text` is the dark stop at 5.38:1 on the page, which is
what body-copy links need. `--color-link` is the light stop at 3.22:1, used only
where 3:1 is the bar: borders, chevrons, icons, hover fills. One control uses one
blue: an outlined button takes the dark stop for both its border and its label.

**The filled primary is the light stop with a white label**, `#128CF0` with
`#FFFFFF`. That measures 3.48:1, under the 4.5 a 15px label needs, and is a
deliberate brand decision **recorded as a pinned exception** in
`test/contrast.test.mjs` rather than shipped silently. `#0F78CE` is the nearest
shade of the same blue where white clears 4.5 at rest, if it is revisited.

**Blue as an area is the light stop; blue as text is the dark stop.** That one
sentence settles every button. On a button the blue is always a fill or a
border, never the label, so a button's blue is always `#128CF0`: the filled tier
fills with it, the outlined tier borders with it, and both look like the same
control family. The outlined label is ink, not blue - a blue label beside a blue
border puts two blues on one control, and the light stop is only 3.48:1 as text.
A border is a UI boundary and needs 3:1, which it clears at 3.48. The ghost tier
has no border, so its label carries the affordance and takes the dark stop, like
an inline link.

**Its hover darkens.** White on the resting fill is 3.48:1, which is a recorded
exception; hover takes it to 4.70:1, so the state a person is actively pointing
at is the compliant one. The rule the test enforces is not a direction but an
outcome: hover must never make the label harder to read. In dark mode, where the
primary is brand yellow with a near-black label, that same rule makes hover
brighten instead.

**There is a filled primary button.** The marketing site has none: its primary
CTA is an App Store badge, which works only when the conversion is leaving for
the store. It has no answer for Save, Invite, Delete or Save Contact, and
business_card_service filled that vacuum with five different button designs.
Store badges remain the marketing hero's primary CTA.

**No control sits on top of the media it acts on.** A thumbnail's ✕, hung off
its corner, is the one control with nowhere to come from: it is smaller than the
smallest button, rounder than the roundest radius, and positioned with
`top`/`right`, which Rule 8 does not allow. It also covers the artwork the
person is trying to judge. The actions for a piece of media belong in the
**header row of the block that owns it** — the same `justify-content:
space-between` row a page header already uses for its actions — or, where one
block holds two thumbnails and a single header could not say which it meant, in
each slot's own action row. business_card_service's `.mark-clear` was the whole
population of this anti-pattern and was removed on 2026-09-08.

**A destructive action has two volumes, and the quiet one is the default when
it shares a row.** Full `.danger` — a red border and a red label — is right when
the action stands alone and the person came to do it. Beside the control it
undoes, it is wrong: "Remove" next to "Replace" at equal weight reads as its
peer, and the red one is the loudest thing in the row when it is the one you
rarely want. The quiet tier keeps the word and drops the box, and takes its
border and colour back the moment a pointer or the keyboard arrives. Its resting
label still owes 4.5:1 — quiet means no border, not grey text: a hint colour on
a control is a contrast failure, not a style.

**A form control's height must not depend on its line-height.** WebKit ignores
`line-height` on a single-line text input and uses the font's natural line box
instead; every other engine honours it. Size an `.input` and a `.select` by
leading alone and the two stand at different heights in Safari while measuring
identically in Chrome, which is a bug you cannot see on the machine you are
building on. Either declare the height, or keep `--leading-normal` at the
typeface's own natural leading, which is why 1.55 is safe for Titillium's 1.52
and why moving it is not a free change. The rule this system follows is that
`.input`, `.textarea` and `.select` are sized by **one shared declaration** and
nothing later gives any of them a different padding, height, font size or
leading; `test/guards.test.mjs` asserts it.

**A line box that does not fit its content box cannot be centred in it.** It
starts at the top of the content box and overflows the bottom, so the text
reads low. This is the failure a fixed height invites: a control 42px tall with
12px of padding leaves 16px of content box, and a 16px font at 1.55 needs 24.8.
Whenever a height is declared, the content box has to be at least the line box,
and at least the font's natural line box too, because WebKit will use that one
for a text input whatever the leading says. The symptom is subtle enough to be
mistaken for a font problem: it presents as a select whose label sits a pixel
low, because a select's box is the widest and emptiest place to notice it.

**`:focus-visible` matches a mouse click on a `<select>`.** It is not a
Chrome bug: a select stays keyboard-operable once focused, so the UA is right
to indicate focus. It does mean `:focus-visible` cannot express "ring on Tab,
nothing on click" for a dropdown, which a button gets for free because a button
does not keep focus on click at all. A select also stays focused after you pick
from it, so a focus ring outlives the choice and sits glowing on a control
nobody is looking at. Where that matters, record the modality on the root
(`data-focus="pointer" | "key"`, set from `pointerdown` and a `Tab` keydown) and
let the pointer state colour on `:hover` only. Do not reach for it on text
fields: you need to see where you are typing.

**Selected is a brand fill, not ink.** Blue as an area is the light stop, so a
chosen filter capsule fills with the same value the filled button does and the
two read as one control family; in dark that flips to the brand yellow with a
near-black label, the same mode flip everything else makes. An ink fill makes
the one selected thing on a page look switched off.

**A colour literal that must not follow the theme is allowlisted, not
forgotten.** Rule 1 forbids literals outside layer 2, but a handful genuinely
cannot be tokens: a white label on a colour the *customer* picked, the two
fixed grounds a logo preview exists to demonstrate, and a vendor's own control
such as Apple's `#007AFF`. Those are listed with their reason in the consuming
project's guard test, so a new literal fails the build instead of quietly
joining them.

**One nav component, two modes.** A nav is a list of destinations plus a
utility cluster laid out along an axis, and the axis is the only thing the mode
changes: `data-nav="bar"` for the marketing header, `data-nav="side"` for the
product console. Link shape, active state, focus, fold mechanics and the
toggle button are written once.

The side mode is the business console's shell, taken from the live console on
2026-09-22 so a consumer inherits it rather than rebuilding it: a floating
card that sticks at the gutter beside the page column. Three states on the
four breakpoints: the full column with labels at `xl` and up, a stacked rail
from `md` to `xl` with each label under its icon, and below `md` a sticky bar
(brand, theme icon, burger) whose burger drops the panel under it as its own
card. A dropdown, not a drawer: a panel that opens where the thumb already is
beats one that slides in from an edge, and it needs no scrim. `.is-collapsed`
forces the icon rail at any width, which is how a person collapses the sidebar
themselves; the choice persists in `localStorage`. The page's own name is not
in the bar: it is a `.page-head` at the top of the content.

**This supersedes a written decision.** `business_card_service`'s
`docs/superpowers/specs/2026-09-02-team-product-refocus-design.md` chose
Direction B with a permanently dark `#161B22` sidebar. The sidebar follows the
theme instead, so the console obeys one palette rather than carrying a second
dark surface family that has to be kept in contrast on its own. If that spec is
revisited, this is the newer decision.

**Three header tiers, not one.** `.hero-band` for marketing landings,
`.hero-strip` for blog and secondary pages, `.app-header` for product UI and
card pages. A gradient band above a data table is marketing intruding on work.

**The brand yellow is `#FFC700`.** The Secondary Logo SVG's value in Brand
Manual V1, chosen over the `#FFC709` the website shipped; the logo is the source
the wordmark derives from, so it arbitrates. In light mode the yellow is only
ever the wordmark tail and the decorative numeral watermark. It is never body
text: it measures 1.45:1. In dark mode it becomes the interactive colour outright
at 11.06:1, which is what makes the mode flip work.

**The script brand tail is an accepted contrast exemption.** `.brand-tail`
renders the brand name, and WCAG 1.4.3 exempts text that is part of a logo or
brand name. It measures 1.45:1 and that is allowed. It is one token
(`--color-brand-tail`) so the call can be revisited, and `test/contrast.test.mjs`
pins it so a change is deliberate. **Do not copy this pattern onto ordinary
text.**

**The wordmark in running text** (a footer's "Moments by NFC.cool", a
signature line) is the same markup, `<span class="brand-name">NFC<em
class="brand-tail">.cool</em></span>`, linked to nfc.cool and set about 1.4em
of the line around it. nfc.cool uses it in headings only; at footer size the
tail's 0.78em comes out near nine pixels and stops reading as ".cool". Related: the live CSS carries a comment explaining that the feature
numeral's `text-shadow` exists so "axe measures the glyph against the shadow,
not the card". That numeral is genuinely decorative and always `aria-hidden`,
so it is fine, but the technique is not a contrast strategy.

**Motion stays small.** One duration, one gesture, three lift distances. No
scroll animation and no reveal-on-scroll. The FAQ answer unfolding when a
person opens its card is the one entrance animation, and it runs on the same
duration. Under `prefers-reduced-motion` all three lift tokens collapse to zero
and the unfold is switched off.

---

## Narrow viewports

Settled 2026-09-10, working through the business console on a 340px screen. Every
one of these started as "the phone layout is cramped" and turned out to be a rule
that holds at every width.

**A control has one height.** 42px, buttons and fields alike. A narrow screen is
not a reason to shrink a control, and a touch target is not a reason to invent a
new number: the console had a 32px `select-inline` with no small-screen override,
so its filter rows were the hardest things on the page to hit, and the fix was to
stop overriding the height rather than to add a 44px one. The same pass found a
40px hex field, the only 40px control in that file, sitting 2px short of the
swatch beside it. If a component sets its own height, that is the bug.

**The gutter grows on a narrow screen. It never shrinks.** The instinct is to
claw back width by tightening the page edge, and it is backwards: content flush
to the frame is what reads as cramped, more than any density inside it. Take the
space off card padding instead. The page needs its frame more than a card needs
its inset.

**A list's right edge comes from a fixed trailing control, not from shared
tracks.** Rows are independent grids, so nothing lines up between them however
carefully the widths inside one are picked. Subgrid looks like the answer and was
tried first: make the list the grid, let each row inherit its tracks. It does not
survive contact, because the parent's tracks are only as good as the items that
size them, and in a list every child spans the full width -- the toolbar, the
header row, the rows themselves. Nothing occupies column two on its own, so its
`auto` track gets sized by those spanning items and comes out arbitrary; measured
once at 161px of empty space with a pill floating in it. What actually gives a
list its edge is the trailing control being a fixed size, 32px for a row menu,
with each marker pushed against it by `justify-self: end`. That needs no shared
tracks at all, and it is the right edge people read down.

**Any track holding a form control wants `minmax(0, 1fr)`.** A bare `1fr` is
`minmax(auto, 1fr)`, and that `auto` floor is the item's min-content size. A
number input left to size itself asks for about 327px at 32px bold, so the track
refuses to shrink, the grid overflows its own box, and whatever sits after it is
pushed outside. The element's own computed width still reads as correct, which is
what makes this one hard to see.

**`overflow: hidden` turns an overflow into a disappearance.** Added for rounded
corners on a grouped control, it silently ate the `+` button off the end of a
stepper for a whole afternoon. It hides the symptom, not the cause: if something
is missing from a container that clips, suspect the track sizing before the
markup.

**A setting that is on or off is a switch.** A checkbox is for picking members
of a set; a switch is for turning one thing on. Three checkboxes at the foot of a
card, each explaining itself behind a hover mark, were the controls that decide
what a whole team may change on their own cards. As switches with their
consequence on the line beneath, the row reads as a statement with its state
beside it. Paint the switch from the checkbox rather than replacing it, so the
form, the keyboard and the screen reader are untouched, and give the knob its own
token: it stays light on a filled track in both themes, which neither the card
colour nor the button's foreground does. That is `.switch` and `.switch-row` in layer 3
now, with `--switch-knob` in the brand; the console's local copy is retired.

**Copy follows the control.** The moment those checkboxes became switches,
"Each person ticked gets a push" was describing something that no longer existed.
A control's name in prose is part of the control.

**A tooltip inside a `<label>` can never open on tap.** The label's activation
behaviour runs on the click, focus moves to the field it labels, and the bubble
closes in the same gesture that opened it. It looks like a CSS problem and is
not. `preventDefault()` on the mark's own click stops the label activating, and
the mark keeps the focus the bubble depends on.

**Frame a popup by the container that has width, not by its trigger.** An 18px
mark is a hopeless anchor: anchored left the bubble runs off the right edge,
centred it runs off the left for a mark early in a row, and no `max-width` can
clamp it because the trigger's x is unknown to CSS. Take the trigger out of the
positioned chain and pin the bubble to the card's padding instead. It then cannot
leave the card whatever the trigger's position, with no number to guess. Keep the
block axis at the trigger's static position so it still opens where it belongs.

**A read-once explanation folds; an answer to the question on screen does not.**
The line that tells someone what a control will do to their team is not a
footnote, it is the label's other half. Fold only what is read once, like the
accepted file types before a first upload.

**Say a number once per screen.** Two cards forty pixels apart, each stating
"11 of 10 seats used", read as two different figures at a glance; on a phone they
land almost on top of each other. The same went for a card count in a page head
and again in the toolbar beneath it.

**An empty state carries its action.** "No cards yet. Create one to get started"
with nothing to press is a dead end, and it is the first thing a new team sees.

**A button whose only job is to scroll is not a button.** "Invite people" in a
page head, linking to `#invite`, where the invite form is already the first card
on the page. On a phone it cost a full row above the thing it pointed at.

**A media query adds no specificity.** Two rules of equal weight are decided by
source order alone, so a phone rule written in the file's main breakpoint block
loses to any same-weight rule further down the file. A component that defines its
own grid later in the sheet keeps that grid on a phone, and the symptom is a
desktop layout at 340px rather than anything that looks like a cascade problem.
Put a component's narrow-viewport rules after the component, not in the shared
block.

**Never join values with a middot.** `A · B · C` is not a layout. It cannot align
between rows, it strands its separators when a value is missing, and it is one of
the surest signs of a generated interface. Values get columns, or their own line,
or they leave.

**Mark exceptions, not defaults.** A badge reading the expected state on nine rows
out of ten is wallpaper, and it makes the tenth row harder to see, not easier. Put
everything that wants attention in one column and leave that column empty on the
ordinary rows: a list is then read by running down a single edge. A role is not a
status, so the two share the column but not the voice, muted text against a pill.

**Draw glyphs, do not type them.** Titillium Web has no chevron, no midline
ellipsis, no ballot tick, no minus sign. Each one falls back to a different system
face at a different weight and baseline, which is exactly the mismatched look a
type system exists to prevent. Chevrons, dots, ticks and bars come from borders,
`box-shadow` or an inline SVG, and then they inherit `currentColor` and work in
both themes for free.

**A hover-only affordance is not an affordance.** Touch has no hover, and
`:focus-visible` is a keyboard heuristic that does not reliably match a tap. A
disclosure needs `:hover`, `:focus` and `:focus-visible`, all three, because each
answers a different input. An absolutely positioned bubble also needs somewhere to
go on a narrow screen: in flow under its trigger, not anchored to an edge it can
run off.

**A fixed pixel width outlives the viewport that suited it.** Label columns,
image previews and single-purpose fields are where this hides. A 120px label
column leaves 170px for the value on a phone, so an email breaks mid-string; two
fixed 220px previews that wrap become 460px of scrolling. Both were written for a
desktop and neither had a small-screen override. If a width is not a token, ask
what it does at 340px.

---

## Building a page

A page is assembled, not designed: the system owns the shell, the page head,
every surface, control and piece of feedback, and a page owns its content and
the layout of what is unique to it. [RECIPES.md](RECIPES.md) has the complete
markup for the four page kinds every NFC.cool property has (a console list, a
console form, an empty state, a marketing page) and the wiring in each
consumer. Start there.

## Consuming the package

### MomentoMarks (Astro, a dependency)

This repo is public, so the package is installed from GitHub, pinned by commit:

```jsonc
// apps/web/package.json
"@nfccool/design": "github:NickAtGit/nfc-cool-design#<commit>"
```
```js
import "@nfccool/design/tokens.css";
import "@nfccool/design/brands/nfccool.css";
import "@nfccool/design/components.css";
import "@nfccool/design/archetypes.css";   // the marketing pages only
```

pnpm records it as a tarball with an integrity hash, so no build machine needs
git or a token. The `exports` all point at TRACKED files (`src/`); the `dist/`
bundles are for the vendoring consumers only and are not exported, so the
install runs no script. Bumping the pin is how a design change reaches the
web: commit here, push, `pnpm update @nfccool/design` there. Fonts are the
consumer's: this package declares `--font-*` and ships no woff2. The theme
script is inlined in `<head>` from `@nfccool/design/theme.js`; `nav.js` is
loaded as a module.

**One nav, and its utilities stay in the bar.** The bar's markup is brand,
panel (the destinations), utility cluster, then the burger — in that order,
so below 1200px the destinations fold behind the burger while Sign in and the
theme control remain visible, and the burger sits at the inline end. With the
utilities inside the panel the burger sat beside the logo (MomentoMarks,
2026-09-22).

### nfc-cool-website (SiteKit, no npm at build time)

Vendor the CSS into `Theme/css/` and regenerate the theme token block:

```bash
node build/emit-sitekit-theme.mjs > /path/to/nfc-cool-website/Theme/tokens-block.yaml
npm run build
```

The site does not consume the package yet, so it has no `consumers.json` entry.
Add one when it does, and the sync and the drift guard cover it for free.

Two things to know:

- SiteKit generates its own `:root` from `Theme/theme.yaml`'s `tokens:` block
  and inlines it in `<head>`. **That block is generated output.** If the
  vendored CSS also shipped a competing `:root`, the two would fight. The
  package is the source; the yaml is downstream.
- `Sources/Site/Renderers/CSSAsyncLoadProcessor.swift` decides which stylesheets
  are render-blocking by filename. Adding a file means updating that list.

### business_card_service (Django, no npm at all)

```bash
npm run build    # regenerates every layer AND pushes it to every consumer
```

Do not copy the bundle by hand. `consumers.json` records who vendors what, and
`build/sync-consumers.mjs` writes it there as the last step of `npm run build`,
so a change to the system reaches its consumers in the same breath that
produced it. `npm run sync` does it alone; `npm run sync:check` fails without
writing, which is what CI should run.

**Why this exists.** A vendored copy is a copy, and a copy drifts silently:
on 2026-09-07 business_card_service was 1216 bytes behind `dist/`, with nothing
anywhere to say so, because the instruction here used to be a manual `cp`.
`npm test` now fails if a consumer present on the machine has fallen behind.

Three things the sync deliberately does **not** do:

- **It never creates a vendored file**, only refreshes one that is already
  there. Adopting the package is the consuming project's decision, taken with
  `npm run sync -- --adopt`. Without that rule a build in this repo would drop
  an untracked bundle into a checkout that does not use one — which is exactly
  what business_card_service's `main` is, since it still links its own
  `dashboard.css`.
- **It does not fail on an absent consumer.** The suite still passes on a
  runner that has only this repo checked out. `NFCCOOL_DESIGN_CONSUMER_ROOT`
  points the resolver somewhere other than this repo's parent.
- **It does not know which branch is checked out.** A vendored file lives in a
  working tree, so what sync refreshes is whatever that tree currently holds.
  While an adoption is in progress on a branch, that is the branch this
  refreshes — the manifest's `why` says so for each consumer, and keeping it
  honest is part of the entry.


Link it once in `web/home/templates/base.html`, `web/templates/base_error.html`
and `web/vcard_profile/templates/my_profile.html`. Those three templates are
where the four competing `:root` blocks live today.

### Email

**A mail is rendered, not written.** `@nfccool/design/email.js` exports
`renderEmail(options) → { html, text }`. A template hands it a heading, a
preheader, an ordered list of blocks (`text`, `button`, `link-fallback`,
`note`, `quote`, `divider`) and a footer; the renderer owns every table, every
inline style and both colour schemes, and writes the plain-text part from the
same blocks. It has no dependencies and needs no build step, because consumers
install this package from git and run nothing; the types are
`src/email.d.ts`. The guideline's Email page renders real examples in both
themes and documents every option.

**Colour comes from the tokens, as literals.** Mail clients strip custom
properties, so `build/emit-css.mjs` resolves a small role table (page, card,
border, rule, heading, text, muted, link, button, quote) against
`src/tokens.json` for BOTH themes into `src/email/palette.js`, and the same
table writes `src/email.css`. Light values are inline on every element; dark
values are a `prefers-color-scheme` block keyed on classes, repeated under
`[data-ogsc]`/`[data-ogsb]` for Outlook.com. `src/email.js` carries no colour
literal, and `test/email.test.mjs` fails on any colour in a rendered mail that
is not a token value.

**The mail button is the link blue, not the web's filled primary.** Blue as
text is the gradient's dark stop, and a mail button is only ever seen at rest:
there is no hover to lift the web primary's 3.48:1 label to AA. So the mail
button fills with `--color-link-text` (`#1A60CE`, white label 5.82:1) and one
blue carries every action in a mail. In dark mode it is brand yellow with an ink
label, the web's own flip. Every pair a mail paints clears 4.5:1 in both
themes, with no exception.

**The header is a hosted PNG.** Gmail blocks SVG and no client loads a webfont
reliably, so the wordmark ships as `src/email/wordmark-on-light.png` and
`wordmark-on-dark.png` (2x, exported as `@nfccool/design/email/…`), drawn from
the guideline's own secondary logo by `npm run email:assets`, each with a
hairline halo in its card colour so the ink survives a client that inverts the
mail on its own (the Gmail apps). The consumer hosts both in one public https
folder and passes it as `assetBaseUrl`; old files stay up, because a mail in an
inbox fetches its image every time it is opened. Without it the header is the
brand name in bold.

**A product signs with its own icon.** `brand.logo: { src, srcDark?, width,
height, alt }` replaces the wordmark with the product's app icon, and
`brand.name` sits beside it in bold heading ink (20px, vertically centred)
unless `brand.showName` is `false`. Both URLs are absolute http(s) and are
refused otherwise; `width`/`height` are the display size and the files are 2x.
The icon's corners round to 22% of its width (the iOS squircle, inline, so
Outlook desktop alone shows it square) and it carries a hairline in the card's
border colour, repainted in dark, so a light icon keeps its edge on a white
card and on a dark one when a client cannot swap. `srcDark` swaps in under a
dark scheme exactly as the wordmark does. The product hosts its own icons; the
footer's `product` line still names the maker ("Moments by NFC.cool"). The
Django layout's `{% block header %}` does the same from `email_logo_src`,
`email_logo_src_dark`, `email_logo_width`, `email_logo_height`,
`email_logo_alt` and `email_brand_name`, and falls back to the wordmark.

**A consumer without Node takes generated Django templates.** `npm run build`
writes `dist/email/django/` (a layout with blocks and one partial per block)
and the two PNGs to `dist/email/`, all made by rendering `src/email.js` with
placeholders, so the markup cannot drift. Django's autoescape escapes; it does
not validate links, and a Django mail keeps its own `.txt` part.

`src/email.css` remains for a template that must be written by hand: flat
literals, a system font stack, a dark block to keep in a `<style>` element.
Do not reference the token files from an email template.

`npm run email:shots -- <dir>` photographs every guideline example in both
schemes at 390 and 800px, the review a mail gets before it ships.

---

## Adding a brand

1. Add a block under `brands` in `src/tokens.json` with the same key set as
   `nfccool`. The token-parity test fails on any omission.
2. `node build/emit-css.mjs`.
3. Ship the new file and set `data-brand="<id>"` on `<html>`.
4. `npm test`. Contrast assertions run against the new palette.

A brand owns colour, and it owns its display typeface. It does not own spacing,
radius, breakpoints, component shape or motion. If a brand needs those to
differ, that is a gap in layer 1, not a brand override.

---

## Verifying

```bash
npm run build     # regenerate every layer, the bundle and the guideline site
npm test          # contrast, literals, breakpoints, token parity, drift
open site/index.html
```

The guideline site renders every token, component and archetype with the
decision behind it, one section per page behind the system's own sidebar, and
measures contrast live from the resolved custom properties, so it cannot
disagree with the system. Its sources are `guideline/sections/*.html`; the
shell around them is `build/guideline.mjs`. Review it in both themes, in both
directions, and at each of the four breakpoints.
