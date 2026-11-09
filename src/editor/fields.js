/* The shell every editor field shares: the host's .field, its label, the error
   under it with aria-invalid and aria-describedby, in one place. */
import { cls } from './config.js';
import { h, uid } from './dom.js';

export function fieldShell({ label, control, labelFor = true }) {
  const id = control.id || uid('ed-field');
  control.id = id;
  const errorId = `${id}-error`;
  const error = h('p', { class: cls('fieldError'), id: errorId, hidden: true });
  const el = h('div', { class: cls('field') },
    label ? h(labelFor ? 'label' : 'span', { class: cls('fieldLabel'), for: labelFor ? id : null }, label) : null,
    control, error);
  return {
    el,
    setError(message) {
      error.textContent = message || '';
      error.hidden = !message;
      const input = control.matches('input, select, textarea') ? control : control.querySelector('input');
      if (message) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', errorId); } else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    },
  };
}
