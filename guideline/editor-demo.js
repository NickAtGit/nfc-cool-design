/* The live examples on the Editor parts page, driven by the same classic
   script a console loads (dist/editor-kit.js). */
(function () {
  const kit = window.NFCEditorKit;
  if (!kit) return;
  const host = name => document.querySelector(`[data-ed-demo="${name}"]`);
  const demos = {};
  document.addEventListener('DOMContentLoaded', () => {
    for (const [name, build] of Object.entries(demos)) { const el = host(name); if (el) build(el); }
  });
})();
