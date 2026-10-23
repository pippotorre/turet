/* Turet — trova la fontanella torinese «toret» più vicina e il percorso a piedi per raggiungerla.
 * Dati: OpenStreetMap (Overpass). Percorsi: routing.openstreetmap.de (profilo a piedi). Mappa: Leaflet.
 * Lingue: italiano, inglese, francese (js/i18n.js). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => I18n.t(k, p);
  const fmtDist = (m) => Geo.formatDistance(m, I18n.decimal());
  const TORINO = { lat: 45.0703, lon: 7.6869 };
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const ROUTING = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
  const RADII = [1000, 3000, 8000, 20000];            // si allarga finché trova qualcosa
  const CACHE_KEY = 'turet.cache.v1', LANG_KEY = 'turet.lang', CACHE_MAX_AGE = 7 * 24 * 3600 * 1000;
  const isApple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && 'ontouchend' in document);

  const state = { origin: null, turets: [], selected: null, route: null, manual: false, serial: 0, routeAbort: null,
    status: null, manualKey: 'manual.tap', cached: false, busy: false };
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
    applyStatic(); refreshDynamic();
  }

  /* ---------- mappa ---------- */
  const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([TORINO.lat, TORINO.lon], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const pinSvg = '<svg viewBox="0 0 34 42" aria-hidden="true"><path class="body" d="M17 1C8.7 1 2 7.6 2 15.8 2 26.5 17 41 17 41s15-14.5 15-25.2C32 7.6 25.3 1 17 1z" stroke="#fff" stroke-width="2.5"/><path d="M17 9c-3.5 4.5-5.5 7.3-5.5 10a5.5 5.5 0 0 0 11 0c0-2.7-2-5.5-5.5-10z" fill="#fff"/></svg>';
  const pinIcon = (sel) => L.divIcon({ className: '', html: '<div class="pin' + (sel ? ' sel' : '') + '">' + pinSvg + '</div>', iconSize: [34, 42], iconAnchor: [17, 41] });

  /* ---------- interfaccia ---------- */
  function setStatus(key, params, error) { state.status = key ? { key, params, error: !!error } : null; renderStatus(); }
  function renderStatus() {
    const s = $('status'), st = state.status;
    s.textContent = st ? t(st.key, st.params && st.params.whyKey ? { ...st.params, why: t(st.params.whyKey) } : st.params) : '';
    s.classList.toggle('error', !!(st && st.error));
  }
  function showManual(key) { $('manual').hidden = false; state.manualKey = key || 'manual.tap'; $('manual-text').textContent = t(state.manualKey); }
  function busy(on) { state.busy = on; renderFind(); }
  function renderFind() { $('find').disabled = state.busy; $('find').textContent = state.busy ? t('searching') : t(state.turets.length ? 'refresh' : 'find'); }
  const standalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  function nameOf(x) { const loc = x.tags && x.tags['name:' + I18n.getLang()]; return loc || x.name || t('name.default'); }

  function bottomPad() { return window.matchMedia('(min-width:900px)').matches ? 40 : Math.min($('panel').offsetHeight, window.innerHeight * 0.62) + 24; }
  let lastFit = null;
  function fit(points) {
    lastFit = points;
    map.invalidateSize();
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [40, bottomPad()], maxZoom: 18, animate: false });
  }
  // se il pannello cambia altezza (es. si apre «Indicazioni passo passo») la mappa si riadatta per non coprire il percorso
  if (window.ResizeObserver) {
    let timer = null;
    new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(() => { if (lastFit) fit(lastFit); }, 120); }).observe($('panel'));
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
    for (const x of state.turets) {
      const m = L.marker([x.lat, x.lon], { icon: pinIcon(state.selected && state.selected.id === x.id), title: nameOf(x), alt: t('pin.alt', { name: nameOf(x), d: fmtDist(x.distance) }) }).addTo(map);
      m.on('click', () => select(x));
      layers.pins.set(x.id, m);
    }
  }

  function renderList() {
    const list = $('list'); list.replaceChildren();
    for (const x of state.turets) {
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
    renderFind(); renderStatus(); renderList(); renderPins();
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

  async function fetchTurets(origin, radius) {
    const key = Geo.roundCoord(origin.lat) + ',' + Geo.roundCoord(origin.lon) + ',' + radius;
    const body = 'data=' + encodeURIComponent(Geo.overpassQuery(origin.lat, origin.lon, radius));
    let lastError = null;
    for (const url of OVERPASS) {
      try {
        const r = await timedFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }, 22000);
        if (!r.ok) throw new Error('Overpass ' + r.status);
        const data = Geo.parseOverpass(await r.json());
        writeCache(key, data);
        return { data, cached: false };
      } catch (e) { lastError = e; }
    }
    const hit = readCache()[key];
    if (hit && Date.now() - hit.ts < CACHE_MAX_AGE) return { data: hit.data, cached: true };
    throw lastError || new Error('unreachable');
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

  async function select(x) {
    state.selected = x; state.route = null;
    for (const [id, m] of layers.pins) m.setIcon(pinIcon(id === x.id));
    renderList();
    if (state.routeAbort) state.routeAbort.abort();
    const ctl = state.routeAbort = new AbortController(), mine = ++state.serial;
    renderCard();
    setStatus('status.routing');
    drawRoute([[state.origin.lat, state.origin.lon], [x.lat, x.lon]], true);
    fit([state.origin, x]);
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const route = await fetchRoute(state.origin, x, ctl.signal);
      if (mine !== state.serial) return;
      state.route = route;
      drawRoute(route.coords, false);
      renderCard();
      setStatus(state.cached ? 'status.offline' : null);
      fit([state.origin, x, ...route.coords.filter((_, i) => i % Math.ceil(route.coords.length / 40) === 0).map(([lat, lon]) => ({ lat, lon }))]);
    } catch (e) {
      if (mine !== state.serial) return;
      setStatus('status.routeFail', null, true);
    } finally { clearTimeout(timer); }
  }

  async function search() {
    const o = state.origin, mine = ++state.serial;
    renderOrigin(); map.setView([o.lat, o.lon], 16, { animate: false });   // senza animazione: altrimenti la fine dell'animazione annulla il successivo fitBounds
    busy(true);
    try {
      let found = [];
      state.cached = false;
      for (const radius of RADII) {
        if (radius === RADII[0]) setStatus('status.searching'); else setStatus('status.widen', { d: fmtDist(radius) });
        const r = await fetchTurets(o, radius);
        if (mine !== state.serial) return;
        state.cached = r.cached;
        if (r.data.length) { found = r.data; break; }
      }
      if (!found.length) {
        state.turets = []; state.selected = null; state.route = null; renderPins(); renderList(); $('result').hidden = true;
        setStatus('status.none', null, true);
        showManual('status.noneManual');
        return;
      }
      state.turets = Geo.sortByDistance(found, o).slice(0, 6);
      state.selected = null;
      renderPins();
      await select(state.turets[0]);
    } catch (e) {
      setStatus('status.loadFail', { whyKey: navigator.onLine ? 'why.unreachable' : 'why.offline' }, true);
    } finally { busy(false); }
  }

  function setOrigin(o) { state.origin = o; return search(); }

  function locate() {
    $('manual').hidden = true; state.manual = false;
    if (!navigator.geolocation) { enableManual('geo.unsupported'); return; }
    busy(true); setStatus('status.locating');
    navigator.geolocation.getCurrentPosition(
      (p) => setOrigin({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, source: 'gps' }),
      (err) => {
        busy(false); setStatus(null);
        enableManual(err.code === 1 ? 'geo.denied' : err.code === 3 ? 'geo.timeout' : 'geo.unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function enableManual(key) { state.manual = true; showManual(key); map.getContainer().style.cursor = 'crosshair'; }

  map.on('click', (e) => {
    if (!state.manual && state.turets.length) return;     // dopo una ricerca i tocchi servono per muovere la mappa
    state.manual = false; map.getContainer().style.cursor = '';
    setOrigin({ lat: e.latlng.lat, lon: e.latlng.lng, accuracy: 0, source: 'manual' });
  });

  $('find').addEventListener('click', locate);
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
  setLanguage(I18n.DICT[storedLang()] ? storedLang() : I18n.detect(navigator.languages || [navigator.language]), false);
})();
