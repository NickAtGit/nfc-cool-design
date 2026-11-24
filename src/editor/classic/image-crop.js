// The crop tool behind the dashboard's image fields.
//
// One tool, two jobs. On the App Clip page (mode "rule") a picked file that
// already meets Apple's rule -- at least `width` wide, exactly `height` high,
// PNG or JPEG, no transparency, under the size cap (organization/forms.py
// validate_app_clip_image is the server's copy) -- is left alone and merely
// previewed; anything else opens the tool. On the card photo (mode "fit")
// every pick opens it: photos are rarely square, and the admin should choose
// the crop rather than get a centre cut they never saw. Either way "Use this
// crop" renders exactly width x height onto an opaque white canvas and hands
// that file to the form in place of the original. Nothing is scaled behind
// anyone's back.
//
// Wired by data attributes on the editor element (the
// organization/dashboard/_image_crop.html partial): data-input (the file
// input's id), data-width, data-height, data-max-bytes, data-mode ("rule" or
// "fit"), data-format ("auto": a PNG stays a PNG unless that blows the size
// cap; "jpeg": always a JPEG) and data-preview (selectors of the slots that
// show the picked or cropped image).
(function () {
  'use strict';
  if (!window.File || !window.DataTransfer) { return; }

  function attach(editor) {
    var input = document.getElementById(editor.dataset.input);
    if (!input || editor.dataset.cropWired) { return; }
    editor.dataset.cropWired = '1';

    var WIDTH = parseInt(editor.dataset.width, 10) || 1800;
    var HEIGHT = parseInt(editor.dataset.height, 10) || 1200;
    var MAX_BYTES = parseInt(editor.dataset.maxBytes, 10) || 10 * 1024 * 1024;
    var MODE = editor.dataset.mode || 'fit';
    var FORMAT = editor.dataset.format || 'auto';
    var RATIO = WIDTH / HEIGHT;
    var MAX_MB = Math.round(MAX_BYTES / (1024 * 1024));

    var form = input.form;
    var canvas = editor.querySelector('canvas');
    // The frame keeps the output's shape; 900 wide is plenty for a preview.
    canvas.width = 900;
    canvas.height = Math.round(900 / RATIO);
    var ctx = canvas.getContext('2d');
    var zoom = editor.querySelector('input[type=range]');
    var note = editor.querySelector('[data-editor-note]');
    var warning = editor.querySelector('[data-editor-warning]');
    var useButton = editor.querySelector('[data-editor-use]');
    var cancelButton = editor.querySelector('[data-editor-cancel]');
    var slots = (editor.dataset.preview || '').split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .map(function (sel) { return document.querySelector(sel); })
      .filter(Boolean);

    var image = null;      // the decoded source, while the tool is open
    var sourceFile = null; // the file that was picked
    var baseWidth = 0;     // crop width at zoom 1: the widest window that fits
    var crop = { x: 0, y: 0, w: 0, h: 0 }; // in source pixels, always WIDTH:HEIGHT

    // --- preview ----------------------------------------------------------

    function setPreview(url) {
      slots.forEach(function (slot) {
        var img = slot.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          img.alt = '';
          slot.insertBefore(img, slot.firstChild);
        }
        img.src = url;
        var empty = slot.querySelector('[data-empty]');
        if (empty) { empty.remove(); }
        slot.classList.remove('is-empty');
      });
    }

    // --- what a picked file is ----------------------------------------------

    function decode(file) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () { resolve({ img: img, url: url }); };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('undecodable')); };
        img.src = url;
      });
    }

    // Any pixel that is not fully opaque means an alpha channel is in use.
    // Sampled at a reduced size: this is a yes/no, not a rendering.
    function hasAlpha(img) {
      var w = Math.min(img.naturalWidth, 300);
      var h = Math.max(1, Math.round(img.naturalHeight * w / img.naturalWidth));
      var probe = document.createElement('canvas');
      probe.width = w;
      probe.height = h;
      var pctx = probe.getContext('2d');
      pctx.drawImage(img, 0, 0, w, h);
      var data;
      try { data = pctx.getImageData(0, 0, w, h).data; } catch (e) { return false; }
      for (var i = 3; i < data.length; i += 4) {
        if (data[i] < 255) { return true; }
      }
      return false;
    }

    // Why the tool opens, in the admin's terms. Null when the file is fine
    // as it is (only ever in "rule" mode).
    function whyNot(file, img) {
      if (MODE !== 'rule') {
        return 'Drag to move, zoom to size. Saved as a ' + WIDTH + ' × ' + HEIGHT + ' crop.';
      }
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        return 'Apple takes PNG or JPEG, so this will be saved as one. Fit it in the frame.';
      }
      if (img.naturalHeight !== HEIGHT || img.naturalWidth < WIDTH) {
        return 'This image is ' + img.naturalWidth + ' × ' + img.naturalHeight +
          ' pixels. Apple takes at least ' + WIDTH + ' wide and exactly ' + HEIGHT +
          ' high. Drag and zoom to fit it.';
      }
      if (file.size > MAX_BYTES) {
        return 'This file is over ' + MAX_MB + ' MB. The crop is saved smaller.';
      }
      if (file.type === 'image/png' && hasAlpha(img)) {
        return 'This image has transparency, which Apple does not take. The crop is saved on white.';
      }
      return null;
    }

    // --- the tool -----------------------------------------------------------

    function openEditor(file, img, reason) {
      image = img;
      sourceFile = file;
      baseWidth = Math.min(img.naturalWidth, img.naturalHeight * RATIO);
      zoom.value = 1;
      crop.w = baseWidth;
      crop.h = baseWidth / RATIO;
      crop.x = (img.naturalWidth - crop.w) / 2;
      // Biased UP, not centred: a face sits in the upper third of a portrait,
      // so a dead-centre square opens on a chin. The leftover height is split
      // 1:2 above:below. Only "fit" (the round card photo) wants this -- the
      // App Clip header is a banner and stays centred. Dragging still works.
      crop.y = MODE === 'fit'
        ? (img.naturalHeight - crop.h) / 3
        : (img.naturalHeight - crop.h) / 2;
      note.textContent = reason;
      editor.hidden = false;
      paint();
    }

    function closeEditor() {
      editor.hidden = true;
      image = null;
      sourceFile = null;
    }

    function clamp() {
      crop.x = Math.min(Math.max(crop.x, 0), image.naturalWidth - crop.w);
      crop.y = Math.min(Math.max(crop.y, 0), image.naturalHeight - crop.h);
    }

    function paint() {
      if (!image) { return; }
      clamp();
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
      // A window narrower than the output is scaled up on export.
      var soft = crop.w < WIDTH - 0.5;
      warning.hidden = !soft;
      warning.textContent = soft
        ? 'This crop is narrower than ' + WIDTH + ' pixels, so it is scaled up and may look soft.'
        : '';
    }

    // The tool lives INSIDE the form it serves, so its own controls bubble up
    // to that form's autosave trigger. That trigger keeps file inputs out (a
    // pick may still be in the tool) but not this zoom slider, whose type is
    // "range": releasing it posted the form with the ORIGINAL, uncropped file
    // still in the input. Apple's validator refused that, and the swap that
    // brought the error back took away the very tool being cropped in. The
    // submit guard at the bottom cannot catch it either, because an autosave
    // posts directly and never submits. These controls are UI, not form data.
    editor.addEventListener('change', function (e) { e.stopPropagation(); });
    editor.addEventListener('input', function (e) { e.stopPropagation(); });

    zoom.addEventListener('input', function () {
      if (!image) { return; }
      var z = parseFloat(zoom.value) || 1;
      var cx = crop.x + crop.w / 2;
      var cy = crop.y + crop.h / 2;
      crop.w = baseWidth / z;
      crop.h = crop.w / RATIO;
      crop.x = cx - crop.w / 2;
      crop.y = cy - crop.h / 2;
      paint();
    });

    // Drag to move. Pointer events cover mouse, touch and pen; the canvas has
    // touch-action: none so a finger drag moves the image, not the page.
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      if (!image) { return; }
      drag = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y };
      if (canvas.setPointerCapture) { canvas.setPointerCapture(e.pointerId); }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag || !image) { return; }
      var perPixel = crop.w / canvas.getBoundingClientRect().width;
      crop.x = drag.cx - (e.clientX - drag.x) * perPixel;
      crop.y = drag.cy - (e.clientY - drag.y) * perPixel;
      paint();
    });
    function endDrag() { drag = null; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // --- export -------------------------------------------------------------

    function handBack(blob, ext) {
      var stem = (sourceFile.name || 'image').replace(/\.[^.]+$/, '');
      var name = stem + '-' + WIDTH + 'x' + HEIGHT + ext;
      var file = new File([blob], name, { type: blob.type });
      try {
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      } catch (e) {
        note.textContent = 'This browser cannot hand the cropped image back to the form. ' +
          'Resize it to ' + WIDTH + ' × ' + HEIGHT + ' pixels and pick it again.';
        return;
      }
      setPreview(URL.createObjectURL(blob));
      closeEditor();
      saveNow();
    }

    // File inputs are kept out of the form's own change trigger (a pick may
    // still be in the tool); this is the moment the file is what the form
    // should get (static/js/autosave.js listens on the form).
    function saveNow() {
      if (form && form.hasAttribute('data-autosave')) {
        form.dispatchEvent(new Event('autosave'));
      }
    }

    useButton.addEventListener('click', function () {
      if (!image) { return; }
      var out = document.createElement('canvas');
      out.width = WIDTH;
      out.height = HEIGHT;
      var octx = out.getContext('2d');
      octx.fillStyle = '#fff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
      var asJpeg = function () {
        out.toBlob(function (blob) {
          if (blob) { handBack(blob, '.jpg'); }
        }, 'image/jpeg', 0.9);
      };
      // "auto": a PNG stays a PNG (flat artwork keeps its edges) unless that
      // would blow the size cap, in which case a JPEG always fits.
      if (FORMAT === 'auto' && sourceFile.type === 'image/png') {
        out.toBlob(function (blob) {
          if (blob && blob.size <= MAX_BYTES) { handBack(blob, '.png'); } else { asJpeg(); }
        }, 'image/png');
      } else {
        asJpeg();
      }
    });

    cancelButton.addEventListener('click', function () {
      input.value = '';
      closeEditor();
    });

    // --- wiring -------------------------------------------------------------

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) { return; }
      // The button keeps its own words: the preview beside it is what says
      // the picture was taken, and a file name ("IMG_4021.HEIC") says nothing.
      decode(file).then(function (r) {
        var reason = whyNot(file, r.img);
        if (reason === null) {
          closeEditor();
          setPreview(r.url);
          saveNow();
        } else {
          openEditor(file, r.img, reason);
        }
      }).catch(function () {
        // Not something this browser can draw (a HEIC on Chrome, say). Leave
        // it to the server, which refuses it with the rule spelled out.
        closeEditor();
      });
    });

    // The tool open means the picked file is not yet what the form should
    // get: finish the crop or drop the pick.
    if (form) {
      form.addEventListener('submit', function (e) {
        if (editor.hidden) { return; }
        e.preventDefault();
        note.textContent = 'Finish the crop first: Use this crop, or Cancel.';
        useButton.focus();
      });
    }
  }

  function attachAll() {
    Array.prototype.forEach.call(document.querySelectorAll('.crop-tool[data-input]'), attach);
  }
  attachAll();
  // A saved App Clip image swaps its field back in, crop tool and all.
  document.addEventListener('htmx:afterSwap', attachAll);
})();
