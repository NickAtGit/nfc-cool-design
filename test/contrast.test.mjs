import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const t = JSON.parse(readFileSync(new URL('../src/tokens.json', import.meta.url), 'utf8'));
const L = t.brands.nfccool.light, D = t.brands.nfccool.dark;

import { ratio, AA, UI } from './contrast-math.mjs';

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
  // The neutral pill and status dot: their label sits on the neutral tint, not
  // on the bare card, which is the surface that nearly failed.
  ['light neutral label on its own tint', L['color-neutral-fg'], '#F4F4F5',            AA],
  ['dark neutral label on its own tint',  D['color-neutral-fg'], '#2C3138',            AA],
  ['light filled danger label',      L['color-danger-on'],      L['color-danger-fg'], AA],
  ['dark filled danger label',       D['color-danger-on'],      D['color-danger-fg'], AA],
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

  // The switch. The TRACK carries the state: its on-fill must read against the
  // card in both themes. The knob only has to be seen on the off track, where
  // it is the one thing that moves; on the dark theme's yellow on-track it is
  // decoration and is not asserted. The avatar's default pair is the primary
  // button's, already covered above.
  ['light switch on-track against card', L['color-primary-bg'], L['color-bg-card'],  UI],
  ['dark switch on-track against card',  D['color-primary-bg'], D['color-bg-card'],  UI],
  ['light switch knob on the off track', L['switch-knob'],      L['field-border'],   UI],
  ['dark switch knob on the off track',  D['switch-knob'],      D['field-border'],   UI],
  // The progress fill against the two surfaces it sits on.
  ['light progress fill on page',        L['color-primary-bg'], L['color-bg'],       UI],
  ['dark progress fill on page',         D['color-primary-bg'], D['color-bg'],       UI],
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

/* The hover-never-worse rule above is relative: it cannot catch a label that
   was unreadable at rest AND on hover. This is the absolute floor. Every
   button label clears 4.5:1 on its own fill, in both themes, except the two
   exceptions this system has written down and pinned above. */
const BUTTON_EXCEPTIONS = new Map([
  // The filled primary at rest: 3.48:1, decided 2026-09-06, pinned in its own
  // test, and hover darkens to 4.70. Dark mode has no exception.
  ['filled primary/light/rest', 3.0],
  // On the brand band the label is carried by --on-brand-text-shadow, which is
  // a Brand Manual requirement in its own right. Pinned by the gradient test.
  ['outlined on brand band/light/rest', 3.0],
  ['outlined on brand band/light/hover', 3.0],
]);
const SURFACE = { 'outlined danger': 'color-bg-card', 'filled danger': 'color-bg-card',
  'outlined on brand band': 'brand-blue-2', 'filled primary on brand band': 'brand-blue-2' };
/* Paint a translucent fill onto the surface behind it, so a tinted hover is
   measured as it actually renders. */
const composite = (value, surface) => {
  const m = /^rgba\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*\)$/i.exec(value ?? '');
  if (!m) return value;
  const a = +m[4], base = parseInt(surface.replace('#', ''), 16);
  const s = [base >> 16 & 255, base >> 8 & 255, base & 255];
  const out = [+m[1], +m[2], +m[3]].map((c, i) => Math.round(a * c + (1 - a) * s[i]));
  return '#' + out.map(c => c.toString(16).padStart(2, '0')).join('');
};
for (const [label, context, classes] of VARIANTS) {
  test(`${label} button: the label is readable on its own fill`, () => {
    const p = buttonParams(context, classes);
    for (const [theme, T] of [['light', L], ['dark', D]]) {
      const surface = T[SURFACE[label] ?? 'color-bg'];
      for (const state of ['rest', 'hover']) {
        const fg = resolve(p[state === 'rest' ? '--btn-fg' : '--btn-fg-hover'], p, T);
        const bgRaw = p[state === 'rest' ? '--btn-bg' : '--btn-bg-hover'];
        const bg = composite(resolve(bgRaw, p, T) ?? surface, surface) ?? surface;
        if (!fg || !/^#[0-9a-fA-F]{6}$/.test(bg)) continue;
        const min = BUTTON_EXCEPTIONS.get(`${label}/${theme}/${state}`) ?? AA;
        const r = ratio(fg, bg);
        assert.ok(r >= min,
          `${theme} ${state}: ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
      }
    }
  });
}

/* A read-only input must not pass for an editable one. In dark, the old rule
   (only a --color-bg-alt fill) sat a few levels from --field-bg and the two
   looked the same. The boundary carries the difference now: a dashed border
   in a colour that is not the field border, and secondary ink that still
   reads on the fill, in both themes. */
test('a read-only input reads as read-only in both themes', () => {
  const css = componentsCSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = /\.input\[readonly\](?:, \.textarea\[readonly\])? \{([^}]*)\}/.exec(css);
  assert.ok(m, 'the .input[readonly] rule is missing');
  const decl = Object.fromEntries(m[1].split(';').map(d => d.split(':').map(x => x.trim())).filter(([k, v]) => k && v));
  assert.equal(decl['border-style'], 'dashed', 'a read-only field has a dashed boundary');
  const tok = v => /^var\(--([\w-]+)\)$/.exec(v ?? '')?.[1];
  for (const [theme, T] of [['light', L], ['dark', D]]) {
    const bg = T[tok(decl.background)], border = T[tok(decl['border-color'])], fg = T[tok(decl.color)];
    assert.ok(bg && border && fg, `${theme}: background, border-color and color must each be a token`);
    assert.notEqual(border.toUpperCase(), T['field-border'].toUpperCase(), `${theme}: the border must differ from an editable field's`);
    assert.notEqual(bg.toUpperCase(), T['field-bg'].toUpperCase(), `${theme}: the fill must differ from an editable field's`);
    assert.ok(ratio(fg, bg) >= AA, `${theme}: read-only text ${fg} on ${bg} is ${ratio(fg, bg).toFixed(2)}:1`);
  }
});
