import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

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

/* ------------------------------------------------------------------
   Guards added after the 2026-09-07 review.
   ------------------------------------------------------------------ */
import { readdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;

/* One selector, one rule per scope. A pasted block that re-opens a selector
   overrides the first silently, and the eye reads the first one. */
function ruleKeys(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const scope = [], keys = [];
  let buf = '';
  for (const ch of clean) {
    if (ch === '{') {
      const prelude = buf.replace(/\s+/g, ' ').trim();
      if (!prelude.startsWith('@')) keys.push([...scope, prelude].join(' '));
      scope.push(prelude);
      buf = '';
    } else if (ch === '}') { scope.pop(); buf = ''; }
    else if (ch === ';') buf = '';
    else buf += ch;
  }
  return keys;
}
for (const f of AUTHORED) {
  test(`${f} opens each selector once per scope`, () => {
    const seen = new Set(), dupes = [];
    for (const k of ruleKeys(read(f))) { if (seen.has(k)) dupes.push(k); seen.add(k); }
    assert.deepEqual(dupes, [], `selector opened twice:\n${dupes.map(s => '  ' + s).join('\n')}`);
  });
}

/* The two focus tones come from the brand layer and nowhere else. A component
   that re-tints them breaks "one ring, every surface": in dark mode a white
   halo next to a near-white stroke is one colour, and the ring goes flat. */
for (const f of AUTHORED) {
  test(`${f} does not re-tint the focus ring`, () => {
    const hits = read(f).split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /--focus-(halo|stroke)\s*:/.test(l));
    assert.deepEqual(hits, [], `focus tone set outside the brand layer:\n${hits.map(([n, l]) => `  ${f}:${n} ${l.trim()}`).join('\n')}`);
  });
}

/* Consumers install from a git URL or a link path, never from a registry
   tarball, so anything an export points at is either in git or built on
   install by the prepare script. */
test('every export target is in git or built by the prepare script', () => {
  const pkg = JSON.parse(read('package.json'));
  const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: ROOT }).toString().split('\n'));
  const built = Object.values(pkg.exports).map(p => p.replace(/^\.\//, '')).filter(p => !tracked.has(p));
  if (built.length === 0) return;
  assert.match(pkg.scripts?.prepare ?? '', /\bbuild\b/,
    `${built.join(', ')} are not tracked, so an install must build them: add "prepare": "npm run build"`);
});

/* UNLICENSED grants nobody anything, so the package must not be publishable. */
test('an UNLICENSED package is marked private', () => {
  const pkg = JSON.parse(read('package.json'));
  if (pkg.license !== 'UNLICENSED') return;
  assert.equal(pkg.private, true, 'set "private": true, or choose a licence');
});

/* The generators read tokens.json and nothing else. A colour or a brand id
   inside a generator is inherited by every brand the file is run for. */
const GENERATORS = readdirSync(join(ROOT, 'build')).filter(f => f.endsWith('.mjs')).map(f => `build/${f}`);
const pkgName = JSON.parse(read('package.json')).name;
for (const f of GENERATORS) {
  test(`${f} carries no colour literal`, () => {
    const hits = read(f).split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /#[0-9a-fA-F]{3,8}\b/.test(l) || /\brgba?\(/.test(l));
    assert.deepEqual(hits, [], `literal colour in a generator:\n${hits.map(([n, l]) => `  ${f}:${n} ${l.trim()}`).join('\n')}`);
  });
  test(`${f} names no brand`, () => {
    const hits = read(f).replaceAll(pkgName, '').split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /\bnfccool\b/.test(l));
    assert.deepEqual(hits, [], `brand id hard-coded in a generator:\n${hits.map(([n, l]) => `  ${f}:${n} ${l.trim()}`).join('\n')}`);
  });
}

/* Motion in the authored layers. */
function scopedRules(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const scope = [], out = [];
  let buf = '';
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') {
      const prelude = buf.replace(/\s+/g, ' ').trim();
      if (!prelude.startsWith('@')) {
        const end = clean.indexOf('}', i);
        out.push({ scope: scope.join(' '), selector: prelude, decl: clean.slice(i + 1, end) });
      }
      scope.push(prelude); buf = '';
    } else if (ch === '}') { scope.pop(); buf = ''; }
    else if (ch === ';') buf = '';
    else buf += ch;
  }
  return out;
}

/* The FAQ answer is revealed by a native details element, which shows it in
   one frame. The archetype animates the reveal so opening a card reads as
   motion, not as a jump. */
