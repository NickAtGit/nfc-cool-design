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
`build/emit-css.mjs` writes `tokens.css`, every `brands/*.css` and `email.css`.
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
   `prefers-color-scheme` in a component rule.
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

**One nav component, two modes.** A nav is a list of destinations plus a
utility cluster laid out along an axis, and the axis is the only thing the mode
changes: `data-nav="bar"` for the marketing header, `data-nav="side"` for the
product console. Link shape, active state, focus, drawer mechanics and the
toggle button are written once.

The side mode has three responsive states, all on the existing four
breakpoints: full with labels at `lg` and up, an icon rail from `md` to `lg`
with labels hidden visually but kept in the accessibility tree, and an
off-canvas drawer with a scrim below `md`. `.is-collapsed` forces the rail at
any width, which is how a person collapses the sidebar themselves; the choice
persists in `localStorage`.

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
text.** Related: the live CSS carries a comment explaining that the feature
numeral's `text-shadow` exists so "axe measures the glyph against the shadow,
not the card". That numeral is genuinely decorative and always `aria-hidden`,
so it is fine, but the technique is not a contrast strategy.

**Motion stays small.** One duration, one gesture, three lift distances. No
scroll animation and no reveal-on-scroll. Under `prefers-reduced-motion` all
three lift tokens collapse to zero.

---

## Consuming the package

### MomentoMarks, or any bundler

```bash
pnpm add @nfccool/design
```
```js
import '@nfccool/design/tokens.css';
import '@nfccool/design/brands/nfccool.css';
import '@nfccool/design/components.css';
import '@nfccool/design/archetypes.css';
```

### nfc-cool-website (SiteKit, no npm at build time)

Vendor the CSS into `Theme/css/` and regenerate the theme token block:

```bash
node build/emit-sitekit-theme.mjs > /path/to/nfc-cool-website/Theme/tokens-block.yaml
node build/emit-bundle.mjs
```

Two things to know:

- SiteKit generates its own `:root` from `Theme/theme.yaml`'s `tokens:` block
  and inlines it in `<head>`. **That block is generated output.** If the
  vendored CSS also shipped a competing `:root`, the two would fight. The
  package is the source; the yaml is downstream.
- `Sources/Site/Renderers/CSSAsyncLoadProcessor.swift` decides which stylesheets
  are render-blocking by filename. Adding a file means updating that list.

### business_card_service (Django, no npm at all)

```bash
node build/emit-bundle.mjs   # writes dist/design.css
cp dist/design.css /path/to/business_card_service/web/static/stylesheets/
```

Link it once in `web/home/templates/base.html`, `web/templates/base_error.html`
and `web/vcard_profile/templates/my_profile.html`. Those three templates are
where the four competing `:root` blocks live today.

### Email

`src/email.css` ships flat literals and a system font stack, because mail
clients strip custom properties and will not load a webfont. Inline it with a
mail-safe inliner. Do not reference the token files from an email template.

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
npm run build     # regenerate every layer and the bundle
npm test          # contrast, literals, breakpoints, token parity, drift
open kitchen-sink/index.html
```

The kitchen sink renders every token, component and archetype with the decision
behind it, and measures contrast live from the resolved custom properties, so it
cannot disagree with the system. Review it in both themes, in both directions,
and at each of the four breakpoints.
