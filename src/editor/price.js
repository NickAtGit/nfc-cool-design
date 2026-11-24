/* A price typed the way a person types it: 12,50 or 12.50, shown in the page's
   locale. Numbers stay numbers; an empty field is null, as the schema has it. */
import { cls, word } from './config.js';
import { h } from './dom.js';
import { fieldShell } from './fields.js';

export const PRICE_MAX = 100000000;

function separators(locale) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
  return {
    decimal: parts.find(p => p.type === 'decimal')?.value ?? '.',
    group: parts.find(p => p.type === 'group')?.value ?? ',',
  };
}

/* Returns a number, null for empty, or undefined when it is not a price.
   Both marks present: the last one is the decimal. One mark used twice: it
   groups. One mark once with exactly three digits after it (1,234) is the only
   real ambiguity, and the locale settles it. */
export function parsePrice(text, locale = 'en') {
  const raw = String(text ?? '').replace(/[\s  ']/g, '');
  if (!raw) return null;
  if (!/^\d*[.,]?[\d.,]*$/.test(raw) || !/\d/.test(raw)) return undefined;
  const dots = (raw.match(/\./g) || []).length;
  const commas = (raw.match(/,/g) || []).length;
  let cleaned;
  if (dots && commas) {
    const decimal = raw.lastIndexOf('.') > raw.lastIndexOf(',') ? '.' : ',';
    const group = decimal === '.' ? ',' : '.';
    if (raw.split(decimal).length !== 2) return undefined;
    cleaned = raw.split(group).join('').replace(decimal, '.');
  } else if (dots + commas === 0) {
    cleaned = raw;
  } else {
    const mark = dots ? '.' : ',';
    const pieces = raw.split(mark);
    if (pieces.length > 2) {
      if (!pieces.slice(1).every(p => p.length === 3)) return undefined;
      cleaned = pieces.join('');
    } else if (pieces[1].length === 3 && pieces[0] !== '' && pieces[0] !== '0' && separators(locale).group === mark) {
      cleaned = pieces.join('');
    } else {
      cleaned = pieces.join('.');
    }
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export function formatPrice(value, locale = 'en') {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

/* onChange(value, valid): value is a number or null; while the text is not a
   price, valid is false and value is null. */
export function priceField({ label, value = null, locale = 'en', placeholder, onChange }) {
  const input = h('input', { class: cls('input'), type: 'text', inputmode: 'decimal', autocomplete: 'off', value: formatPrice(value, locale), placeholder });
  const shell = fieldShell({ label, control: input });
  const read = () => {
    const parsed = parsePrice(input.value, locale);
    if (parsed === undefined) return { value: null, error: word('priceInvalid') };
    if (parsed !== null && parsed > PRICE_MAX) return { value: null, error: word('priceTooHigh') };
    return { value: parsed, error: '' };
  };
  input.addEventListener('input', () => {
    const r = read();
    if (!r.error) shell.setError('');
    if (onChange) onChange(r.value, !r.error);
  });
  input.addEventListener('blur', () => {
    const r = read();
    shell.setError(r.error);
    if (!r.error) input.value = formatPrice(r.value, locale);
  });
  return { el: shell.el, input, value: () => read().value, valid: () => !read().error, setError: shell.setError };
}
