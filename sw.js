/* Turet — service worker: salva il «guscio» dell'app (pagina, stili, script, Leaflet, icone) per aprirla anche con poca rete.
 * Strategia: rete per prima, copia salvata solo offline. Mappe e percorsi arrivano sempre da internet e non si salvano qui.
 * Per forzare l'aggiornamento delle copie salvate cambia VERSION. */
const VERSION = 'turet-v18';
const SHELL = ['./', 'index.html', 'css/app.css?v=18', 'js/i18n.js?v=18', 'js/geo.js?v=18', 'js/app.js?v=18', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'img/icon-192.png', 'img/toret.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // tile, Overpass, routing: sempre dalla rete
  // prima la rete (così l'app è sempre quella pubblicata), la copia salvata solo se non c'è connessione
  e.respondWith(fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req.mode === 'navigate' ? 'index.html' : req, c)); } return r; })
    .catch(() => caches.match(req.mode === 'navigate' ? 'index.html' : req)));
});
