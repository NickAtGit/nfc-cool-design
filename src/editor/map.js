/* The place pin, on MapKit JS and nothing else. The token comes from a function
   the host passes in; without a key the part says so and everything around it
   still works.

     const pin = NFCEditorKit.mapPin({
       value: { lat, lng },
       getAddress: () => addressInput.value,
       token: () => fetch('/org/mapkit-token/').then(r => r.json()),
       onChange: ({ lat, lng }) => {},
     });
     addressInput.addEventListener('input', pin.addressChanged);
     await pin.lookupNow();   // before a save, once per address

   Nothing loads until the part is scrolled into view. */
import { cls, word } from './config.js';
import { ask } from './confirm.js';
import { h } from './dom.js';

export const LOOKUP_DELAY_MS = 800;
const SCRIPT = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';

/* A pin placed by hand is not moved by typing; an address is looked up once. */
export function shouldLookUp({ address, lastLooked, byHand, force = false }) {
  const text = (address || '').trim();
  if (!text) return false;
  return force || (!byHand && text !== lastLooked);
}

/* The route answers a token, { token }, or { available: false }. */
export function tokenFrom(answer) {
  if (typeof answer === 'string') return answer || null;
  return (answer && answer.token) || null;
}

let loading = null;
function loadFromApple() {
  if (window.mapkit && window.mapkit.Map) return Promise.resolve(window.mapkit);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve(window.mapkit);
      s.onerror = () => { loading = null; reject(new Error('mapkit')); };
      document.head.append(s);
    });
  }
  return loading;
}

let initialised = false;

export function mapPin({ value, getAddress = () => '', token, onChange, loadMapKit = loadFromApple }) {
  let pin = value && value.lat !== null && value.lat !== undefined ? { lat: value.lat, lng: value.lng } : null;
  let byHand = Boolean(pin);
  let lastLooked = null;
  let timer = 0;
  let mk = null, map = null, marker = null, geocoder = null;
  let starting = null;
  let off = false;

  const canvas = h('div', { class: 'ed-map-canvas' });
  const note = h('p', { class: cls('fieldHint'), role: 'status', hidden: true });
  const btn = (text, onclick) => h('button', { type: 'button', class: `${cls('buttonSecondary')} ${cls('buttonSmall')}`, onclick }, text);
  const find = btn(word('mapFind'), () => lookUp(true));
  const here = navigator.geolocation ? btn(word('mapHere'), useLocation) : null;
  const remove = btn(word('mapRemove'), askRemove);
  const actions = h('div', { class: 'ed-map-actions' }, find, here, remove);
  const el = h('div', { class: 'ed-map' }, canvas, actions, note);

  const say2 = (text) => { note.textContent = text || ''; note.hidden = !text; };
  const paint = () => { remove.hidden = !pin; };
  const round = n => Math.round(n * 1e6) / 1e6;

  function unavailable() {
    off = true;
    canvas.hidden = true;
    actions.hidden = true;
    say2(word('mapOff'));
  }

  async function currentToken() {
    try { return tokenFrom(await token()); } catch (err) { return null; }
  }

  function scheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark ? mk.Map.ColorSchemes.Dark : mk.Map.ColorSchemes.Light;
  }

  function showPin() {
    if (!map) return;
    if (marker) { map.removeAnnotation(marker); marker = null; }
    if (!pin) return;
    const at = new mk.Coordinate(pin.lat, pin.lng);
    marker = new mk.MarkerAnnotation(at, { draggable: true });
    marker.addEventListener('drag-end', () => place(marker.coordinate.latitude, marker.coordinate.longitude, true));
    map.addAnnotation(marker);
    map.setCenterAnimated(at);
  }

  function place(lat, lng, hand) {
    pin = { lat: round(lat), lng: round(lng) };
    byHand = hand;
    paint();
    showPin();
    if (onChange) onChange({ ...pin });
  }

  function start() {
    if (starting) return starting;
    starting = (async () => {
      const first = await currentToken();
      if (!first) { unavailable(); return false; }
      try { mk = await loadMapKit(); } catch (err) { unavailable(); return false; }
      if (!initialised) {
        let spare = first;
        mk.init({ authorizationCallback: (done) => {
          if (spare) { done(spare); spare = null; return; }
          currentToken().then(done);
        } });
        initialised = true;
      }
      map = new mk.Map(canvas, { showsCompass: mk.FeatureVisibility.Hidden, colorScheme: scheme() });
      map.addEventListener('single-tap', (e) => {
        const c = map.convertPointOnPageToCoordinate(e.pointOnPage);
        place(c.latitude, c.longitude, true);
      });
      geocoder = new mk.Geocoder({});
      themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      showPin();
      return true;
    })();
    return starting;
  }

  const themeWatch = new MutationObserver(() => { if (map) map.colorScheme = scheme(); });

  async function lookUp(force) {
    const address = getAddress();
    if (!shouldLookUp({ address, lastLooked, byHand, force })) return;
    if (!(await start())) return;
    lastLooked = address.trim();
    await new Promise((resolve) => {
      geocoder.lookup(address, (err, data) => {
        const hit = !err && data && data.results && data.results[0];
        if (hit) { say2(''); place(hit.coordinate.latitude, hit.coordinate.longitude, false); } else say2(word('mapNotFound'));
        resolve();
      });
    });
  }

  function useLocation() {
    navigator.geolocation.getCurrentPosition(
      async (p) => { if (await start()) place(p.coords.latitude, p.coords.longitude, true); },
      () => say2(word('mapNoPosition')),
    );
  }

  async function askRemove() {
    if (!(await ask({ title: word('mapRemoveAsk'), detail: word('mapRemoveDetail'), action: word('remove') }))) return;
    pin = null;
    byHand = false;
    paint();
    showPin();
    if (onChange) onChange({ lat: null, lng: null });
  }

  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { seen.disconnect(); start(); }
    });
    seen.observe(el);
  } else start();
  paint();

  return {
    el,
    value: () => (pin ? { ...pin } : { lat: null, lng: null }),
    addressChanged() { clearTimeout(timer); timer = setTimeout(() => lookUp(false), LOOKUP_DELAY_MS); },
    /* Before a save: an address with no pin is looked up, once per address. */
    lookupNow() { clearTimeout(timer); return pin ? Promise.resolve() : lookUp(false); },
    isOff: () => off,
    destroy() { clearTimeout(timer); themeWatch.disconnect(); if (map) map.destroy(); },
  };
}
