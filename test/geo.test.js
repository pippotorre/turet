const assert = require('assert');
const G = require('../js/geo.js');
const I = require('../js/i18n.js');
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
  assert.strictEqual(G.formatDistance(1234), '1,2 km'); assert.strictEqual(G.formatDistance(1234, '.'), '1.2 km'); assert.strictEqual(G.formatDistance(12500), '13 km'); assert.strictEqual(G.formatDistance(NaN), '—');
});
t('walkMinutes e formatDuration', () => {
  assert.strictEqual(G.walkMinutes(800), 10); assert.strictEqual(G.walkMinutes(5), 1);
  assert.strictEqual(G.formatDuration(45), '45 min'); assert.strictEqual(G.formatDuration(65), '1 h 5 min'); assert.strictEqual(G.formatDuration(120), '2 h');
});
t('overpassQuery arrotonda il centro e allarga il raggio', () => {
  const q = G.overpassQuery(45.070312, 7.686845, 1000);
  assert(q.includes('(around:1150,45.07,7.687)'), q); assert(q.includes('"amenity"="drinking_water"')); assert(q.includes('nwr')); assert(q.includes('out center'));
});
t('parseOverpass scarta elementi non validi', () => {
  const r = G.parseOverpass({ elements: [{ type: 'node', id: 1, lat: 45, lon: 7, tags: { name: 'Toret di prova' } }, { type: 'way', id: 2 }, { type: 'node', id: 3, lat: 'x', lon: 7 }, { type: 'node', id: 4, lat: 45.1, lon: 7.1 }] });
  assert.strictEqual(r.length, 2); assert.strictEqual(r[0].name, 'Toret di prova'); assert.strictEqual(r[1].name, '');
  assert.deepStrictEqual(G.parseOverpass(null), []); assert.deepStrictEqual(G.parseOverpass({}), []);
});
t('parseOverpass accetta aree con centro', () => {
  const r = G.parseOverpass({ elements: [{ type: 'way', id: 7, center: { lat: 45.05, lon: 7.65 }, tags: { amenity: 'drinking_water' } }, { type: 'node', id: 7, lat: 45, lon: 7 }] });
  assert.strictEqual(r.length, 2); assert.notStrictEqual(r[0].id, r[1].id); assert.strictEqual(r[0].lat, 45.05);
});
t('instruction in italiano', () => {
  I.setLang('it');
  assert.strictEqual(G.instruction({ maneuver: { type: 'depart' }, name: 'Via Roma' }, I), 'Parti su Via Roma');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'left' }, name: 'Via Po' }, I), 'Svolta a sinistra su Via Po');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'slight right' }, name: '' }, I), 'Svolta leggermente a destra');
  assert.strictEqual(G.instruction({ maneuver: { type: 'roundabout', exit: 2 }, name: 'Corso Vittorio' }, I), 'Alla rotonda prendi la 2ª uscita su Corso Vittorio');
  assert.strictEqual(G.instruction({ maneuver: { type: 'arrive' } }, I), 'Sei arrivato al turet');
  assert.strictEqual(G.instruction({ maneuver: { type: 'arrive', modifier: 'right' } }, I), 'Sei arrivato al turet (sul lato destro)');
  assert.strictEqual(G.instruction({ maneuver: { type: 'continue' }, name: '' }, I), 'Prosegui');
  assert.strictEqual(G.instruction({}, I), 'Prosegui');
});
t('instruction in inglese', () => {
  I.setLang('en');
  assert.strictEqual(G.instruction({ maneuver: { type: 'depart' }, name: 'Via Roma' }, I), 'Head out on Via Roma');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'left' }, name: 'Via Po' }, I), 'Turn left onto Via Po');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'sharp right' }, name: '' }, I), 'Turn sharp right');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'straight' }, name: 'Via Po' }, I), 'Continue straight on Via Po');
  assert.strictEqual(G.instruction({ maneuver: { type: 'roundabout', exit: 3 }, name: '' }, I), 'At the roundabout, take the 3rd exit');
  assert.strictEqual(G.instruction({ maneuver: { type: 'arrive', modifier: 'left' } }, I), 'You have arrived at the turet (on your left)');
  I.setLang('it');
});
t('instruction in francese', () => {
  I.setLang('fr');
  assert.strictEqual(G.instruction({ maneuver: { type: 'depart' }, name: 'Via Roma' }, I), 'Partez sur Via Roma');
  assert.strictEqual(G.instruction({ maneuver: { type: 'turn', modifier: 'right' }, name: 'Via Po' }, I), 'Tournez à droite sur Via Po');
  assert.strictEqual(G.instruction({ maneuver: { type: 'roundabout', exit: 1 }, name: '' }, I), 'Au rond-point, prenez la 1re sortie');
  assert.strictEqual(G.instruction({ maneuver: { type: 'roundabout', exit: 2 }, name: '' }, I), 'Au rond-point, prenez la 2e sortie');
  assert.strictEqual(G.instruction({ maneuver: { type: 'fork', modifier: 'slight left' }, name: '' }, I), 'À l’embranchement, serrez à gauche');
  assert.strictEqual(G.instruction({ maneuver: { type: 'arrive', modifier: 'right' } }, I), 'Vous êtes arrivé au turet (sur votre droite)');
  I.setLang('it');
});
t('mapsLinks', () => {
  const l = G.mapsLinks({ lat: 45.1, lon: 7.6 }, { lat: 45.2, lon: 7.7 });
  assert(l.google.includes('origin=45.1,7.6') && l.google.includes('destination=45.2,7.7') && l.google.includes('walking'));
  assert(l.apple.includes('daddr=45.2,7.7') && l.apple.includes('dirflg=w'));
  assert(G.mapsLinks({ lat: 1, lon: 2 }, { lat: 3, lon: 4 }, 'fr').google.endsWith('&hl=fr'));
});
console.log('\n' + n + ' prove superate');
