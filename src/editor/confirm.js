/* Every delete asks first, in the page's one dialog (GUIDELINE, "One are you
   sure, and it names the thing"), which is the host's: this fills it and says
   what was answered. A browser with no <dialog> gets window.confirm. */
import { cls } from './config.js';

export function ask({ title, detail = '', action, tone = 'danger' }) {
  const dialog = document.querySelector(cls('confirmDialog'));
  if (!dialog || typeof dialog.showModal !== 'function') {
    return Promise.resolve(window.confirm(detail ? `${title} ${detail}` : title));
  }
  if (dialog.open) return Promise.resolve(false);
  const go = dialog.querySelector(cls('confirmGo'));
  const titleEl = dialog.querySelector(cls('confirmTitle'));
  const detailEl = dialog.querySelector(cls('confirmDetail'));
  if (titleEl) titleEl.textContent = title;
  if (detailEl) { detailEl.textContent = detail; detailEl.hidden = !detail; }
  if (!go.dataset.label) go.dataset.label = go.textContent;
  go.textContent = action || go.dataset.label;
  go.classList.toggle('btn-danger', tone !== 'primary');
  return new Promise((resolve) => {
    let answer = false;
    go.onclick = () => { answer = true; dialog.close(); };
    dialog.addEventListener('close', () => { go.onclick = null; resolve(answer); }, { once: true });
    dialog.showModal();
  });
}
