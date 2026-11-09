/* The editor kit's pure logic. Parts that need a browser are driven by hand
   through the guideline's Editor parts page. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bounds, columnsOf, dropTarget, keyTarget, place, reorder } from '../src/editor/sortable-core.js';

const stack = (...heights) => {
  let top = 0;
  return heights.map((h) => { const r = { left: 0, right: 100, top, bottom: top + h }; top += h + 8; return r; });
};

test('reorder moves one item and leaves the input alone', () => {
  const input = ['a', 'b', 'c', 'd'];
  assert.deepEqual(reorder(input, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorder(input, 3, 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
});

test('fixed items hold the ends, and positions count what can move', () => {
  assert.deepEqual(bounds([true, false, false, false]), { min: 1, max: 3 });
  assert.deepEqual(bounds([false, false, true]), { min: 0, max: 1 });
  assert.deepEqual(place(2, { min: 1, max: 5 }), { position: 2, total: 5 });
});

test('arrows move one place in a list and stop at the ends', () => {
  const at = (index, key) => keyTarget({ index, key, min: 1, max: 4 });
  assert.equal(at(2, 'ArrowDown'), 3);
  assert.equal(at(2, 'ArrowUp'), 1);
  assert.equal(at(1, 'ArrowUp'), 1, 'the fixed first row is not passed');
  assert.equal(at(4, 'ArrowDown'), 4);
  assert.equal(at(2, 'ArrowLeft'), 2, 'a list has no sideways');
});

test('a grid moves by a line, and Left and Right swap in RTL', () => {
  const at = (key, rtl = false) => keyTarget({ index: 5, key, min: 0, max: 11, grid: true, columns: 4, rtl });
  assert.equal(at('ArrowDown'), 9);
  assert.equal(at('ArrowUp'), 1);
  assert.equal(at('ArrowRight'), 6);
  assert.equal(at('ArrowLeft'), 4);
  assert.equal(at('ArrowRight', true), 4);
  assert.equal(at('ArrowLeft', true), 6);
  assert.equal(keyTarget({ index: 9, key: 'ArrowDown', min: 0, max: 11, grid: true, columns: 4 }), 9, 'no line below');
});

test('columnsOf counts the first line', () => {
  const r = t => ({ top: t });
  assert.equal(columnsOf([r(0), r(1), r(0), r(100), r(100)]), 3);
  assert.equal(columnsOf([]), 1);
});

test('a dragged row takes a place once it crosses half of a neighbour', () => {
  const rects = stack(40, 40, 40, 40);
  const drop = (index, y, min = 0, max = 3) => dropTarget({ rects, index, x: 10, y, min, max });
  assert.equal(drop(0, 20), 0, 'over itself');
  assert.equal(drop(0, 50), 0, 'the top half of the next row');
  assert.equal(drop(0, 80), 1, 'the bottom half of the next row');
  assert.equal(drop(0, 175), 3);
  assert.equal(drop(3, 140), 3, 'the bottom half of the row above');
  assert.equal(drop(3, 100), 2);
  assert.equal(drop(3, -30), 0, 'above the list');
  assert.equal(drop(0, 900), 3, 'below the list');
  assert.equal(drop(2, -30, 1, 3), 1, 'not past a fixed first row');
  assert.equal(drop(0, 44), 0, 'in a gap');
});

test('a taller neighbour does not flip back and forth', () => {
  /* Dragged 40 high at index 1, under a neighbour 100 high: cross its half and
     the dragged row is first, and the same pointer then says stay. */
  const before = stack(100, 40);
  assert.equal(dropTarget({ rects: before, index: 1, x: 10, y: 40, min: 0, max: 1 }), 0);
  const after = stack(40, 100);
  assert.equal(dropTarget({ rects: after, index: 0, x: 10, y: 40, min: 0, max: 1 }), 0);
});

test('in a grid the side of a tile decides, mirrored in RTL', () => {
  const tile = (left, top) => ({ left, right: left + 100, top, bottom: top + 100 });
  const rects = [tile(0, 0), tile(110, 0), tile(220, 0), tile(0, 110), tile(110, 110)];
  const drop = (x, y, rtl = false) => dropTarget({ rects, index: 0, x, y, min: 0, max: 4, grid: true, rtl });
  assert.equal(drop(130, 50), 0, 'the near half of the next tile');
  assert.equal(drop(190, 50), 1);
  assert.equal(drop(190, 150), 4, 'the far half on the next line');
  assert.equal(drop(130, 50, true), 1, 'in RTL the near half is on the other side');
  assert.equal(drop(105, 50), 0, 'in a gap');
});
