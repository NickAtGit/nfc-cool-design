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
