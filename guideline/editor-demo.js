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
    repeater(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'repeater';
      const seed = [{ q: 'Do you deliver?', a: 'Inside Lisbon.' }, { q: 'Is there parking?', a: 'Behind the shop.' }, { q: '', a: '' }];
      const show = items => { log.textContent = JSON.stringify(items.filter(i => i.q).map(i => i.q)); };
      const r = kit.repeater({
        items: seed, max: 5, addLabel: 'Add a question', newItem: () => ({ q: '', a: '' }),
        name: i => i.q || 'New question',
        confirmRemove: i => ({ title: `Remove ${i.q ? `"${i.q}"` : 'this question'}?`, detail: 'It leaves the page.', action: 'Remove' }),
        renderRow(fields, item, row) {
          const f = el('div', 'field');
          const l = el('span', 'field-label', 'Question');
          const input = el('input', 'input');
          input.value = item.q;
          input.addEventListener('input', () => { item.q = input.value; row.setHeld(!item.q); row.refresh(); row.changed(); });
          f.append(l, input);
          fields.append(f);
          row.setHeld(!item.q);
        },
        onChange: show,
      });
      show(seed);
      root.append(r.el, log);
    },
    fold(root) {
      const sections = [{ title: 'Starters', n: 8 }, { title: 'Mains', n: 16 }];
      const r = kit.repeater({
        items: sections, addLabel: 'Add a section', newItem: () => ({ title: 'New section', n: 0 }),
        name: i => i.title, collapse: { summary: i => `${i.title}: ${i.n} items` },
        renderRow(fields, item) { const input = el('input', 'input'); input.value = item.title; input.setAttribute('aria-label', 'Section name'); fields.append(input); },
      });
      root.append(r.el);
    },
    fields(root) {
      const out = el('p', 'ks-note');
      out.dataset.edLog = 'fields';
      const show = (k, v, ok) => { out.textContent = `${k}: ${JSON.stringify(v)} ${ok === false ? '(invalid)' : ''}`; };
      const price = kit.priceField({ label: 'Price', value: 12.5, locale: 'pt-PT', onChange: (v, ok) => show('price', v, ok) });
      const url = kit.urlField({ label: 'YouTube or Vimeo link', hosts: ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com'], hostError: 'Use a YouTube or Vimeo link.', onChange: (v, ok) => show('url', v, ok) });
      const site = kit.urlField({ label: 'Website', onChange: (v, ok) => show('site', v, ok) });
      const rating = kit.ratingField({ label: 'Score', value: 4.8, onChange: v => show('rating', v) });
      const grid = el('div', 'stack');
      grid.append(price.el, url.el, site.el, rating.el, out);
      root.append(grid);
    },
    segmented(root) {
      const out = el('p', 'ks-note');
      kit.segmented(root.querySelector('.fu-switch'), { value: 'blocks', onChange: v => { out.textContent = `Now showing ${v}`; } });
      root.append(out);
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
