/* WCAG 2 contrast, shared by the tests. Not a test file itself (the runner
   picks up *.test.mjs only). */
const srgb = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export const lum = hex => { const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * srgb((n >> 16) & 255) + 0.7152 * srgb((n >> 8) & 255) + 0.0722 * srgb(n & 255); };
export const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05); };
/* Body text: 4.5:1. Non-text indicators and large text: 3:1. */
export const AA = 4.5, UI = 3.0;
