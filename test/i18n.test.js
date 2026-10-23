const assert = require('assert');
const I = require('../js/i18n.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };
const keys = (l) => Object.keys(I.DICT[l]).sort();
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

t('tutte le lingue hanno le stesse chiavi', () => {
  for (const l of Object.keys(I.DICT)) assert.deepStrictEqual(keys(l), keys('it'), 'chiavi diverse in ' + l);
});
t('stessi segnaposto in ogni traduzione', () => {
  for (const l of ['en', 'fr']) for (const k of keys('it')) assert.strictEqual(ph(I.DICT[l][k]), ph(I.DICT.it[k]), l + ' · ' + k);
});
t('nessuna traduzione vuota o identica per sbaglio a una chiave', () => {
  for (const l of Object.keys(I.DICT)) for (const [k, v] of Object.entries(I.DICT[l])) assert(typeof v === 'string' && v.trim() !== '' || k.startsWith('step.arrive.') || k === 'on' || k === 'onto', l + ' · ' + k);
});
t('detect sceglie la prima lingua supportata, altrimenti inglese', () => {
  assert.strictEqual(I.detect(['fr-CA', 'en']), 'fr'); assert.strictEqual(I.detect(['de-DE', 'it-IT']), 'it');
  assert.strictEqual(I.detect(['de', 'es']), 'en'); assert.strictEqual(I.detect([]), 'en'); assert.strictEqual(I.detect(undefined), 'en');
});
t('t() sostituisce i segnaposto e ripiega sull’italiano', () => {
  I.setLang('en'); assert.strictEqual(I.t('status.widen', { d: '3 km' }), 'None nearby, widening the search to 3 km…');
  assert.strictEqual(I.t('chiave.inesistente'), 'chiave.inesistente'); assert.strictEqual(I.t('status.widen'), 'None nearby, widening the search to {d}…');
  I.setLang('xx'); assert.strictEqual(I.getLang(), 'en'); I.setLang('it');
});
t('ordinali', () => {
  I.setLang('en'); assert.deepStrictEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(I.ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  I.setLang('fr'); assert.deepStrictEqual([1, 2, 3].map(I.ordinal), ['1re', '2e', '3e']);
  I.setLang('it'); assert.strictEqual(I.ordinal(2), '2ª'); assert.strictEqual(I.ordinal(undefined), '1ª');
});
t('separatore decimale', () => { I.setLang('en'); assert.strictEqual(I.decimal(), '.'); I.setLang('fr'); assert.strictEqual(I.decimal(), ','); I.setLang('it'); });
console.log('\n' + n + ' prove superate');
