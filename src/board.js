/* Board behaviour for @nfccool/design: cards that move between stages, and
 * the side panel a card opens in. Taken from Lurva's pipeline (/quadro) on
 * 2026-11-23, made to know nothing about what moves.
 *
 * Progressive enhancement, like ui.js: without this file a board is a set of
 * readable columns and each card can be a link to its record. An ES module;
 * wire it once per page that has a board or a side panel:
 *
 *   <script type="module" src="/assets/design/board.js"></script>
 *
 * which self-initialises on DOMContentLoaded. To control the timing, opt out
 * with ?no-auto and call initBoard() yourself; calling it again after a part
 * of the page is swapped in only picks up the new boards.
 *
 *   import { initBoard, moveCard, filterBoard, openSidePanel, closeSidePanel } from '/assets/design/board.js?no-auto';
 *
 * The markup it reads (recipe 7 in RECIPES.md):
 *   .board[data-board]           the columns; data-side-panel="<id>" names a
 *                                .side-panel that a card opens in
 *   .board-col[data-stage]       one per stage, its cards in .board-col-body
 *   .board-card[data-id]         a card; tabindex="0", draggable="true"
 *   [data-count]                 in a column head: its visible card count
 *   .board-strip [data-go]       a stage chip; its [data-count] is kept too
 *   .board-dock [data-go]        a drop target while a card is carried
 *   [data-board-none]            shown when a filter leaves no card at all
 *   [data-move-to="<stage>"]     inside the side panel: moves the open card
 *
 * What it does:
 *   mouse        native drag and drop between columns (a pointer that hovers)
 *   touch        a held card lifts after 380ms, follows the finger, and drops
 *                on a column, a strip chip or the dock; the board scrolls
 *                sideways near its edges and a column near its top and foot
 *   keyboard     Enter or Space on a card opens it; a stage is then picked
 *                with the panel's [data-move-to] buttons, which is also how a
 *                finger moves a card without dragging it
 *   counts       each column's count, is-empty and the strip's counts follow
 *                every move and every filter
 *   narrow       below lg the board is as tall as the window under it
 *                (--board-h), and the strip marks the column in view
 *
 * Events, on the .board, for the product to act on:
 *   board:move   { card, id, from, to, revert } after the card has moved on
 *                screen; save it, and call revert() if the save fails
 *   board:open   { card, id, stage, panel } before a card's panel opens;
 *                fill the panel here, or preventDefault() to open it yourself
 *
 * No copy lives here. Every word a person reads (the hint, the empty column,
 * the close label) is in the page's own markup, in the page's language.
 */

const boards = new WeakSet();
let documentBound = false;
const LIFT_AFTER = 380;   // ms a finger rests on a card before it lifts
const SLOP = 8;           // px a finger may wander before the hold is a scroll
const EDGE = 40;          // px from an edge where carrying starts to scroll
const narrow = () => matchMedia('(max-width: 899px)').matches;
const coarse = () => matchMedia('(pointer: coarse)').matches;
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const stageOf = (card) => card.closest('.board-col')?.dataset.stage;
const bodyOf = (board, stage) => board.querySelector(`.board-col[data-stage="${CSS.escape(stage)}"] .board-col-body`);
const firstCard = (body) => body.querySelector('.board-card');

/* ---- counts ---- */
export function recount(board) {
  board.querySelectorAll('.board-col').forEach((col) => {
    const visible = [...col.querySelectorAll('.board-card')].filter((c) => !c.hidden).length;
    const count = col.querySelector('[data-count]');
    if (count) count.textContent = visible;
    col.classList.toggle('is-empty', visible === 0);
    document.querySelectorAll(`.board-strip [data-go="${CSS.escape(col.dataset.stage)}"] [data-count]`)
      .forEach((n) => (n.textContent = visible));
  });
  const none = document.querySelector('[data-board-none]');
  if (none) none.hidden = !!board.querySelector('.board-card:not([hidden])') || !board.querySelector('.board-card');
}

/* ---- filter: keep() decides, per card, whether it stays in sight ---- */
export function filterBoard(board, keep) {
  board.querySelectorAll('.board-card').forEach((card) => (card.hidden = !keep(card)));
  recount(board);
}

