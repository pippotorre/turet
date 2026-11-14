# Pubblicare Turet su Google Play — guida completa

Tempo di lavoro: circa 1–2 ore, più l'attesa della revisione di Google (di solito pochi giorni, a volte di più). L'app Android è il sito aperto a schermo intero («Trusted Web Activity»): dopo la pubblicazione, ogni modifica al sito arriva anche all'app senza ripubblicare.

## Dati dell'app (da copiare così come sono)
| Voce | Valore |
| --- | --- |
| Nome nello store (max 30 caratteri) | `Turet – fontanelle di Torino` |
| Nome sotto l'icona | `Turet` |
| Sito | `https://turet.entratadisicurezza.com/` |
| Percorso di avvio (Start URL) | `/turet/` |
| Identificativo del pacchetto | `com.entratadisicurezza.turet` (non si può più cambiare dopo la pubblicazione) |
| Informativa privacy | `https://turet.entratadisicurezza.com/privacy.html` |
| Email di contatto | `info@entratadisicurezza.com` |
| Categoria | Mappe e navigazione |
| Prezzo | Gratuita, senza annunci, senza acquisti |

## Cosa è già pronto nel repository
- Il sito completo (`index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `img/`, `vendor/`, `privacy.html`), con icone e schermata iniziale.
- `store/play-icon-512.png` (icona 512×512) e `store/feature-graphic-1024x500.png` (immagine in evidenza).
- `store/scheda-play-store.md`: tutti i testi della scheda in italiano, inglese, francese, spagnolo e tedesco, e le risposte per la Play Console.
- `tools/verifica-sito.sh`: controlla dal Mac che il sito sia online e a posto.
- `docs/assetlinks.modello.json`: modello del file che collega sito e app.

**Cosa non posso preparare io:** il file `.aab` (il pacchetto Android) si genera con PWABuilder dal sito già online; gli screenshot vanno fatti dal tuo telefono; l'account e la Play Console sono tuoi.

## Passo 1 — Metti online il sito e controllalo
1. Il sito si pubblica da solo su GitHub Pages a ogni push su `main` (vedi [docs/PAGES.md](PAGES.md) per l'impostazione una tantum e per i dati settimanali). Aspetta che in «Actions» il workflow «Pubblica il sito» sia verde.
2. Controllo veloce, da Terminale sul Mac:
   ```
   bash tools/verifica-sito.sh https://turet.entratadisicurezza.com/
   ```
   Ogni riga deve essere «OK». Se non vuoi usare il Terminale, apri nel browser `…/turet/`, `…/turet/privacy.html` e `…/turet/manifest.webmanifest`: devono aprirsi senza errori.
3. Apri il sito dal telefono, premi il pulsante di ricerca e controlla che chieda la posizione e trovi una fontanella.

## Passo 2 — Controlla il tuo account Google Play
1. Entra su https://play.google.com/console con l'account che hai già.
2. Controlla che non ci siano avvisi rossi o richieste in sospeso (verifica dell'identità, dati di contatto, profilo dei pagamenti). Sono cambiate le regole dal tuo primo account: se Google chiede un documento o un telefono Android per la verifica, completa quel passaggio prima di andare avanti.
3. Per un account **creato dopo il 13 novembre 2023** è richiesto un test chiuso con almeno 12 persone per 14 giorni prima della produzione. Se il tuo account è più vecchio la regola di norma non vale; la Console te lo dice nella pagina dell'app («Dashboard»), quindi non serve decidere ora.

## Passo 3 — Crea il pacchetto con PWABuilder
1. Vai su https://www.pwabuilder.com e inserisci `https://turet.entratadisicurezza.com/`, poi «Start».
2. Quando l'analisi finisce, scegli «Package for stores» → «Android» → «Generate package».
3. Compila le opzioni così:
   - Package ID: `com.entratadisicurezza.turet`
   - App name: `Turet` · Launcher name: `Turet`
   - App version: `1.0.0` · Version code: `1`
   - Start URL: `/turet/`
   - Display mode: Standalone · Orientation: Portrait
   - **Location delegation: attiva.** È indispensabile: senza, la posizione non funziona nell'app. Se non trovi la voce, fermati e scrivimelo.
   - Notification delegation: disattivata · Google Play Billing: disattivato
   - Signing key: «Create new» (PWABuilder crea la chiave per te)
4. Scarica lo ZIP. Dentro ci sono il file `.aab`, il file della chiave (`signing.keystore`) con la sua password (`signing-key-info.txt`) e un `assetlinks.json`.
5. **Metti al sicuro keystore e password** (due copie, per esempio un gestore di password e un disco). Senza non puoi più aggiornare l'app Android.
(L'aspetto di PWABuilder può cambiare: segui le voci equivalenti.)

## Passo 4 — Crea l'app nella Play Console
1. «Crea app» → nome `Turet – fontanelle di Torino`, lingua predefinita italiano, tipo «App», «Gratuita».
2. Spunta le dichiarazioni (norme per gli sviluppatori e leggi sull'esportazione degli Stati Uniti) e conferma.

## Passo 5 — Contenuti dell'app (sezione «Norme» o «Contenuti dell'app»)
Compila in questo ordine:
| Sezione | Cosa rispondere |
| --- | --- |
| Norme sulla privacy | URL: `https://turet.entratadisicurezza.com/privacy.html` |
| Accesso all'app | Tutte le funzioni sono accessibili senza login o credenziali |
| Annunci | No, l'app non contiene annunci |
| Valutazione dei contenuti | Categoria «Utility/Produttività/Altro»; nessuna violenza, nessun contenuto sessuale, nessuna parolaccia, nessun gioco d'azzardo, nessuna interazione tra utenti, non condivide la posizione con altri utenti. Esito atteso: tutte le età (PEGI 3) |
| Pubblico di destinazione | Fasce 13 anni e oltre (non selezionare fasce sotto i 13: attiverebbero regole aggiuntive per i bambini). L'app non è pensata per i bambini |
| App di notizie / Covid-19 / Governativa / Finanziaria / Salute | No a tutte |
| Sicurezza dei dati | Raccoglie: **Posizione → Posizione precisa**. Condivisa con terzi: **sì** (i servizi di OpenStreetMap, necessari alla funzione principale). Elaborazione effimera: **sì** (non viene salvata). Obbligatoria: sì. Scopo: funzionalità dell'app. Dati crittografati in transito: sì (HTTPS). Inoltre (dal 27/10/2026) **Attività nelle app → Interazioni con l'app**: visite e uso del pulsante «Installa l'app» contati da GoatCounter, in forma aggregata e senza identificativi; condivisa: **no** (GoatCounter è un fornitore che lavora per conto nostro); scopo: **Analisi**; obbligatoria: sì. Nessun altro dato, nessun account. Possibilità di richiedere l'eliminazione: non applicabile, i dati non sono conservati in forma personale |

## Passo 6 — Scheda dello store
1. «Presenza nello store» → «Scheda principale dello store».
2. Testi: copia da `store/scheda-play-store.md` titolo, descrizione breve e completa in italiano; poi «Gestisci traduzioni» e aggiungi inglese, francese, spagnolo e tedesco con i testi del file.
3. Grafica: icona `store/play-icon-512.png`, immagine in evidenza `store/feature-graphic-1024x500.png`.
4. **Screenshot del telefono (almeno 2, meglio 4):** apri l'app (o il sito) sul tuo telefono, fai una ricerca riuscita e premi insieme tasto accensione e volume giù. Ne servono con la mappa e il percorso, e con la lista dei risultati. Caricali da «Screenshot del telefono».
5. Categoria «Mappe e navigazione», email `info@entratadisicurezza.com`, sito web `https://turet.entratadisicurezza.com/`.

## Passo 7 — Primo caricamento (test interno) e collegamento sito-app
1. «Test e rilascio» → «Test interno» → «Crea nuova release». Se chiede di usare la «firma delle app di Google Play», accetta.
2. Carica il file `.aab`, nome release `1.0.0`, «Salva» e «Avvia il rilascio».
3. Nella scheda «Tester» crea una lista con la tua email e salva: ti dà un link per installare l'app dal Play Store.
4. **Collega app e sito.** Apri «Test e rilascio» → «Integrità dell'app» → «Firma dell'app» e copia l'**impronta del certificato SHA-256** della chiave di firma dell'app.
   Il file `.well-known/assetlinks.json` sta **in questo repository** (cartella `.well-known/`), perché ogni app ha il suo indirizzo (`https://turet.entratadisicurezza.com/`) e quindi il suo file, con un solo blocco:
   ```
   [
     { "relation": ["delegate_permission/common.handle_all_urls"],
       "target": { "namespace": "android_app", "package_name": "com.entratadisicurezza.turet",
                   "sha256_cert_fingerprints": ["IMPRONTA-SHA256-DELLA-FIRMA-DELL-APP"] } }
   ]
   ```
   Sostituisci l'impronta (riga come `AB:CD:12:…`, 32 coppie) con quella vera, salva e fai push: dopo la pubblicazione il file è online. Non lasciare segnaposto.
5. Controllo: l'indirizzo `https://turet.entratadisicurezza.com/.well-known/assetlinks.json` deve mostrare il testo nel browser. Poi prova il verificatore di Google: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://turet.entratadisicurezza.com&relation=delegate_permission/common.handle_all_urls` deve elencare il tuo pacchetto.
6. Installa l'app dal link di test interno e aprila. Controlli:
   - **non** deve comparire la barra con l'indirizzo in alto (se compare, il collegamento sito-app non è a posto: di solito impronta sbagliata o file nel posto sbagliato; a volte serve aspettare qualche minuto o reinstallare);
   - il telefono deve chiedere il permesso per la posizione e la ricerca deve funzionare;
   - il pulsante «Apri in Google Maps» deve aprire Maps.

## Passo 8 — Produzione
1. «Test e rilascio» → «Produzione» → «Crea nuova release» e scegli «Promuovi» dalla release di test (o ricarica lo stesso `.aab`).
2. Note di rilascio (in italiano e in inglese): «Prima versione.» / «First release.»
3. Paesi: scegli dove distribuirla (per esempio tutti, oppure solo l'Italia).
4. «Invia per la revisione». Controlla la casella dell'email dell'account: Google scrive lì l'esito. Se è respinta, il messaggio dice il motivo: incollamelo e lo sistemiamo.
5. Se la Console ti chiede il test chiuso con 12 tester per 14 giorni (vedi passo 2), usa «Test chiuso» con la stessa release, invita i tester per email, aspetta i 14 giorni e poi fai domanda di accesso alla produzione dalla Dashboard.

## Dopo la pubblicazione
- **Aggiornare il sito:** basta fare push su `main` (e aumentare il numero `?v=` come spiegato nel README). L'app si aggiorna da sola.
- **Aggiornare il pacchetto:** serve solo per cambiare nome, icona o impostazioni di PWABuilder. Si rigenera con la stessa chiave (importando il keystore) e un «Version code» più alto.
- **Non perdere** il keystore e la password.

## Se qualcosa non va
| Problema | Cosa controllare |
| --- | --- |
| Compare la barra dell'indirizzo | L'impronta in `assetlinks.json` deve essere quella della «Firma dell'app» della Play Console (non quella di PWABuilder, se hai accettato la firma di Google); il file deve stare nella radice del dominio e rispondere con JSON |
| La posizione non viene chiesta | In PWABuilder la «Location delegation» era disattivata: rigenera il pacchetto con l'opzione attiva e carica una nuova versione con «Version code» 2 |
| Schermata bianca all'avvio | Il sito deve aprirsi da browser; controlla `bash tools/verifica-sito.sh` |
| Rifiutata per privacy o posizione | L'informativa deve aprirsi senza errori e dichiarare l'uso della posizione; controlla le risposte su «Sicurezza dei dati» (passo 5) |
