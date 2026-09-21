/* Renders the NFC.cool Design Guideline from guideline/sections/*.html.
   Two outputs from one source: a page per section for a static host
   (build/emit-guideline.mjs writes site/), and one self-contained page whose
   menu switches sections in place, for the shareable artifact
   (build/emit-artifact.mjs). Every page is the system's own app shell with
   the system's own sidebar as the menu, so the guideline is itself a
   consumer of the package. */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = f => readFileSync(join(root, f), 'utf8');
const tokens = JSON.parse(r('src/tokens.json'));

export const SITE_TITLE = 'NFC.cool Design Guideline';
export const SECTIONS = [
  { slug: 'decisions',  title: 'Decisions',            group: 'Foundations' },
  { slug: 'colour',     title: 'Colour',               group: 'Foundations' },
  { slug: 'typography', title: 'Typography',           group: 'Foundations' },
  { slug: 'space',      title: 'Space and motion',     group: 'Foundations' },
  { slug: 'buttons',    title: 'Buttons',              group: 'Components' },
  { slug: 'forms',      title: 'Form controls',        group: 'Components' },
  { slug: 'surfaces',   title: 'Surfaces and data',    group: 'Components' },
  { slug: 'feedback',   title: 'Feedback',             group: 'Components' },
  { slug: 'navigation', title: 'Navigation',           group: 'Components' },
  { slug: 'headers',    title: 'Header tiers',         group: 'Components' },
  { slug: 'overlay',    title: 'Overlay',              group: 'Components' },
  { slug: 'archetypes', title: 'Marketing archetypes', group: 'Archetypes' },
  { slug: 'prose',      title: 'Prose',                group: 'Archetypes' },
];
export const pageFile = s => (s.slug === 'decisions' ? 'index.html' : `${s.slug}.html`);

/* One glyph per destination, on the same 24px grid and stroke as the console
   icons, so the rail from md to lg has something to show. */
const GLYPHS = {
  decisions:  '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  colour:     '<path d="M12 3.5c3.5 4 6 7.2 6 10.3A6 6 0 0 1 6 13.8C6 10.7 8.5 7.5 12 3.5Z"/>',
  typography: '<path d="M4 7V4h16v3M12 4v16M9 20h6"/>',
  space:      '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M10.5 8v4.5M14 8v3M17.5 8v4.5"/>',
  buttons:    '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8.5 12h7"/>',
  forms:      '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h5M15.5 9.5v5"/>',
  surfaces:   '<rect x="3" y="9" width="14" height="11" rx="2"/><path d="M7 5h12a2 2 0 0 1 2 2v9"/>',
  feedback:   '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4Z"/><path d="M8 9h8M8 12.5h5"/>',
  navigation: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5Z"/>',
  headers:    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M7 7h6"/>',
  overlay:    '<rect x="3" y="3" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2"/>',
  archetypes: '<rect x="3" y="3" width="18" height="6" rx="1.5"/><rect x="3" y="12" width="8" height="9" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/>',
  prose:      '<path d="M4 6h16M4 10h16M4 14h11M4 18h7"/>',
};
const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const icon = slug => `<svg class="nav-icon" ${SVG}>${GLYPHS[slug]}</svg>`;
const BURGER_OPEN = `<svg class="nav-toggle-icon nav-toggle-icon-open" width="16" height="16" ${SVG.replace('stroke-width="1.8"', 'stroke-width="2"')}><path d="M3 6h18M3 12h18M3 18h18"/></svg>`;
const BURGER_CLOSE = `<svg class="nav-toggle-icon nav-toggle-icon-close" width="16" height="16" ${SVG.replace('stroke-width="1.8"', 'stroke-width="2"')}><path d="M5 5l14 14M19 5L5 19"/></svg>`;

const LOGO = `<a class="nav-brand" href="HOME"><img class="nav-logo-on-light" src="images/nfc-secondary-logo-black.webp" alt="NFC.cool" width="600" height="148"><img class="nav-logo-on-dark" src="images/nfc-secondary-logo-white.webp" alt="NFC.cool" width="600" height="148"></a>`;

export function sidebar(current, href) {
  const groups = [...new Set(SECTIONS.map(s => s.group))];
  const lists = groups.map(g => `<p class="nav-section">${g}</p>\n<ul class="nav-list">\n` +
    SECTIONS.filter(s => s.group === g).map(s => {
      const on = s.slug === current;
      return `<li class="nav-item"><a class="nav-link${on ? ' is-active' : ''}" href="${href(s)}"${on ? ' aria-current="page"' : ''}>${icon(s.slug)}<span class="nav-label">${s.title}</span></a></li>`;
    }).join('\n') + '\n</ul>').join('\n');
  return `<nav class="nav" data-nav="side" id="guide-nav" aria-label="Guideline">
${LOGO.replace('HOME', href(SECTIONS[0]))}
<button class="nav-theme-toggle" type="button" aria-label="Toggle light or dark theme"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18V4a8 8 0 1 1 0 16z"/></svg></button>
<button class="nav-toggle" type="button" aria-controls="guide-nav-panel" aria-expanded="false" aria-label="Menu">${BURGER_OPEN}${BURGER_CLOSE}</button>
<div class="nav-panel" id="guide-nav-panel">
${lists}
<div class="nav-utility">
<div class="nav-theme-switch" role="group" aria-label="Colour theme"><button type="button" data-theme-set="light" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span>Light</span></button><button type="button" data-theme-set="dark" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><span>Dark</span></button></div>
<button class="btn btn-ghost btn-sm" type="button" data-nav-collapse aria-label="Collapse navigation" title="Collapse navigation"><svg width="18" height="18" ${SVG}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg></button>
</div>
</div>
</nav>`;
}

