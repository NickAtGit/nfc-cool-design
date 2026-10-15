/* Component behaviour for @nfccool/design: the few things a console page's
 * components need that CSS and HTML cannot do alone. Taken from the business
 * console after its 2026-10-15 review, so a product inherits them instead of
 * rewriting them.
 *
 * Progressive enhancement, like nav.js: every component here works without
 * this file (a form posts, a <details> opens, a tab row scrolls), it is only
 * less helpful. An ES module; wire it once per page:
 *
 *   <script type="module" src="/assets/design/ui.js"></script>
 *
 * which self-initialises on DOMContentLoaded. To control the timing, opt out
 * with ?no-auto and call initUI() yourself. Document-level listeners are bound
 * once however often initUI runs, so calling it again after swapping part of
 * the page in (HTMX, a fetch) only picks up the new tab rows and toasts.
 *
 *   import { initUI, showToast } from '/assets/design/ui.js?no-auto';
 *
 * What it does:
 *   .section-nav      scrolls the tab you are on into view, fades the edge
 *                     while more tabs wait past it (.can-scroll-end)
 *   .row-menu         outside click and Escape close it, one open at a time,
 *                     opens upward near the bottom of the window (.is-up)
 *   data-confirm-*    a form, a submit button or a link asks first, in the
 *                     page's one <dialog data-confirm-dialog>
 *   .toast            showToast(): a success hides after five seconds, an
 *                     error stays until its close button
 *   .stepper          its minus and plus step the number field
 *   .info-tip         a tap opens it even inside a <label>, which would
 *                     otherwise take the focus the bubble lives on
 *
 * No copy lives here. Every word a person reads (the dialog's Cancel, the
 * toast's close label) is in the page's own markup, in the page's language.
 */

const bound = new WeakSet();
let documentBound = false;

/* ---- section tabs ---- */
function fitSectionNav(nav) {
  // scrollLeft runs negative in RTL; its magnitude is the distance travelled.
  const max = nav.scrollWidth - nav.clientWidth;
  nav.classList.toggle('can-scroll-end', max > 2 && Math.abs(nav.scrollLeft) < max - 2);
}

export function initSectionNav(root = document) {
  root.querySelectorAll('.section-nav').forEach((nav) => {
    if (bound.has(nav)) return;
    bound.add(nav);
    const active = nav.querySelector('[aria-current="page"], .is-active');
    if (active && nav.scrollWidth > nav.clientWidth) {
      // Inside the strip only: scrollIntoView would scroll the page too.
      const a = active.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      nav.scrollLeft += (a.left + a.width / 2) - (n.left + n.width / 2);
    }
    fitSectionNav(nav);
    nav.addEventListener('scroll', () => fitSectionNav(nav), { passive: true });
  });
}

/* ---- a row's menu ---- */
function closeRowMenus(except) {
  document.querySelectorAll('details.row-menu[open]').forEach((d) => {
    if (d !== except) d.open = false;
  });
}

function placeRowMenu(d) {
  d.classList.remove('is-up');
  if (!d.open) return;
  const panel = d.querySelector(':scope > .menu');
  if (!panel) return;
  const box = panel.getBoundingClientRect();
  const room = d.getBoundingClientRect().top - box.height;
  if (box.bottom > window.innerHeight - 8 && room > 8) d.classList.add('is-up');
}

/* ---- confirm ---- */
function confirmDialog() {
  return document.querySelector('dialog[data-confirm-dialog]');
}

/* Fills the page's one dialog from the asker's data-confirm-* and calls go()
   when the person confirms. Returns false where there is no <dialog> support,
   so the caller can fall back to the browser's own confirm. */
function ask(asker, go) {
  const dialog = confirmDialog();
  if (!dialog || typeof dialog.showModal !== 'function') return false;
  const title = dialog.querySelector('.dialog-title');
  const text = dialog.querySelector('.dialog-text');
  const action = dialog.querySelector('[data-confirm-go]');
  if (!action) return false;
  if (!action.dataset.label) action.dataset.label = action.textContent;
  if (title) title.textContent = asker.getAttribute('data-confirm-title');
  if (text) {
    text.textContent = asker.getAttribute('data-confirm-detail') || '';
    text.hidden = !text.textContent;
  }
  action.textContent = asker.getAttribute('data-confirm-action') || action.dataset.label;
  // A destructive confirm fills red; "primary" is for one that is not
  // (signing out), which takes the filled primary instead.
  action.classList.toggle('btn-danger', asker.getAttribute('data-confirm-tone') !== 'primary');
  action.onclick = () => { dialog.close(); go(); };
  dialog.showModal();
  return true;
}

