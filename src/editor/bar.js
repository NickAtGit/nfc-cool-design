/* A small picture of the page's bottom bar, for the Bar panel. It is a picture:
   nothing in it can be pressed. The words come from the caller.

     const bar = NFCEditorKit.barPreview({ main: 'Book a table', save: true });
     bar.update({ main: null }); */
import { word } from './config.js';
import { h, icon } from './dom.js';

export function barPreview({ main = null, save = false, label } = {}) {
  const el = h('div', { class: 'ed-bar', role: 'img' });
  const state = { main, save };
  function paint() {
    const saveLabel = label || word('barSave');
    el.setAttribute('aria-label', [state.main || word('barNoMain'), state.save ? saveLabel : null].filter(Boolean).join(', '));
    el.classList.toggle('is-empty', !state.main && !state.save);
    el.replaceChildren(
      state.main ? h('span', { class: 'ed-bar-main', 'aria-hidden': 'true' }, state.main) : null,
      state.save && state.main ? h('span', { class: 'ed-bar-save', 'aria-hidden': 'true' }, icon('save')) : null,
      state.save && !state.main ? h('span', { class: 'ed-bar-main', 'aria-hidden': 'true' }, saveLabel) : null,
      !state.main && !state.save ? h('span', { class: 'ed-bar-none', 'aria-hidden': 'true' }, word('barNoMain')) : null,
    );
  }
  paint();
  return { el, update(next) { Object.assign(state, next); paint(); } };
}
