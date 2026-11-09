/* A rating: a number from 0 to 5 by 0.1 in the host's stepper, with stars drawn
   beside it. The number is the control; the stars only show it. */
import { cls, say } from './config.js';
import { h, icon } from './dom.js';
import { fieldShell } from './fields.js';

export const RATING_MAX = 5;

/* A number between 0 and 5 to one decimal, or null when it is not one. */
export function cleanRating(text) {
  const n = Number(String(text ?? '').trim().replace(',', '.'));
  if (String(text ?? '').trim() === '' || !Number.isFinite(n)) return null;
  return Math.round(Math.min(RATING_MAX, Math.max(0, n)) * 10) / 10;
}

function star() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path fill="currentColor" d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z"/>';
  return svg;
}

export function ratingField({ label, value = 0, onChange }) {
  const input = h('input', { type: 'number', inputmode: 'decimal', min: '0', max: String(RATING_MAX), step: '0.1', value: String(value ?? 0), 'aria-label': label });
  const fill = h('span', { class: 'ed-stars-fill' }, [1, 2, 3, 4, 5].map(star));
  const stars = h('span', { class: 'ed-stars', 'aria-hidden': 'true' }, h('span', { class: 'ed-stars-base' }, [1, 2, 3, 4, 5].map(star)), fill);
  const paint = () => { fill.style.inlineSize = `${((cleanRating(input.value) ?? 0) / RATING_MAX) * 100}%`; };
  const changed = () => { paint(); if (onChange) onChange(cleanRating(input.value)); };
  const stepBy = (delta) => {
    const next = Math.min(RATING_MAX, Math.max(0, (cleanRating(input.value) ?? 0) + delta));
    input.value = String(Math.round(next * 10) / 10);
    changed();
  };
  const button = (name, glyph, delta) => h('button', { type: 'button', class: cls('stepperButton'), 'aria-label': say(name, { name: label }),
    /* ui.js steps every .stepper from the document, by the input's own step,
       and this part clamps and rounds itself: left to bubble it counts twice. */
    onclick: (e) => { e.stopPropagation(); stepBy(delta); } }, icon(glyph));
  const stepper = h('div', { class: cls('stepper') }, button('ratingLess', 'minus', -0.1), input, button('ratingMore', 'plus', 0.1));
  input.addEventListener('input', changed);
  input.addEventListener('blur', () => { const v = cleanRating(input.value); input.value = String(v ?? 0); changed(); });
  const control = h('div', { class: 'ed-rating' }, stepper, stars);
  const shell = fieldShell({ label, control, labelFor: false });
  paint();
  return { el: shell.el, input, value: () => cleanRating(input.value), setError: shell.setError };
}
