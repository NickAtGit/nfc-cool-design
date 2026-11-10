/* A whole number with minus and plus beside it, in the host's stepper (the
   console's .seat-stepper): a booking's largest party. The number stays a
   field a person can type into; the buttons only step it, inside the range. */
import { cls, say } from './config.js';
import { h, icon } from './dom.js';
import { fieldShell } from './fields.js';

/* `text` as a whole number inside [min, max], or `fallback` when it is none. */
export function clampWhole(text, min, max, fallback) {
  const n = Number(String(text ?? '').trim());
  if (String(text ?? '').trim() === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function stepper({ label, value, min = 0, max = 999, onChange }) {
  const start = clampWhole(value, min, max, min);
  const input = h('input', { type: 'number', inputmode: 'numeric', min: String(min), max: String(max), step: '1', value: String(start), 'aria-label': label });
  let current = start;
  const set = (next) => {
    current = clampWhole(next, min, max, current);
    input.value = String(current);
    if (onChange) onChange(current);
  };
  const button = (name, glyph, delta) => h('button', { type: 'button', class: cls('stepperButton'), 'aria-label': say(name, { name: label }),
    onclick: () => set(current + delta) }, icon(glyph));
  input.addEventListener('change', () => set(input.value));
  const control = h('div', { class: `${cls('stepper')} ed-stepper` }, button('stepLess', 'minus', -1), input, button('stepMore', 'plus', 1));
  const shell = fieldShell({ label, control, labelFor: false });
  return { el: shell.el, input, value: () => current, setError: shell.setError };
}