const HEADER = `<header class="app-header">
  <span class="ks-site-name"><span class="brand-name">NFC<em class="brand-tail">.cool</em></span> Design Guideline</span>
  <span class="spacer"></span>
  <span class="ks-bp" id="ks-bp"></span>
  <button class="btn btn-secondary btn-sm" type="button" id="ks-theme">Dark</button>
  <button class="btn btn-secondary btn-sm" type="button" id="ks-dir">RTL</button>
</header>`;

const LOCAL_FONTS = `@font-face { font-family:'Titillium Web'; font-weight:400; font-display:swap; src:url('fonts/TitilliumWeb-400.woff2') format('woff2'); }
@font-face { font-family:'Titillium Web'; font-weight:600; font-display:swap; src:url('fonts/TitilliumWeb-600.woff2') format('woff2'); }
@font-face { font-family:'Titillium Web'; font-weight:700; font-display:swap; src:url('fonts/TitilliumWeb-700.woff2') format('woff2'); }
@font-face { font-family:'Caveat'; font-weight:400 700; font-display:swap; src:url('fonts/Caveat-400.woff2') format('woff2'); }`;
const GOOGLE_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&family=Caveat:wght@400;700&display=swap">`;

function layersCSS() {
  const brand = tokens.defaultBrand;
  const layers = ['src/tokens.css', `src/brands/${brand}.css`, 'src/components.css', 'src/archetypes.css']
    .map(f => `/* ===== ${f} ===== */\n` + r(f)).join('\n');
  const dark = Object.entries(tokens.brands[brand].dark)
    .filter(([k]) => !k.startsWith('$')).map(([k, v]) => `      --${k}: ${v};`).join('\n');
  return `${layers}

/* A root nobody has stamped (no JS, or a viewer on "system") still reaches the
   dark palette through prefers-color-scheme. An explicit light choice wins. */
@media (prefers-color-scheme: dark) {
   :root:not([data-theme="light"]) {
${dark}
      --brand-gradient:
         radial-gradient(ellipse 85% 55% at 50% 50%, var(--brand-glow) 0%, transparent 70%),
         linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg) 100%);
   }
   :root:not([data-theme="light"]) .hero-band::before,
   :root:not([data-theme="light"]) .hero-strip::before,
   :root:not([data-theme="light"]) .feature-banner::before,
   :root:not([data-theme="light"]) .final-cta::before { display: none; }
}`;
}

const section = (s, current) =>
  `<section class="gl-section${s.slug === current ? ' is-current' : ''}" id="${s.slug}" data-title="${s.title}">
<h1 class="ks-title">${s.title}</h1>
${r(`guideline/sections/${s.slug}.html`)}</section>`;

/* Inlined in both outputs: a module script fetched from file:// is blocked by
   the browser, and the artifact cannot fetch a sibling file at all. */
const navScript = () => '<script type="module">\n'
  + r('src/nav.js').replace(/import\.meta\?\.url\?\.includes\('no-auto'\)/, 'false').replace(/<\/script/gi, '<\\/script')
  + '\n</script>';

const MIME = { svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' };
function inlineImages(html) {
  for (const file of readdirSync(join(root, 'guideline/images'))) {
    const ext = file.split('.').pop().toLowerCase();
    if (!MIME[ext]) continue;
    const b64 = readFileSync(join(root, 'guideline/images', file)).toString('base64');
    html = html.replaceAll(`src="images/${file}"`, `src="data:${MIME[ext]};base64,${b64}"`);
  }
  return html;
}

function document_({ title, current, sections, mode, href, fonts, images, wrap }) {
  const head = `<title>${title}</title>
${fonts === 'google' ? GOOGLE_FONTS + '\n' : ''}<style>
${fonts === 'local' ? LOCAL_FONTS + '\n' : ''}${layersCSS()}
/* ---- guideline chrome ---- */
${r('guideline/guideline.css')}
</style>
<script>${r('src/theme.js').replace(/<\/script/gi, '<\\/script')}</script>
<script>${r('guideline/head.js')}</script>`;
  let body = `<div class="app-shell" data-mode="${mode}">
${sidebar(current, href)}
<div class="app-main">
${HEADER}
<main class="ks-page">
${sections.map(s => section(s, current)).join('\n')}
${r('guideline/sections/_footer.html')}</main>
</div>
</div>
<script>
${r('guideline/guideline.js')}
</script>
${navScript()}`;
  if (images === 'inline') body = inlineImages(body);
  return wrap
    ? `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`
    : `${head}\n${body}\n`;
}

/* One page per section, for a static host. Fonts and images are relative. */
export function renderSite() {
  const pages = new Map();
  for (const s of SECTIONS) {
    pages.set(pageFile(s), document_({
      title: `${s.title} · ${SITE_TITLE}`, current: s.slug, sections: [s], mode: 'site',
      href: pageFile, fonts: 'local', images: 'relative', wrap: true,
    }));
  }
  return pages;
}

/* Every section in one page for the artifact host, which wraps the content
   in its own document, admits one font host, and cannot fetch a sibling file. */
export function renderSingle() {
  return document_({
    title: SITE_TITLE, current: SECTIONS[0].slug, sections: SECTIONS, mode: 'single',
    href: s => `#${s.slug}`, fonts: 'google', images: 'inline', wrap: false,
  });
}
