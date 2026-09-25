/* @nfccool/design/email.js: one NFC.cool mail, rendered from data.

   A template is a few lines of data; this file owns ALL markup and styling.
   Zero dependencies and no build step, because consumers install the package
   from git by commit and run nothing: import it and call it.

     import { renderEmail } from '@nfccool/design/email.js';
     const { html, text } = renderEmail({
       assetBaseUrl: 'https://example.com/email/',
       preheader: 'This link works once and expires in 15 minutes.',
       heading: 'Sign in to Moments',
       blocks: [
         { type: 'text', text: 'Tap the button to sign in. It works once and expires in 15 minutes.' },
         { type: 'button', label: 'Sign in', href: link },
         { type: 'link-fallback', href: link },
         { type: 'note', text: 'If you did not ask for this, you can ignore this email.' },
       ],
       footer: { product: 'Moments by NFC.cool', reason: 'You got this because someone asked to sign in with this address.' },
     });

   What it guarantees, so a template never has to think about it:
   - every string is escaped, text and attributes alike; a link is refused
     (TypeError) unless it is http(s) or mailto;
   - the plain-text part is written from the same blocks, in the same order;
   - tables and inline styles only, so Gmail, Outlook desktop, Outlook.com and
     Apple Mail agree; the button is bulletproof in Outlook desktop;
   - light by default, dark through prefers-color-scheme and Outlook.com's
     data-ogsc/data-ogsb, every colour from src/tokens.json via palette.js;
   - `dir` flips every physical side, `lang` is stamped on the document.

   Colour lives in ./email/palette.js, GENERATED from src/tokens.json. This
   file carries no colour literal; test/guards.test.mjs holds it to that. */
import { palette } from './email/palette.js';

/* The hosted header. Two PNGs at 2x, drawn from the repo's own wordmark by
   build/emit-email-assets.mjs, each with a hairline halo in its own card
   colour so a client that inverts the mail without asking still shows it. */
export const WORDMARK = Object.freeze({
  onLight: 'wordmark-on-light.png',
  onDark: 'wordmark-on-dark.png',
  width: 126,
  height: 34,
});

/* Every file a consumer has to host at `assetBaseUrl`. */
export const EMAIL_ASSETS = Object.freeze([WORDMARK.onLight, WORDMARK.onDark]);

const FONT = palette.font.replaceAll('"', "'");

/* ------------------------------------------------------------------ escaping */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ESC[c]);
}

/* A link in a mail is http(s) or mailto, and nothing else: no javascript:,
   no data:, no relative path that resolves against a webmail's own origin.
   Refusing loudly beats sending a mail whose one button does nothing. */
