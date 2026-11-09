/* The autosave status line. Seen at every step; spoken only where a burst of
   saving ends, so a screen reader is not told "Saving" on each pause.

     const status = NFCEditorKit.autosaveStatus();
     toolbar.append(status.el);
     status.set('saving');
     status.set('signedOut', { href: '/login/' });
     status.set('failed', { message: 'A sentence of its own.' });

   States: idle, saving, saved, retrying, failed, updated, signedOut, readOnly. */
import { word } from './config.js';
import { h } from './dom.js';

const SILENT = new Set(['idle', 'saving']);
const ALERT = new Set(['failed', 'signedOut', 'readOnly']);

export function autosaveStatus() {
  const dot = h('span', { class: 'ed-status-dot', 'aria-hidden': 'true' });
  const text = h('span', { class: 'ed-status-text', 'aria-hidden': 'true' });
  const spoken = h('span', { class: 'sr-only', role: 'status' });
  const alarm = h('span', { class: 'sr-only', role: 'alert' });
  const el = h('div', { class: 'ed-status', dataset: { state: 'idle' } }, dot, text, spoken, alarm);
  let current = 'idle';

  return {
    el,
    state: () => current,
    set(state, { message, href } = {}) {
      const words = message || (state === 'idle' ? '' : word(`status_${state}`));
      const changed = state !== current || words !== text.textContent.replace(/\s+$/, '');
      current = state;
      el.dataset.state = state;
      text.replaceChildren(words);
      if (href) { text.removeAttribute('aria-hidden'); text.append(' ', h('a', { href }, word('signIn'))); } else text.setAttribute('aria-hidden', 'true');
      if (!changed || SILENT.has(state)) return;
      spoken.textContent = '';
      alarm.textContent = '';
      (ALERT.has(state) ? alarm : spoken).textContent = words;
    },
  };
}
