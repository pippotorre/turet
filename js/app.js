/* Turet — trova la fontanella torinese «toret» più vicina e il percorso a piedi per raggiungerla.
 * Dati: OpenStreetMap (Overpass). Percorsi: routing.openstreetmap.de (profilo a piedi). Mappa: Leaflet. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TORINO = { lat: 45.0703, lon: 7.6869 };
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const ROUTING = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
  const RADII = [1000, 3000, 8000, 20000];            // si allarga finché trova qualcosa
  const CACHE_KEY = 'turet.cache.v1', CACHE_MAX_AGE = 7 * 24 * 3600 * 1000;
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isApple = /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent) && 'ontouchend' in document || /iphone|ipad|ipod/i.test(navigator.userAgent);

  const state = { origin: null, turets: [], selected: null, manual: false, serial: 0, routeAbort: null };
  const layers = { me: null, accuracy: null, route: null, pins: new Map() };

  /* ---------- mappa ---------- */
  const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([TORINO.lat, TORINO.lon], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const pinSvg = '<svg viewBox="0 0 34 42" aria-hidden="true"><path class="body" d="M17 1C8.7 1 2 7.6 2 15.8 2 26.5 17 41 17 41s15-14.500 15-25.200C32 7.600 25.300 1 17 1z" stroke="#fff" stroke-width="2.500"/><path d="M17 9c-3.500 4.500-5.500 7.300-5.500 10a5.500 5.500 0 0 0 11 0c0-2.700-2-5.500-5.500-10z" fill="#fff"/></svg>';
  const pinIcon = (sel) => L.divIcon({ className: '', html: '<div class="pin' + (sel ? ' sel' : '') + '">' + pinSvg + '</div>', iconSize: [34, 42], iconAnchor: [17, 41] });

  /* ---------- interfaccia ---------- */
  function setStatus(text, error) { const s = $('status'); s.textContent = text || ''; s.classList.toggle('error', !!error); }
  function showManual(text) { $('manual').hidden = false; if (text) $('manual-text').textContent = text; }
  function busy(on) { const b = $('find'); b.disabled = on; b.textContent = on ? 'Cerco…' : (state.turets.length ? 'Aggiorna la mia posizione' : 'Trova il turet più vicino'); }
  const nameOf = (t) => t.name || 'Turet';

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
    let t = null;
    new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (lastFit) fit(lastFit); }, 120); }).observe($('panel'));
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
    for (const t of state.turets) {
      const m = L.marker([t.lat, t.lon], { icon: pinIcon(false), title: nameOf(t), alt: nameOf(t) + ', a ' + Geo.formatDistance(t.distance) }).addTo(map);
      m.on('click', () => select(t));
      layers.pins.set(t.id, m);
    }
  }

  function renderList() {
    const list = $('list'); list.replaceChildren();
    for (const t of state.turets) {
      const li = document.createElement('li'), b = document.createElement('button'), n = document.createElement('span'), d = document.createElement('small');
      b.type = 'button'; n.textContent = nameOf(t); d.textContent = Geo.formatDistance(t.distance);
      b.setAttribute('aria-current', String(state.selected && state.selected.id === t.id));
      b.append(n, d); b.addEventListener('click', () => select(t));
      li.append(b); list.append(li);
    }
    $('others').hidden = state.turets.length < 2;
  }

  function renderSteps(steps) {
    const ol = $('steps'); ol.replaceChildren();
    for (const s of steps) {
      if (!s.maneuver) continue;
      const li = document.createElement('li'); li.textContent = Geo.instruction(s);
      if (s.distance > 0 && s.maneuver.type !== 'arrive') { const sp = document.createElement('span'); sp.textContent = ' — ' + Geo.formatDistance(s.distance); li.append(sp); }
      ol.append(li);
    }
    $('steps-box').hidden = !ol.children.length;
  }

  function renderCard(t, route) {
    $('result').hidden = false;
    $('r-name').textContent = nameOf(t);
    const links = Geo.mapsLinks(state.origin, t);
    $('open-google').href = links.google; $('open-apple').href = links.apple; $('open-apple').hidden = !isApple;
    const meta = $('r-meta'), note = $('r-note');
    meta.replaceChildren(); note.hidden = true;
    if (route) {
      const strong = document.createElement('strong'); strong.textContent = Geo.formatDistance(route.distance);
      meta.append(strong, ' · circa ' + Geo.formatDuration(Math.max(1, Math.round(route.duration / 60))) + ' a piedi');
      renderSteps(route.steps);
    } else {
      const strong = document.createElement('strong'); strong.textContent = Geo.formatDistance(t.distance);
      meta.append(strong, ' in linea d’aria · circa ' + Geo.formatDuration(Geo.walkMinutes(t.distance * 1.25)) + ' a piedi');
      $('steps-box').hidden = true;
    }
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
    throw lastError || new Error('Servizio non raggiungibile');
  }

  async function fetchRoute(from, to, signal) {
    const url = ROUTING + from.lon + ',' + from.lat + ';' + to.lon + ',' + to.lat + '?overview=full&geometries=geojson&steps=true';
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('Routing ' + r.status);
    const j = await r.json();
    const route = j && j.routes && j.routes[0];
    if (!route || !route.geometry) throw new Error('Nessun percorso');
    return { distance: route.distance, duration: route.duration, coords: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]), steps: (route.legs && route.legs[0] && route.legs[0].steps) || [] };
  }

  /* ---------- flusso ---------- */
  function drawRoute(latlngs, dashed) {
    if (layers.route) map.removeLayer(layers.route);
    layers.route = L.polyline(latlngs, { color: '#2b8fb5', weight: 6, opacity: .9, dashArray: dashed ? '2 10' : null, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  }

  async function select(t) {
    state.selected = t;
    for (const [id, m] of layers.pins) m.setIcon(pinIcon(id === t.id));
    renderList();
    if (state.routeAbort) state.routeAbort.abort();
    const ctl = state.routeAbort = new AbortController(), mine = ++state.serial;
    renderCard(t, null);
    setStatus('Calcolo il percorso a piedi…');
    drawRoute([[state.origin.lat, state.origin.lon], [t.lat, t.lon]], true);
    fit([state.origin, t]);
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const route = await fetchRoute(state.origin, t, ctl.signal);
      if (mine !== state.serial) return;
      drawRoute(route.coords, false);
      renderCard(t, route);
      setStatus('');
      fit([state.origin, t, ...route.coords.filter((_, i) => i % Math.ceil(route.coords.length / 40) === 0).map(([lat, lon]) => ({ lat, lon }))]);
    } catch (e) {
      if (mine !== state.serial) return;
      setStatus('Il percorso stradale non è disponibile: ti mostro la linea d’aria. Puoi proseguire con la tua app di mappe.', true);
    } finally { clearTimeout(timer); }
  }

  async function search() {
    const o = state.origin, mine = ++state.serial;
    renderOrigin(); map.setView([o.lat, o.lon], 16, { animate: false });   // senza animazione: altrimenti la fine dell'animazione annulla il successivo fitBounds
    busy(true);
    try {
      let found = [], cached = false;
      for (const radius of RADII) {
        setStatus(radius === RADII[0] ? 'Cerco i turet vicino a te…' : 'Nessuno nelle vicinanze, allargo la ricerca a ' + Geo.formatDistance(radius) + '…');
        const r = await fetchTurets(o, radius);
        if (mine !== state.serial) return;
        cached = r.cached;
        if (r.data.length) { found = r.data; break; }
      }
      if (!found.length) {
        state.turets = []; renderPins(); renderList(); $('result').hidden = true;
        setStatus('Non trovo turet entro 20 km da qui. I turet sono le fontanelle di Torino.', true);
        showManual('Se non sei a Torino, puoi guardare il centro città oppure toccare la mappa per cambiare punto.');
        return;
      }
      state.turets = Geo.sortByDistance(found, o).slice(0, 6);
      renderPins();
      setStatus(cached ? 'Sei offline: uso gli ultimi dati salvati per questa zona.' : '');
      await select(state.turets[0]);
      if (cached) setStatus('Sei offline: uso gli ultimi dati salvati per questa zona.');
    } catch (e) {
      setStatus('Non riesco a caricare i turet (' + (navigator.onLine ? 'servizio non raggiungibile' : 'sei offline') + '). Riprova tra poco.', true);
    } finally { busy(false); }
  }

  function setOrigin(o) { state.origin = o; return search(); }

  function locate() {
    $('manual').hidden = true; state.manual = false;
    if (!navigator.geolocation) { enableManual('Il tuo browser non fornisce la posizione. Tocca la mappa per indicare dove sei.'); return; }
    busy(true); setStatus('Cerco la tua posizione…');
    navigator.geolocation.getCurrentPosition(
      (p) => setOrigin({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, source: 'gps' }),
      (err) => {
        busy(false);
        const msg = err.code === 1 ? 'Non posso usare la tua posizione perché l’accesso è stato negato. Puoi riattivarlo dalle impostazioni del browser, oppure toccare la mappa per indicare dove sei.'
          : err.code === 3 ? 'La posizione ci mette troppo. Riprova all’aperto oppure tocca la mappa per indicare dove sei.'
          : 'Non riesco a rilevare la posizione. Tocca la mappa per indicare dove sei.';
        setStatus('', false); enableManual(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function enableManual(text) { state.manual = true; showManual(text); map.getContainer().style.cursor = 'crosshair'; }

  map.on('click', (e) => {
    if (!state.manual && state.turets.length) return;     // dopo una ricerca i tocchi servono per muovere la mappa
    state.manual = false; map.getContainer().style.cursor = '';
    setOrigin({ lat: e.latlng.lat, lon: e.latlng.lng, accuracy: 0, source: 'manual' });
  });

  $('find').addEventListener('click', locate);
  $('goto-torino').addEventListener('click', () => { map.setView([TORINO.lat, TORINO.lon], 15, { animate: false }); state.manual = true; map.getContainer().style.cursor = 'crosshair'; $('manual-text').textContent = 'Tocca la mappa per indicare dove sei.'; });

  /* ---------- installazione come app ---------- */
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('install').hidden = false; });
  window.addEventListener('appinstalled', () => { installEvent = null; $('install').hidden = true; });
  $('install').addEventListener('click', async () => { const ev = installEvent; installEvent = null; $('install').hidden = true; try { await ev.prompt(); } catch (e) {} });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (isApple && !(navigator.standalone === true) && !(matchMedia('(display-mode: standalone)').matches)) { const b = $('install'); b.hidden = false; b.textContent = 'Installa l’app (Condividi → Aggiungi alla schermata Home)'; b.disabled = true; b.style.textDecoration = 'none'; }
})();
