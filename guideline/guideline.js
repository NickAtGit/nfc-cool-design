(function () {
  const root = document.documentElement;
  const css = n => getComputedStyle(root).getPropertyValue(n).trim();
  const KEY_DIR = 'nfccool.guideline.dir';

  /* --- resolve any colour (hex, rgb, rgba, transparent) to an rgb triplet --- */
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  function rgb(value) {
    probe.style.color = '';
    probe.style.color = value;
    const c = getComputedStyle(probe).color.match(/[\d.]+/g);
    return c ? c.slice(0, 3).map(Number) : null;
  }
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  function ratio(a, b) {
    const A = rgb(a), B = rgb(b); if (!A || !B) return null;
    const l1 = lum(A), l2 = lum(B); const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  const hex = v => { const c = rgb(v); return c ? '#' + c.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase() : v; };

  /* --- swatch grids --- */
  function renderSwatches() {
    document.querySelectorAll('[data-swatches]').forEach(el => {
      el.innerHTML = el.dataset.swatches.split(',').map(name => {
        const v = css('--' + name);
        return `<div class="ks-swatch"><div class="ks-fill" style="background:${v}"></div>
          <div class="ks-meta"><b>--${name}</b>${hex(v)}</div></div>`;
      }).join('');
    });
  }

  /* --- contrast tables --- */
  function renderTables() {
    document.querySelectorAll('[data-contrast]').forEach(el => {
      const rows = JSON.parse(el.dataset.contrast);
      el.innerHTML = '<thead><tr><th>Pair</th><th>Sample</th><th>Ratio</th><th>Needs</th><th>Result</th></tr></thead><tbody>'
        + rows.map(([fg, bg, label, min]) => {
          const fv = css(fg), bv = css(bg), r = ratio(fv, bv);
          const exempt = fg === '--color-brand-tail';
          const ok = r !== null && r >= min;
          const verdict = exempt ? '<span class="ks-exempt">EXEMPT</span>'
            : ok ? '<span class="ks-pass">PASS</span>' : '<span class="ks-fail">FAIL</span>';
          return `<tr><td>${label}<br><span style="color:var(--color-text-muted)">${fg} on ${bg}</span></td>
            <td><span style="display:inline-block;padding:.25rem .6rem;border-radius:var(--radius-sm);background:${bv};color:${fv};font-weight:600">Sample</span></td>
            <td style="font-variant-numeric:tabular-nums">${r ? r.toFixed(2) : '—'}:1</td>
            <td style="font-variant-numeric:tabular-nums">${min}:1</td>
            <td>${verdict}</td></tr>`;
        }).join('') + '</tbody>';
    });
  }

  /* --- type ramp --- */
  const RAMP = [['--text-hero','Hero, split page hero h1'],['--text-display','Display, centred hero'],
    ['--text-title','Title, landing section'],['--text-heading','Heading, page section h2'],
    ['--text-subhead','Subhead, prose h2'],['--text-lg','Large'],['--text-md','Medium, card title'],
    ['--text-base','Base, prose body'],['--text-body','Body, form controls'],['--text-sm','Small'],
    ['--text-xs','Extra small, meta'],['--text-2xs','Micro-label'],['--text-3xs','Eyebrow']];
  function renderType() {
    const el = document.getElementById('ks-type');
    if (!el) return;
    el.innerHTML = RAMP.map(([tok, use]) => `<div class="ks-type-row">
        <span class="ks-type-name">${tok}</span>
        <span class="ks-type-sample" style="font-size:var(${tok})">Tap it. It works.</span>
        <span class="ks-type-use">${use}</span></div>`).join('');
  }

  /* --- space, radius, elevation --- */
  function renderScales() {
    const space = document.getElementById('ks-space');
    if (space) space.innerHTML = Array.from({length:12},(_,i)=>i+1).map(n =>
      `<div class="ks-scale-row"><span class="ks-name">--space-${n}</span>
        <span class="ks-bar-fill" style="width:var(--space-${n})"></span>
        <span class="ks-note" style="margin:0">${css('--space-'+n)}</span></div>`).join('');

    const radius = document.getElementById('ks-radius');
    if (radius) radius.innerHTML = ['sm','base','md','lg','xl','pill'].map(r =>
      `<div style="text-align:center"><div style="width:5rem;height:3.5rem;background:var(--color-bg-alt);
        border:1px solid var(--color-border);border-radius:var(--radius-${r})"></div>
        <span class="ks-note">--radius-${r}</span></div>`).join('');

    const elev = document.getElementById('ks-elev');
    if (elev) elev.innerHTML = [0,1,2,3].map(n =>
      `<div style="text-align:center"><div style="width:6rem;height:4rem;background:var(--color-bg-card);
        border:1px solid var(--color-border);border-radius:var(--radius-lg);box-shadow:var(--elev-${n})"></div>
        <span class="ks-note">--elev-${n}</span></div>`).join('')
      + `<div style="text-align:center"><div style="width:6rem;height:4rem;background:var(--color-bg-card);
        border-radius:var(--radius-xl);box-shadow:var(--elev-media)"></div>
        <span class="ks-note">--elev-media</span></div>`;
  }

  /* --- theme and direction, remembered across pages --- */
  const themeBtn = document.getElementById('ks-theme');
  const dirBtn = document.getElementById('ks-dir');
  const remember = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
  function labelToggles() {
    themeBtn.textContent = root.getAttribute('data-theme') === 'dark' ? 'Light' : 'Dark';
    dirBtn.textContent = root.getAttribute('dir') === 'rtl' ? 'LTR' : 'RTL';
  }
  /* The button is the guideline's own, so it is not a .nav-theme-toggle that
     theme.js would drive by delegation; it asks theme.js to flip and listens
     for the answer, which also arrives when the OS flips the theme. */
  themeBtn.addEventListener('click', () => window.nfccoolTheme.toggle());
  root.addEventListener('nfccool:theme', () => { labelToggles(); renderTables(); renderSwatches(); });
  dirBtn.addEventListener('click', () => {
    const next = root.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
    root.setAttribute('dir', next);
    remember(KEY_DIR, next);
    labelToggles();
  });

  /* --- breakpoint readout --- */
  const bpEl = document.getElementById('ks-bp');
  function bp() {
    const w = window.innerWidth;
    const name = w >= 1200 ? 'xl' : w >= 900 ? 'lg' : w >= 768 ? 'md' : w >= 600 ? 'sm' : 'base';
    bpEl.textContent = `${w}px · ${name}`;
  }
  window.addEventListener('resize', bp);

  /* --- single-file build: the menu switches sections in place --- */
  const shell = document.querySelector('.app-shell');
  if (shell && shell.dataset.mode === 'single') {
    const sections = Array.from(document.querySelectorAll('.gl-section'));
    const links = Array.from(document.querySelectorAll('#guide-nav .nav-link'));
    const siteName = document.title;
    function route() {
      const id = location.hash.slice(1);
      const target = sections.find(s => s.id === id) || sections[0];
      sections.forEach(s => s.classList.toggle('is-current', s === target));
      links.forEach(a => {
        const on = a.getAttribute('href') === '#' + target.id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      document.title = `${target.dataset.title} · ${siteName}`;
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', route);
    route();
  }

  /* Specimen links are href="#", which would jump the page to the top on each
     click. A real consumer's links go somewhere. */
  document.querySelectorAll('a[href="#"]').forEach(a =>
    a.addEventListener('click', e => e.preventDefault()));

  labelToggles(); renderSwatches(); renderTables(); renderType(); renderScales(); bp();
})();
