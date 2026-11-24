/* The console's .fu-switch with its behaviour: one of a few, aria-pressed on
   the button that is on.

     <span class="fu-switch" role="group" aria-label="Show"><button data-value="a">A</button>...</span>
     NFCEditorKit.segmented(el, { value: 'a', onChange: v => {} }); */
export function segmented(el, { value, onChange } = {}) {
  const buttons = () => [...el.querySelectorAll('button[data-value]')];
  let current = value;
  const paint = () => buttons().forEach(b => b.setAttribute('aria-pressed', b.dataset.value === current ? 'true' : 'false'));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-value]');
    if (!b || b.disabled || b.dataset.value === current) return;
    current = b.dataset.value;
    paint();
    if (onChange) onChange(current);
  });
  paint();
  return { el, value: () => current, set(v) { current = v; paint(); } };
}
