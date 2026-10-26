/* Turet — trova la fontanella torinese «toret» più vicina e il percorso a piedi per raggiungerla.
 * Dati: OpenStreetMap (Overpass). Percorsi: routing.openstreetmap.de (profilo a piedi). Mappa: Leaflet.
 * Lingue: italiano, inglese, francese (js/i18n.js). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => I18n.t(k, p);
  const fmtDist = (m) => Geo.formatDistance(m, I18n.decimal());
  const TORINO = { lat: 45.0703, lon: 7.6869 };
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.openstreetmap.fr/api/interpreter'];
  const ROUTING = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
  const RADII = [1000, 2000, 3500, 5000];             // parte da 1 km, l'utente può estendere fino a 5 km
  const CACHE_KEY = 'turet.cache.v1', LANG_KEY = 'turet.lang', CACHE_MAX_AGE = 7 * 24 * 3600 * 1000;
  const isApple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && 'ontouchend' in document);

  const PINS = 40;
  const state = { origin: null, turets: [], selected: null, route: null, manual: false, serial: 0, routeAbort: null,
    status: null, manualKey: 'manual.tap', cached: false, busy: false, radius: 0 };
  const layers = { me: null, accuracy: null, route: null, pins: new Map() };

  /* ---------- lingua ---------- */
  function storedLang() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } }
  function applyStatic() {
    const lang = I18n.getLang();
    document.documentElement.lang = lang;
    document.title = t('doc.title');
    const meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', t('doc.description'));
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);     // testi del nostro dizionario, mai dati esterni
    for (const el of document.querySelectorAll('[data-i18n-attr]')) for (const pair of el.dataset.i18nAttr.split(';')) { const [a, k] = pair.split(':'); el.setAttribute(a, t(k)); }
    for (const b of document.querySelectorAll('.lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    if (isApple && !standalone()) $('install').textContent = t('install.ios');
  }
  function setLanguage(code, save) {
    I18n.setLang(code);
    if (save) { try { localStorage.setItem(LANG_KEY, code); } catch (e) {} }
    applyStatic(); refreshDynamic(); renderNet();
  }

  /* ---------- mappa ---------- */
  const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([TORINO.lat, TORINO.lon], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const pinSvg = '<svg viewBox="0 0 34 42" aria-hidden="true"><path class="body" d="M17 1C8.7 1 2 7.6 2 15.8 2 26.5 17 41 17 41s15-14.5 15-25.2C32 7.6 25.3 1 17 1z" stroke="#fff" stroke-width="2.5"/><path d="M17 9c-3.5 4.5-5.5 7.3-5.5 10a5.5 5.5 0 0 0 11 0c0-2.7-2-5.5-5.5-10z" fill="#fff"/></svg>';
  const pinIcon = (sel) => L.divIcon({ className: '', html: '<div class="pin' + (sel ? ' sel' : '') + '">' + pinSvg + '</div>', iconSize: [26, 32], iconAnchor: [13, 31] });

  // segnalazione di una fontanella mancante: apre una nota di OpenStreetMap sul punto in cui sei (o al centro della mappa)
  function updateReport() {
    const c = state.origin ? { lat: state.origin.lat, lng: state.origin.lon } : map.getCenter();
    $('report').href = 'https://www.openstreetmap.org/note/new#map=19/' + c.lat.toFixed(5) + '/' + c.lng.toFixed(5) + '&layers=N';
  }
  // con la mappa molto aperta i segnaposto si rimpiccioliscono per non coprirsi
  function updateZoomClass() { map.getContainer().classList.toggle('zoom-far', map.getZoom() < 16); }
  map.on('moveend', updateReport); map.on('zoomend', updateZoomClass); updateReport(); updateZoomClass();

  /* ---------- interfaccia ---------- */
  function setStatus(key, params, error) { state.status = key ? { key, params, error: !!error } : null; renderStatus(); }
  function renderStatus() {
    const s = $('status'), st = state.status;
    let p = st && st.params;
    if (p && p.whyKey) p = { ...p, why: t(p.whyKey, p.whyParams) };
    if (p && p.meters) p = { ...p, d: fmtDist(p.meters) };
    s.textContent = st ? t(st.key, p) + (p && p.detail ? ' [' + p.detail + ']' : '') : '';
    s.classList.toggle('error', !!(st && st.error));
  }
  function showManual(key) { $('manual').hidden = false; state.manualKey = key || 'manual.tap'; $('manual-text').textContent = t(state.manualKey); }
  function busy(on) { state.busy = on; renderFind(); renderExtend(); }
  function renderExtend() {
    const b = $('extend'), next = RADII[state.radius + 1];
    b.hidden = !state.origin || state.busy || !next;
    if (next) b.textContent = t('extend', { d: fmtDist(next) });
  }
  function renderFind() { $('find').disabled = state.busy; $('find').textContent = state.busy ? t('searching') : t(state.turets.length ? 'refresh' : 'find'); }
  const standalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  function nameOf(x) { const loc = x.tags && x.tags['name:' + I18n.getLang()]; return loc || x.name || t('name.default'); }

  function bottomPad() { return window.matchMedia('(min-width:900px)').matches ? 40 : Math.min($('panel').offsetHeight, window.innerHeight * 0.62) + 24; }
  let lastFit = null, lastZoom = 18;
  function fit(points, maxZoom) {
    lastFit = points; lastZoom = maxZoom;
    map.invalidateSize();
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [40, bottomPad()], maxZoom: maxZoom || 18, animate: false });
  }
  // se il pannello cambia altezza (es. si apre «Indicazioni passo passo») la mappa si riadatta per non coprire il percorso
  if (window.ResizeObserver) {
    let timer = null;
    new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(() => { if (lastFit) fit(lastFit, lastZoom); }, 120); }).observe($('panel'));
  }

  function renderOrigin() {
    const o = state.origin;
    if (layers.me) map.removeLayer(layers.me);
    if (layers.accuracy) { map.removeLayer(layers.accuracy); layers.accuracy = null; }
    layers.me = L.marker([o.lat, o.lon], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false, interactive: false, zIndexOffset: 1000 }).addTo(map);
    if (o.accuracy && o.accuracy > 30 && o.accuracy < 2000) layers.accuracy = L.circle([o.lat, o.lon], { radius: o.accuracy, color: '#2a6df4', weight: 1, fillOpacity: .08, interactive: false }).addTo(map);
  }

  function renderPins() {
    for (const m of layers.pins.values()) map.removeLayer(m);
    layers.pins.clear();
    const shown = state.turets.slice(0, PINS);      // sulla mappa solo i più vicini: troppi segnaposto sovrapposti non si leggono
    if (state.selected && !shown.includes(state.selected)) shown.push(state.selected);
    for (const x of shown) {
      const m = L.marker([x.lat, x.lon], { icon: pinIcon(state.selected && state.selected.id === x.id), title: nameOf(x), alt: t('pin.alt', { name: nameOf(x), d: fmtDist(x.distance) }) }).addTo(map);
      m.on('click', () => select(x));
      layers.pins.set(x.id, m);
    }
  }

  function renderList() {
    const list = $('list'); list.replaceChildren();
    for (const x of state.turets.slice(0, 12)) {
      const li = document.createElement('li'), b = document.createElement('button'), n = document.createElement('span'), d = document.createElement('small');
      b.type = 'button'; n.textContent = nameOf(x); d.textContent = fmtDist(x.distance);
      b.setAttribute('aria-current', String(!!state.selected && state.selected.id === x.id));
      b.append(n, d); b.addEventListener('click', () => select(x));
      li.append(b); list.append(li);
    }
    $('others').hidden = state.turets.length < 2;
  }

  function renderSteps(steps) {
    const ol = $('steps'); ol.replaceChildren();
    for (const s of steps) {
      if (!s.maneuver) continue;
      const li = document.createElement('li'); li.textContent = Geo.instruction(s, I18n);
      if (s.distance > 0 && s.maneuver.type !== 'arrive') { const sp = document.createElement('span'); sp.textContent = ' — ' + fmtDist(s.distance); li.append(sp); }
      ol.append(li);
    }
    $('steps-box').hidden = !ol.children.length;
  }

  function renderCard() {
    const x = state.selected, route = state.route;
    if (!x || !state.origin) return;
    $('result').hidden = false;
    $('r-name').textContent = nameOf(x);
    const links = Geo.mapsLinks(state.origin, x, I18n.getLang());
    $('open-google').href = links.google; $('open-apple').href = links.apple; $('open-apple').hidden = !isApple;
    const meta = $('r-meta'), strong = document.createElement('strong');
    meta.replaceChildren();
    if (route) {
      strong.textContent = fmtDist(route.distance);
      meta.append(strong, ' ' + t('card.route', { t: Geo.formatDuration(Math.max(1, Math.round(route.duration / 60))) }));
      renderSteps(route.steps);
    } else {
      strong.textContent = fmtDist(x.distance);
      meta.append(strong, ' ' + t('card.air', { t: Geo.formatDuration(Geo.walkMinutes(x.distance * 1.25)) }));
      $('steps-box').hidden = true;
    }
  }

  // dopo un cambio di lingua riscrive tutto ciò che è stato generato dal programma
  function refreshDynamic() {
    renderFind(); renderExtend(); renderStatus(); renderList(); renderPins();
    if (!$('manual').hidden) $('manual-text').textContent = t(state.manualKey);
    if (state.selected) renderCard();
  }

  /* ---------- dati ---------- */
  const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; } };
  function writeCache(key, data) {
    try { const c = readCache(), keys = Object.keys(c); if (keys.length > 12) delete c[keys.sort((a, b) => c[a].ts - c[b].ts)[0]]; c[key] = { ts: Date.now(), data }; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {}
  }

  async function timedFetch(url, options, ms) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(url, { ...options, signal: ctl.signal }); } finally { clearTimeout(timer); }
  }

  async function queryOne(url, body) {
    const host = new URL(url).hostname;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await timedFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }, 14000);
        if (!r.ok) { const e = new Error('http'); e.http = r.status; throw e; }
        return Geo.parseOverpass(await r.json());
      } catch (err) {
        const bad = { host, http: err.http, timeout: err.name === 'AbortError', detail: err.http ? String(err.http) : err.name === 'AbortError' ? 'timeout' : 'rete' };
        if (attempt === 1 || !(err.http >= 500 || err.http === 429)) throw bad;
        await new Promise((res) => setTimeout(res, 1200));      // 502/504/429: il server è occupato, un secondo tentativo spesso basta
      }
    }
  }

  async function fetchTurets(origin, radius) {
    const key = Geo.roundCoord(origin.lat) + ',' + Geo.roundCoord(origin.lon) + ',' + radius;
    const body = 'data=' + encodeURIComponent(Geo.overpassQuery(origin.lat, origin.lon, radius));
    try {                                                           // tutti i server insieme: vince il primo che risponde
      const data = await Promise.any(OVERPASS.map((u) => queryOne(u, body)));
      writeCache(key, data);
      return { data, cached: false };
    } catch (agg) {
      const hit = readCache()[key];
      if (hit && Date.now() - hit.ts < CACHE_MAX_AGE) return { data: hit.data, cached: true };
      const errs = (agg && agg.errors) || [];
      const e = new Error('unreachable');
      e.http = (errs.find((x) => x.http) || {}).http; e.timeout = errs.length && errs.every((x) => x.timeout);
      e.detail = errs.map((x) => x.host.replace(/^overpass[.-]?/, '').replace(/\.[a-z]+$/, '') + ' ' + x.detail).join(', ');
      throw e;
    }
  }

  async function fetchRoute(from, to, signal) {
    const url = ROUTING + from.lon + ',' + from.lat + ';' + to.lon + ',' + to.lat + '?overview=full&geometries=geojson&steps=true';
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('Routing ' + r.status);
    const j = await r.json();
    const route = j && j.routes && j.routes[0];
    if (!route || !route.geometry) throw new Error('No route');
    return { distance: route.distance, duration: route.duration, coords: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]), steps: (route.legs && route.legs[0] && route.legs[0].steps) || [] };
  }

  /* ---------- flusso ---------- */
  function drawRoute(latlngs, dashed) {
    if (layers.route) map.removeLayer(layers.route);
    layers.route = L.polyline(latlngs, { color: '#2b8fb5', weight: 6, opacity: .9, dashArray: dashed ? '2 10' : null, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  }

  // inquadratura: partenza, turet scelto e gli altri turet abbastanza vicini, in ogni direzione (non solo quello del percorso)
  function viewPoints(x) {
    const limit = state.radius ? Infinity : Math.max(x.distance * 3, 400);   // dopo «cerca più lontano» si inquadrano tutti i risultati
    return [state.origin, x, ...state.turets.slice(0, PINS).filter((y) => y.id !== x.id && y.distance <= limit)];
  }

  async function select(x, overview) {
    state.selected = x; state.route = null;
    renderPins();
    renderList();
    if (state.routeAbort) state.routeAbort.abort();
    const ctl = state.routeAbort = new AbortController(), mine = ++state.serial;
    renderCard();
    setStatus('status.routing');
    drawRoute([[state.origin.lat, state.origin.lon], [x.lat, x.lon]], true);
    fit(overview ? viewPoints(x) : [state.origin, x]);
    if (!overview) $('panel').scrollTo({ top: 0, behavior: 'smooth' });   // la scheda con il percorso sta in cima al pannello
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const route = await fetchRoute(state.origin, x, ctl.signal);
      if (mine !== state.serial) return;
      state.route = route;
      drawRoute(route.coords, false);
      renderCard();
      setStatus(state.cached ? 'status.offline' : null);
      fit([...(overview ? viewPoints(x) : [state.origin, x]), ...route.coords.filter((_, i) => i % Math.ceil(route.coords.length / 40) === 0).map(([lat, lon]) => ({ lat, lon }))]);
    } catch (e) {
      if (mine !== state.serial) return;
      setStatus('status.routeFail', null, true);
    } finally { clearTimeout(timer); }
  }

  async function search() {
    const o = state.origin, mine = ++state.serial, radius = RADII[state.radius];
    updateReport();
    renderOrigin(); fit([o], state.radius ? 15 : 16);   // il punto resta nella parte di mappa non coperta dal pannello
    //   // senza animazione: altrimenti la fine dell'animazione annulla il successivo fitBounds
    busy(true);
    try {
      state.cached = false;
      setStatus('status.searching');
      const r = await fetchTurets(o, radius);
      if (mine !== state.serial) return;
      state.cached = r.cached;
      if (!r.data.length) {
        state.turets = []; state.selected = null; state.route = null; renderPins(); renderList(); $('result').hidden = true;
        setStatus('status.none', { meters: radius }, true);
        if (!RADII[state.radius + 1]) showManual('status.noneManual');
        return;
      }
      state.turets = Geo.sortByDistance(r.data, o).slice(0, 60);
      state.selected = null;
      renderPins();
      await select(state.turets[0], true);
    } catch (e) {
      const whyKey = !navigator.onLine ? 'why.offline' : e && e.http ? 'why.http' : e && e.timeout ? 'why.timeout' : 'why.unreachable';
      setStatus('status.loadFail', { whyKey, whyParams: { code: e && e.http }, detail: e && e.detail }, true);
      if (e && e.detail) console.warn('Overpass:', e.detail);
    } finally { busy(false); }
  }

  function setOrigin(o) { state.origin = o; state.radius = 0; return search(); }

  function renderNet() { $('net').hidden = navigator.onLine !== false; }
  window.addEventListener('online', () => { renderNet(); if (state.status && state.status.key === 'status.loadFail') setStatus(null); });
  window.addEventListener('offline', renderNet);

  function locate() {
    renderNet();
    if (navigator.onLine === false) { $('net').scrollIntoView({ block: 'nearest' }); return; }   // senza rete non si può cercare: l'avviso invita a riconnettersi
    $('manual').hidden = true; state.manual = false;
    if (!navigator.geolocation) { enableManual('geo.unsupported'); return; }
    busy(true); setStatus('status.locating');
    let started = false;
    const fail = (err) => { if (started) return; busy(false); setStatus(null); enableManual(err.code === 1 ? 'geo.denied' : err.code === 3 ? 'geo.timeout' : 'geo.unavailable'); };
    const fix = (p) => ({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, source: 'gps' });
    // 1) posizione rapida (rete/cache): il punto compare subito e parte la ricerca
    navigator.geolocation.getCurrentPosition((p) => {
      if (started) return; started = true;
      const first = fix(p); setOrigin(first);
      // 2) posizione precisa (GPS): se è molto diversa dalla prima si rifà la ricerca da lì
      navigator.geolocation.getCurrentPosition((q) => {
        if (state.origin !== first) return;                      // nel frattempo l'utente ha scelto un altro punto
        const better = fix(q);
        if (Geo.haversine(first, better) < 60) { state.origin = better; renderOrigin(); } else setOrigin(better);
      }, () => {}, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    }, () => {
      // la posizione rapida non c'è: si prova direttamente con il GPS
      navigator.geolocation.getCurrentPosition((p) => { if (!started) { started = true; setOrigin(fix(p)); } }, fail, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
    }, { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 });
  }

  function enableManual(key) { state.manual = true; showManual(key); map.getContainer().style.cursor = 'crosshair'; }

  map.on('click', (e) => {
    if (!state.manual && state.turets.length) return;     // dopo una ricerca i tocchi servono per muovere la mappa
    state.manual = false; map.getContainer().style.cursor = '';
    setOrigin({ lat: e.latlng.lat, lon: e.latlng.lng, accuracy: 0, source: 'manual' });
  });

  $('find').addEventListener('click', locate);
  $('extend').addEventListener('click', () => { if (state.origin && RADII[state.radius + 1]) { state.radius++; search(); } });
  $('goto-torino').addEventListener('click', () => { map.setView([TORINO.lat, TORINO.lon], 15, { animate: false }); state.manual = true; map.getContainer().style.cursor = 'crosshair'; showManual('manual.tap'); });
  for (const b of document.querySelectorAll('.lang button')) b.addEventListener('click', () => setLanguage(b.dataset.lang, true));

  /* ---------- installazione come app ---------- */
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('install').hidden = false; });
  window.addEventListener('appinstalled', () => { installEvent = null; $('install').hidden = true; });
  $('install').addEventListener('click', async () => { const ev = installEvent; installEvent = null; $('install').hidden = true; try { await ev.prompt(); } catch (e) {} });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (isApple && !standalone()) { const b = $('install'); b.hidden = false; b.disabled = true; b.style.textDecoration = 'none'; }

  /* ---------- avvio ---------- */
  renderNet();
  setLanguage(I18n.DICT[storedLang()] ? storedLang() : I18n.detect(navigator.languages || [navigator.language]), false);
})();