test('the FAQ answer animates when its card opens', () => {
  const rules = scopedRules(read('src/archetypes.css'));
  const open = rules.filter(r => r.scope === '' && /\.faq-item\[open\]\s+\.faq-body/.test(r.selector));
  assert.ok(open.some(r => /\banimation(-name)?\s*:/.test(r.decl)),
    '.faq-item[open] .faq-body must declare an animation');
});

/* Every animation an authored layer starts is switched off or slowed under
   prefers-reduced-motion, in the same file, by a rule on the same selector. */
for (const f of AUTHORED) {
  test(`${f} honours prefers-reduced-motion for every animation`, () => {
    const rules = scopedRules(read(f));
    const animated = rules.filter(r => !/prefers-reduced-motion/.test(r.scope) && /\banimation(-name)?\s*:/.test(r.decl));
    const calmed = rules.filter(r => /prefers-reduced-motion: reduce/.test(r.scope) && /\banimation(-duration)?\s*:/.test(r.decl));
    const missing = animated.filter(a => !calmed.some(c => c.selector === a.selector)).map(a => a.selector);
    assert.deepEqual(missing, [], `animated but never calmed under reduced motion:\n${missing.map(s => '  ' + s).join('\n')}`);
  });
}

/* Below md the side nav is a bar whose burger drops the panel. The burger has
   to be visible there, or the panel can never be opened on a phone; and the
   panel has to honour `hidden`, or it is open before the script runs. */
test('the phone bar shows the burger below md, and its panel folds', () => {
  const rules = scopedRules(read('src/components.css'));
  const burger = rules.find(r =>
    /max-width: 767px/.test(r.scope) && /\[data-nav="side"\] \.nav-toggle/.test(r.selector) && /display:\s*inline-flex/.test(r.decl));
  assert.ok(burger, 'a [data-nav="side"] .nav-toggle rule with display: inline-flex must sit inside @media (max-width: 767px)');
  const folded = rules.find(r =>
    /max-width: 767px/.test(r.scope) && /\.nav-panel\[hidden\]/.test(r.selector) && /display:\s*none/.test(r.decl));
  assert.ok(folded, 'the side panel must honour [hidden] below md');
});

/* A page may hold several side navs (the guideline does: its own sidebar and
   the boxed examples on the Navigation page). Each collapse toggle belongs to
   the nav it sits in, and each nav remembers its own state. */
test('the sidebar collapse toggle is scoped to its own nav', () => {
  const js = read('src/nav.js');
  assert.ok(!js.includes("document.querySelector('[data-nav-collapse]')"),
    'the toggle must be looked up inside the nav, not on the document');
  assert.ok(js.includes("nav.querySelector('[data-nav-collapse]')"), 'expected nav.querySelector for the toggle');
  assert.match(js, /STORE_KEY\}?[:.]\$\{nav\.id\}|STORE_KEY \+ .*nav\.id/, 'the stored state must be keyed by nav id');
});

/* From md to lg the sidebar is a stacked rail: each label sits under its icon,
   so an iPad keeps readable destinations without paying for the full width.
   Only the person's own collapse takes the labels away. */
test('the md to xl rail keeps its labels, stacked under the icons', () => {
  const rail = scopedRules(read('src/components.css'))
    .filter(r => /min-width: 768px\) and \(max-width: 1199px/.test(r.scope));
  const hidden = rail.filter(r => /\.nav-label/.test(r.selector) && /clip-path|position:\s*absolute/.test(r.decl));
  assert.deepEqual(hidden.map(r => r.selector), [], 'the rail must not visually hide .nav-label');
  assert.ok(rail.some(r => /\.nav-link\b/.test(r.selector) && /flex-direction:\s*column/.test(r.decl)),
    'the rail link must stack the icon over the label');
});

/* WebKit ignores line-height on a single-line text input and uses the font's
   natural line box instead. Size an .input and a .select by leading alone and
   the two stand at different heights in Safari while measuring identically in
   Chrome -- a bug invisible on the machine it is written on. The defence is
   that all three controls are sized by ONE declaration and nothing later
   re-sizes just one of them. */
