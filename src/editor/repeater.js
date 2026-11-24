/* A list of rows the person adds to, reorders and removes from: a form's
   sections, questions, opening places. It owns the order and the row chrome;
   the row's own fields are the caller's.

     const r = NFCEditorKit.repeater({
       items: [...], newItem: () => ({ q: '' }), addLabel: 'Add a question', max: 30,
       name: item => item.q || 'Question',
       renderRow: (fields, item, row) => { fields.append(...); },
       confirmRemove: item => ({ title: 'Remove this question?', detail: 'It leaves the page.', action: 'Remove' }),
       onChange: items => {},
     });

   A row with a required value still empty is held back by the caller, which
   says so with row.setHeld(true): the "Not on the page yet" pill.

   collapse: { summary: item => '...', when: items => bool } folds each row
   behind a button, and the fields of a folded row do not exist. */
import { cls, say, word } from './config.js';
import { ask } from './confirm.js';
import { h, icon, uid } from './dom.js';
import { reorder } from './sortable-core.js';
import { sortable } from './sortable.js';

export function repeater(options) {
  const { newItem, addLabel, max = Infinity, name = () => word('rowName'), renderRow, confirmRemove, onChange, collapse, sortableRows = true } = options;
  let items = [...(options.items || [])];
  const rows = new Map();
  const list = h('ul', { class: 'ed-rep-rows' });
  const add = h('button', { type: 'button', class: `${cls('buttonSecondary')} ${cls('buttonSmall')}`, onclick: addRow }, icon('plus'), addLabel);
  const limit = h('p', { class: `${cls('fieldHint')} ed-rep-limit`, hidden: true });
  const el = h('div', { class: 'ed-rep' }, list, h('div', { class: 'ed-rep-foot' }, add, limit));
  const folded = () => Boolean(collapse && (!collapse.when || collapse.when(items)));

  const changed = () => { paintLimit(); if (onChange) onChange(items.slice()); };
  function paintLimit() {
    const full = items.length >= max;
    add.disabled = full;
    limit.hidden = !full;
    limit.textContent = full ? say('repeaterFull', { max }) : '';
  }

  function buildRow(item) {
    const fields = h('div', { class: 'ed-rep-fields' });
    const held = h('span', { class: `${cls('pillWarning')} ed-rep-held`, hidden: true }, word('heldBack'));
    const remove = h('button', {
      type: 'button', class: 'ed-rep-remove', 'aria-label': say('removeItem', { name: name(item) }),
      onclick: async () => {
        const question = confirmRemove ? confirmRemove(item) : { title: say('removeAsk', { name: name(item) }), action: word('remove') };
        if (await ask(question)) removeRow(item);
      },
    }, icon('close'));
    const handle = sortableRows ? h('button', { type: 'button', class: 'ed-handle', 'data-ed-handle': '', 'aria-label': say('moveItem', { name: name(item) }) }, icon('grip')) : null;
    const li = h('li', { class: 'ed-rep-row' });
    const row = {
      el: li, item,
      setHeld(on) { held.hidden = !on; },
      /* The name changed: the handle and the remove button say the new one. */
      refresh() {
        const n = name(item);
        if (handle) handle.setAttribute('aria-label', say('moveItem', { name: n }));
        remove.setAttribute('aria-label', say('removeItem', { name: n }));
        if (toggle) summary.textContent = collapse.summary(item);
      },
      open(on) { if (toggle) setFold(on); },
      changed,
    };
    let toggle = null;
    let summary = null;
    function setFold(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && !fields.childNodes.length) renderRow(fields, item, row);
      if (!open) fields.replaceChildren();
      summary.textContent = collapse.summary(item);
      fields.hidden = !open;
    }
    const head = h('div', { class: 'ed-rep-head' }, handle);
    if (collapse) {
      const fieldsId = uid('ed-rep-fields');
      fields.id = fieldsId;
      summary = h('span', { class: 'ed-rep-summary' });
      toggle = h('button', { type: 'button', class: 'ed-rep-toggle', 'aria-expanded': 'false', 'aria-controls': fieldsId, onclick: () => setFold(toggle.getAttribute('aria-expanded') !== 'true') }, icon('chevron'), summary);
      head.append(toggle, held, remove);
      li.append(head, fields);
      setFold(!folded());
    } else {
      head.append(held, remove);
      li.append(head, fields);
      renderRow(fields, item, row);
    }
    li.classList.toggle('is-foldable', Boolean(collapse));
    rows.set(item, row);
    return li;
  }

  function addRow() {
    if (items.length >= max) return;
    const item = newItem();
    items.push(item);
    const li = buildRow(item);
    list.append(li);
    changed();
    const row = rows.get(item);
    row.open(true);
    const first = li.querySelector('.ed-rep-fields input, .ed-rep-fields textarea, .ed-rep-fields select');
    if (first) first.focus();
  }

  function removeRow(item) {
    const index = items.indexOf(item);
    const next = list.children[index + 1] || list.children[index - 1];
    rows.get(item).el.remove();
    rows.delete(item);
    items.splice(index, 1);
    changed();
    const focus = next ? next.querySelector('.ed-handle, button') : add;
    if (focus) focus.focus();
  }

  items.forEach(item => list.append(buildRow(item)));
  paintLimit();
  const sorter = sortableRows ? sortable(list, {
    items: '.ed-rep-row',
    label: li => name(items[[...list.children].indexOf(li)] || {}),
    onMove: ({ from, to }) => { items = reorder(items, from, to); changed(); },
  }) : null;

  return {
    el,
    value: () => items.slice(),
    rowOf: item => rows.get(item),
    /* Puts the rows in this order without firing onChange: the value's meaning
       did not change, only where the rows stand. */
    sort(compare) {
      items = items.slice().sort(compare);
      items.forEach(item => list.append(rows.get(item).el));
    },
    destroy() { if (sorter) sorter.destroy(); },
  };
}
