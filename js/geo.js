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

  const CLAUSES = [['amenity', 'drinking_water'], ['amenity', 'fountain', 'drinking_water', 'yes'], ['fountain', 'toret']];
  function clauses(types, where) {
    const parts = [];
    for (const t of types) {
      for (const c of CLAUSES) parts.push(t + '["' + c[0] + '"="' + c[1] + '"]' + (c[2] ? '["' + c[2] + '"="' + c[3] + '"]' : '') + where);
      if (t === 'node') parts.push('node["man_made"="water_tap"]["drinking_water"="yes"]' + where);
    }
    return parts;
  }

  /** Query Overpass: i punti d'acqua potabile attorno a un punto. kind 'node' (default, veloce) oppure 'area' (aree e relazioni, più lenta). */
  function overpassQuery(lat, lon, r, kind) {
    const at = '(around:' + r + ',' + roundCoord(lat) + ',' + roundCoord(lon) + ')';
    return '[out:json][timeout:25];(' + clauses(kind === 'area' ? ['way', 'relation'] : ['node'], at).join(';') + ';);out center;';
  }

  /** Stessa ricerca su un rettangolo (sud, ovest, nord, est): serve allo script che prepara i file delle tessere. */
  function overpassBbox(s, w, n, e) {
    return '[out:json][timeout:180];(' + clauses(['node', 'way', 'relation'], '(' + [s, w, n, e].join(',') + ')').join(';') + ';);out center;';
  }

  /* ---- tessere di dati pronte (data/t/<riga>_<colonna>.json): la griglia è di 0,25° (~20-28 km) ---- */
  const GRID = 4;
  const tileId = (lat, lon) => Math.floor(lat * GRID) + '_' + Math.floor(lon * GRID);
  /** Identificatori delle tessere che coprono il cerchio di raggio r (m) attorno a un punto. */
  function tileIds(lat, lon, r) {
    const dLat = r / 111000, dLon = r / (111000 * Math.max(0.2, Math.cos(rad(lat)))), out = [];
    for (let y = Math.floor((lat - dLat) * GRID); y <= Math.floor((lat + dLat) * GRID); y++)
      for (let x = Math.floor((lon - dLon) * GRID); x <= Math.floor((lon + dLon) * GRID); x++) out.push(y + '_' + x);
    return out;
  }
  const KIND = { n: 'node', w: 'way', r: 'relation' }, KIND_SHORT = { node: 'n', way: 'w', relation: 'r' };
  /** Righe compatte [id, lat, lon, nome] → oggetti come quelli di parseOverpass. */
  function rowsToItems(rows) {
    const out = [];
    for (const r of Array.isArray(rows) ? rows : []) {
      if (!Array.isArray(r) || !Number.isFinite(r[1]) || !Number.isFinite(r[2]) || !KIND[String(r[0])[0]]) continue;
      const name = String(r[3] || '').slice(0, 80);
      out.push({ id: KIND[r[0][0]] + r[0].slice(1), lat: r[1], lon: r[2], name, tags: name ? { name } : {} });
    }
    return out;
  }
  /** Elementi di parseOverpass → righe compatte (5 decimali, ~1 m), raggruppate per tessera. */
  function itemsToTiles(items) {
    const tiles = {}, seen = new Set();
    for (const x of items) {
      if (seen.has(x.id)) continue; seen.add(x.id);
      const m = /^(node|way|relation)(\d+)$/.exec(x.id); if (!m) continue;
      const row = [KIND_SHORT[m[1]] + m[2], Math.round(x.lat * 1e5) / 1e5, Math.round(x.lon * 1e5) / 1e5];
      if (x.name) row.push(x.name.slice(0, 60));
      (tiles[tileId(x.lat, x.lon)] = tiles[tileId(x.lat, x.lon)] || []).push(row);
    }
    return tiles;
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

  return { haversine, sortByDistance, formatDistance, walkMinutes, formatDuration, roundCoord, overpassQuery, overpassBbox, tileId, tileIds, rowsToItems, itemsToTiles, parseOverpass, instruction, mapsLinks };
});
