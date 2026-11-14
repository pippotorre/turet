#!/usr/bin/env node
/* Prepara le tessere di dati (data/t/<riga>_<colonna>.json + data/t/index.json) scaricando da OpenStreetMap (Overpass)
 * i punti d'acqua potabile di un rettangolo. Uso:   node tools/genera-tessere.mjs [sud,ovest,nord,est]
 * Senza argomento usa la zona di questa app (BBOX qui sotto). Gira ogni settimana su GitHub (.github/workflows/pubblica.yml).
 * Se un blocco non si scarica dopo vari tentativi non si cambia nulla: meglio dati vecchi che dati a metà. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const Geo = require('../js/geo.js');
const here = dirname(fileURLToPath(import.meta.url));
const BBOX = '44.0,6.6,46.6,9.3';                                  // sud,ovest,nord,est
const SERVERS = (process.env.OVERPASS_URLS || 'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter,https://overpass.kumi.systems/api/interpreter,https://overpass.openstreetmap.fr/api/interpreter').split(',');
const PAUSE = Number(process.env.PAUSA_MS ?? 4000);
const OUT = process.env.OUT_DIR || join(here, '..', 'data', 't');
const [S, W, N, E] = (process.argv[2] || BBOX).split(',').map(Number);
if (![S, W, N, E].every(Number.isFinite) || S >= N || W >= E) { console.error('Rettangolo non valido: sud,ovest,nord,est'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(query) {
  let last = '';
  for (let round = 0; round < 4; round++) {
    for (const url of SERVERS) {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'fontanelle-tessere/1.0 (github.com/pippotorre)' }, body: 'data=' + encodeURIComponent(query), signal: AbortSignal.timeout(240000) });
        if (!r.ok) { last = url + ' ' + r.status; await sleep(PAUSE); continue; }
        const j = await r.json();
        if (j.remark && /error|timed out|out of memory/i.test(j.remark)) { last = url + ' ' + j.remark; await sleep(PAUSE); continue; }
        return j;
      } catch (e) { last = url + ' ' + e.message; await sleep(PAUSE); }
    }
    await sleep(15000 * (round + 1));
  }
  throw new Error('nessun server ha risposto (' + last + ')');
}

const items = new Map();
let blocks = 0;
for (let s = Math.floor(S); s < N; s++) for (let w = Math.floor(W); w < E; w++) {
  const q = Geo.overpassBbox(Math.max(s, S), Math.max(w, W), Math.min(s + 1, N), Math.min(w + 1, E));
  const found = Geo.parseOverpass(await ask(q));
  for (const x of found) items.set(x.id, x);
  blocks++; console.log(`blocco ${s},${w}: ${found.length} punti`);
  await sleep(PAUSE);
}

const tiles = Geo.itemsToTiles([...items.values()]);
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
const index = {};
for (const [id, rows] of Object.entries(tiles)) { rows.sort((a, b) => a[0].localeCompare(b[0])); writeFileSync(join(OUT, id + '.json'), JSON.stringify(rows)); index[id] = rows.length; }
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), grid: 4, bbox: [S, W, N, E], total: items.size, tiles: index }));
console.log(`Fatto: ${items.size} punti in ${Object.keys(index).length} tessere (${blocks} blocchi) → ${OUT} (${readdirSync(OUT).length} file)`);
