# Pubblicazione su GitHub Pages — Turet

Indirizzo: **https://turet.entratadisicurezza.com/** (repository `pippotorre/turet`).

## Impostazione una tantum (sul sito GitHub)
1. **Settings → Pages → Build and deployment → Source: «GitHub Actions»**.
2. **Settings → Pages → Custom domain:** `turet.entratadisicurezza.com` → Save. Quando il controllo DNS è verde, spunta **Enforce HTTPS**. (Su Tophost il record DNS deve essere un `CNAME` da `turet` a `pippotorre.github.io`.)
3. **Actions → «Pubblica il sito» → Run workflow** (la prima volta scarica anche i dati, può richiedere diversi minuti).
4. Apri `https://turet.entratadisicurezza.com/` e controlla in fondo al pannello la riga della versione (`v… · data dei dati`).

## Come funziona
- A ogni push su `main` il workflow esegue le prove, prepara il sito (senza `test/`, `tools/`, `art/`, `store/`, `docs/`) e lo pubblica.
- Ogni lunedì e a richiesta, prima ricrea `data/t/` da OpenStreetMap (`tools/genera-tessere.mjs`) e lo salva nel repository. Se il download fallisce non cambia nulla: restano i dati precedenti.
- Per cambiare la zona coperta modifica `BBOX` in `tools/genera-tessere.mjs` (sud,ovest,nord,est) o lancia lo script con un rettangolo: `node tools/genera-tessere.mjs 44,6.6,46.6,9.3`.

## Problemi comuni
| Sintomo | Causa e rimedio |
|---|---|
| Il workflow non parte o «Pages not enabled» | Manca il passo 1: Source deve essere «GitHub Actions». |
| «Domain's DNS record could not be retrieved» | Il CNAME su Tophost non è ancora propagato o punta a un nome sbagliato. |
| Il telefono mostra ancora la versione vecchia | Chiudi e riapri l'app: il service worker prende prima la rete e si aggiorna da solo. |