test('one declaration sizes the input, the textarea and the select', () => {
  const rules = scopedRules(read('src/components.css'));
  const SIZING = /(^|;|\s)(padding(-block|-top|-bottom)?|block-size|height|min-height|font-size|line-height)\s*:/;
  const shared = rules.filter(r => /^\.input,\s*\.textarea,\s*\.select$/.test(r.selector.trim()));
  assert.equal(shared.length, 1, 'expected exactly one shared sizing rule for the three controls');

  const offenders = [];
  for (const r of rules) {
    const sel = r.selector.trim();
    if (sel === '.input, .textarea, .select') continue;
    // A textarea is genuinely multi-line: it owns min-height and resize.
    // (?![\w-]) and not \b: a hyphen is a word boundary, so \b matched
    // .input-group, which is a wrapper and sizes itself legitimately.
    const targetsOne = /^\.(input|select)(?![\w-])/.test(sel) && !/,/.test(sel);
    if (targetsOne && SIZING.test(r.decl)) offenders.push(`${sel} { ${r.decl.trim()} }`);
  }
  assert.deepEqual(offenders, [], `a control re-sized on its own:\n  ${offenders.join('\n  ')}`);
});

/* A line box that does not fit its content box cannot be centred in it: it
   starts at the top and overflows the bottom, so the text reads low. If the
   shared control rule ever declares a height, the content box must clear both
   the declared line box AND the font's natural one, which is what WebKit will
   use for a text input whatever the leading says. */
test('a declared control height leaves room for the line box', () => {
  const tokens = JSON.parse(read('src/tokens.json'));
  const prim = tokens.primitives ?? tokens;
  const rule = scopedRules(read('src/components.css'))
    .find(r => r.selector.trim() === '.input, .textarea, .select');
  const height = /(?:^|;)\s*(?:block-size|height)\s*:/.test(rule.decl);
  if (!height) {
    // No height declared: the box wraps its own line box, so it always fits.
    // The leading must then stay near the typeface's natural line box, or the
    // WebKit input and the select diverge. Titillium's natural leading is 1.52.
    const leading = parseFloat(String(prim.leading?.['leading-normal'] ?? prim['leading-normal'] ?? '1.55'));
    assert.ok(Math.abs(leading - 1.52) < 0.1,
      `--leading-normal ${leading} is too far from Titillium's natural 1.52; ` +
      'a text input will not match a select in WebKit');
    return;
  }
  assert.fail('a height was declared: assert here that content box >= max(line box, natural line box)');
});

/* A vendored copy is a copy, and a copy drifts. business_card_service was
   1216 bytes behind the bundle with nothing anywhere to say so, because the
   guideline's instruction was a manual `cp`. `npm run build` now ends by
   syncing, and this fails if a consumer that IS on this machine has fallen
   behind. A consumer that is absent is skipped rather than failed, so the
   suite still passes on a runner that has only this repo checked out. */
test('every vendoring consumer on this machine has the current bundle', async () => {
  const { drift, plan } = await import('../build/sync-consumers.mjs');
  const present = plan().filter(p => p.present);
  if (!present.length) return; // nothing to check here
  assert.deepEqual(drift().map(p => p.dst), [],
    'vendored CSS is behind dist/. Run: npm run sync');
});

/* The manifest is the only place that knows who vendors what, so it has to
   stay honest about the difference: a consumer that installs from npm cannot
   drift and must not be listed as one that copies files. */
test('the consumer manifest names a real path and real files for each entry', () => {
  const { consumers } = JSON.parse(read('consumers.json'));
  assert.ok(Object.keys(consumers).length, 'expected at least one vendoring consumer');
  for (const [name, spec] of Object.entries(consumers)) {
    assert.ok(spec.root, `${name} needs a root`);
    assert.ok(spec.why, `${name} needs a why: the next person has to know if copying is still right`);
    for (const from of Object.keys(spec.files)) {
      assert.match(from, /^dist\//, `${name} must vendor a BUILT file, not an authored layer (${from})`);
    }
  }
});

/* Adopting the package is the consuming project's decision. A build run in
   THIS repo must never scatter a design bundle into a checkout that does not
   already vendor one -- business_card_service's main branch links its own
   dashboard.css and has no design.css at all, so an eager sync would have left
   an untracked bundle sitting in it. */
test('sync refreshes a vendored file but never creates one', () => {
  const src = read('build/sync-consumers.mjs');
  assert.match(src, /--adopt/, 'expected an explicit --adopt path for first-time vendoring');
  assert.match(src, /if \(!existsSync\(p\.dst\)\)[\s\S]{0,200}?if \(!adopt\)/,
    'a missing destination must be skipped unless --adopt is passed');
  assert.match(src, /\.filter\(p => p\.present && existsSync\(p\.dst\)\)/,
    'drift() must only consider files that are already vendored');
});
