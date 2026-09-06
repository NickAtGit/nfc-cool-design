import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const AUTHORED = ['src/components.css', 'src/archetypes.css'];

/* Colour lives in the brand layer. A literal in a component means that
   component cannot be re-skinned, which is how a shared system dies. */
for (const f of AUTHORED) {
  test(`${f} declares no literal colour`, () => {
    const hits = read(f).split('\n')
      .map((line, i) => [i + 1, line])
      .filter(([, l]) => /#[0-9a-fA-F]{3,8}\b/.test(l) || /\brgba?\(/.test(l));
    assert.deepEqual(hits, [], `literal colour found:\n${hits.map(([n, l]) => `  ${f}:${n} ${l.trim()}`).join('\n')}`);
  });
}

/* Lengths above a hairline come from the scale, not from the keyboard.
   Small px values survive: borders, the CSS triangle, the accent stripe. */
for (const f of AUTHORED) {
  test(`${f} uses no off-scale px length`, () => {
    const bad = [];
    read(f).split('\n').forEach((line, i) => {
      if (line.trim().startsWith('/*') || line.trim().startsWith('*')) return;
      // Breakpoints have their own test; comments are prose, not declarations.
      if (/@media/.test(line)) return;
      const code = line.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\*.*$/, '');
      for (const m of code.matchAll(/(\d+(?:\.\d+)?)px/g)) {
        if (parseFloat(m[1]) > 8) bad.push(`${f}:${i + 1} ${m[0]} -> ${line.trim()}`);
      }
    });
    assert.deepEqual(bad, [], `off-scale px:\n${bad.map(s => '  ' + s).join('\n')}`);
  });
}

/* Four breakpoints. min-width uses the value, max-width uses value-1. */
const BP = JSON.parse(read('src/tokens.json')).breakpoints;
const allowed = new Set([
  ...Object.values(BP).map(v => `min-width:${v}px`),
  ...Object.values(BP).map(v => `max-width:${v - 1}px`),
]);
for (const f of AUTHORED) {
  test(`${f} only uses the four breakpoints`, () => {
    const bad = [];
    for (const m of read(f).matchAll(/@media[^{]*?\(\s*(min|max)-width\s*:\s*([\d.]+px)\s*\)/g)) {
      const cond = `${m[1]}-width:${m[2]}`;
      if (!allowed.has(cond)) bad.push(cond);
    }
    assert.deepEqual(bad, [], `off-scale breakpoint(s): ${bad.join(', ')}. Allowed: ${[...allowed].join(', ')}`);
  });
}

/* The sidebar is a flex item. If it can shrink, every link is squeezed until
   its label collapses under the icon. */
test('the sidebar refuses to shrink inside the app shell', () => {
  const css = read('src/components.css');
  const rule = css.slice(css.indexOf('[data-nav="side"] {'), css.indexOf('}', css.indexOf('[data-nav="side"] {')));
  assert.match(rule, /flex-shrink:\s*0/, 'the sidebar must not shrink below --nav-width');
});

/* text-overflow only applies to a single line. */
test('a truncating label also prevents wrapping', () => {
  const css = read('src/components.css');
  for (const sel of ['.nav-label']) {
    const rule = css.slice(css.indexOf(sel + ' {'), css.indexOf('}', css.indexOf(sel + ' {')));
    if (!/text-overflow:\s*ellipsis/.test(rule)) continue;
    assert.match(rule, /white-space:\s*nowrap/,
      `${sel} sets text-overflow but not white-space: nowrap, so it wraps instead of truncating`);
  }
});

/* A display toggle must out-rank any element-selector rule that also sets
   display on the same nodes, or both states render at once. */
test('the theme logo toggle out-ranks the .nav-brand img rule', () => {
  const css = read('src/components.css');
  const spec = sel => {
    const ids = (sel.match(/#[\w-]+/g) || []).length;
    const cls = (sel.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) || []).length;
    const els = (sel.match(/(^|[\s>+~])[a-z]+/g) || []).length;
    return ids * 100 + cls * 10 + els;
  };
  const base = spec('.nav-brand img');
  for (const sel of ['.nav-brand .nav-logo-on-light', '.nav-brand .nav-logo-on-dark']) {
    assert.ok(css.includes(sel + ' {'), `${sel} must exist`);
    assert.ok(spec(sel) > base,
      `${sel} (${spec(sel)}) must out-rank .nav-brand img (${base})`);
  }
});

/* The wordmark is Latin and must never reorder inside RTL text. */
test('the wordmark is isolated left-to-right', () => {
  const css = read('src/archetypes.css');
  const rule = css.slice(css.indexOf('.brand-name {'), css.indexOf('}', css.indexOf('.brand-name {')));
  assert.match(rule, /direction:\s*ltr/, '.brand-name must force direction: ltr');
  assert.match(rule, /unicode-bidi:\s*isolate/, '.brand-name must isolate its bidi run');
  assert.ok(!/\[dir="rtl"\][^{]*\.brand-name/.test(css),
    'the rule must apply unconditionally, not only under [dir="rtl"]');
});

/* Both themes define exactly the same token set, or a token silently
   inherits its light value in the dark theme. */
test('every brand token is defined in both themes', () => {
  const { light, dark } = JSON.parse(read('src/tokens.json')).brands.nfccool;
  const l = Object.keys(light).filter(k => !k.startsWith('$'));
  const d = Object.keys(dark).filter(k => !k.startsWith('$'));
  assert.deepEqual(l.filter(k => !d.includes(k)), [], 'missing from dark');
  assert.deepEqual(d.filter(k => !l.includes(k)), [], 'missing from light');
});

/* The generated CSS must match its source. */
test('generated CSS matches src/tokens.json', () => {
  execFileSync('node', ['build/emit-css.mjs', '--check'],
    { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' });
});

/* Every var() an authored layer consumes must be defined somewhere. */
test('no authored layer references an undefined token', () => {
  const defined = new Set();
  for (const f of ['src/tokens.css', 'src/brands/nfccool.css']) {
    for (const m of read(f).matchAll(/^\s*(--[\w-]+)\s*:/gm)) defined.add(m[1]);
  }
  const local = /^--(btn|cta|focus)-/;
  const missing = new Set();
  for (const f of AUTHORED) {
    for (const m of read(f).matchAll(/var\(\s*(--[\w-]+)/g)) {
      const name = m[1];
      if (!defined.has(name) && !local.test(name) && !read(f).includes(`${name}:`)) missing.add(`${name} (${f})`);
    }
  }
  assert.deepEqual([...missing], [], `undefined token(s): ${[...missing].join(', ')}`);
});
