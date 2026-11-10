/* Media: a grid of photos and a list of files. Both upload as they are picked,
   three at a time, with the size checked first; the upload itself is the
   caller's function, which resolves to { id, url, thumb, ... }.

     NFCEditorKit.mediaGrid({ items, upload: file => promise, maxItems: 100, onChange });
     NFCEditorKit.fileList({ items, upload, maxItems: 10, onChange });

   A tile's actions sit under the picture, never on it (GUIDELINE, "No control
   sits on top of the media it acts on"). Removing drops the reference and asks
   first; the server prunes the file. */
import { cls, say, word } from './config.js';
import { ask } from './confirm.js';
import { h, icon, uid } from './dom.js';
import { sortable } from './sortable.js';

export const UPLOADS_AT_ONCE = 3;
const MB = 1024 * 1024;

/* Runs worker over items, at most limit at a time, starting them in order. */
export async function runPool(items, limit, worker) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

export const isImage = file => (file.type || '').startsWith('image/') || /\.(hei[cf])$/i.test(file.name || '');
export const isPdf = file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');

/* Which of the picked files go up, and the one sentence for the rest. */
export function triage(files, { room, pickMax = Infinity, maxBytes, fits }) {
  const accepted = [];
  let error = '';
  let refusal = null;
  for (const file of files) {
    if (fits && !fits(file)) { refusal = refusal || { key: 'wrongType', name: file.name }; continue; }
    if (file.size > maxBytes) { refusal = refusal || { key: 'tooBig', name: file.name }; continue; }
    accepted.push(file);
  }
  const limit = Math.min(room, pickMax);
  if (accepted.length > limit) {
    accepted.length = Math.max(0, limit);
    error = limit < pickMax ? 'full' : 'pickMax';
  }
  return { accepted, error, refusal };
}

function explain(result, { noun, maxBytes, maxItems, pickMax }) {
  if (result.refusal?.key === 'tooBig') return say('mediaTooBig', { name: result.refusal.name, mb: Math.round(maxBytes / MB) });
  if (result.refusal?.key === 'wrongType') return say('mediaWrongType', { name: result.refusal.name, noun });
  if (result.error === 'full') return say('mediaFull', { max: maxItems });
  if (result.error === 'pickMax') return say('mediaPickMax', { max: pickMax });
  return '';
}

function dropZone(root, slot, onFiles) {
  const carries = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  root.addEventListener('dragover', (e) => { if (!carries(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; slot.classList.add('is-dragover'); });
  root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) slot.classList.remove('is-dragover'); });
  root.addEventListener('drop', (e) => { if (!carries(e)) return; e.preventDefault(); slot.classList.remove('is-dragover'); onFiles([...e.dataTransfer.files]); });
}

function adder({ word: addWord, spec, accept, multiple, onFiles }) {
  const id = uid('ed-file');
  const input = h('input', { class: 'sr-only', id, type: 'file', accept, multiple });
  input.addEventListener('change', () => { const files = [...input.files]; input.value = ''; onFiles(files); });
  const slot = h('label', { class: 'slot-empty', for: id }, icon('upload'), h('span', { class: 'slot-empty-word' }, addWord), spec ? h('span', { class: 'slot-empty-spec' }, spec) : null);
  return { input, slot };
}

