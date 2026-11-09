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

/* ---- price, link, rating ---- */
import { formatPrice, parsePrice, PRICE_MAX } from '../src/editor/price.js';
import { normalizeUrl } from '../src/editor/url.js';
import { cleanRating } from '../src/editor/rating.js';

test('a price reads a comma or a point', () => {
  assert.equal(parsePrice('12,50', 'pt-PT'), 12.5);
  assert.equal(parsePrice('12.50', 'pt-PT'), 12.5);
  assert.equal(parsePrice('12,5', 'en'), 12.5);
  assert.equal(parsePrice('.5'), 0.5);
  assert.equal(parsePrice(' 7 '), 7);
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('   '), null);
});

test('a price with both marks takes the last as the decimal', () => {
  assert.equal(parsePrice('1.234,50', 'en'), 1234.5);
  assert.equal(parsePrice('1,234.50', 'pt-PT'), 1234.5);
  assert.equal(parsePrice('1,234,567', 'en'), 1234567);
  assert.equal(parsePrice('1 234,50', 'pt-PT'), 1234.5);
});

test('three digits after one mark: the locale says which it is', () => {
  assert.equal(parsePrice('1,234', 'en'), 1234);
  assert.equal(parsePrice('1.234', 'en'), 1.234);
  assert.equal(parsePrice('1.234', 'de-DE'), 1234);
  assert.equal(parsePrice('1,234', 'de-DE'), 1.234);
  assert.equal(parsePrice('0,125', 'en'), 0.125, 'a leading zero is never a thousand');
});

test('what is not a price says so rather than guessing', () => {
  for (const bad of ['abc', '12a', '-3', '1.2.3', '1,23,4', '1.2,3.4', '.', ',']) {
    assert.equal(parsePrice(bad, 'en'), undefined, bad);
  }
  assert.equal(PRICE_MAX, 100000000);
});

test('a price shows in the page\'s locale, with no grouping and no padding', () => {
  assert.equal(formatPrice(12.5, 'pt-PT'), '12,5');
  assert.equal(formatPrice(1234.5, 'en'), '1234.5');
  assert.equal(formatPrice(null), '');
  assert.equal(formatPrice(0, 'en'), '0');
});

test('a link gains https://, keeps http://, and is null when empty', () => {
  assert.deepEqual(normalizeUrl(''), { ok: true, value: null });
  assert.deepEqual(normalizeUrl('   '), { ok: true, value: null });
  assert.equal(normalizeUrl('nfc.cool/menu').value, 'https://nfc.cool/menu');
  assert.equal(normalizeUrl('http://nfc.cool').value, 'http://nfc.cool');
  assert.equal(normalizeUrl('HTTPS://NFC.cool/a').value, 'HTTPS://NFC.cool/a');
  assert.equal(normalizeUrl('nfc.cool:8080/a').value, 'https://nfc.cool:8080/a', 'a port is not a scheme');
});

test('a link is refused for its scheme or its host', () => {
  assert.equal(normalizeUrl('javascript:alert(1)').reason, 'scheme');
  assert.equal(normalizeUrl('mailto:a@b.co').reason, 'scheme');
  assert.equal(normalizeUrl('tel:+351900').reason, 'scheme');
  assert.equal(normalizeUrl('localhost').reason, 'host');
  assert.equal(normalizeUrl('not a link').reason, 'host');
  assert.equal(normalizeUrl('https://.com').reason, 'host');
});

test('a host list refuses anything else, on the exact host as the server does', () => {
  const hosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com'];
  assert.equal(normalizeUrl('youtu.be/abc', { hosts }).value, 'https://youtu.be/abc');
  assert.equal(normalizeUrl('https://WWW.YouTube.com/watch?v=1', { hosts }).ok, true);
  assert.equal(normalizeUrl('https://evil.com/youtube.com', { hosts }).reason, 'allowed');
  assert.equal(normalizeUrl('https://notyoutube.com', { hosts }).reason, 'allowed');
});

test('a rating is 0 to 5 by 0.1, or nothing', () => {
  assert.equal(cleanRating('4.8'), 4.8);
  assert.equal(cleanRating('4,8'), 4.8);
  assert.equal(cleanRating('4.86'), 4.9);
  assert.equal(cleanRating('9'), 5);
  assert.equal(cleanRating('-1'), 0);
  assert.equal(cleanRating(''), null);
  assert.equal(cleanRating('x'), null);
});