export function safeHref(href) {
  const s = String(href ?? '').trim();
  if (!/^(https?:\/\/[^\s/?#]+|mailto:[^\s])/i.test(s) || /[\s\u0000-\u001F\u007F<>"]/.test(s)) {
    throw new TypeError(`renderEmail: refused link ${JSON.stringify(s)}. Only http(s) and mailto links are allowed.`);
  }
  return s;
}

/* An image in a mail is fetched by the client from an absolute http(s) URL:
   safeHref's rules, without mailto. */
export function safeImageSrc(src) {
  const s = String(src ?? '').trim();
  if (!/^https?:\/\//i.test(s)) {
    throw new TypeError(`renderEmail: refused image ${JSON.stringify(s)}. An image is an absolute http(s) URL.`);
  }
  return safeHref(s);
}

/* ------------------------------------------------------------------ styling */

const css = obj => Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  .map(([k, v]) => `${k}:${v}`).join(';');

/* The dark palette, keyed on classes. One table feeds the media query and
   Outlook.com's attribute hooks, so they cannot disagree. */
const DARK = [
  ['.em-page', 'background-color', 'page', 'bg'],
  ['.em-card', 'background-color', 'card', 'bg'],
  ['.em-card', 'border-color', 'border', 'bg'],
  ['.em-h', 'color', 'heading', 'fg'],
  ['.em-t', 'color', 'text', 'fg'],
  ['.em-m', 'color', 'muted', 'fg'],
  ['.em-a', 'color', 'link', 'fg'],
  ['.em-btn', 'background-color', 'buttonBg', 'bg'],
  ['.em-btn-a', 'color', 'buttonFg', 'fg'],
  ['.em-rule', 'border-top-color', 'rule', 'bg'],
  ['.em-quote', 'background-color', 'quoteBg', 'bg'],
  ['.em-quote', 'border-color', 'quoteBar', 'bg'],
  ['.em-logo', 'border-color', 'border', 'bg'],
];
function darkRules(prefix) {
  const D = palette.dark;
  const bySel = new Map();
  for (const [sel, prop, role, kind] of DARK) {
    const key = prefix ? `${prefix[kind]} ${sel}` : sel;
    bySel.set(key, [...(bySel.get(key) ?? []), `${prop}:${D[role]} !important`]);
  }
  return [...bySel].map(([sel, decl]) => `${sel}{${decl.join(';')}}`).join('\n');
}
const SWAP = [
  '.em-wm-light{display:none !important}',
  '.em-wm-dark{display:block !important;max-height:none !important;overflow:visible !important}',
];

function headStyles() {
  const base = `body{margin:0 !important;padding:0 !important;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;line-height:inherit !important}
u + #em-body a{color:inherit;text-decoration:none}
@media only screen and (max-width:600px){
.em-outer{padding:20px 12px 32px !important}
.em-pad{padding-left:24px !important;padding-right:24px !important}
.em-card{padding-top:28px !important;padding-bottom:32px !important}
.em-h1{font-size:22px !important;line-height:28px !important}
}`;
  const dark = `@media (prefers-color-scheme: dark){
${darkRules()}
${SWAP.join('\n')}
}`;
  /* Outlook.com marks what it repainted with data-ogsc (text) and data-ogsb
     (backgrounds). Its own style element: Gmail drops a whole <style> block
     over one selector it dislikes, and this keeps the risk out of the others. */
  const ogs = `${darkRules({ fg: '[data-ogsc]', bg: '[data-ogsb]' })}
${SWAP.map(r => `[data-ogsc] ${r}`).join('\n')}`;
  return `<style>\n${base}\n</style>\n<style>\n${dark}\n</style>\n<style>\n${ogs}\n</style>`;
}

/* ------------------------------------------------------------------ blocks */

/* Gap above a block, in px, from what it is and what came before it. The
   button and the divider get air; paragraphs sit at one line's rhythm. */
const BEFORE = { text: 16, button: 28, 'link-fallback': 20, note: 20, divider: 28, quote: 20 };
const AFTER = { button: 28, divider: 28, quote: 20 };
const TYPES = new Set(Object.keys(BEFORE));

function runsOf(text) {
  const list = Array.isArray(text) ? text : [text];
  return list.map(r => (typeof r === 'string' ? { text: r } : r));
}

/* A link in body copy is the brand's link colour with a quiet underline; in
   the footer it takes the footer's own muted ink, so the small print never
   shouts. */
function inlineHtml(text, L, tone = 'body') {
  return runsOf(text).map(r => {
    const t = escapeHtml(r.text).replace(/\r?\n/g, '<br>');
    if ('href' in r) {
      const style = tone === 'footer'
        ? { color: L.muted, 'text-decoration': 'underline' }
        : { color: L.link, 'text-decoration': 'underline', 'font-weight': tone === 'body' ? 600 : undefined };
      return `<a class="${tone === 'footer' ? 'em-m' : 'em-a'}" href="${escapeHtml(safeHref(r.href))}" style="${css(style)}">${t}</a>`;
    }
    if (r.strong) return `<strong class="em-h" style="${css({ color: L.heading, 'font-weight': 600 })}">${t}</strong>`;
    return t;
  }).join('');
}

function inlineText(text) {
  return runsOf(text).map(r => {
    if (!('href' in r)) return r.text;
    const href = safeHref(r.href);
    // A link whose words are its address says it once.
    return href === r.text || href === `mailto:${r.text}` ? r.text : `${r.text} (${href})`;
  }).join('');
}

function blockHtml(b, ctx) {
  const { L, start, end } = ctx;
  const p = (cls, style, inner) => `<p class="${cls}" style="${css({ margin: 0, 'font-family': FONT, ...style })}">${inner}</p>`;
  switch (b.type) {
    case 'text':
      return p('em-t', { 'font-size': '16px', 'line-height': '26px', color: L.text }, inlineHtml(b.text, L));
    case 'note':
      return p('em-m', { 'font-size': '14px', 'line-height': '21px', color: L.muted }, inlineHtml(b.text, L, 'note'));
    case 'button': {
      const href = escapeHtml(safeHref(b.href));
      const label = escapeHtml(b.label);
      const r = palette.radius.button;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>`
        + `<td class="em-btn" bgcolor="${L.buttonBg}" style="${css({ 'background-color': L.buttonBg, 'border-radius': r })}">`
        + `<a class="em-btn em-btn-a" href="${href}" target="_blank" style="${css({
          display: 'inline-block', padding: '13px 28px', 'font-family': FONT, 'font-size': '16px',
          'line-height': '22px', 'font-weight': 600, color: L.buttonFg, 'background-color': L.buttonBg,
          'text-decoration': 'none', 'border-radius': r, 'mso-padding-alt': 0,
        })}">`
        /* Outlook desktop ignores padding on a link. These two spacers are
           Mark Robbins' bulletproof button: an em space widened for the sides,
           and mso-text-raise for the top and bottom, so the whole pill is the
           link there too. Every other client never sees them. */
        + `<!--[if mso]><i style="mso-font-width:175%;mso-text-raise:20pt" hidden>&#8195;</i><span style="mso-text-raise:10pt"><![endif]-->`
        + label
        + `<!--[if mso]></span><i style="mso-font-width:175%" hidden>&#8195;&#8203;</i><![endif]-->`
        + `</a></td></tr></table>`;
    }
    case 'link-fallback': {
      const href = escapeHtml(safeHref(b.href));
      const label = escapeHtml(b.label ?? 'Or copy this link:');
      return p('em-m', { 'font-size': '13px', 'line-height': '20px', color: L.muted },
        `${label}<br><a class="em-a" href="${href}" style="${css({ color: L.link, 'text-decoration': 'none', 'word-break': 'break-all', 'overflow-wrap': 'anywhere' })}">${href}</a>`);
    }
    case 'quote':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>`
        + `<td class="em-quote" bgcolor="${L.quoteBg}" style="${css({
          'background-color': L.quoteBg, [`border-${start}`]: `3px solid ${L.quoteBar}`,
          [`border-top-${end}-radius`]: '8px', [`border-bottom-${end}-radius`]: '8px', padding: '14px 18px',
        })}">`
        + p('em-h', { 'font-size': '16px', 'line-height': '24px', 'font-weight': 600, color: L.heading }, inlineHtml(b.text, L))
        + `</td></tr></table>`;
    case 'divider':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
        + `<td class="em-rule" style="${css({ 'border-top': `1px solid ${L.rule}`, 'font-size': 0, 'line-height': 0, height: '1px' })}">&nbsp;</td></tr></table>`;
    default:
      throw new TypeError(`renderEmail: unknown block type ${JSON.stringify(b?.type)}`);
  }
}

