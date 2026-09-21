/* Theme for @nfccool/design: resolved before first paint, remembered per
 * browser, and toggled from the nav's own controls.
 *
 * A classic script on purpose, so it can be INLINED in <head> before the
 * stylesheets paint -- a module is deferred, and a deferred theme flashes:
 *
 *   <script>…contents of theme.js…</script>
 *
 * What it does, in order:
 *  1. Stamps data-theme on <html> from the remembered choice, else from
 *     prefers-color-scheme. A root the host has already stamped wins, so a
 *     server that knows the answer can render it.
 *  2. Follows the OS while no choice has been made: a person who never
 *     touched the switch gets dark when their phone does.
 *  3. Records the input modality as data-focus="pointer" | "key", which
 *     .select:focus reads to quieten a mouse-driven focus ring.
 *  4. Once the DOM exists, drives every .nav-theme-toggle and every
 *     [data-theme-set] button by delegation, and keeps aria-pressed in step
 *     with the attribute the CSS already lights from.
 *
 * window.nfccoolTheme = { get, set, toggle } is exposed for a page with a
 * control of its own, and the root dispatches "nfccool:theme" on every change.
 */
(function () {
  var root = document.documentElement;
  var KEY = 'nfccool.theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } }
  function system() { return mq && mq.matches ? 'dark' : 'light'; }
  function get() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function apply(v) {
    root.setAttribute('data-theme', v);
    // Native controls, scrollbars and form widgets follow the same fact.
    root.style.colorScheme = v;
    var sets = document.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < sets.length; i++) {
      sets[i].setAttribute('aria-pressed', String(sets[i].getAttribute('data-theme-set') === v));
    }
    var toggles = document.querySelectorAll('.nav-theme-toggle');
    for (var j = 0; j < toggles.length; j++) toggles[j].setAttribute('aria-pressed', String(v === 'dark'));
    root.dispatchEvent(new CustomEvent('nfccool:theme', { detail: { theme: v } }));
  }
  function set(v) { remember(v); apply(v); }
  function toggle() { set(get() === 'dark' ? 'light' : 'dark'); }

  if (!root.getAttribute('data-theme')) apply(stored() || system());
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () { if (!stored()) apply(system()); });
  }

  // Additive: nothing is stamped until an input arrives, so a page that never
  // sees a pointer keeps every focus ring.
  window.addEventListener('pointerdown', function () { root.setAttribute('data-focus', 'pointer'); }, true);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') root.setAttribute('data-focus', 'key');
  }, true);

  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.nav-theme-toggle, [data-theme-set]') : null;
      if (!t) return;
      var v = t.getAttribute('data-theme-set');
      if (v) set(v); else toggle();
    });
    // The controls exist now: carry the stamped fact to their aria-pressed.
    apply(get());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  window.nfccoolTheme = { get: get, set: set, toggle: toggle, KEY: KEY };
})();
