import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const t = JSON.parse(readFileSync(new URL('../src/tokens.json', import.meta.url), 'utf8'));
const L = t.brands.nfccool.light, D = t.brands.nfccool.dark;

const srgb = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = hex => { const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * srgb((n >> 16) & 255) + 0.7152 * srgb((n >> 8) & 255) + 0.0722 * srgb(n & 255); };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05); };

/* Body text: 4.5:1. Non-text indicators and large text: 3:1. */
const AA = 4.5, UI = 3.0;

const cases = [
  // [label, fg, bg, threshold]
  ['light body text on page',        L['color-text'],           L['color-bg'],       AA],
  ['light body text on card',        L['color-text'],           L['color-bg-card'],  AA],
  ['light secondary on page',        L['color-text-secondary'], L['color-bg'],       AA],
  ['light muted on page',            L['color-text-muted'],     L['color-bg'],       AA],
  ['light muted on bg-alt',          L['color-text-muted'],     L['color-bg-alt'],   AA],
  ['light muted on card',            L['color-text-muted'],     L['color-bg-card'],  AA],
  ['light link text on page',        L['color-link-text'],      L['color-bg'],       AA],
  ['light link text on card',        L['color-link-text'],      L['color-bg-card'],  AA],
  ['light link hover on page',       L['color-link-text-hover'],L['color-bg'],       AA],

  // The gradient itself is an accepted exception, pinned below rather than here.

  // Filled primary button, both themes. The dark fill is brand yellow, so its
  // label is near-black; testing only the light theme hid that for one commit.
  ['light primary button hover label', L['color-primary-fg'], L['color-primary-bg-hover'], UI],
  ['light primary on brand band',      L['btn-onbrand-fg'],   L['btn-onbrand-bg'],         AA],

  // Semantic tones as text on the surfaces they appear on.
  ['light success fg on page',       L['color-success-fg'],     L['color-bg'],       AA],
  ['light warning fg on page',       L['color-warning-fg'],     L['color-bg'],       AA],
  ['light danger fg on page',        L['color-danger-fg'],      L['color-bg'],       AA],
  ['light info fg on page',          L['color-info-fg'],        L['color-bg'],       AA],
  ['light neutral fg on page',       L['color-neutral-fg'],     L['color-bg'],       AA],
  ['light ios pill label',           L['platform-ios-fg'],      L['color-bg-card'],  AA],
  ['light android pill label',       L['platform-android-fg'],  L['color-bg-card'],  AA],

  // Dark theme.
  ['dark body text on page',         D['color-text'],           D['color-bg'],       AA],
  ['dark secondary on page',         D['color-text-secondary'], D['color-bg'],       AA],
  ['dark muted on page',             D['color-text-muted'],     D['color-bg'],       AA],
  ['dark muted on bg-alt',           D['color-text-muted'],     D['color-bg-alt'],   AA],
  ['dark link text on page',         D['color-link-text'],      D['color-bg'],       AA],
  ['dark link text on card',         D['color-link-text'],      D['color-bg-card'],  AA],
  ['dark success fg on page',        D['color-success-fg'],     D['color-bg'],       AA],
  ['dark warning fg on page',        D['color-warning-fg'],     D['color-bg'],       AA],
  ['dark danger fg on page',         D['color-danger-fg'],      D['color-bg'],       AA],
  ['dark info fg on page',           D['color-info-fg'],        D['color-bg'],       AA],
  ['dark ios pill label',            D['platform-ios-fg'],      D['color-bg-card'],  AA],
  ['dark primary button label',        D['color-primary-fg'], D['color-primary-bg'],       AA],
  ['dark primary button hover label',  D['color-primary-fg'], D['color-primary-bg-hover'], AA],
  ['dark primary on brand band',       D['btn-onbrand-fg'],   D['btn-onbrand-bg'],         AA],
  ['dark android pill label',        D['platform-android-fg'],  D['color-bg-card'],  AA],
];