export function mediaGrid({ items = [], upload, maxItems = 100, maxBytes = 15 * MB, pickMax = 20, accept = 'image/*,.heic,.heif', captions = false, captionMax = 140, spec, addLabel, onChange }) {
  const data = new WeakMap();
  const grid = h('ul', { class: 'ed-media-grid' });
  const error = h('p', { class: cls('fieldError'), role: 'alert', hidden: true });
  const { input, slot } = adder({ word: addLabel || word('mediaAdd'), spec, accept, multiple: true, onFiles: addFiles });
  const add = h('li', { class: 'ed-media-add' }, input, slot);
  const el = h('div', { class: 'ed-media' }, grid, error);
  grid.append(add);

  const tiles = () => [...grid.querySelectorAll('.ed-media-item')];
  const done = () => tiles().filter(t => !t.classList.contains('is-uploading'));
  const value = () => done().map(t => data.get(t));
  const emit = () => { paintAdd(); if (onChange) onChange(value()); };
  const say2 = (text) => { error.textContent = text; error.hidden = !text; };
  function paintAdd() { add.hidden = tiles().length >= maxItems; }

  function tile(item, previewUrl) {
    const img = h('img', { src: previewUrl || item.thumb || item.url, alt: (item && item.caption) || '', loading: 'lazy', draggable: 'false' });
    const frame = h('div', { class: 'ed-media-frame' }, img);
    const li = h('li', { class: 'ed-media-item' }, frame);
    if (previewUrl) {
      li.classList.add('is-uploading');
      frame.append(h('span', { class: 'sr-only' }, word('uploading')));
    }
    const finish = (stored) => {
      data.set(li, stored);
      li.classList.remove('is-uploading');
      img.src = stored.thumb || stored.url;
      frame.querySelector('.sr-only')?.remove();
      const handle = h('button', { type: 'button', class: 'ed-handle', 'data-ed-handle': '', 'aria-label': word('mediaMove') }, icon('grip'));
      const remove = h('button', { type: 'button', class: 'ed-rep-remove', 'aria-label': word('mediaRemove'), onclick: async () => {
        if (!(await ask({ title: word('mediaRemoveAsk'), detail: word('mediaRemoveDetail'), action: word('remove') }))) return;
        li.remove();
        emit();
        input.focus();
      } }, icon('close'));
      if (captions) {
        const caption = h('input', { class: cls('input'), type: 'text', maxlength: String(captionMax), value: stored.caption || '', placeholder: word('mediaCaption'), 'aria-label': word('mediaCaption') });
        caption.addEventListener('input', () => { stored.caption = caption.value; img.alt = caption.value; if (onChange) onChange(value()); });
        li.append(caption);
      }
      li.append(h('div', { class: 'ed-media-actions' }, handle, remove));
    };
    if (!previewUrl) finish(item);
    return { li, finish };
  }

  async function addFiles(files) {
    say2('');
    const result = triage(files, { room: maxItems - tiles().length, pickMax, maxBytes, fits: isImage });
    say2(explain(result, { noun: word('mediaNounPhoto'), maxBytes, maxItems, pickMax }));
    const pending = result.accepted.map((file) => {
      const preview = URL.createObjectURL(file);
      const t = tile(null, preview);
      grid.insertBefore(t.li, add);
      return { file, t, preview };
    });
    paintAdd();
    await runPool(pending, UPLOADS_AT_ONCE, async ({ file, t, preview }) => {
      try {
        t.finish(await upload(file));
      } catch (err) {
        t.li.remove();
        say2(err && err.message ? err.message : say('mediaFailed', { name: file.name }));
      }
      URL.revokeObjectURL(preview);
      emit();
    });
  }

  items.forEach((item) => grid.insertBefore(tile(item).li, add));
  dropZone(el, slot, addFiles);
  paintAdd();
  const sorter = sortable(grid, {
    items: '.ed-media-item', axis: 'grid',
    label: li => (data.get(li)?.caption) || word('mediaNounPhoto'),
    isFixed: li => li.classList.contains('is-uploading'),
    onMove: emit,
  });
  return { el, value, addFiles, destroy: () => sorter.destroy() };
}

