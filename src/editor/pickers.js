/* The Look panel's pickers. All three are native radios, painted, so the arrow
   keys, the form and the screen reader come for free.

     NFCEditorKit.swatches({ legend, options: [{ value, label, color, accent }], value, onChange });
     NFCEditorKit.templateCards({ legend, options: [{ value, name, note }], value, disabled, disabledNote, onChange });
     NFCEditorKit.fontPicker({ legend, catalog, value, onChange });   // value null is Default */
import { cls, word } from './config.js';
import { h, icon, uid } from './dom.js';

function group(legend, className, children) {
  return h('fieldset', { class: className }, legend ? h('legend', { class: cls('fieldLabel') }, legend) : null, children);
}

function radioSet({ value, onChange, disabled }) {
  const name = uid('ed-radio');
  let current = value;
  return {
    radio(v, extra = {}) {
      return h('input', {
        class: 'sr-only', type: 'radio', name, checked: v === current, disabled: Boolean(disabled),
        onchange: () => { current = v; if (onChange) onChange(v); },
        ...extra,
      });
    },
    value: () => current,
  };
}

export function swatches({ legend, options, value, disabled, onChange }) {
  const set = radioSet({ value, onChange, disabled });
  const items = options.map((o) => {
    const fill = h('span', { class: 'ed-swatch-fill' });
    fill.style.setProperty('--ed-swatch', o.color);
    fill.style.setProperty('--ed-swatch-2', o.accent || o.color);
    return h('label', { class: 'ed-swatch', title: o.label }, set.radio(o.value), fill, h('span', { class: 'sr-only' }, o.label));
  });
  return { el: group(legend, 'ed-swatches', items), value: set.value };
}

export function templateCards({ legend, options, value, disabled, disabledNote, onChange }) {
  const set = radioSet({ value, onChange, disabled });
  const items = options.map(o => h('label', { class: 'ed-template' }, set.radio(o.value),
    h('span', { class: 'ed-template-name' }, o.name), o.note ? h('span', { class: 'ed-template-note' }, o.note) : null));
  const el = group(legend, `ed-templates${disabled ? ' is-disabled' : ''}`, [
    h('div', { class: 'ed-templates-grid' }, items),
    disabled && disabledNote ? h('p', { class: cls('fieldHint') }, disabledNote) : null,
  ]);
  return { el, value: set.value };
}

/* Categories in the order the catalog first names them. */
export function groupFonts(catalog) {
  const groups = new Map();
  for (const font of catalog) {
    if (!groups.has(font.category)) groups.set(font.category, []);
    groups.get(font.category).push(font);
  }
  return [...groups].map(([category, fonts]) => ({ category, fonts }));
}

const loaded = new Map();
function loadFace(font) {
  if (loaded.has(font.name)) return loaded.get(font.name);
  const files = font.files || {};
  const url = files['400'] || Object.values(files)[0];
  if (!url || typeof FontFace === 'undefined') return Promise.resolve(false);
  const face = new FontFace(font.name, `url("${url}")`);
  const job = face.load().then((f) => { document.fonts.add(f); return true; }).catch(() => false);
  loaded.set(font.name, job);
  return job;
}

export function fontPicker({ legend, catalog, value = null, disabled, sample, onChange, load = loadFace }) {
  const set = radioSet({ value, onChange, disabled });
  const text = sample || word('fontSample');
  const row = (v, label, sampled) => h('label', { class: 'ed-font' }, set.radio(v),
    h('span', { class: 'ed-font-name' }, label), sampled, h('span', { class: 'ed-font-tick', 'aria-hidden': 'true' }, icon('check')));
  const samples = new Map();
  const list = h('div', { class: 'ed-font-list' }, row(null, word('fontDefault'), null));
  for (const { category, fonts } of groupFonts(catalog)) {
    list.append(h('p', { class: 'ed-font-group' }, (word('fontCategories')[category]) || category));
    for (const font of fonts) {
      const s = h('span', { class: 'ed-font-sample', 'aria-hidden': 'true' }, text);
      samples.set(s, font);
      list.append(row(font.name, font.name, s));
    }
  }
  /* A face costs a download, so only the ones scrolled into view are fetched. */
  const paint = async (s) => {
    const font = samples.get(s);
    if (await load(font)) s.style.fontFamily = `"${font.name}"`;
  };
  if ('IntersectionObserver' in window) {
    const watch = new IntersectionObserver((entries) => {
      entries.filter(e => e.isIntersecting).forEach((e) => { watch.unobserve(e.target); paint(e.target); });
    }, { root: list, rootMargin: '120px' });
    samples.forEach((_, s) => watch.observe(s));
  } else samples.forEach((_, s) => paint(s));
  return { el: group(legend, 'ed-fonts', list), value: set.value };
}
