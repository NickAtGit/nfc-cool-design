/* The undo toast: what just happened and one button, for eight seconds, which
   stop running while a pointer or the focus is on it. Undo is one level, so a
   new toast replaces the last one and that undo is gone.

     NFCEditorKit.undoToast({ message: 'Menu deleted.', onUndo: () => {} }); */
import { word } from './config.js';
import { h, icon } from './dom.js';

let current = null;

export function undoToast({ message, action, onUndo, duration = 8000 }) {
  if (current) current.dismiss();
  let timer = 0;
  let left = duration;
  let startedAt = 0;
  const dismiss = () => {
    clearTimeout(timer);
    el.remove();
    if (homeDialog) homeDialog.removeEventListener('close', rehome);
    if (current === api) current = null;
  };
  const start = () => { startedAt = Date.now(); timer = setTimeout(dismiss, left); };
  const pause = () => { clearTimeout(timer); left = Math.max(1000, left - (Date.now() - startedAt)); };

  const el = h('div', { class: 'ed-undo', role: 'status', onpointerenter: pause, onpointerleave: start, onfocusin: pause, onfocusout: start },
    h('span', { class: 'ed-undo-text' }, message),
    h('button', { type: 'button', class: 'ed-undo-action', onclick: () => { dismiss(); onUndo(); } }, action || word('undo')),
    h('button', { type: 'button', class: 'ed-undo-close', 'aria-label': word('close'), onclick: dismiss }, icon('close')));

  /* An open <dialog> is on the top layer and would cover anything outside it.
     When the dialog goes first, the toast stays. */
  const homeDialog = [...document.querySelectorAll('dialog[open]')].pop() || null;
  const rehome = () => document.body.append(el);
  if (homeDialog) homeDialog.addEventListener('close', rehome, { once: true });
  (homeDialog || document.body).append(el);

  const api = { el, dismiss };
  current = api;
  start();
  return api;
}
