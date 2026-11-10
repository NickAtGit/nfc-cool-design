/* The block library, for the Add sheet: suggested kinds, then all of them.

     NFCEditorKit.blockLibrary({
       suggested: ['book'], all: [{ kind: 'book', name: 'Booking', summary: '...', added: true, pill: 'Page plan' }],
       full: false, onPick: kind => {},
     }); */
import { cls, word } from './config.js';
import { h, icon } from './dom.js';

export function blockLibrary({ suggested = [], all, full = false, fullNote, onPick }) {
  const byKind = new Map(all.map(item => [item.kind, item]));
  const button = item => h('button', { type: 'button', class: 'ed-lib-item', disabled: full, dataset: { kind: item.kind }, onclick: () => onPick(item.kind) },
    h('span', { class: 'ed-lib-head' },
      h('span', { class: 'ed-lib-name' }, item.name),
      item.added ? h('span', { class: 'ed-lib-tick' }, icon('check'), h('span', { class: 'sr-only' }, word('libraryAdded'))) : null,
      item.pill ? h('span', { class: cls('pillWarning') }, item.pill) : null),
    h('span', { class: 'ed-lib-summary' }, item.summary));
  const section = (title, items) => (items.length
    ? h('section', { class: 'ed-lib-section' }, h('h3', { class: 'ed-lib-title' }, title), h('div', { class: 'ed-lib-grid' }, items.map(button)))
    : null);
  const picks = suggested.map(k => byKind.get(k)).filter(Boolean);
  const el = h('div', { class: 'ed-lib' },
    full ? h('p', { class: cls('fieldHint') }, fullNote || word('libraryFull')) : null,
    section(word('librarySuggested'), picks),
    section(word('libraryAll'), all));
  return { el };
}
