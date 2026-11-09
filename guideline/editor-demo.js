/* The live examples on the Editor parts page, driven by the same classic
   script a console loads (dist/editor-kit.js). */
(function () {
  const kit = window.NFCEditorKit;
  if (!kit) return;
  const host = name => document.querySelector(`[data-ed-demo="${name}"]`);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const demos = {
    rows(root) {
      const names = [['Contact details', 'Phone, email and links', false], ['Menu', '3 sections, 24 items', true], ['Booking', 'Takes bookings', true], ['Location', 'Rua do Lumiar 41', true], ['Questions', '7 questions', true], ['Reviews', '4.8 on Google', true]];
      const list = el('ul', 'ed-rows');
      const status = kit.autosaveStatus();
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'rows';
      const save = (what) => { log.textContent = what; status.set('saving'); setTimeout(() => status.set('saved'), 400); };
      const add = (name, summary, movable, at) => {
        const row = kit.blockRow({
          name, summary, movable,
          pills: name === 'Booking' ? [{ text: 'Page plan', tone: 'warning' }] : [],
          menu: movable ? [
            { label: 'Hide', onSelect: () => { row.update({ muted: true, pills: [{ text: 'Hidden' }] }); save(`${name} hidden`); } },
            { label: 'Delete', danger: true, confirm: { title: `Delete ${name}?`, detail: 'It leaves the page.', action: 'Delete' }, onSelect: () => {
              const before = row.el.nextSibling;
              row.el.remove();
              save(`${name} deleted`);
              kit.undoToast({ message: `${name} deleted.`, onUndo: () => { list.insertBefore(row.el, before); save(`${name} restored`); } });
            } },
          ] : [],
          onToggle: () => {},
        });
        row.el.dataset.name = name;
        if (!movable) row.el.dataset.fixed = '1';
        row.body.append(el('p', 'ks-note', `The form for ${name} goes here. Escape closes it.`));
        list.insertBefore(row.el, at || null);
      };
      names.forEach(([n, s, m]) => add(n, s, m));
      kit.sortable(list, { items: '.ed-row', label: n => n.dataset.name, isFixed: n => n.dataset.fixed, onMove: ({ from, to, item }) => save(`${item.dataset.name}: ${from} to ${to}`) });
      root.append(status.el, list, log);
    },
    sheet(root) {
      const open = el('button', 'btn btn-secondary btn-sm', 'Open the sheet');
      open.type = 'button';
      open.dataset.edOpenSheet = '';
      open.addEventListener('click', () => {
        const body = el('div', 'stack');
        const field = el('div', 'field');
        const label = el('label', 'field-label', 'Button label');
        label.htmlFor = 'ed-demo-sheet-input';
        const input = el('input', 'input');
        input.id = 'ed-demo-sheet-input';
        field.append(label, input);
        const undo = el('button', 'btn btn-secondary btn-sm', 'Change template');
        undo.type = 'button';
        undo.addEventListener('click', () => kit.undoToast({ message: 'Template changed.', onUndo: () => {} }));
        body.append(field, undo);
        kit.sheet({ title: 'Booking', body }).open();
      });
      root.append(open);
    },
    status(root) {
      const status = kit.autosaveStatus();
      const row = el('div', 'ks-row');
      for (const state of ['saving', 'saved', 'retrying', 'failed', 'updated', 'readOnly']) {
        const b = el('button', 'btn btn-secondary btn-sm', state);
        b.type = 'button';
        b.addEventListener('click', () => status.set(state));
        row.append(b);
      }
      const out = el('button', 'btn btn-secondary btn-sm', 'signedOut');
      out.type = 'button';
      out.addEventListener('click', () => status.set('signedOut', { href: '#' }));
      row.append(out);
      root.append(row, status.el);
    },
    split(root) {
      const split = kit.split(root.querySelector('.ed-split'));
      root.querySelectorAll('[data-view-set]').forEach(b => b.addEventListener('click', () => split.setView(b.dataset.viewSet)));
    },
  };
  document.addEventListener('DOMContentLoaded', () => {
    for (const [name, build] of Object.entries(demos)) { const el = host(name); if (el) build(el); }
  });
})();
