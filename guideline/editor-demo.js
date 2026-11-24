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
      const party = kit.stepper({ label: 'Largest party', value: 8, min: 1, max: 50, onChange: v => show('party', v) });
      const grid = el('div', 'stack');
      grid.append(price.el, url.el, site.el, rating.el, party.el, out);
      root.append(grid);
    },
    segmented(root) {
      const out = el('p', 'ks-note');
      kit.segmented(root.querySelector('.fu-switch'), { value: 'blocks', onChange: v => { out.textContent = `Now showing ${v}`; } });
      root.append(out);
    },
    hours(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'hours';
      const show = (v, ok) => { log.textContent = `${ok ? 'valid' : 'invalid'} ${JSON.stringify(v)}`; };
      const e = kit.hoursEditor({ shape: 'booking', value: [{ day: 1, windows: [{ open: '09:00', close: '13:00' }, { open: '14:00', close: '24:00' }] }, { day: 2, windows: [{ open: '10:00', close: '18:00' }] }], onChange: show });
      show(e.value(), e.valid());
      root.append(e.el, log);
    },
    hoursPlace(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'hoursPlace';
      const show = (v, ok) => { log.textContent = `${ok ? 'valid' : 'invalid'} ${JSON.stringify(v)}`; };
      const e = kit.hoursEditor({ shape: 'place', value: [{ day: 1, open: '07:30', close: '19:00' }], onChange: show });
      show(e.value(), e.valid());
      root.append(e.el, log);
    },
    dates(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'dates';
      const show = (v, ok) => { log.textContent = `${ok ? 'valid' : 'invalid'} ${JSON.stringify(v)}`; };
      const e = kit.dateRanges({ value: [{ from: '2026-12-24', to: '2026-12-26', note: 'Christmas' }, { from: '2026-11-20', to: '2026-11-20', note: null }], onChange: show });
      show(e.value(), e.valid());
      root.append(e.el, log);
    },
    media(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'media';
      const swatch = hue => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="hsl(${hue} 70% 55%)"/></svg>`)}`;
      const show = v => { log.textContent = JSON.stringify(v.map(i => i.id)); };
      let next = 10;
      const g = kit.mediaGrid({
        items: [{ id: 1, url: swatch(10) }, { id: 2, url: swatch(130) }, { id: 3, url: swatch(220) }, { id: 4, url: swatch(300) }],
        captions: true, maxItems: 8, pickMax: 3, maxBytes: 1024 * 1024, spec: 'Up to 1 MB',
        upload: file => new Promise((res, rej) => setTimeout(() => (file.name.includes('fail') ? rej(new Error(`${file.name} was refused.`)) : res({ id: next++, url: swatch(next * 37) })), 150)),
        onChange: show,
      });
      show(g.value());
      root.append(g.el, log);
    },
    files(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'files';
      const show = v => { log.textContent = JSON.stringify(v.map(i => i.title)); };
      let next = 100;
      const f = kit.fileList({ items: [{ id: 1, url: '#', title: 'Wine list' }, { id: 2, url: '#', title: '' }], maxItems: 4, spec: 'PDF, up to 20 MB', upload: () => new Promise(res => setTimeout(() => res({ id: next++, url: '#' }), 100)), onChange: show });
      show(f.value());
      root.append(f.el, log);
    },
    mapOff(root) {
      const address = el('input', 'input');
      address.setAttribute('aria-label', 'Address');
      const pin = kit.mapPin({ getAddress: () => address.value, token: () => Promise.resolve({ available: false }) });
      address.addEventListener('input', pin.addressChanged);
      root.append(address, pin.el);
      root.style.display = 'grid';
      root.style.gap = 'var(--space-3)';
    },
    mapFake(root) {
      /* A stand-in for MapKit JS, which needs a real key: the same calls, no tiles. */
      const lookups = [];
      const mapkit = {
        FeatureVisibility: { Hidden: 'hidden' },
        init(o) { o.authorizationCallback(() => {}); },
        Coordinate: function (a, b) { this.latitude = a; this.longitude = b; },
        MarkerAnnotation: function (c) { this.coordinate = c; this.addEventListener = () => {}; },
        Geocoder: function () { this.lookup = (a, cb) => { lookups.push(a); root.dataset.lookups = String(lookups.length); setTimeout(() => (a.includes('nowhere') ? cb(null, { results: [] }) : cb(null, { results: [{ coordinate: { latitude: 38.7, longitude: -9.1 } }] })), 10); }; },
        Map: function (node) {
          node.textContent = 'MapKit stand-in: click to place the pin';
          node.style.cursor = 'pointer';
          const hs = {};
          this.addEventListener = (t, f) => { hs[t] = f; };
          this.addAnnotation = (m) => { root.dataset.marker = `${m.coordinate.latitude},${m.coordinate.longitude}`; };
          this.removeAnnotation = () => { delete root.dataset.marker; };
          this.setCenterAnimated = () => {};
          this.convertPointOnPageToCoordinate = () => ({ latitude: 41.15, longitude: -8.61 });
          this.destroy = () => {};
          node.addEventListener('click', () => hs['single-tap'] && hs['single-tap']({ pointOnPage: {} }));
        },
      };
      mapkit.Map.ColorSchemes = { Dark: 'dark', Light: 'light' };
      const address = el('input', 'input');
      address.setAttribute('aria-label', 'Address');
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'map';
      const pin = kit.mapPin({ getAddress: () => address.value, token: () => Promise.resolve('token'), loadMapKit: () => Promise.resolve(mapkit), onChange: v => { log.textContent = JSON.stringify(v); } });
      address.addEventListener('input', pin.addressChanged);
      root.append(address, pin.el, log);
      root.style.display = 'grid';
      root.style.gap = 'var(--space-3)';
    },
    look(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'look';
      const show = (k, v) => { log.textContent = `${k}=${v}`; };
      const sw = kit.swatches({ legend: 'Presets', value: 'ocean', onChange: v => show('swatch', v), options: [
        { value: 'ocean', label: 'Ocean', color: '#0B4F6C', accent: '#01BAEF' }, { value: 'paper', label: 'Paper', color: '#FFFFFF', accent: '#F5F6F8' },
        { value: 'ink', label: 'Ink', color: '#1C2128', accent: '#1C2128' }, { value: 'sun', label: 'Sun', color: '#FFC700', accent: '#E85D04' } ] });
      const t = kit.templateCards({ legend: 'Template', value: 'brand', onChange: v => show('template', v), options: [{ value: 'brand', name: 'Brand-led', note: 'Your colours up front' }, { value: 'menu', name: 'Menu card', note: 'Paper and type' }, { value: 'bento', name: 'Bento', note: 'Tiles' }] });
      const locked = kit.templateCards({ legend: 'Template, chosen by the team', value: 'menu', disabled: true, disabledNote: 'Your team chose this template.', options: [{ value: 'brand', name: 'Brand-led' }, { value: 'menu', name: 'Menu card' }, { value: 'bento', name: 'Bento' }] });
      const loaded = [];
      const f = kit.fontPicker({ legend: 'Font', value: null, onChange: v => show('font', v), load: (font) => { loaded.push(font.name); root.dataset.loaded = String(loaded.length); return Promise.resolve(false); },
        catalog: Array.from({ length: 40 }, (_, i) => ({ name: `Face ${i + 1}`, category: i < 20 ? 'sans' : 'script', files: {} })) });
      const stack = el('div', 'stack');
      stack.style.display = 'grid'; stack.style.gap = 'var(--space-5)';
      stack.append(sw.el, t.el, locked.el, f.el, log);
      root.append(stack);
    },
    library(root) {
      const log = el('p', 'ks-note');
      log.dataset.edLog = 'library';
      const all = [
        { kind: 'book', name: 'Booking', summary: 'Take bookings on the page', pill: 'Page plan' },
        { kind: 'offer', name: 'Menu & prices', summary: 'What you sell and for how much', added: true },
        { kind: 'find', name: 'Location', summary: 'Where you are and when' },
        { kind: 'questions', name: 'Questions', summary: 'What people ask' },
      ];
      const open = (full) => kit.sheet({ title: 'Add block', body: kit.blockLibrary({ suggested: ['find'], all, full, onPick: (k) => { log.textContent = k; document.querySelector('dialog.ed-sheet').close(); } }).el }).open();
      const row = el('div', 'ks-row');
      const a = el('button', 'btn btn-secondary btn-sm', 'Add block');
      const b = el('button', 'btn btn-secondary btn-sm', 'Add block, page full');
      a.type = b.type = 'button';
      a.addEventListener('click', () => open(false));
      b.addEventListener('click', () => open(true));
      row.append(a, b);
      root.append(row, kit.blockLibrary({ suggested: ['find'], all, onPick: (k) => { log.textContent = k; } }).el, log);
    },
    bar(root) {
      const a = kit.barPreview({ main: 'Book a table', save: true });
      const c = kit.barPreview({ main: 'A very long main button label that has to be cut short on a phone', save: true });
      const b = kit.barPreview({ main: null, save: false });
      root.style.display = 'grid'; root.style.gap = 'var(--space-3)';
      root.append(a.el, c.el, b.el);
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
