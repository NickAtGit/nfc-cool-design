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
 * ONE MODEL FOR BOTH MODES. A nav is a brand, a toggle and a panel; the mode
 * only decides the axis and the width below which the panel folds behind the
 * toggle -- the bar folds under xl, the side (the console) folds under md,
 * where it becomes a phone bar whose burger drops the panel under it. Escape
 * closes and returns focus, a click outside closes, choosing a destination
 * closes, and leaving the folding widths reopens the panel in place.
 *
 * Expected markup, either mode:
 *   <nav class="nav" data-nav="bar|side" id="site-nav">
 *     <a class="nav-brand">
 *     <button class="nav-toggle" aria-controls="site-nav-panel" aria-expanded="false">
 *     <div class="nav-panel" id="site-nav-panel"> ...destinations, utilities... </div>
 *   </nav>
 *   (bar: the utilities sit OUTSIDE the panel, before the toggle, so they stay
 *   in the bar on a phone; side: they sit INSIDE it, at the foot of the column)
 *
 *   <button data-nav-collapse>   <- optional, in a side nav: the person's own
 *                                   rail, remembered per nav
 */

const STORE_KEY = 'nfccool.nav.collapsed';
const FOLD = { bar: '(max-width: 1199px)', side: '(max-width: 767px)' };

function setExpanded(toggle, panel, open) {
  toggle.setAttribute('aria-expanded', String(open));
  // The burger ships both icons and swaps them on this class, so the class and
  // aria-expanded are the same fact told twice -- to the eye and to a screen
  // reader. Set together here so they can never disagree.
  toggle.classList.toggle('is-open', open);
  // The nav carries it too, for the side mode's panel and any consumer rule.
  const nav = toggle.closest('.nav');
  if (nav) nav.classList.toggle('is-open', open);
  panel.hidden = !open;
}

/* ---- the fold: toggle + panel ---- */
function initFold(nav) {
  const toggle = nav.querySelector('.nav-toggle');
  const panel = nav.querySelector('.nav-panel');
  if (!toggle || !panel) return;
  const folds = window.matchMedia(FOLD[nav.dataset.nav] ?? FOLD.bar);

  // Start closed only where the toggle is visible; above the fold the panel
  // is simply the nav's list and must be shown.
  const apply = () => setExpanded(toggle, panel, !folds.matches);
  apply();
  folds.addEventListener('change', apply);

  toggle.addEventListener('click', () => {
    setExpanded(toggle, panel, toggle.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && folds.matches && toggle.getAttribute('aria-expanded') === 'true') {
      setExpanded(toggle, panel, false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (folds.matches && !nav.contains(e.target) && toggle.getAttribute('aria-expanded') === 'true') {
      setExpanded(toggle, panel, false);
    }
  });
  // Choosing a destination closes the panel; a same-page anchor would
  // otherwise leave it hanging over the section it just scrolled to.
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a') && folds.matches) setExpanded(toggle, panel, false);
  });
}

/* ---- side: the person's own rail, remembered per nav ---- */
function initCollapse(nav) {
  const collapse = nav.querySelector('[data-nav-collapse]');
  if (!collapse) return;
  const key = `${STORE_KEY}:${nav.id}`;
  const set = (on) => {
    nav.classList.toggle('is-collapsed', on);
    collapse.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) { /* private mode */ }
  };
  let stored = null;
  try { stored = localStorage.getItem(key); } catch (e) { /* private mode */ }
  if (stored === '1') set(true);
  collapse.addEventListener('click', () => set(!nav.classList.contains('is-collapsed')));
}

export function initNav(root = document) {
  root.querySelectorAll('.nav[data-nav]').forEach((nav) => {
    if (!nav.id) return;
    initFold(nav);
    if (nav.dataset.nav === 'side') initCollapse(nav);
  });
}

if (typeof document !== 'undefined' && !import.meta?.url?.includes('no-auto')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNav());
  } else {
    initNav();
  }
}
