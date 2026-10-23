# Turet su Google Play (Android)

L'app Android è lo stesso sito, aperto a schermo intero in una «Trusted Web Activity»: ogni modifica al sito arriva anche all'app, senza nuove pubblicazioni. Costi: l'account sviluppatore che hai già.

Dati usati qui: sito `https://www.entratadisicurezza.com/turet/` · nome «Turet» · pacchetto `com.entratadisicurezza.turet` (non si cambia più dopo la pubblicazione).

## 1. Pubblica il sito aggiornato
Carica su Tophost, nella cartella `turet/`, tutto il contenuto del progetto (comprese le cartelle `img/`, `css/`, `js/`, `vendor/`, il file `privacy.html`). Controlla nel browser che si aprano `…/turet/` e `…/turet/privacy.html`.

## 2. Completa la privacy
In `privacy.html`, `store/scheda-play-store.md` sostituisci `INDIRIZZO-EMAIL` con l'indirizzo che vuoi rendere pubblico.

## 3. Crea il pacchetto con PWABuilder
1. Vai su https://www.pwabuilder.com e inserisci `https://www.entratadisicurezza.com/turet/`.
2. Quando l'analisi finisce, scegli «Package for stores» → «Android».
3. Imposta: Package ID `com.entratadisicurezza.turet`, nome «Turet», nome breve «Turet», Start URL `/turet/`, versione 1 (codice 1). Per la firma scegli «Create new» (se ti chiede di usare la firma di Google Play, accetta).
4. Scarica lo ZIP: contiene il file `.aab` da caricare, il file `signing.keystore` con la sua password e un `assetlinks.json`. **Conserva keystore e password in un posto sicuro**: senza non puoi aggiornare l'app.
(L'aspetto di PWABuilder può cambiare un poco: segui le sue voci equivalenti.)

## 4. Collega app e sito (assetlinks)
Serve perché l'app si apra senza la barra del browser.
1. Il file va a questo indirizzo esatto, nella **radice** del dominio (non dentro `/turet/`): `https://www.entratadisicurezza.com/.well-known/assetlinks.json`
2. Usa il modello in `docs/assetlinks.modello.json` oppure quello dello ZIP, ma l'impronta SHA-256 deve essere quella giusta:
   - dopo aver caricato l'app in Play Console, apri *Test e rilascio → Integrità dell'app → Firma dell'app* e copia «Impronta certificato SHA-256» della **chiave di firma dell'app**; incollala nel file. Se vuoi, aggiungi anche quella del keystore di PWABuilder, separata da virgola.
3. Carica il file su Tophost nella cartella `.well-known/` della radice del sito. Se Tophost nasconde le cartelle che iniziano con il punto, creala dal pannello.
4. Controllo: l'indirizzo deve mostrare il testo del file nel browser (sul Mac: apri l'indirizzo e verifica).

## 5. Play Console
1. *Crea app*: nome «Turet», italiano, app, gratuita.
2. Compila le sezioni richieste con `store/scheda-play-store.md` (testi, risposte su privacy, annunci, valutazione contenuti, sicurezza dei dati).
3. *Scheda dello store → Grafica*: icona `store/play-icon-512.png`, immagine in evidenza `store/feature-graphic-1024x500.png`.
4. *Test → Test interno*: carica il file `.aab` e invita i tuoi tester per email: parte subito e si scarica da un link, utile per provare l'app vera prima di tutto il resto.
5. Se l'account è anche per te soggetto alla regola dei test chiusi (12 tester per 14 giorni), la Console te lo indica: usa *Test chiuso* con la stessa build e poi chiedi l'accesso alla produzione.
6. *Produzione*: crea il rilascio con lo stesso `.aab` e invia in revisione (di solito pochi giorni).

## 6. Prima di pubblicare
- Sul telefono del test interno apri l'app: se in alto compare una barra con l'indirizzo, l'assetlinks non coincide (impronta sbagliata o file nel posto sbagliato).
- Verifica che la posizione venga richiesta e che la ricerca funzioni.

## 7. Screenshot
Servono almeno 2 immagini verticali. Fai gli screenshot dal telefono con l'app aperta (ricerca riuscita, percorso con indicazioni) e caricali nella scheda dello store. Qui non posso farli: la mappa reale non è raggiungibile.

## Aggiornamenti
Per cambiare l'app basta ricaricare i file del sito. Solo per cambiare nome, icona o pacchetto si rifà il pacchetto (con la stessa chiave e un codice versione più alto).

## iPhone
Resta il sito: Condividi → «Aggiungi a Home».
