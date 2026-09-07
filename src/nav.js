/* Navigation behaviour for @nfccool/design.
 *
 * Progressive enhancement: the markup works without this file, it just does
 * not collapse. The file is an ES module (it uses export and import.meta), so
 * a classic script tag cannot load it. Wire it once per page:
 *
 *   <script type="module" src="/assets/design/nav.js"></script>
 *
 * which self-initialises on DOMContentLoaded. To control the timing yourself,
 * opt out with ?no-auto and call initNav() from your own module:
 *
 *   import { initNav } from '/assets/design/nav.js?no-auto';
 *   initNav();
 *
 * Doing both initialises the nav twice, and every toggle then cancels itself.
 *
 * Expected markup:
 *   <nav class="nav" data-nav="bar" id="site-nav">
 *     <button class="nav-toggle" aria-controls="site-nav-panel" aria-expanded="false">
 *     <div class="nav-panel" id="site-nav-panel"> ... </div>
 *   </nav>
 *
 *   <button data-nav-open="app-nav">            <- drawer trigger, below md
 *   <nav class="nav" data-nav="side" id="app-nav">
 *     <button data-nav-collapse>                <- rail toggle, lg and up
 */

const STORE_KEY = 'nfccool.nav.collapsed';
const mqDrawer = () => window.matchMedia('(max-width: 767px)');

function setExpanded(toggle, panel, open) {
  toggle.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
}

/* ---- bar: burger + drop panel ---- */
function initBar(nav) {
  const toggle = nav.querySelector('.nav-toggle');
  const panel = nav.querySelector('.nav-panel');
  if (!toggle || !panel) return;

  // The panel is only ever hidden in the collapsed layout, so let the media
  // query decide rather than hard-coding a starting state.
  const mq = window.matchMedia('(max-width: 1199px)');
  const sync = () => { if (mq.matches) setExpanded(toggle, panel, false); else { panel.hidden = false; toggle.setAttribute('aria-expanded', 'false'); } };
  sync();
  mq.addEventListener('change', sync);

  toggle.addEventListener('click', () => {
    setExpanded(toggle, panel, panel.hidden);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mq.matches && !panel.hidden) {
      setExpanded(toggle, panel, false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!mq.matches || panel.hidden) return;
    if (!nav.contains(e.target)) setExpanded(toggle, panel, false);
  });

  // Choosing a destination should close the panel. Without this the menu
  // stays open over the page it just navigated to, which reads as a stuck
  // menu on any same-document or client-routed navigation.
  panel.addEventListener('click', (e) => {
    if (mq.matches && e.target.closest('a')) setExpanded(toggle, panel, false);
  });
}

/* ---- side: drawer below md, rail toggle above ---- */
function initSide(nav) {
  let scrim = null;
  let lastFocus = null;

  function close() {
    nav.classList.remove('is-open');
    if (scrim) { scrim.remove(); scrim = null; }
    document.body.style.removeProperty('overflow');
    document.querySelectorAll(`[data-nav-open="${nav.id}"]`)
      .forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (lastFocus) { lastFocus.focus(); lastFocus = null; }
  }

  function open(trigger) {
    lastFocus = trigger || null;
    nav.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    scrim.addEventListener('click', close);
    nav.parentNode.insertBefore(scrim, nav);
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    const first = nav.querySelector('a, button');
    if (first) first.focus();
  }

  document.querySelectorAll(`[data-nav-open="${nav.id}"]`).forEach((btn) => {
    btn.setAttribute('aria-controls', nav.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => (nav.classList.contains('is-open') ? close() : open(btn)));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) close();
  });

  // Same for the drawer: picking a destination dismisses it.
  nav.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && e.target.closest('a')) close();
  });
  // Leaving the drawer band should not strand an open drawer.
  mqDrawer().addEventListener('change', (e) => { if (!e.matches) close(); });

  const collapse = document.querySelector('[data-nav-collapse]');
  if (collapse) {
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch { /* private mode */ }
    if (saved === '1') nav.classList.add('is-collapsed');
    collapse.setAttribute('aria-expanded', String(!nav.classList.contains('is-collapsed')));
    collapse.addEventListener('click', () => {
      const collapsed = nav.classList.toggle('is-collapsed');
      collapse.setAttribute('aria-expanded', String(!collapsed));
      try { localStorage.setItem(STORE_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
    });
  }
}

export function initNav(root = document) {
  root.querySelectorAll('[data-nav="bar"]').forEach(initBar);
  root.querySelectorAll('[data-nav="side"]').forEach((nav) => {
    if (!nav.id) return;   // the drawer trigger addresses the nav by id
    initSide(nav);
  });
}

if (typeof document !== 'undefined' && !import.meta?.url?.includes('no-auto')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNav());
  } else {
    initNav();
  }
}
