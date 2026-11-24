/* Days off: a list of dates, sorted, one day or several, each with a short
   note. A row with no date yet is not sent.

     NFCEditorKit.dateRanges({ value: [{ from, to, note }], onChange: (value, valid) => {} }); */
import { cls, say, word } from './config.js';
import { h } from './dom.js';
import { fieldShell } from './fields.js';
import { repeater } from './repeater.js';

export const compareRanges = (a, b) => (a.from || '9999').localeCompare(b.from || '9999') || (a.to || '').localeCompare(b.to || '');

export const rangeProblem = r => (r.from && r.multi && r.to && r.to < r.from ? 'datesOrder' : null);

/* What the schema takes: sorted, every row complete, a single day as from = to. */
export function serializeRanges(rows) {
  return rows.filter(r => r.from).slice().sort(compareRanges).map(r => ({
    from: r.from,
    to: r.multi && r.to ? r.to : r.from,
    note: (r.note || '').trim() || null,
  }));
}

export function readRanges(value) {
  return (value || []).map(r => ({ from: r.from, to: r.to, note: r.note || '', multi: Boolean(r.to && r.to !== r.from) }));
}

export function dateRanges({ value, onChange, max = 50, noteMax = 80 }) {
  const items = readRanges(value).sort(compareRanges);
  const valid = rows => rows.every(r => !rangeProblem(r));
  const emit = rows => { if (onChange) onChange(serializeRanges(rows), valid(rows)); };
  const nameOf = r => r.from || word('datesNew');

  const list = repeater({
    items, max, sortableRows: false,
    addLabel: word('datesAdd'),
    newItem: () => ({ from: '', to: '', note: '', multi: false }),
    name: nameOf,
    confirmRemove: r => ({ title: r.from ? say('datesRemoveAsk', { date: r.from }) : word('datesRemoveEmpty'), action: word('remove') }),
    onChange: emit,
    renderRow(fields, item, row) {
      const from = h('input', { class: cls('input'), type: 'date', value: item.from });
      const fromField = fieldShell({ label: word('datesFrom'), control: from });
      const to = h('input', { class: cls('input'), type: 'date', value: item.to && item.multi ? item.to : '' });
      const toField = fieldShell({ label: word('datesTo'), control: to });
      toField.el.hidden = !item.multi;
      const multi = h('input', { class: cls('switchInput'), type: 'checkbox', role: 'switch', checked: item.multi });
      const multiRow = h('label', { class: cls('switchRow') }, h('span', { class: cls('switchLabel') }, word('datesMulti')), multi);
      const note = h('input', { class: cls('input'), type: 'text', maxlength: String(noteMax), value: item.note });
      const noteField = fieldShell({ label: word('datesNote'), control: note });
      const check = () => { toField.setError(rangeProblem(item) ? word(rangeProblem(item)) : ''); };
      const changed = () => { check(); row.setHeld(!item.from); row.refresh(); row.changed(); };
      from.addEventListener('change', () => { item.from = from.value; changed(); });
      to.addEventListener('change', () => { item.to = to.value; changed(); });
      multi.addEventListener('change', () => { item.multi = multi.checked; toField.el.hidden = !multi.checked; if (!multi.checked) { item.to = ''; to.value = ''; } changed(); });
      note.addEventListener('input', () => { item.note = note.value; row.changed(); });
      row.setHeld(!item.from);
      fields.append(h('div', { class: 'ed-dates-pair' }, fromField.el, toField.el), multiRow, noteField.el);
      check();
    },
  });

  /* Sorted when the focus leaves a row, so a row does not jump from under the
     date being typed. Moving a row by then cannot take the focus with it. */
  list.el.addEventListener('focusout', (e) => {
    const from = e.target.closest('.ed-rep-row');
    if (from && !from.contains(e.relatedTarget)) list.sort(compareRanges);
  });

  return { el: list.el, value: () => serializeRanges(list.value()), valid: () => valid(list.value()) };
}