/* ---- move: the card moves first, the product is told after ---- */
function syncPanel(id, stage) {
  document.querySelectorAll('.side-panel').forEach((panel) => {
    if (panel.dataset.boardCard !== String(id)) return;
    panel.querySelectorAll('[data-move-to]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.moveTo === stage)));
  });
}

/* ---- landing: where a moved card goes, and how it gets there ----
   A board may keep its columns in an order of its own: data-board-order names
   an attribute of the cards, and a column holds them by that value, highest
   first (an ISO time is newest first). Without it a moved card goes to the top. */
const EASE = 'cubic-bezier(.2, .8, .2, 1)';
function place(card, body) {
  const attr = card.closest('.board')?.dataset.boardOrder;
  const value = attr && card.getAttribute(attr);
  const cards = [...body.querySelectorAll('.board-card')].filter((c) => c !== card);
  const before = value != null && value !== ''
    ? cards.find((c) => (c.getAttribute(attr) || '') < value) || body.querySelector('.board-col-empty')
    : cards[0] || body.querySelector('.board-col-empty');
  body.insertBefore(card, before && before.parentElement === body ? before : null);
}
const places = (board) => new Map([...board.querySelectorAll('.board-card')].map((c) => [c, c.getBoundingClientRect()]));
/* Every card that changed place glides from where it was: the ones closing the
   gap the card left, the ones making room for it, and the card itself unless it
   was dropped, which is already under the pointer and settles there instead. */
function glide(board, before, card, settle) {
  board.querySelectorAll('.board-card').forEach((c) => {
    const was = before.get(c);
    if (!was || c.hidden || (c === card && settle)) return;
    const now = c.getBoundingClientRect();
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: c === card ? 420 : 300, easing: EASE });
  });
  if (settle) card.animate([{ transform: 'scale(.94)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: EASE });
}

/* quiet: the product already saved the change (its own panel did it), so the
   card only moves; no board:move. settle: the card was dropped where it lands. */
export function moveCard(card, stage, { quiet = false, settle = false } = {}) {
  const board = card.closest('.board');
  const from = stageOf(card);
  const to = bodyOf(board, stage);
  if (!to || from === stage) return false;
  const home = card.parentElement;
  const next = card.nextElementSibling;
  const before = places(board);
  place(card, to);
  if (!calm()) glide(board, before, card, settle);
  card.classList.remove('is-landed');
  void card.offsetWidth;   // restart the landing ring when a card lands twice
  card.classList.add('is-landed');
  setTimeout(() => card.classList.remove('is-landed'), calm() ? 0 : 1400);
  recount(board);
  syncPanel(card.dataset.id, stage);
  const revert = () => {
    home.insertBefore(card, next && next.parentElement === home ? next : null);
    recount(board);
    syncPanel(card.dataset.id, from);
  };
  if (!quiet) board.dispatchEvent(new CustomEvent('board:move', { bubbles: true, detail: { card, id: card.dataset.id, from, to: stage, revert } }));
  return true;
}

/* ---- side panel ---- */
let opener = null;
const scrimOf = (panel) => (panel.previousElementSibling?.matches('.side-panel-scrim') ? panel.previousElementSibling : null);

export function openSidePanel(panel, from = document.activeElement) {
  if (typeof panel === 'string') panel = document.getElementById(panel);
  if (!panel) return;
  opener = from;
  const scrim = scrimOf(panel);
  panel.hidden = false;
  if (scrim) scrim.hidden = false;
  requestAnimationFrame(() => {
    panel.classList.add('is-open');
    scrim?.classList.add('is-open');
  });
  document.body.classList.add('has-side-panel');
  (panel.querySelector('[data-close]') || panel).focus({ preventScroll: true });
}

export function closeSidePanel(panel = document.querySelector('.side-panel.is-open')) {
  if (!panel || panel.hidden) return;
  const scrim = scrimOf(panel);
  panel.classList.remove('is-open');
  scrim?.classList.remove('is-open');
  document.body.classList.remove('has-side-panel');
  setTimeout(() => {
    panel.hidden = true;
    if (scrim) scrim.hidden = true;
  }, calm() ? 0 : 200);
  document.querySelectorAll('.board-card.is-selected').forEach((c) => c.classList.remove('is-selected'));
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  opener = null;
}

function openCard(board, card) {
  const panel = board.dataset.sidePanel && document.getElementById(board.dataset.sidePanel);
  // The panel names its card before the product fills it, so [data-move-to]
  // inside it always moves the card that is open.
  if (panel) panel.dataset.boardCard = card.dataset.id;
  const event = new CustomEvent('board:open', { bubbles: true, cancelable: true, detail: { card, id: card.dataset.id, stage: stageOf(card), panel } });
  board.querySelectorAll('.board-card.is-selected').forEach((c) => c.classList.remove('is-selected'));
  card.classList.add('is-selected');
  if (!board.dispatchEvent(event) || !panel) return;
  syncPanel(card.dataset.id, stageOf(card));
  openSidePanel(panel, card);
}

/* ---- one board ---- */
function bindBoard(board) {
  let dragged = null;
  let carry = null;
  let justDropped = false;

  // Mouse. On a touch screen native drag fights with scrolling, so it is off.
  // Only where it was on: a card without draggable="true" (a read-only board)
  // is not carried by touch either, and data-board-carry remembers which were.
  if (coarse()) board.querySelectorAll('.board-card[draggable="true"]').forEach((c) => { c.draggable = false; c.dataset.boardCarry = ''; });
  board.addEventListener('dragstart', (event) => {
    const card = event.target.closest?.('.board-card');
    if (!card) return;
    dragged = card;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.id);
    requestAnimationFrame(() => card.classList.add('is-dragging'));
    board.classList.add('is-dragging');
  });
  board.addEventListener('dragend', () => {
    dragged?.classList.remove('is-dragging');
    dragged = null;
    board.classList.remove('is-dragging');
    board.querySelectorAll('.board-col.is-over').forEach((c) => c.classList.remove('is-over'));
  });
  board.addEventListener('dragover', (event) => {
    const col = event.target.closest?.('.board-col');
    if (!col || !dragged) return;
    event.preventDefault();
    board.querySelectorAll('.board-col.is-over').forEach((c) => c !== col && c.classList.remove('is-over'));
    col.classList.add('is-over');
  });
  board.addEventListener('dragleave', (event) => {
    const col = event.target.closest?.('.board-col');
    if (col && !col.contains(event.relatedTarget)) col.classList.remove('is-over');
  });
  board.addEventListener('drop', (event) => {
    const col = event.target.closest?.('.board-col');
    if (!col || !dragged) return;
    event.preventDefault();
    col.classList.remove('is-over');
    moveCard(dragged, col.dataset.stage, { settle: true });
  });

  // Open: a click or Enter on a card, but not on a link or a button inside it.
  board.addEventListener('click', (event) => {
    const card = event.target.closest('.board-card');
    if (!card || justDropped || event.target.closest('a, button, input, select, textarea')) return;
    if (card.matches('a')) event.preventDefault();
    openCard(board, card);
  });
  board.addEventListener('keydown', (event) => {
    const card = event.target.closest('.board-card');
    if (!card || event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    openCard(board, card);
  });

  // Narrow: the board fills the window below its tools; each column scrolls.
  const fit = () => {
    if (!narrow()) return board.style.removeProperty('--board-h');
    const top = board.getBoundingClientRect().top + scrollY;
    board.style.setProperty('--board-h', `${Math.max(380, innerHeight - top - 12)}px`);
  };
  fit();
  addEventListener('resize', fit);

  // The strip: a tap scrolls to that column; the column in view is marked.
  const chips = [...document.querySelectorAll('.board-strip [data-go]')];
  const rtl = getComputedStyle(board).direction === 'rtl';
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const col = board.querySelector(`.board-col[data-stage="${CSS.escape(chip.dataset.go)}"]`);
    if (!col) return;
    const b = board.getBoundingClientRect(), c = col.getBoundingClientRect();
    board.scrollBy({ left: rtl ? c.right - b.right : c.left - b.left, behavior: calm() ? 'auto' : 'smooth' });
  }));
  const mark = () => {
    const b = board.getBoundingClientRect();
    let best = null, gap = Infinity;
    board.querySelectorAll('.board-col').forEach((col) => {
      const c = col.getBoundingClientRect();
      const d = Math.abs(rtl ? c.right - b.right : c.left - b.left);
      if (d < gap) { gap = d; best = col.dataset.stage; }
    });
    chips.forEach((chip) => {
      const on = chip.dataset.go === best;
      chip.setAttribute('aria-current', String(on));
      if (on && narrow()) chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };
  if (chips.length) {
    board.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
    mark();
  }

  // Touch: hold to lift, carry, drop.
  board.addEventListener('touchstart', (event) => {
    const card = event.target.closest('.board-card');
    if (!card || !card.matches('[draggable="true"], [data-board-carry]') || carry || event.touches.length > 1) return;
    const { clientX: x0, clientY: y0 } = event.touches[0];
    const wait = setTimeout(() => lift(card, x0, y0), LIFT_AFTER);
    const off = () => {
      clearTimeout(wait);
      card.removeEventListener('touchmove', moved);
      card.removeEventListener('touchend', off);
      card.removeEventListener('touchcancel', off);
    };
    const moved = (e) => {
      const t = e.touches[0];
      if (!carry && Math.hypot(t.clientX - x0, t.clientY - y0) > SLOP) off();
    };
    card.addEventListener('touchmove', moved, { passive: true });
    card.addEventListener('touchend', off);
    card.addEventListener('touchcancel', off);
  }, { passive: true });

  function lift(card, x, y) {
    const box = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('board-card-ghost');
    ghost.classList.remove('is-selected');
    ghost.removeAttribute('tabindex');
    ghost.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.inlineSize = `${box.width}px`;
    document.body.append(ghost);
    card.classList.add('is-lifted');
    board.classList.add('is-dragging');
    document.documentElement.classList.add('is-board-carrying');
    const here = stageOf(card);
    document.querySelectorAll('.board-dock [data-go]').forEach((s) => s.classList.toggle('is-here', s.dataset.go === here));
    navigator.vibrate?.(12);
    carry = { card, ghost, dx: box.width / 2, dy: box.height + 14, x, y, target: null, frame: requestAnimationFrame(edges) };
    place(x, y);
  }
  function place(x, y) {
    carry.x = x;
    carry.y = y;
    carry.ghost.style.left = `${x - carry.dx}px`;
    carry.ghost.style.top = `${y - carry.dy}px`;
  }
  function targetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el?.closest('.board-dock [data-go], .board-strip [data-go]') || el?.closest('.board-col') || null;
  }
  function edges() {
    if (!carry) return;
    const { x, y } = carry;
    const b = board.getBoundingClientRect();
    if (x < b.left + EDGE) board.scrollLeft -= 18;
    else if (x > b.right - EDGE) board.scrollLeft += 18;
    const body = carry.target?.matches('.board-col') && carry.target.querySelector('.board-col-body');
    if (body) {
      const r = body.getBoundingClientRect();
      if (y < r.top + EDGE) body.scrollTop -= 10;
      else if (y > r.bottom - EDGE) body.scrollTop += 10;
    }
    carry.frame = requestAnimationFrame(edges);
  }
  // Not passive: once a card is lifted, the finger moves the card, not the page.
  document.addEventListener('touchmove', (event) => {
    if (!carry) return;
    event.preventDefault();
    const t = event.touches[0];
    place(t.clientX, t.clientY);
    const target = targetAt(t.clientX, t.clientY);
    if (target !== carry.target) {
      carry.target?.classList.remove('is-over');
      target?.classList.add('is-over');
      carry.target = target;
    }
  }, { passive: false });
  function drop() {
    if (!carry) return;
    const { card, ghost, target, frame } = carry;
    cancelAnimationFrame(frame);
    carry = null;
    ghost.remove();
    card.classList.remove('is-lifted');
    target?.classList.remove('is-over');
    board.classList.remove('is-dragging');
    document.documentElement.classList.remove('is-board-carrying');
    justDropped = true;
    setTimeout(() => (justDropped = false), 400);
    const stage = target?.dataset.go || target?.dataset.stage;
    if (stage) moveCard(card, stage, { settle: true });
  }
  document.addEventListener('touchend', drop);
  document.addEventListener('touchcancel', drop);
  // The long press that lifts a card would also open the browser's menu.
  board.addEventListener('contextmenu', (event) => {
    if (carry || (coarse() && event.target.closest('.board-card'))) event.preventDefault();
  });

  recount(board);
}

function bindDocument() {
  if (documentBound) return;
  documentBound = true;
  document.addEventListener('click', (event) => {
    const panel = event.target.closest('.side-panel');
    if (event.target.matches('.side-panel-scrim')) return closeSidePanel();
    if (!panel) return;
    if (event.target.closest('[data-close]')) return closeSidePanel(panel);
    const move = event.target.closest('[data-move-to]');
    if (move && panel.dataset.boardCard) {
      const card = document.querySelector(`.board-card[data-id="${CSS.escape(panel.dataset.boardCard)}"]`);
      if (card) moveCard(card, move.dataset.moveTo);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.querySelector('.side-panel.is-open')) closeSidePanel();
  });
}

export function initBoard(root = document) {
  bindDocument();
  root.querySelectorAll('.board[data-board]').forEach((board) => {
    if (boards.has(board)) return;
    boards.add(board);
    bindBoard(board);
  });
}

if (!import.meta?.url?.includes('no-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initBoard());
  else initBoard();
}
