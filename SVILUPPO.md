# Turet — note di sviluppo

Diario del progetto: decisioni prese, verifiche, domande aperte. Si aggiorna a ogni passo.

## Obiettivo

Web app installabile (PWA, anche su Google Play come app impacchettata) che trova il **toret** più vicino,
la fontanella torinese in ghisa a testa di toro, e disegna il percorso a piedi.
Indirizzo: **https://turet.entratadisicurezza.com/** (GitHub Pages, dominio personalizzato).

## Decisioni prese

| Data | Decisione |
|---|---|
| 23/10/2026 | Sito statico (HTML/CSS/JS senza build), nessun server, nessun database, nessuna chiave. |
| 23/10/2026 | Dati da OpenStreetMap: punti d'acqua potabile via Overpass (più server in parallelo, secondo tentativo su 502/429), percorso a piedi da routing.openstreetmap.de, mappa Leaflet 1.9.4 in `vendor/`. |
| 23/10/2026 | Interfaccia in italiano, inglese e francese. Ultimi risultati salvati sul dispositivo per 7 giorni (uso con poca rete). |
| 23/10/2026 | Illustrazione, icone, splash e informativa privacy originali (`art/`, `privacy.html`). |
| 26/10/2026 | Pubblicazione su Google Play come PWA impacchettata (PWABuilder): guida in `docs/ANDROID.md`, controllo del sito con `tools/verifica-sito.sh`. |
| 26/10/2026 | Fino a 40 punti sulla mappa, inclusi i rubinetti potabili; link per segnalare su OpenStreetMap le fontanelle mancanti. |
| 27/10/2026 | **Statistiche di visita con GoatCounter** (senza cookie, nessun dato personale): vedi sotto. |
| 27/10/2026 | **Spagnolo e tedesco**, come Nasone: interfaccia (`js/i18n.js`), pulsanti ES/DE, informativa privacy e testi per la scheda Google Play. Le frasi uguali a Nasone riprendono le sue traduzioni; quelle con turet, Torino e testa di toro sono tradotte apposta. Su schermi stretti i pulsanti delle lingue vanno su una riga a tutta larghezza (stessa regola CSS di Nasone). Versione dei file `?v=16` / `turet-v16`. |

## Statistiche (GoatCounter)

- Account unico per tutto il dominio: https://entratadisicurezza.goatcounter.com (gratuito per siti non commerciali).
  Le app si distinguono dal percorso della pagina (`/turet/`).
- Script in `index.html`, prima di `</head>`. Il percorso inviato è `location.pathname` senza `index.html`,
  così `/turet/` e `/turet/index.html` contano come la stessa pagina. `privacy.html` non è contata.
- Eventi sul pulsante «Installa l'app» (`js/app.js`, funzione `conta`):
  - `turet-installa-clic`: qualcuno ha toccato il pulsante;
  - `turet-installa-rifiutata`: ha chiuso la finestra di Chrome senza installare;
  - `turet-installata`: l'app è stata installata (anche dal menu ⋮ di Chrome, senza il pulsante).
  Su iPhone il pulsante è solo un'istruzione (non cliccabile), quindi lì non ci sono eventi.
- Nessun cookie e niente salvato nel browser: non serve il banner. GoatCounter non conserva l'IP
  (lo usa solo per ricavare il paese). Server in Germania e Finlandia.
- Limiti: chi usa un blocco pubblicità (Brave, uBlock, ecc.) non viene contato; offline non si conta nulla.
- Informativa privacy aggiornata in IT/EN/FR (sezione «Statistiche di visita») e indicazioni per la
  «Sicurezza dei dati» di Google Play in `docs/ANDROID.md`.
- Versione dei file portata a `?v=15` / `turet-v15` per far arrivare il nuovo `app.js` ai telefoni.

## Verifiche fatte

- 27/10/2026 – Prova in Chromium simulando Android, con lo script di GoatCounter vero (copia dal repository
  ufficiale): una visita per `/turet/`, nessuna per `privacy.html`, eventi `installa-clic`, `installa-rifiutata`
  e `installata` inviati correttamente. Nessun errore JavaScript. Prove esistenti superate (`node test/geo.test.js && node test/i18n.test.js`).

- 27/10/2026 – Spagnolo e tedesco: prove `i18n` estese alle nuove lingue (stesse chiavi e segnaposto, scelta automatica
  della lingua del telefono) e superate; app e informativa provate in Chromium a 360 px in ES e DE, nessun errore JavaScript,
  niente scorrimento orizzontale, nessun residuo dei testi di Nasone.

## Punti aperti

- [ ] Play Console: «Gestisci traduzioni» → aggiungere spagnolo e tedesco con i testi di `store/scheda-play-store.md`.

- [ ] Aggiornare il modulo «Sicurezza dei dati» nella Play Console (Interazioni con l'app → Analisi).
- [ ] Dopo qualche giorno, controllare su GoatCounter che arrivino visite ed eventi.

| 14/11/2026 | Spostamento su GitHub Pages (turet.entratadisicurezza.com). Dati a tessere (`data/t/`) rigenerati ogni settimana da un'azione di GitHub; il service worker ora prende prima la rete. Il vecchio indirizzo su Tophost mostra una pagina di trasferimento con redirect dopo 4 secondi. |
| 14/11/2026 | Tessere statiche come fonte principale: dentro la zona e con dati < 10 giorni nessuna chiamata a Overpass (che resta per fuori zona, dati vecchi o mancanti). |
| 15/11/2026 | **Statistiche dopo lo spostamento.** Sul sottodominio il percorso della pagina è `/` per tutte le app, quindi dal 14/11 le visite finivano mescolate in un'unica voce `/` di GoatCounter. Ora lo script in `index.html` mette `/turet` davanti al percorso (`/turet/`): la serie continua con lo stesso nome di quando l'app era su Tophost. Se la pagina è già sotto `/turet/` (vecchio indirizzo) il nome non viene ripetuto. Eventi `turet-installa-…` invariati. Provato in Chromium sul sottodominio con lo script vero di GoatCounter. |
