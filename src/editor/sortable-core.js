/* The arithmetic behind Sortable, with no DOM in it, so node --test can pin it. */

export function reorder(list, from, to) {
  const next = list.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/* Fixed items stay at the ends (the contact row, a tile still uploading):
   nothing is dragged past them. */
export function bounds(fixed) {
  let min = 0;
  let max = fixed.length - 1;
  while (min <= max && fixed[min]) min += 1;
  while (max >= min && fixed[max]) max -= 1;
  return { min, max };
}

export const place = (index, { min, max }) => ({ position: index - min + 1, total: max - min + 1 });

/* How many tiles the first line of a grid holds. */
export function columnsOf(rects) {
  if (!rects.length) return 1;
  const top = rects[0].top;
  const n = rects.filter(r => Math.abs(r.top - top) < 2).length;
  return Math.max(1, n);
}

/* Where an arrow key takes an item. A list moves on Up and Down; a grid also
   moves by a line, and its Left and Right swap under dir="rtl". */
export function keyTarget({ index, key, min, max, grid = false, columns = 1, rtl = false }) {
  let delta = 0;
  if (key === 'ArrowUp') delta = grid ? -columns : -1;
  else if (key === 'ArrowDown') delta = grid ? columns : 1;
  else if (grid && key === 'ArrowLeft') delta = rtl ? 1 : -1;
  else if (grid && key === 'ArrowRight') delta = rtl ? -1 : 1;
  else return index;
  const next = index + delta;
  return next < min || next > max ? index : next;
}

/* Which index the dragged item should take, given every item's box with the
   dragged one at its resting place. Half of a neighbour is the line to cross,
   and a pointer in a gap or over the item itself changes nothing, so an item
   taller than the dragged one does not flip back and forth. */
export function dropTarget({ rects, index, x, y, min, max, grid = false, rtl = false }) {
  const own = rects[index];
  if (y >= own.top && y <= own.bottom && (!grid || (x >= own.left && x <= own.right))) return index;
  const clamp = i => Math.min(max, Math.max(min, i));
  if (!grid) {
    const others = rects.map((r, i) => ({ r, i })).filter(o => o.i !== index);
    if (others.length && y < others[0].r.top) return min;
    if (others.length && y > others[others.length - 1].r.bottom) return max;
  }
  for (let i = 0; i < rects.length; i += 1) {
    if (i === index) continue;
    const r = rects[i];
    if (y < r.top || y > r.bottom) continue;
    if (grid && (x < r.left || x > r.right)) continue;
    const before = grid ? (rtl ? x > (r.left + r.right) / 2 : x < (r.left + r.right) / 2) : y < (r.top + r.bottom) / 2;
    const slot = i < index ? (before ? i : i + 1) : (before ? i - 1 : i);
    return clamp(slot);
  }
  return index;
}