function blockText(b, prev) {
  switch (b.type) {
    case 'text':
    case 'note':
      return inlineText(b.text);
    case 'button':
      return `${b.label}: ${safeHref(b.href)}`;
    case 'link-fallback':
      // The button line above already carries this URL in plain text.
      if (prev?.type === 'button' && safeHref(prev.href) === safeHref(b.href)) return null;
      return safeHref(b.href);
    case 'quote':
      return `“${inlineText(b.text)}”`;
    case 'divider':
      return '----';
    default:
      throw new TypeError(`renderEmail: unknown block type ${JSON.stringify(b?.type)}`);
  }
}

/* One block's markup on its own, with the same styling renderEmail gives it.
   For a generator that assembles a mail outside JavaScript (the Django
   partials in dist/email/django/ are made this way); a template never needs it. */
export function renderBlock(block, { dir = 'ltr' } = {}) {
  if (!block || !TYPES.has(block.type)) throw new TypeError(`renderEmail: unknown block type ${JSON.stringify(block?.type)}`);
  const rtl = dir === 'rtl';
  return blockHtml(block, { L: palette.light, start: rtl ? 'right' : 'left', end: rtl ? 'left' : 'right' });
}

/* The gap above a block, given the block before it (null for the first). */
export function blockGap(block, prev) {
  return Math.max(BEFORE[block.type], AFTER[prev?.type] ?? 0);
}

