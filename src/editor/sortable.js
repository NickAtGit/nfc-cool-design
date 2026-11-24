/* Sortable: drag by pointer, or lift and move by keyboard. No dependency.

     const s = NFCEditorKit.sortable(listEl, {
       items: '.ed-row',                  // the children that move
       label: el => el.dataset.name,      // the name spoken
       isFixed: el => el.dataset.fixed,   // stays at its end
       axis: 'block',                     // or 'grid'
       onMove: ({ from, to, item }) => {},
     });

   A handle is any [data-ed-handle] button inside an item. A mouse or a finger
   on it lifts at once. A finger held 300 ms anywhere else on the row lifts too,
   and until then the list scrolls: touch-action: none is on the handle only.

   The dragged element is never taken out of the DOM. Its neighbours move
   around it, because removing it would drop its pointer capture and its focus
   and "focus stays on the handle" is the keyboard contract. */
import { say } from './config.js';
import { announce } from './dom.js';
import { bounds, columnsOf, dropTarget, keyTarget, place } from './sortable-core.js';

const LONG_PRESS_MS = 300;
const PRESS_SLOP = 10;
const EDGE = 48;
const NOT_A_PRESS = 'input, textarea, select, a, summary, [data-ed-no-press]';

function scroller(node) {
  for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
    const y = getComputedStyle(el).overflowY;
    if ((y === 'auto' || y === 'scroll') && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}

export function sortable(container, options) {
  const { items, onMove, label = el => el.textContent.trim(), isFixed = () => false, axis = 'block', longPress = true } = options;
  const grid = axis === 'grid';
  container.setAttribute('data-ed-sortable', '');
  const list = () => [...container.children].filter(c => c.matches(items));
  const rangeOf = all => bounds(all.map(el => Boolean(isFixed(el))));
  const isRtl = () => getComputedStyle(container).direction === 'rtl';

  let drag = null;
  let press = null;
  let held = null;
  let swallowClick = false;

  const owns = (target) => target.closest('[data-ed-sortable]') === container;
  const itemOf = (node) => {
    const el = node.closest(items);
    return el && el.parentElement === container ? el : null;
  };

  function moveTo(el, target) {
    for (;;) {
      const all = list();
      const at = all.indexOf(el);
      if (at === target) return;
      if (at < target) container.insertBefore(all[at + 1], el);
      else el.after(all[at - 1]);
    }
  }

  /* ---- pointer ---- */
  function lift(el, e, captureOn) {
    const all = list();
    const box = el.getBoundingClientRect();
    drag = {
      el, id: e.pointerId, from: all.indexOf(el), range: rangeOf(all),
      x: e.clientX, y: e.clientY, grabX: e.clientX - box.left, grabY: e.clientY - box.top,
      tx: 0, ty: 0, scroll: scroller(container), frame: 0,
    };
    try { captureOn.setPointerCapture(e.pointerId); } catch (err) { /* the finger already left */ }
    el.classList.add('ed-sort-lifted');
    container.classList.add('ed-sorting');
    drag.frame = requestAnimationFrame(tick);
  }

  function autoScroll() {
    const s = drag.scroll;
    const top = s ? s.getBoundingClientRect().top : 0;
    const bottom = s ? s.getBoundingClientRect().bottom : window.innerHeight;
    let step = 0;
    if (drag.y < top + EDGE) step = -Math.ceil((top + EDGE - drag.y) / 4);
    else if (drag.y > bottom - EDGE) step = Math.ceil((drag.y - bottom + EDGE) / 4);
    if (!step) return;
    if (s) s.scrollTop += step; else window.scrollBy(0, step);
  }

  function resting() {
    return list().map((el) => {
      const r = el.getBoundingClientRect();
      if (el !== drag.el) return r;
      return { left: r.left - drag.tx, right: r.right - drag.tx, top: r.top - drag.ty, bottom: r.bottom - drag.ty };
    });
  }

  function tick() {
    if (!drag) return;
    autoScroll();
    const all = list();
    const index = all.indexOf(drag.el);
    const target = dropTarget({ rects: resting(), index, x: drag.x, y: drag.y, min: drag.range.min, max: drag.range.max, grid, rtl: isRtl() });
    if (target !== index) moveTo(drag.el, target);
    const r = resting()[list().indexOf(drag.el)];
    drag.ty = drag.y - drag.grabY - r.top;
    drag.tx = grid ? drag.x - drag.grabX - r.left : 0;
    drag.el.style.transform = `translate(${drag.tx}px, ${drag.ty}px)`;
    drag.frame = requestAnimationFrame(tick);
  }

  function endDrag(commit) {
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.frame);
    d.el.style.transform = '';
    d.el.classList.remove('ed-sort-lifted');
    container.classList.remove('ed-sorting');
    if (!commit) { moveTo(d.el, d.from); return; }
    const to = list().indexOf(d.el);
    if (to !== d.from && onMove) onMove({ from: d.from, to, item: d.el });
  }

  function clearPress() {
    if (press) clearTimeout(press.timer);
    press = null;
  }

  function onPointerDown(e) {
    if (e.button !== 0 || drag || held || !owns(e.target)) return;
    const handle = e.target.closest('[data-ed-handle]');
    if (handle) {
      const el = itemOf(handle);
      if (!el || isFixed(el)) return;
      lift(el, e, handle);
      return;
    }
    if (!longPress || e.pointerType !== 'touch' || e.target.closest(NOT_A_PRESS)) return;
    const el = itemOf(e.target);
    if (!el || isFixed(el)) return;
    const down = e;
    press = {
      x: e.clientX, y: e.clientY,
      timer: setTimeout(() => { press = null; swallowClick = true; lift(el, down, el); }, LONG_PRESS_MS),
    };
  }

  function onPointerMove(e) {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > PRESS_SLOP) clearPress();
    if (drag && e.pointerId === drag.id) { drag.x = e.clientX; drag.y = e.clientY; }
  }

  function onPointerEnd(e) {
    clearPress();
    if (drag && e.pointerId === drag.id) endDrag(e.type === 'pointerup');
    if (swallowClick) setTimeout(() => { swallowClick = false; }, 0);
  }

  /* Blocking only once lifted, so the list scrolls until then. It has to be
     registered before the touch starts for the browser to let it block. */
  function onTouchMove(e) { if (drag) e.preventDefault(); }
  function onContextMenu(e) { if (press || drag) e.preventDefault(); }
  function onClick(e) { if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; } }

  /* ---- keyboard ---- */
  function say2(name, el, index, range) {
    announce(say(name, { name: label(el), ...place(index, range) }));
  }

  function dropHeld(commit) {
    const h = held;
    held = null;
    h.el.classList.remove('ed-sort-lifted');
    if (!commit) {
      moveTo(h.el, h.from);
      announce(say('moveCancelled'));
      return;
    }
    announce(say('moveDropped', { name: label(h.el) }));
    const to = list().indexOf(h.el);
    if (to !== h.from && onMove) onMove({ from: h.from, to, item: h.el });
  }

  function onKeyDown(e) {
    if (drag && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endDrag(false); return; }
    const handle = e.target.closest ? e.target.closest('[data-ed-handle]') : null;
    if (!handle || !owns(handle)) return;
    const el = itemOf(handle);
    if (!el) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (held) { dropHeld(true); return; }
      if (isFixed(el)) return;
      const all = list();
      const range = rangeOf(all);
      held = { el, handle, from: all.indexOf(el), range };
      el.classList.add('ed-sort-lifted');
      say2('moveLifted', el, held.from, range);
      return;
    }
    if (!held) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dropHeld(false); return; }
    if (e.key === 'Tab') { dropHeld(false); return; }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const all = list();
    const index = all.indexOf(el);
    const target = keyTarget({
      index, key: e.key, min: held.range.min, max: held.range.max, grid, rtl: isRtl(),
      columns: grid ? columnsOf(all.map(n => n.getBoundingClientRect())) : 1,
    });
    if (target === index) return;
    moveTo(el, target);
    handle.scrollIntoView({ block: 'nearest' });
    say2('moveMoved', el, target, held.range);
  }

  function onFocusOut(e) {
    if (held && e.target === held.handle) dropHeld(false);
  }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerEnd);
  container.addEventListener('pointercancel', onPointerEnd);
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('contextmenu', onContextMenu);
  container.addEventListener('click', onClick, true);
  container.addEventListener('focusout', onFocusOut);
  /* On the document: a lifted pointer's Escape lands wherever the focus is, not
     in the list. owns() keeps a nested list's keys to that list. */
  document.addEventListener('keydown', onKeyDown, true);

  return {
    destroy() {
      clearPress();
      if (drag) endDrag(false);
      container.removeAttribute('data-ed-sortable');
      for (const [type, fn, opt] of [['pointerdown', onPointerDown], ['pointermove', onPointerMove], ['pointerup', onPointerEnd], ['pointercancel', onPointerEnd], ['touchmove', onTouchMove], ['contextmenu', onContextMenu], ['click', onClick, true], ['focusout', onFocusOut]]) {
        container.removeEventListener(type, fn, opt);
      }
      document.removeEventListener('keydown', onKeyDown, true);
    },
  };
}
