/* Turet — funzioni pure (distanze, query Overpass, istruzioni di percorso in italiano).
 * Nessuna dipendenza dal browser: si provano con `node test/geo.test.js`. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Geo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const R = 6371008.8;                         // raggio medio della Terra, metri
  const WALK_M_PER_MIN = 80;                   // ~4,8 km/h
  const rad = (d) => (d * Math.PI) / 180;

  /** Distanza in metri tra due punti {lat, lon} (formula dell'emisenoverso). */
  function haversine(a, b) {
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function sortByDistance(points, origin) {
    return points.map((p) => ({ ...p, distance: haversine(origin, p) })).sort((x, y) => x.distance - y.distance);
  }

  function formatDistance(m) {
    if (!Number.isFinite(m)) return '—';
    if (m < 950) return Math.max(10, Math.round(m / 10) * 10) + ' m';
    return (m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',') + ' km';
  }

  function walkMinutes(m) { return Math.max(1, Math.round(m / WALK_M_PER_MIN)); }

  function formatDuration(minutes) {
    if (minutes < 60) return minutes + ' min';
    const h = Math.floor(minutes / 60), r = minutes % 60;
    return h + ' h' + (r ? ' ' + r + ' min' : '');
  }

  /** Arrotonda a 3 decimali (~100 m): la posizione esatta non viene inviata al servizio dei dati. */
  const roundCoord = (v) => Math.round(v * 1000) / 1000;

  /** Query Overpass: i turet (fontane in ghisa a testa di toro) attorno a un punto. */
  function overpassQuery(lat, lon, radius) {
    const r = Math.round(radius + 150);        // margine per compensare l'arrotondamento del centro
    return '[out:json][timeout:25];node["amenity"="drinking_water"]["fountain"="toret"](around:' + r + ',' + roundCoord(lat) + ',' + roundCoord(lon) + ');out body;';
  }

  /** Estrae dalla risposta di Overpass solo nodi con coordinate valide. */
  function parseOverpass(json) {
    const out = [];
    for (const el of (json && Array.isArray(json.elements) ? json.elements : [])) {
      if (el.type !== 'node' || !Number.isFinite(el.lat) || !Number.isFinite(el.lon)) continue;
      const tags = el.tags || {};
      out.push({ id: el.id, lat: el.lat, lon: el.lon, name: String(tags.name || tags.description || '').slice(0, 80), tags });
    }
    return out;
  }

  const SIDE = {
    left: 'a sinistra', right: 'a destra', 'slight left': 'leggermente a sinistra', 'slight right': 'leggermente a destra',
    'sharp left': 'decisamente a sinistra', 'sharp right': 'decisamente a destra', straight: 'dritto', uturn: 'con inversione a U',
  };

  /** Istruzione in italiano da un passo OSRM ({maneuver:{type,modifier,exit}, name}). */
  function instruction(step) {
    const m = step.maneuver || {}, name = (step.name || '').trim(), on = name ? ' su ' + name : '';
    const side = SIDE[m.modifier] || '';
    switch (m.type) {
      case 'depart': return 'Parti' + on;
      case 'arrive': return 'Sei arrivato al turet' + (m.modifier === 'left' ? ' (sul lato sinistro)' : m.modifier === 'right' ? ' (sul lato destro)' : '');
      case 'turn': return m.modifier === 'uturn' ? 'Inverti la marcia' + on : 'Svolta ' + (side || 'a destra') + on;
      case 'end of road': return 'Alla fine della strada svolta ' + (side || 'a destra') + on;
      case 'fork': return 'Al bivio tieni la ' + (/left/.test(m.modifier || '') ? 'sinistra' : 'destra') + on;
      case 'merge': return 'Immettiti' + on;
      case 'roundabout': case 'rotary': return 'Alla rotonda prendi la ' + (m.exit || 1) + 'ª uscita' + on;
      case 'roundabout turn': return 'Alla rotonda svolta ' + (side || 'a destra') + on;
      case 'new name': case 'continue': return 'Prosegui' + (name ? ' su ' + name : '');
      default: return 'Prosegui' + on;
    }
  }

  /** Url per proseguire con le app di mappe del telefono. */
  function mapsLinks(from, to) {
    const d = to.lat + ',' + to.lon;
    return {
      google: 'https://www.google.com/maps/dir/?api=1&origin=' + from.lat + ',' + from.lon + '&destination=' + d + '&travelmode=walking',
      apple: 'https://maps.apple.com/?saddr=' + from.lat + ',' + from.lon + '&daddr=' + d + '&dirflg=w',
    };
  }

  return { haversine, sortByDistance, formatDistance, walkMinutes, formatDuration, roundCoord, overpassQuery, parseOverpass, instruction, mapsLinks };
});