for (const [label, fg, bg, min] of cases) {
  test(`contrast: ${label}`, () => {
    const r = ratio(fg, bg);
    assert.ok(r >= min, `${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
  });
}

/* Documented exemption. WCAG 1.4.3 exempts text that is part of a logo or
   brand name. The script tail renders the brand name, so it is allowed to
   fail - but the test pins it, so a change here is a deliberate act. */
/* The focus ring is two-tone on purpose: an inner halo and an outer stroke.
   The contract is not that both tones contrast with every surface, but that
   AT LEAST ONE always does, which is what lets one ring work on the page, on
   a card and on the brand band without per-context overrides. */
for (const [theme, T] of [['light', L], ['dark', D]]) {
  for (const surface of ['color-bg', 'color-bg-card', 'brand-blue-1', 'brand-blue-2']) {
    test(`focus ring is visible on ${theme} ${surface}`, () => {
      const halo = ratio(T['focus-halo'], T[surface]);
      const stroke = ratio(T['focus-stroke'], T[surface]);
      assert.ok(Math.max(halo, stroke) >= UI,
        `neither ring tone clears 3:1 on ${T[surface]}: halo ${halo.toFixed(2)}, stroke ${stroke.toFixed(2)}`);
    });
  }
}

/* Accepted exception, decided deliberately: the brand band keeps its shipped
   colours, and white text on it is carried by --on-brand-text-shadow rather
   than by the background contrast. Pinned so that changing either the gradient
   or the shadow is a deliberate act rather than a silent regression. */
test('brand gradient is the iOS app appThemeGradient', () => {
  assert.equal(L['brand-blue-1'], '#1A60CE', 'top stop must match the app');
  assert.equal(L['brand-blue-2'], '#128CF0', 'bottom stop must match the app');
  // White clears AA at the top and stays above the large-text floor at the
  // bottom, so the shadow carries body copy over the lower half only.
  assert.ok(ratio(L['color-on-brand'], L['brand-blue-1']) >= 4.5, 'white must clear AA at the top stop');
  assert.ok(ratio(L['color-on-brand'], L['brand-blue-2']) >= 3.0, 'white must clear the large-text floor at the bottom');
  assert.ok(ratio(L['color-on-brand'], L['brand-blue-2']) < 4.5,
    'the band now passes for body copy on its own - drop the shadow compensation');
  assert.notEqual(L['on-brand-text-shadow'], 'none', 'the band still needs the shadow in light mode');
});

/* The interactive colours are the gradient stops themselves, not tints
   derived from them. If that ever stops being true it should be a decision. */
test('interactive colours are the brand gradient stops', () => {
  assert.equal(L['color-link-text'], L['brand-blue-1'], 'link text is the dark stop');
  assert.equal(L['color-link'], L['brand-blue-2'], 'the interactive hue is the light stop');
  assert.equal(L['color-primary-bg'], L['brand-blue-2'], 'the filled primary is the light stop');
});

/* Whatever the label colour, hover must never make it harder to read: the state
   a person is actively pointing at should be the more legible one. */
test('the filled primary label gains contrast on hover, in both themes', () => {
  for (const [theme, T] of [['light', L], ['dark', D]]) {
    const rest = ratio(T['color-primary-fg'], T['color-primary-bg']);
    const hover = ratio(T['color-primary-fg'], T['color-primary-bg-hover']);
    assert.ok(hover >= rest,
      `${theme}: hover drops the label from ${rest.toFixed(2)} to ${hover.toFixed(2)}`);
  }
});

/* Buttons use one blue. It is the light stop, and on a button it is only ever
   a fill or a border - never the label. */
test('the outlined button borders in the same blue as the filled one', () => {
  const css = readFileSync(new URL('../src/components.css', import.meta.url), 'utf8');
  const rule = css.slice(css.indexOf('.btn {'), css.indexOf('}', css.indexOf('.btn {')));
  assert.match(rule, /--btn-border:\s*var\(--color-primary-bg\)/,
    'the outlined border must be the same token as the filled fill');
  assert.match(rule, /--btn-fg:\s*var\(--color-text\)/,
    'the outlined label must be ink, not a second blue');
});

test('the outlined button border reads against a card', () => {
  assert.ok(ratio(L['color-primary-bg'], L['color-bg-card']) >= 3.0,
    'the border is a UI boundary and must clear 3:1');
});

/* RECORDED EXCEPTION, decided deliberately on 2026-09-06.
   The filled primary is the brand's light stop with a white label. That pairing
   is 3.48:1, under the 4.5 a 15px label needs. It is pinned here so it stays a
   known, revisitable decision rather than an invisible regression on the most
   important control in the product. Hover darkens to clear 4.5.
   #0F78CE is the nearest shade of the same blue where white passes at rest. */
test('light filled primary is a recorded contrast exception', () => {
  const rest = ratio(L['color-primary-fg'], L['color-primary-bg']);
  assert.ok(rest < 4.5,
    'the filled primary now passes on its own - delete this exception and restore the AA assertion');
  assert.ok(rest >= 3.0, `it must at least clear the 3:1 non-text floor, got ${rest.toFixed(2)}`);
  assert.ok(ratio(L['color-primary-fg'], L['color-primary-bg-hover']) >= 4.5,
    'hover must bring the label to AA');
});

/* The fill has to be distinguishable from the surface behind it. */
test('the filled primary reads against a card', () => {
  assert.ok(ratio(L['color-primary-bg'], L['color-bg-card']) >= 3.0,
    'the light primary fill must clear 3:1 against a white card');
});

test('brand tail is a documented logotype exemption', () => {
  const r = ratio(L['color-brand-tail'], L['color-bg']);
  assert.ok(r < 4.5, 'brand tail now passes AA - update the exemption note in archetypes.css');
});

/* A button is one component re-skinned by local custom properties, so a
   variant that sets a fill and forgets the matching label inherits a label
   from whichever sibling variant came last in the file. Resolve the real
   cascade for every variant and check that hover never paints the label
   harder to read than rest, in both themes. */
const componentsCSS = readFileSync(new URL('../src/components.css', import.meta.url), 'utf8');
function buttonParams(context, classes) {
  const clean = componentsCSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const matched = [];
  let order = 0;
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const sel of m[1].split(',').map(s => s.trim())) {
      const parts = sel.split(/\s+/);
      if (parts.length > 2 || !parts.every(p => /^(\.[\w-]+)+$/.test(p))) continue;
      const [ctx, compound] = parts.length === 2 ? parts : [null, parts[0]];
      if (ctx && !context.includes(ctx.slice(1))) continue;
      const cls = compound.slice(1).split('.');
      if (!cls.every(c => classes.includes(c))) continue;
      matched.push({ spec: cls.length + (ctx ? 1 : 0), order: order++, decl: m[2] });
    }
  }
  matched.sort((a, b) => a.spec - b.spec || a.order - b.order);
  const params = {};
  for (const { decl } of matched)
    for (const d of decl.matchAll(/(--btn-[\w-]+)\s*:\s*([^;]+);/g)) params[d[1]] = d[2].trim();
  return params;
}
const resolve = (value, params, T) => {
  const m = /^var\((--[\w-]+)\)$/.exec(value ?? '');
  if (!m) return /^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value : null;
  return m[1] in params ? resolve(params[m[1]], params, T) : resolve(T[m[1].slice(2)], params, T);
};
const VARIANTS = [
  ['outlined', [], ['btn']],
  ['filled primary', [], ['btn', 'btn-primary']],
  ['ghost', [], ['btn', 'btn-ghost']],
  ['outlined danger', [], ['btn', 'btn-danger']],
  ['filled danger', [], ['btn', 'btn-danger', 'btn-primary']],
  ['outlined on brand band', ['on-brand'], ['btn']],
  ['filled primary on brand band', ['on-brand'], ['btn', 'btn-primary']],
];
for (const [label, context, classes] of VARIANTS) {
  test(`${label} button: hover never makes the label harder to read`, () => {
    const p = buttonParams(context, classes);
    for (const [theme, T] of [['light', L], ['dark', D]]) {
      const fg = resolve(p['--btn-fg'], p, T), bg = resolve(p['--btn-bg'], p, T);
      const fgHover = resolve(p['--btn-fg-hover'], p, T), bgHover = resolve(p['--btn-bg-hover'], p, T);
      // A transparent or translucent hover fill: the surface behind decides.
      if (!fgHover || !bgHover) continue;
      const rest = fg && bg ? ratio(fg, bg) : UI;
      const hover = ratio(fgHover, bgHover);
      assert.ok(hover >= rest,
        `${theme}: label ${fgHover} on hover fill ${bgHover} is ${hover.toFixed(2)}:1, at rest it was ${rest.toFixed(2)}:1`);
    }
  });
}
