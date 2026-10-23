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

  function formatDistance(m, decimal) {
    if (!Number.isFinite(m)) return '—';
    if (m < 950) return Math.max(10, Math.round(m / 10) * 10) + ' m';
    return (m / 1000).toFixed(m < 10000 ? 1 : 0).replace(/\.0$/, '').replace('.', decimal || ',') + ' km';
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
    const at = '(around:' + r + ',' + roundCoord(lat) + ',' + roundCoord(lon) + ')';
    // tutti i punti d'acqua potabile pubblici (a Torino sono in gran parte toret, ma molti non hanno il tag fountain=toret) + fontane marcate come potabili
    // tutti i punti d'acqua potabile (nodi, aree e relazioni): a Torino sono in gran parte toret, ma non tutti hanno il tag fountain=toret
    return '[out:json][timeout:25];(nwr["amenity"="drinking_water"]' + at + ';nwr["fountain"="toret"]' + at + ';nwr["amenity"="fountain"]["drinking_water"="yes"]' + at + ';);out center body;';
  }

  /** Estrae dalla risposta di Overpass solo nodi con coordinate valide. */
  function parseOverpass(json) {
    const out = [];
    for (const el of (json && Array.isArray(json.elements) ? json.elements : [])) {
      const lat = Number.isFinite(el.lat) ? el.lat : el.center && el.center.lat, lon = Number.isFinite(el.lon) ? el.lon : el.center && el.center.lon;   // aree e relazioni hanno il centro in `center`
      if (!['node', 'way', 'relation'].includes(el.type) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const tags = el.tags || {};
      out.push({ id: el.type + el.id, lat, lon, name: String(tags.name || tags.description || '').slice(0, 80), tags });
    }
    return out;
  }

  /** Istruzione di percorso da un passo OSRM ({maneuver:{type,modifier,exit}, name}), nella lingua di `i18n` (oggetto con t() e ordinal()). */
  function instruction(step, i18n) {
    const t = i18n.t, m = step.maneuver || {}, name = (step.name || '').trim();
    const on = name ? t('on', { name }) : '', onto = name ? t('onto', { name }) : '';
    const side = m.modifier && m.modifier !== 'straight' && m.modifier !== 'uturn' ? t('side.' + m.modifier) : t('side.right');
    switch (m.type) {
      case 'depart': return t('step.depart', { on });
      case 'arrive': return t('step.arrive') + (m.modifier === 'left' ? t('step.arrive.left') : m.modifier === 'right' ? t('step.arrive.right') : '');
      case 'turn':
        if (m.modifier === 'uturn') return t('step.uturn', { on });
        if (m.modifier === 'straight') return t('step.straight', { on });
        return t('step.turn', { side, onto });
      case 'end of road': return t('step.endroad', { side, onto });
      case 'fork': return t(/left/.test(m.modifier || '') ? 'step.fork.left' : 'step.fork.right', { on });
      case 'merge': return t('step.merge', { on });
      case 'roundabout': case 'rotary': return t('step.roundabout', { ord: i18n.ordinal(m.exit || 1), on });
      case 'roundabout turn': return t('step.roundaboutTurn', { side, onto });
      default: return t('step.continue', { on });
    }
  }

  /** Url per proseguire con le app di mappe del telefono. */
  function mapsLinks(from, to, lang) {
    const d = to.lat + ',' + to.lon;
    return {
      google: 'https://www.google.com/maps/dir/?api=1&origin=' + from.lat + ',' + from.lon + '&destination=' + d + '&travelmode=walking' + (lang ? '&hl=' + encodeURIComponent(lang) : ''),
      apple: 'https://maps.apple.com/?saddr=' + from.lat + ',' + from.lon + '&daddr=' + d + '&dirflg=w',
    };
  }

  return { haversine, sortByDistance, formatDistance, walkMinutes, formatDuration, roundCoord, overpassQuery, parseOverpass, instruction, mapsLinks };
});
