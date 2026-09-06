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
  ['light focus stroke on page',     L['focus-stroke'],         L['color-bg'],       UI],
  ['light focus stroke on card',     L['focus-stroke'],         L['color-bg-card'],  UI],

  // The gradient itself is an accepted exception, pinned below rather than here.
  ['focus halo on gradient top',     L['focus-halo'],           L['brand-blue-1'],   UI],
  ['focus stroke on gradient top',   L['focus-stroke'],         L['brand-blue-1'],   UI],
  ['focus stroke on gradient bottom',L['focus-stroke'],         L['brand-blue-2'],   UI],

  // Filled primary button, both themes. The dark fill is brand yellow, so its
  // label is near-black; testing only the light theme hid that for one commit.
  ['light primary button label',       L['color-primary-fg'], L['color-primary-bg'],       AA],
  ['light primary button hover label', L['color-primary-fg'], L['color-primary-bg-hover'], AA],
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
  ['dark focus stroke on page',      D['focus-stroke'],         D['color-bg'],       UI],
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
/* Accepted exception, decided deliberately: the brand band keeps its shipped
   colours, and white text on it is carried by --on-brand-text-shadow rather
   than by the background contrast. Pinned so that changing either the gradient
   or the shadow is a deliberate act rather than a silent regression. */
test('brand gradient keeps its shipped values', () => {
  assert.equal(L['brand-blue-1'], '#137BD9');
  assert.equal(L['brand-blue-2'], '#00A2F3');
  assert.ok(ratio(L['color-on-brand'], L['brand-blue-2']) < 4.5,
    'the gradient now passes on its own - drop the text-shadow compensation');
  assert.notEqual(L['on-brand-text-shadow'], 'none',
    'the bright gradient needs the shadow compensation in light mode');
});

test('brand tail is a documented logotype exemption', () => {
  const r = ratio(L['color-brand-tail'], L['color-bg']);
  assert.ok(r < 4.5, 'brand tail now passes AA - update the exemption note in archetypes.css');
});
