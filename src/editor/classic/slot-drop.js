// A file dropped on an empty image slot (_slot_empty.html, [data-slot-drop]):
// handed to the slot's own file input as if it had been picked, so whatever
// listens there (the crop tool, the logo slots' autosave) does what it does for
// a pick. The tile is the input's label, so a click already picks a file.
(function () {
  'use strict';

  function slotOf(e) {
    return e.target && e.target.closest ? e.target.closest('[data-slot-drop]') : null;
  }

  function carriesFiles(e) {
    var types = e.dataTransfer && e.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, 'Files') !== -1;
  }

  document.addEventListener('dragover', function (e) {
    var slot = slotOf(e);
    if (!slot || !carriesFiles(e)) { return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    slot.classList.add('is-dragover');
  });

  document.addEventListener('dragleave', function (e) {
    var slot = slotOf(e);
    if (slot && !slot.contains(e.relatedTarget)) { slot.classList.remove('is-dragover'); }
  });

  document.addEventListener('drop', function (e) {
    var slot = slotOf(e);
    if (!slot) { return; }
    e.preventDefault();
    slot.classList.remove('is-dragover');
    var input = document.getElementById(slot.htmlFor);
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!input || !file) { return; }
    try {
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (err) { return; } // a browser that cannot set files: the click still works
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
})();
