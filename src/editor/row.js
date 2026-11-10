/* The block row: drag handle, the button that opens the form, its pills, its
   one menu. The form is the caller's, and only the open one is in the DOM.

     const row = NFCEditorKit.blockRow({
       name: 'Menu', summary: '3 sections', pills: [{ text: 'Hidden' }],
       movable: true, muted: false,
       menu: [{ label: 'Hide', onSelect }, { label: 'Delete', danger: true,
               confirm: { title: 'Delete Menu?', detail: '...', action: 'Delete' }, onSelect }],
       onToggle: open => {},
     });
     list.append(row.el);  row.body.append(form);  row.setOpen(true);

   Escape inside the form closes it and hands focus back to the row. */
import { cls, say } from './config.js';
import { ask } from './confirm.js';
import { h, icon, uid } from './dom.js';

function menuOf(name, items) {
  const details = h('details', { class: cls('rowMenu') });
  const panel = h('div', { class: cls('rowMenuPanel') });
  details.append(h('summary', { 'aria-label': say('actionsFor', { name }) }, icon('dots')), panel);
  items.forEach((item) => {
    if (item.danger && panel.children.length) panel.append(h('div', { class: cls('rowMenuSeparator'), role: 'separator' }));
    panel.append(h('button', {
      type: 'button',
      class: item.danger ? cls('rowMenuDanger') : cls('rowMenuItem'),
      onclick: async () => {
        details.open = false;
        if (item.confirm && !(await ask(item.confirm))) return;
        item.onSelect();
      },
    }, item.label));
  });
  return details;
}

export function blockRow(options) {
  const state = { name: '', summary: '', pills: [], movable: true, muted: false, menu: [], ...options };
  const bodyId = uid('ed-row-body');
  const title = h('span', { class: 'ed-row-title' });
  const summary = h('span', { class: 'ed-row-summary' });
  const main = h('button', {
    type: 'button', class: 'ed-row-main', 'aria-expanded': 'false', 'aria-controls': bodyId,
    onclick: () => { api.setOpen(main.getAttribute('aria-expanded') !== 'true', true); },
  }, title, summary);
  const handleSlot = h('span', { class: 'ed-row-handle' });
  const pills = h('span', { class: 'ed-row-pills' });
  const menuSlot = h('span', { class: 'ed-row-menu' });
  const message = h('p', { class: 'ed-row-message', role: 'alert', hidden: true });
  const body = h('div', { class: 'ed-row-body', id: bodyId, hidden: true });
  const el = h('li', { class: 'ed-row' }, h('div', { class: 'ed-row-head' }, handleSlot, main, pills, menuSlot), message, body);

  function paint() {
    title.textContent = state.name;
    summary.textContent = state.summary || '';
    summary.hidden = !state.summary;
    el.classList.toggle('is-muted', Boolean(state.muted));
    handleSlot.replaceChildren(state.movable
      ? h('button', { type: 'button', class: 'ed-handle', 'data-ed-handle': '', 'aria-label': say('moveItem', { name: state.name }) }, icon('grip'))
      : '');
    pills.replaceChildren(...state.pills.map(p => h('span', { class: cls(p.tone === 'warning' ? 'pillWarning' : 'pill') }, p.text)));
    menuSlot.replaceChildren(...(state.menu.length ? [menuOf(state.name, state.menu)] : []));
  }

  const api = {
    el, body,
    /* Name, summary, pills or menu changed: the open form is left alone. */
    update(partial) { Object.assign(state, partial); paint(); },
    isOpen: () => main.getAttribute('aria-expanded') === 'true',
    setOpen(open, fromUser) {
      main.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.hidden = !open;
      el.classList.toggle('is-open', open);
      if (fromUser && state.onToggle) state.onToggle(open);
    },
    /* A refusal that belongs to the block rather than to one of its fields. */
    setMessage(text) { message.textContent = text || ''; message.hidden = !text; },
    focus() { main.focus(); },
  };

  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !api.isOpen() || !body.contains(e.target)) return;
    if (e.target.closest('details[open]')) return;
    e.stopPropagation();
    api.setOpen(false, true);
    main.focus();
  });

  paint();
  return api;
}
