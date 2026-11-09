/* Joins src/editor/*.js into one classic script, dist/editor-kit.js
   (window.NFCEditorKit). Not an ES module on purpose: a consumer's production
   static files sit on a CDN, and type="module" from another origin needs CORS
   headers a classic <script> does not.

   The sources are ES modules so the pure logic runs under node --test as it
   stands. Only three forms of module syntax are allowed, and anything else
   throws here rather than ship a script that fails in the browser:
     import { a, b } from './other.js';
     export function name / export async function name / export const name / export class Name
   Each module becomes a function scope, so two of them can share a local name.
   Comment-only lines are dropped: the editor's scripts have a size budget
   (the spec's 60 KB gzipped, with the page's own script) and comments are not
   what a browser needs. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*'\.\/([\w-]+)\.js';[ \t]*$/gm;
const EXPORT = /^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

function parse(dir, file) {
  const name = file.replace(/\.js$/, '');
  const raw = readFileSync(join(dir, file), 'utf8');
  const imports = [];
  let body = raw.replace(IMPORT, (_, names, from) => {
    imports.push({ names: names.split(',').map(s => s.trim()).filter(Boolean), from });
    return '';
  });
  const exports = [];
  body = body.replace(EXPORT, (_, kind, id) => { exports.push(id); return `${kind} ${id}`; });
  for (const line of body.split('\n')) {
    if (/^\s*(import|export)\b(?!\s*\()/.test(line)) throw new Error(`src/editor/${file}: module syntax the bundle cannot join: ${line.trim()}`);
  }
  for (const { names } of imports) {
    if (names.some(n => /\s/.test(n))) throw new Error(`src/editor/${file}: "import { a as b }" is not supported`);
  }
  return { name, body, imports, exports };
}

/* Whole-line comments only, with the block form tracked line by line: nothing
   inside a string or a template is ever touched, because a line is only
   dropped when a comment starts it. */
function dropCommentLines(src) {
  const out = [];
  let inBlock = false;
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (inBlock) { if (t.includes('*/')) inBlock = false; continue; }
    if (t.startsWith('//')) continue;
    if (t.startsWith('/*')) { if (!t.includes('*/')) inBlock = true; else if (!t.endsWith('*/')) out.push(line); continue; }
    if (t) out.push(line);
  }
  return out.join('\n');
}

export function bundleEditorKit(root, banner) {
  const dir = join(root, 'src/editor');
  const mods = new Map(readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => { const m = parse(dir, f); return [m.name, m]; }));
  if (!mods.has('index')) throw new Error('src/editor/index.js is the public API and must exist');
  const order = [], state = new Map();
  const visit = (name, from) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'busy') throw new Error(`src/editor: import cycle through ${name}`);
    const m = mods.get(name);
    if (!m) throw new Error(`src/editor/${from}.js imports ./${name}.js, which does not exist`);
    state.set(name, 'busy');
    for (const i of m.imports) visit(i.from, name);
    state.set(name, 'done');
    order.push(m);
  };
  visit('index');
  const unused = [...mods.keys()].filter(n => !state.has(n));
  if (unused.length) throw new Error(`src/editor: not reachable from index.js: ${unused.join(', ')}`);
  const blocks = order.map(m => {
    const pulls = m.imports.map(i => {
      const missing = i.names.filter(n => !mods.get(i.from).exports.includes(n));
      if (missing.length) throw new Error(`src/editor/${m.name}.js imports ${missing.join(', ')} from ${i.from}.js, which does not export it`);
      return `  const { ${i.names.join(', ')} } = modules[${JSON.stringify(i.from)}];`;
    }).join('\n');
    return `modules[${JSON.stringify(m.name)}] = (function () {\n${pulls}\n${dropCommentLines(m.body)}\n  return { ${m.exports.join(', ')} };\n})();`;
  });
  return `${banner}(function () {\n'use strict';\nconst modules = {};\n${blocks.join('\n')}\nwindow.NFCEditorKit = modules.index.kit;\n})();\n`;
}
