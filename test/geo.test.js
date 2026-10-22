const assert = require('assert');
const G = require('../js/geo.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

t('haversine Torino Porta Nuova → Piazza Castello ~1,2 km', () => {
  const d = G.haversine({ lat: 45.0620, lon: 7.6784 }, { lat: 45.0711, lon: 7.6857 });
  assert(d > 1000 && d < 1300, d);
});
t('haversine stesso punto = 0', () => assert.strictEqual(G.haversine({ lat: 45, lon: 7 }, { lat: 45, lon: 7 }), 0));
t('sortByDistance ordina e aggiunge distance', () => {
  const s = G.sortByDistance([{ id: 1, lat: 45.07, lon: 7.70 }, { id: 2, lat: 45.0701, lon: 7.6801 }], { lat: 45.07, lon: 7.68 });
  assert.deepStrictEqual(s.map((x) => x.id), [2, 1]); assert(s[0].distance < s[1].distance);
});
t('formatDistance', () => {
  assert.strictEqual(G.formatDistance(4), '10 m'); assert.strictEqual(G.formatDistance(234), '230 m');
  assert.strictEqual(G.formatDistance(1234), '1,2 km'); assert.strictEqual(G.formatDistance(12500), '13 km'); assert.strictEqual(G.formatDistance(NaN), '—');
});
t('walkMinutes e formatDuration', () => {
  assert.strictEqual(G.walkMinutes(800), 10); assert.strictEqual(G.walkMinutes(5), 1);
  assert.strictEqual(G.formatDuration(45), '45 min'); assert.strictEqual(G.formatDuration(65), '1 h 5 min'); assert.strictEqual(G.formatDuration(120), '2 h');
});
t('overpassQuery arrotonda il centro e allarga il raggio', () => {
  const q = G.overpassQuery(45.070312, 7.686845, 1000);
  assert(q.includes('(around:1150,45.07,7.687)'), q); assert(q.includes('"fountain"="toret"')); assert(q.includes('"amenity"="drinking_water"'));
});
t('parseOverpass scarta elementi non validi', () => {
  const r = G.parseOverpass({ elements: [{ type: 'node', id: 1, lat: 45, lon: 7, tags: { name: 'Toret di prova' } }, { type: 'way', id: 2 }, { type: 'node', id: 3, lat: 'x', lon: 7 }, { type: 'node', id: 4, lat: 45.1, lon: 7.1 }] });
  assert.strictEqual(r.length, 2); assert.strictEqual(r[0].name, 'Toret di prova'); assert.strictEqual(r[1].name, '');
  assert.deepStrictEqual(G.parseOverpass(null), []); assert.deepStrictEqual(G.parseOverpass({}), []);
});
t('instruction in italiano', () => {
  assert.strictEqual(G.instruction({ maneuver: { type: 'depart' }, name: 'Via Roma' }), 'Parti su Via Roma');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'left' }, name: 'Via Po' }), 'Svolta a sinistra su Via Po');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'slight right' }, name: '' }), 'Svolta leggermente a destra');
  assert.strictEqual(G.instruction({ maneuver: { type: 'roundabout', exit: 2 }, name: 'Corso Vittorio' }), 'Alla rotonda prendi la 2ª uscita su Corso Vittorio');
  assert.strictEqual(G.instruction({ maneuver: { type: 'arrive' } }), 'Sei arrivato al turet');
  assert.strictEqual(G.instruction({ maneuver: { type: 'arrive', modifier: 'right' } }), 'Sei arrivato al turet (sul lato destro)');
  assert.strictEqual(G.instruction({ maneuver: { type: 'arrive', modifier: 'left' } }), 'Sei arrivato al turet (sul lato sinistro)');
  assert.strictEqual(G.instruction({ maneuver: { type: 'continue' }, name: '' }), 'Prosegui');
  assert.strictEqual(G.instruction({}), 'Prosegui');
});
t('mapsLinks', () => {
  const l = G.mapsLinks({ lat: 45.1, lon: 7.6 }, { lat: 45.2, lon: 7.7 });
  assert(l.google.includes('origin=45.1,7.6') && l.google.includes('destination=45.2,7.7') && l.google.includes('walking'));
  assert(l.apple.includes('daddr=45.2,7.7') && l.apple.includes('dirflg=w'));
});
console.log('\n' + n + ' prove superate');