export function fileList({ items = [], upload, maxItems = 10, maxBytes = 20 * MB, titleMax = 80, spec, addLabel, onChange }) {
  const data = new WeakMap();
  const list = h('ul', { class: 'ed-file-rows' });
  const error = h('p', { class: cls('fieldError'), role: 'alert', hidden: true });
  const { input, slot } = adder({ word: addLabel || word('fileAdd'), spec, accept: 'application/pdf,.pdf', multiple: true, onFiles: addFiles });
  const add = h('div', { class: 'ed-file-add' }, input, slot);
  const el = h('div', { class: 'ed-files' }, list, add, error);

  const rows = () => [...list.children];
  const value = () => rows().filter(r => !r.classList.contains('is-uploading')).map(r => data.get(r));
  const emit = () => { add.hidden = rows().length >= maxItems; if (onChange) onChange(value()); };
  const say2 = (text) => { error.textContent = text; error.hidden = !text; };

  function row(item, uploadingName) {
    const li = h('li', { class: 'ed-file-row' });
    const held = h('span', { class: `${cls('pillWarning')} ed-rep-held`, hidden: true }, word('heldBack'));
    const title = h('input', { class: cls('input'), type: 'text', maxlength: String(titleMax), 'aria-label': word('fileTitle'), placeholder: word('fileTitle'), value: item ? item.title || '' : uploadingName, disabled: Boolean(uploadingName) });
    const handleSlot = h('span', { class: 'ed-row-handle' });
    const actions = h('span', { class: 'ed-file-actions' });
    const status = uploadingName ? h('span', { class: 'ed-file-status' }, word('uploading')) : null;
    li.append(handleSlot, h('span', { class: 'ed-file-icon' }, icon('file')), h('div', { class: 'ed-file-main' }, title, status, held), actions);
    if (uploadingName) li.classList.add('is-uploading');
    const finish = (stored) => {
      data.set(li, stored);
      li.classList.remove('is-uploading');
      status?.remove();
      title.disabled = false;
      if (!title.value && stored.title) title.value = stored.title;
      stored.title = title.value;
      held.hidden = Boolean(title.value.trim());
      handleSlot.append(h('button', { type: 'button', class: 'ed-handle', 'data-ed-handle': '', 'aria-label': say('moveItem', { name: stored.title || word('fileTitle') }) }, icon('grip')));
      actions.append(h('button', { type: 'button', class: 'ed-rep-remove', 'aria-label': say('removeItem', { name: stored.title || word('fileTitle') }), onclick: async () => {
        if (!(await ask({ title: say('removeAsk', { name: stored.title || word('fileThis') }), detail: word('mediaRemoveDetail'), action: word('remove') }))) return;
        li.remove();
        emit();
        input.focus();
      } }, icon('close')));
      title.addEventListener('input', () => { stored.title = title.value; held.hidden = Boolean(title.value.trim()); if (onChange) onChange(value()); });
    };
    if (!uploadingName) finish(item);
    return { li, finish };
  }

  async function addFiles(files) {
    say2('');
    const result = triage(files, { room: maxItems - rows().length, maxBytes, fits: isPdf });
    say2(explain(result, { noun: word('fileNoun'), maxBytes, maxItems }));
    const pending = result.accepted.map((file) => {
      const stem = (file.name || '').replace(/\.[^.]+$/, '');
      const r = row(null, stem);
      list.append(r.li);
      return { file, r, stem };
    });
    add.hidden = rows().length >= maxItems;
    await runPool(pending, UPLOADS_AT_ONCE, async ({ file, r, stem }) => {
      try {
        const stored = await upload(file);
        r.finish({ ...stored, title: stored.title || stem });
      } catch (err) {
        r.li.remove();
        say2(err && err.message ? err.message : say('mediaFailed', { name: file.name }));
      }
      emit();
    });
  }

  items.forEach(item => list.append(row(item).li));
  dropZone(el, slot, addFiles);
  add.hidden = rows().length >= maxItems;
  const sorter = sortable(list, {
    items: '.ed-file-row',
    label: li => data.get(li)?.title || word('fileTitle'),
    isFixed: li => li.classList.contains('is-uploading'),
    onMove: emit,
  });
  return { el, value, addFiles, destroy: () => sorter.destroy() };
}
