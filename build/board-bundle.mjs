/* The board as a layer of its own, for a host that vendors only the tokens
   and draws its own components (the business console's leads board,
   2026-11-24).

   dist/board.css: the regions of src/components.css between the
   /* @board *\/ and /* @end board *\/ markers, in file order. The rules stay in
   components.css (design.css and the guideline keep them, and every guard that
   reads components.css still reads them); this only cuts them out.

   dist/board-kit.js: src/board.js as one classic script, window.NFCBoard. Not
   an ES module on purpose, as editor-kit.js: a consumer's production static
   files sit on a CDN, and type="module" from another origin needs CORS. It
   does not start itself: the host calls NFCBoard.initBoard() when its board is
   on the page. */

const OPEN = '/* @board */';
const CLOSE = '/* @end board */';

export function boardLayer(css, banner = '') {
  const parts = [];
  let at = 0;
  for (;;) {
    const start = css.indexOf(OPEN, at);
    if (start === -1) break;
    const end = css.indexOf(CLOSE, start);
    if (end === -1) throw new Error('src/components.css: a /* @board */ without its /* @end board */');
    parts.push(css.slice(start + OPEN.length, end).trim());
    at = end + CLOSE.length;
  }
  if (!parts.length) throw new Error('src/components.css marks no board region');
  return banner + parts.join('\n\n') + '\n';
}

const AUTO = /^if \(!import\.meta\?\.url\?\.includes\('no-auto'\)\) \{\n[\s\S]*?\n\}\n?/m;
const EXPORT = /^export\s+(?=(?:async\s+)?function|const|let|class)/gm;

export function boardClassic(js, banner = '') {
  if (!AUTO.test(js)) throw new Error('src/board.js: the auto-start block the classic build removes has changed');
  let body = js.replace(AUTO, '');
  const names = [...body.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  body = body.replace(EXPORT, '');
  for (const line of body.split('\n')) {
    if (/^\s*(import|export)\s/.test(line) || line.includes('import.meta')) {
      throw new Error(`src/board.js: module syntax the classic build cannot carry: ${line.trim()}`);
    }
  }
  return `${banner}(function () {\n'use strict';\n${body}\nwindow.NFCBoard = { ${names.join(', ')} };\n})();\n`;
}
