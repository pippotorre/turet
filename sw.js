/* Turet — service worker: salva il «guscio» dell'app (pagina, stili, script, Leaflet, icone) per aprirla anche con poca rete.
 * Mappe, dati dei turet e percorsi arrivano sempre da internet e non vengono mai salvati qui (i dati dei turet li ricorda l'app in localStorage).
 * Per forzare l'aggiornamento delle copie salvate cambia VERSION. */
const VERSION = 'turet-v1';
const SHELL = ['./', 'index.html', 'css/app.css?v=1', 'js/geo.js?v=1', 'js/app.js?v=1', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'img/icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // tile, Overpass, routing: sempre dalla rete
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put('index.html', c)); } return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req, c)); } return r; })));
});
