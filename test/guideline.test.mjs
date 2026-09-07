import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, pageFile, renderSite, renderSingle } from '../build/guideline.mjs';

/* The guideline's own sidebar, without the boxed nav examples on the
   Navigation page, which carry active links of their own. */
const menu = html => {
  const i = html.indexOf('id="guide-nav"');
  return html.slice(i, html.indexOf('</nav>', i));
};

/* The guideline is a real site: one page per section, and the menu on every
   page names every section, with the current one marked. */
test('every section renders to its own page and the menu marks it', () => {
  const pages = renderSite();
  assert.equal(pages.size, SECTIONS.length, 'one page per section');
  for (const s of SECTIONS) {
    const html = pages.get(pageFile(s));
    assert.ok(html, `${pageFile(s)} is missing`);
    const active = menu(html).match(/<a class="nav-link is-active" href="([^"]+)"/g) || [];
    assert.equal(active.length, 1, `${pageFile(s)} must mark exactly one menu entry, found ${active.length}`);
    assert.match(active[0], new RegExp(`href="${pageFile(s)}"`), `${pageFile(s)} marks the wrong entry`);
    for (const o of SECTIONS) assert.ok(menu(html).includes(`href="${pageFile(o)}"`), `${pageFile(s)} must link to ${pageFile(o)}`);
    assert.ok(html.includes(`<h1 class="ks-title">${s.title}</h1>`), `${pageFile(s)} must carry its title`);
    assert.ok(html.includes(`<title>${s.title} `), `${pageFile(s)} must name the page in the tab`);
  }
});

/* The shareable single-file build carries every section behind a hash link
   and depends on nothing outside itself. */
test('the single-file build carries every section behind a hash link', () => {
  const html = renderSingle();
  for (const s of SECTIONS) {
    assert.match(html, new RegExp(`<section class="gl-section( is-current)?" id="${s.slug}"`), `section ${s.slug} missing`);
    assert.ok(menu(html).includes(`href="#${s.slug}"`), `menu entry for ${s.slug} missing`);
  }
  assert.ok(!/href="\.\.\/src\//.test(html), 'the single file must not link to sibling stylesheets');
});

/* From md to lg the sidebar is an icon rail, so a menu entry without an icon
   disappears there. */
test('every menu entry carries an icon, so the rail is never empty', () => {
  const html = renderSingle();
  const links = menu(html).match(/<a class="nav-link[^"]*" href="#[^"]+"[^>]*>[\s\S]*?<\/a>/g) || [];
  assert.equal(links.length, SECTIONS.length, 'one menu link per section');
  for (const l of links) assert.match(l, /<svg class="nav-icon"/, `no icon in: ${l.slice(0, 80)}`);
});