/* ------------------------------------------------------------------ the mail */

function checkOptions(o) {
  if (!o || typeof o !== 'object') throw new TypeError('renderEmail: expected an options object');
  if (typeof o.heading !== 'string' || !o.heading.trim()) throw new TypeError('renderEmail: heading is required');
  if (!Array.isArray(o.blocks)) throw new TypeError('renderEmail: blocks must be an array');
  for (const b of o.blocks) {
    if (!b || !TYPES.has(b.type)) throw new TypeError(`renderEmail: unknown block type ${JSON.stringify(b?.type)}`);
  }
  if (o.dir !== undefined && o.dir !== 'ltr' && o.dir !== 'rtl') throw new TypeError('renderEmail: dir is "ltr" or "rtl"');
  if (o.lang !== undefined && !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(o.lang)) throw new TypeError('renderEmail: lang must be a BCP 47 tag');
  const logo = o.brand?.logo;
  if (logo !== undefined) {
    if (!logo || typeof logo !== 'object') throw new TypeError('renderEmail: brand.logo must be an object');
    safeImageSrc(logo.src);
    if (logo.srcDark !== undefined) safeImageSrc(logo.srcDark);
    for (const k of ['width', 'height']) {
      if (!Number.isInteger(logo[k]) || logo[k] < 1 || logo[k] > 600) {
        throw new TypeError(`renderEmail: brand.logo.${k} must be a whole number of px between 1 and 600, got ${JSON.stringify(logo[k])}`);
      }
    }
    if (typeof logo.alt !== 'string') throw new TypeError('renderEmail: brand.logo.alt must be a string (empty when the name sits beside it)');
  }
}

