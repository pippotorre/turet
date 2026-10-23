# Turet — la fontanella più vicina

Web app (installabile come app su Android e iPhone) che trova il **toret** — la fontanella torinese in ghisa a testa di toro — più vicino alla tua posizione e disegna il percorso a piedi per raggiungerlo.

## Cosa fa
- Rileva la posizione (GPS del telefono) oppure, se rifiuti o non c'è, ti lascia toccare la mappa per indicare dove sei.
- Cerca i turet attorno a te in OpenStreetMap (raggio di 1, 3, 8 e 20 km, finché ne trova), mostra il più vicino e gli altri 5.
- Disegna il percorso a piedi con distanza, tempo e indicazioni passo passo in italiano; se il servizio dei percorsi non risponde mostra la linea d'aria.
- Pulsanti per proseguire con Google Maps (e Mappe di Apple su iPhone/iPad).
- Funziona offline in parte: l'app si apre e ricorda gli ultimi turet visti per la zona (7 giorni); mappe e percorsi richiedono internet.

## Pubblicazione
Sito statico: basta copiare i file in una cartella raggiungibile in **HTTPS** (la posizione del telefono funziona solo su HTTPS), per esempio `https://www.entratadisicurezza.com/turet/`. Va bene anche GitHub Pages. Non servono PHP, database o chiavi.
Per aggiornare dopo una modifica a CSS/JS cambia il numero `?v=` in `index.html` e in `sw.js` (e `VERSION` in `sw.js`).

## Struttura
- `index.html`, `css/app.css`, `js/app.js` (interfaccia e flusso), `js/geo.js` (funzioni pure: distanze, query, istruzioni in italiano).
- `vendor/leaflet/` — Leaflet 1.9.4 (licenza BSD-2, nell'intestazione del file), niente CDN.
- `manifest.webmanifest`, `sw.js`, `img/` — installazione come app e icone (originali).
- `test/geo.test.js` — prove delle funzioni pure: `node test/geo.test.js`.

## Servizi esterni e limiti
| Servizio | A cosa serve | Note |
| --- | --- | --- |
| OpenStreetMap (tile.openstreetmap.org) | mappa | Uso leggero consentito con attribuzione ([policy](https://operations.osmfoundation.org/policies/tiles/)). Con molti utenti serve un fornitore di tile dedicato. |
| Overpass (overpass-api.de, poi overpass.kumi.systems) | posizione dei turet | Gratuito, uso corretto. L'app invia un punto arrotondato a ~100 m. |
| routing.openstreetmap.de (profilo a piedi) | percorso | Gratuito, senza garanzie di servizio. In caso di errore l'app ripiega sulla linea d'aria. |

**Dati:** i turet sono i nodi `amenity=drinking_water` + `fountain=toret` di OpenStreetMap ([tag](https://wiki.openstreetmap.org/wiki/Tag:fountain=toret)). L'app è completa quanto lo è la mappatura: se manca un turet, si aggiunge su openstreetmap.org con quei due tag e compare in app senza altre modifiche.

## Privacy
La posizione non viene salvata né inviata a un server del progetto: resta nel browser. Ai servizi esterni vanno solo un punto arrotondato (ricerca) e le due coordinate del tragitto (percorso). Nel browser si salva solo la copia degli ultimi risultati (localStorage).

## Idee per il seguito
Navigazione in tempo reale mentre cammini, filtro «aperto/funzionante» se i dati lo permettono, segnalazione di un turet mancante o guasto, tema «Torino» con altri punti d'acqua (nasoni, fontane).

## Lingue

L'interfaccia parla italiano, inglese e francese. La lingua si sceglie dai pulsanti IT/EN/FR in alto e viene ricordata; alla prima visita si usa quella del telefono (se non è supportata: inglese).

Per aggiungerne una: copia un blocco in `DICT` di `js/i18n.js`, traduci i testi (tieni invariati i `{segnaposto}`), aggiungi il codice a `LANGS` e un pulsante `data-lang` in `index.html`; `node test/i18n.test.js` controlla che non manchi nessuna voce. Se cambi file, aumenta `VERSION` in `sw.js`.