function onSubmit(e) {
  const form = e.target;
  const asker = e.submitter && e.submitter.hasAttribute('data-confirm-title') ? e.submitter : form;
  if (!asker.hasAttribute || !asker.hasAttribute('data-confirm-title')) return;
  if (form.dataset.confirmed === '1') { delete form.dataset.confirmed; return; }
  const submitter = e.submitter || null;
  const shown = ask(asker, () => {
    form.dataset.confirmed = '1';
    if (typeof form.requestSubmit === 'function') form.requestSubmit(submitter);
    else form.submit();
  });
  if (shown) { e.preventDefault(); return; }
  const detail = asker.getAttribute('data-confirm-detail');
  if (!window.confirm(asker.getAttribute('data-confirm-title') + (detail ? ` ${detail}` : ''))) e.preventDefault();
}

function onConfirmLink(e) {
  const link = e.target.closest ? e.target.closest('a[data-confirm-title]') : null;
  if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  if (ask(link, () => { window.location.href = link.href; })) e.preventDefault();
}

/* ---- the toast ---- */
let toastTimer;

function toastElement() {
  let el = document.querySelector('[data-toast]');
  if (!el) {
    // A page that did not ship one still gets a live region; it is created
    // before it is filled, so the announcement is not lost.
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('data-toast', '');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    document.body.appendChild(el);
  }
  return el;
}

/* tone: 'success' (hides after five seconds), 'danger' (stays until closed)
   or 'neutral' (hides like a success). */
export function showToast(message, { tone = 'success' } = {}) {
  const el = toastElement();
  clearTimeout(toastTimer);
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', el.dataset.closeLabel || 'Close');
  close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  close.addEventListener('click', () => { el.hidden = true; });
  el.replaceChildren(text, close);
  el.className = `toast${tone === 'neutral' ? '' : ` toast-${tone}`}`;
  el.hidden = false;
  if (tone !== 'danger') toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

/* A toast the server rendered (after a redirect) gets the same close button
   and the same five seconds. */
export function initToast(root = document) {
  root.querySelectorAll('[data-toast]').forEach((el) => {
    if (bound.has(el)) return;
    bound.add(el);
    if (el.hidden || !el.textContent.trim()) return;
    const tone = el.classList.contains('toast-danger') ? 'danger'
      : el.classList.contains('toast-success') ? 'success' : 'neutral';
    showToast(el.textContent.trim(), { tone });
  });
}

/* ---- the stepper ---- */
function onStep(e) {
  const btn = e.target.closest ? e.target.closest('.stepper > button') : null;
  if (!btn || btn.disabled) return;
  const input = btn.parentElement.querySelector('input');
  if (!input || input.disabled || input.readOnly) return;
  const down = btn === btn.parentElement.firstElementChild;
  try { if (down) input.stepDown(); else input.stepUp(); } catch (err) { return; }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function bindDocument() {
  if (documentBound) return;
  documentBound = true;
  window.addEventListener('resize', () => document.querySelectorAll('.section-nav').forEach(fitSectionNav));
  document.addEventListener('click', (e) => {
    closeRowMenus(e.target.closest ? e.target.closest('details.row-menu') : null);
  });
  // 'toggle' does not bubble, so this listens in the capture phase.
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.matches && d.matches('details.row-menu')) {
      if (d.open) closeRowMenus(d);
      placeRowMenu(d);
    }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('details.row-menu[open]');
    if (!open) return;
    closeRowMenus(null);
    open.querySelector('summary')?.focus();
  });
  // Capture, so the question comes before any other submit handler acts.
  document.addEventListener('submit', onSubmit, true);
  document.addEventListener('click', onConfirmLink);
  document.addEventListener('click', onStep);
  // The bubble shows while the mark holds focus. A tap on a mark inside a
  // <label> runs the label's activation, which focuses the labelled field and
  // closes the bubble in the same gesture; cancelling the click stops that,
  // and the mark takes the focus itself.
  document.addEventListener('click', (e) => {
    const tip = e.target.closest ? e.target.closest('.info-tip') : null;
    if (!tip) return;
    e.preventDefault();
    tip.focus();
  });
}

export function initUI(root = document) {
  bindDocument();
  initSectionNav(root);
  initToast(root);
}

if (typeof document !== 'undefined' && !import.meta?.url?.includes('no-auto')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initUI());
  } else {
    initUI();
  }
}
