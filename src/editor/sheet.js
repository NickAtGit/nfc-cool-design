/* The editor's sheet: a native <dialog>, so showModal() brings the focus trap,
   Escape and the return of focus. Centred on a laptop, bottom-anchored under
   900 px, where it rises above the on-screen keyboard.

     const s = NFCEditorKit.sheet({ title: 'Look', body: node, onClose });
     s.open();

   It removes itself when closed. */
import { word } from './config.js';
import { h, icon, uid } from './dom.js';

export function sheet({ title, body, onClose, keep = false }) {
  const titleId = uid('ed-sheet-title');
  const content = h('div', { class: 'ed-sheet-body' }, body);
  const close = h('button', { type: 'button', class: 'ed-sheet-close', 'aria-label': word('close'), onclick: () => dialog.close() }, icon('close'));
  const inner = h('div', { class: 'ed-sheet-inner' },
    h('header', { class: 'ed-sheet-head' }, h('h2', { class: 'ed-sheet-title', id: titleId }, title), close),
    content);
  const dialog = h('dialog', { class: 'ed-sheet', 'aria-labelledby': titleId }, inner);

  /* A press that starts on the veil and ends there closes it. A text selection
     dragged out of a field and let go on the veil does not. */
  let pressedVeil = false;
  dialog.addEventListener('pointerdown', (e) => { pressedVeil = e.target === dialog; });
  dialog.addEventListener('click', (e) => { if (e.target === dialog && pressedVeil) dialog.close(); });

  const viewport = window.visualViewport;
  function fitKeyboard() {
    const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    dialog.style.setProperty('--ed-sheet-keyboard', `${Math.round(covered)}px`);
    const field = document.activeElement;
    if (covered && field && dialog.contains(field)) field.scrollIntoView({ block: 'center' });
  }

  dialog.addEventListener('close', () => {
    if (viewport) { viewport.removeEventListener('resize', fitKeyboard); viewport.removeEventListener('scroll', fitKeyboard); }
    if (!keep) dialog.remove();
    if (onClose) onClose();
  });

  return {
    el: dialog,
    body: content,
    open() {
      if (!dialog.isConnected) document.body.append(dialog);
      dialog.showModal();
      if (viewport) { viewport.addEventListener('resize', fitKeyboard); viewport.addEventListener('scroll', fitKeyboard); }
    },
    close() { if (dialog.open) dialog.close(); },
    setTitle(text) { dialog.querySelector('.ed-sheet-title').textContent = text; },
  };
}
