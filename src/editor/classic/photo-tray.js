// From photos on the web (blocks/photo_web.py): photos upload one at a time
// as they're chosen, each gets its label from the server a moment later, and
// Read sends the tray. The same flow as the apps' tray (spec 2026-10-22 §3).
(function () {
  var MAX = 15;
  var KINDS = {menu: 'Menu', storefront: 'Storefront', hours: 'Opening hours', stand: 'Table stand',
    card: 'Business card', price_list: 'Price list', room: 'Room', dish: 'Dish', product: 'Product', logo: 'Logo',
    trust: 'Certificate', payment: 'Payment', other: 'Photo'};

  function setup(root) {
    var input = root.querySelector('input[type=file]');
    var grid = root.querySelector('[data-photo-grid]');
    var count = root.querySelector('[data-photo-count]');
    var error = root.querySelector('[data-photo-error]');
    var readButton = root.querySelector('[data-photo-read]');
    var hint = root.querySelector('[data-photo-hint]');
    var csrf = root.querySelector('input[name=csrfmiddlewaretoken]').value;
    var tray = null, uploading = 0, queue = [], items = {}, polling = null;

    function base() { return root.dataset.createUrl + tray.id + '/'; }
    function say(text) { error.textContent = text || ''; error.hidden = !text; }
    function send(url, body) {
      return fetch(url, {method: 'POST', body: body || new FormData(), credentials: 'same-origin',
        headers: {'X-CSRFToken': csrf, 'Accept': 'application/json'}});
    }
    function refresh() {
      var n = grid.children.length;
      count.hidden = n === 0;
      count.textContent = n + ' of ' + MAX;
      readButton.disabled = uploading > 0 || n === 0 || !tray;
      readButton.textContent = n ? 'Read ' + n + ' photo' + (n === 1 ? '' : 's') : 'Read';
      root.querySelector('.photo-tray-drop').hidden = n >= MAX;
    }
    function label(photo) {
      if (!photo.labelled) { return 'Reading…'; }
      return photo.label || KINDS[photo.kind] || 'Photo';
    }
    function tile(file) {
      var li = document.createElement('li');
      li.className = 'photo-tray-item is-uploading';
      var img = document.createElement('img');
      img.alt = '';
      img.src = URL.createObjectURL(file);
      var caption = document.createElement('span');
      caption.textContent = 'Uploading…';
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'photo-tray-remove';
      remove.setAttribute('aria-label', 'Remove this photo');
      remove.textContent = '✕';
      li.append(img, caption, remove);
      grid.appendChild(li);
      return li;
    }
    function ensureTray() {
      if (tray) { return Promise.resolve(tray); }
      return send(root.dataset.createUrl).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) { throw new Error(data.error || 'The photos could not be started.'); }
          tray = data;
          return tray;
        });
      });
    }
    function upload(file) {
      var li = tile(file);
      uploading += 1;
      refresh();
      return ensureTray().then(function () {
        var body = new FormData();
        body.append('file', file);
        return send(base() + 'add/', body);
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) { throw new Error(data.error || 'That photo could not be added.'); }
          li.classList.remove('is-uploading');
          li.dataset.id = data.id;
          items[data.id] = li;
          li.querySelector('span').textContent = label(data);
          li.querySelector('button').addEventListener('click', function () { drop(data.id, li); });
          watch();
        });
      }).catch(function (e) {
        li.remove();
        say(e.message);
      }).finally(function () {
        uploading -= 1;
        refresh();
      });
    }
    function drop(id, li) {
      send(base() + id + '/delete/').then(function (r) {
        if (r.ok) { li.remove(); delete items[id]; refresh(); }
      });
    }
    function watch() {
      if (polling) { return; }
      polling = setInterval(function () {
        fetch(base(), {credentials: 'same-origin', headers: {'Accept': 'application/json'}})
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var waiting = false;
            data.photos.forEach(function (photo) {
              var li = items[photo.id];
              if (li) { li.querySelector('span').textContent = label(photo); }
              waiting = waiting || !photo.labelled;
            });
            if (!waiting && !uploading) { clearInterval(polling); polling = null; }
          });
      }, 1500);
    }
    input.addEventListener('change', function () {
      say('');
      var room = MAX - grid.children.length;
      var files = Array.prototype.slice.call(input.files);
      if (files.length > room) { say('A business takes at most 15 photos.'); files = files.slice(0, room); }
      input.value = '';
      files.reduce(function (chain, file) { return chain.then(function () { return upload(file); }); },
        Promise.resolve());
    });
    readButton.addEventListener('click', function () {
      if (!tray) { return; }
      readButton.disabled = true;
      var body = new FormData();
      (root.dataset.readFields || '').split(',').filter(Boolean).forEach(function (id) {
        var field = document.getElementById(id);
        if (field) { body.append(field.name, field.value); }
      });
      send(base() + 'read/', body).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) { throw new Error(data.error || 'The photos could not be read.'); }
          hint.hidden = false;
          window.location.href = data.redirect;
        });
      }).catch(function (e) { say(e.message); refresh(); });
    });
    refresh();
  }

  document.querySelectorAll('[data-photo-tray]').forEach(setup);
})();