function assetUrl(base, file) {
  const b = String(base).trim();
  if (!/^https?:\/\/[^\s/?#]+/i.test(b) || /[\s"<>]/.test(b)) {
    throw new TypeError(`renderEmail: assetBaseUrl must be an absolute http(s) URL, got ${JSON.stringify(b)}`);
  }
  return (b.endsWith('/') ? b : `${b}/`) + file;
}

/* A product's own mark: its icon, squircle-cornered, with its name beside it
   in bold, the way the product's web header shows it. The icon is the
   consumer's own hosted 2x PNG; `srcDark` swaps in under a dark scheme the
   same way the wordmark does, and a client that cannot swap shows the light
   one, whose hairline (the card's border colour, repainted in dark) keeps
   its edge on either card. Outlook desktop ignores the radius and shows a
   square icon, which is still the icon. */
function logoMark(brand, L, start, link) {
  const logo = brand.logo;
  const w = logo.width, h = logo.height;
  const radius = `${Math.round(w * 0.22)}px`;
  const img = (src, cls) => `<img class="${cls}" src="${escapeHtml(safeImageSrc(src))}" width="${w}" height="${h}" alt="${escapeHtml(logo.alt)}" style="${css({
    display: 'block', width: `${w}px`, height: `${h}px`, border: `1px solid ${L.border}`, 'border-radius': radius,
    'box-sizing': 'border-box', 'font-family': FONT, 'font-size': '13px', color: L.heading,
  })}">`;
  let icon;
  if (logo.srcDark !== undefined) {
    icon = img(logo.src, 'em-logo em-wm-light em-h')
      + `<!--[if !mso]><!--><div class="em-wm-dark" style="display:none;max-height:0;overflow:hidden;mso-hide:all">`
      + img(logo.srcDark, 'em-logo')
      + `</div><!--<![endif]-->`;
  } else {
    icon = img(logo.src, 'em-logo em-h');
  }
  const cells = [`<td class="em-brand-icon" valign="middle" style="vertical-align:middle;font-size:0;line-height:0">${link(icon)}</td>`];
  if (brand.showName !== false && typeof brand.name === 'string' && brand.name.trim()) {
    cells.push(`<td class="em-brand-name" valign="middle" style="${css({ 'vertical-align': 'middle', [`padding-${start}`]: '12px' })}">`
      + link(`<span class="em-h" style="${css({ 'font-family': FONT, 'font-size': '20px', 'line-height': '24px', 'font-weight': 700, 'letter-spacing': '-0.2px', color: L.heading })}">${escapeHtml(brand.name)}</span>`)
      + `</td>`);
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>${cells.join('')}</tr></table>`;
}

function header(o, L, start) {
  const brand = o.brand ?? {};
  const name = brand.name ?? palette.label;
  const link = brand.href === undefined
    ? inner => inner
    : inner => `<a href="${escapeHtml(safeHref(brand.href))}" style="text-decoration:none">${inner}</a>`;
  if (brand.logo !== undefined) {
    return `<tr><td align="${start}" style="padding-bottom:28px">${logoMark(brand, L, start, link)}</td></tr>`;
  }
  const useImage = o.assetBaseUrl && brand.wordmark !== false;
  let mark;
  if (useImage) {
    const img = (file, cls, extra = '') => `<img class="${cls}" src="${escapeHtml(assetUrl(o.assetBaseUrl, file))}" width="${WORDMARK.width}" height="${WORDMARK.height}" alt="${escapeHtml(name)}" style="${css({ display: 'block', border: 0, width: `${WORDMARK.width}px`, height: `${WORDMARK.height}px`, 'font-family': FONT, 'font-size': '18px', 'font-weight': 700, color: L.heading })}${extra}">`;
    /* The dark variant is hidden until a dark scheme asks for it, and never
       reaches Outlook desktop, which would otherwise show both. */
    mark = img(WORDMARK.onLight, 'em-wm-light em-h')
      + `<!--[if !mso]><!--><div class="em-wm-dark" style="display:none;max-height:0;overflow:hidden;mso-hide:all">`
      + img(WORDMARK.onDark, '')
      + `</div><!--<![endif]-->`;
  } else {
    mark = `<span class="em-h" style="${css({ 'font-family': FONT, 'font-size': '19px', 'line-height': '24px', 'font-weight': 700, 'letter-spacing': '-0.2px', color: L.heading })}">${escapeHtml(name)}</span>`;
  }
  return `<tr><td align="${start}" style="padding-bottom:28px">${link(mark)}</td></tr>`;
}

function footerHtml(f, L, start) {
  if (!f) return '';
  const line = (inner, extra = {}) => `<p class="em-m" style="${css({ margin: '0 0 6px', 'font-family': FONT, 'font-size': '13px', 'line-height': '20px', color: L.muted, ...extra })}">${inner}</p>`;
  const parts = [];
  if (f.product) parts.push(line(escapeHtml(f.product), { 'font-weight': 600 }));
  if (f.reason) parts.push(line(inlineHtml(f.reason, L, 'footer')));
  if (f.address) parts.push(line(escapeHtml(f.address)));
  if (f.links?.length) {
    parts.push(line(f.links.map(l => `<a class="em-m" href="${escapeHtml(safeHref(l.href))}" style="${css({ color: L.muted, 'text-decoration': 'underline' })}">${escapeHtml(l.label)}</a>`).join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;')));
  }
  if (!parts.length) return '';
  return `<tr><td class="em-pad" align="${start}" style="padding:24px 41px 0">${parts.join('')}</td></tr>`;
}

function footerText(f) {
  if (!f) return [];
  const out = [];
  if (f.product) out.push(f.product);
  if (f.reason) out.push(inlineText(f.reason));
  if (f.address) out.push(f.address);
  for (const l of f.links ?? []) out.push(`${l.label}: ${safeHref(l.href)}`);
  return out;
}

/* A preheader is the grey line an inbox shows after the subject. The filler
   stops a client from pulling body copy in after it. */
const PREHEADER_FILL = '&#847;&zwnj;&nbsp;'.repeat(60);

/**
 * Render one mail. Returns `{ html, text }`; send both, as multipart/alternative.
 * @param {import('./email.d.ts').EmailOptions} options
 * @returns {{ html: string, text: string }}
 */
export function renderEmail(options) {
  checkOptions(options);
  const o = options;
  const L = palette.light;
  const dir = o.dir ?? 'ltr';
  const lang = o.lang ?? 'en';
  const start = dir === 'rtl' ? 'right' : 'left';
  const end = dir === 'rtl' ? 'left' : 'right';
  const ctx = { L, start, end };

  const rows = [];
  let prev = null;
  rows.push(`<tr><td><h1 class="em-h em-h1" style="${css({ margin: 0, 'font-family': FONT, 'font-size': '24px', 'line-height': '31px', 'font-weight': 700, 'letter-spacing': '-0.3px', color: L.heading })}">${escapeHtml(o.heading)}</h1></td></tr>`);
  for (const b of o.blocks) {
    const gap = blockGap(b, prev);
    rows.push(`<tr><td align="${start}" style="padding-top:${gap}px">${blockHtml(b, ctx)}</td></tr>`);
    prev = b;
  }

  const r = palette.radius.card;
  const title = escapeHtml(o.title ?? o.heading);
  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
${headStyles()}
</head>
<body id="em-body" class="em-page" dir="${dir}" style="${css({ margin: 0, padding: 0, width: '100%', 'background-color': L.page, 'word-spacing': 'normal' })}">
${o.preheader ? `<div style="${css({ display: 'none', 'font-size': '1px', 'line-height': '1px', 'max-height': 0, 'max-width': 0, opacity: 0, overflow: 'hidden', 'mso-hide': 'all', color: L.page })}">${escapeHtml(o.preheader)}${PREHEADER_FILL}</div>\n` : ''}<div role="article" aria-roledescription="email" aria-label="${title}" lang="${escapeHtml(lang)}" dir="${dir}" class="em-page" style="${css({ 'background-color': L.page, 'text-align': start })}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-page" bgcolor="${L.page}" style="background-color:${L.page}">
<tr><td class="em-outer" align="center" style="padding:40px 16px 48px">
<!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;border-collapse:separate">
<tr><td class="em-card em-pad" bgcolor="${L.card}" align="${start}" style="${css({ 'background-color': L.card, border: `1px solid ${L.border}`, 'border-radius': r, padding: '36px 40px 40px', 'text-align': start })}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${header(o, L, start)}
${rows.join('\n')}
</table>
</td></tr>
${footerHtml(o.footer, L, start)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</div>
</body>
</html>
`;

  const text = [];
  text.push(o.heading, '');
  prev = null;
  for (const b of o.blocks) {
    const t = blockText(b, prev);
    if (t !== null) text.push(t, '');
    prev = b;
  }
  const foot = footerText(o.footer);
  if (foot.length) text.push('----', ...foot, '');
  return { html, text: `${text.join('\n').trimEnd()}\n` };
}
