#!/usr/bin/env bash
# Controlla che il sito sia online e pronto per l'app Android.
# Uso:  bash tools/verifica-sito.sh https://www.entratadisicurezza.com/nasone/ [com.pacchetto.app]
BASE="${1:-}"; PKG="${2:-}"
if [ -z "$BASE" ]; then echo "Uso: bash tools/verifica-sito.sh https://www.entratadisicurezza.com/nasone/ [pacchetto]"; exit 2; fi
BASE="${BASE%/}/"
ORIGIN="$(echo "$BASE" | sed -E 's#^(https?://[^/]+)/.*#\1#')"
KO=0
ok()  { echo "OK   $1"; }
ko()  { echo "KO   $1"; KO=1; }
code() { curl -s -o /dev/null -L -m 20 -w '%{http_code}' "$1"; }

[ "${BASE#https://}" != "$BASE" ] && ok "usa HTTPS" || ko "l'indirizzo deve iniziare con https://"
for f in "" manifest.webmanifest sw.js index.html privacy.html css/app.css js/app.js js/i18n.js js/geo.js img/icon-192.png img/icon-512.png img/icon-maskable-512.png vendor/leaflet/leaflet.js; do
  c="$(code "$BASE$f")"; [ "$c" = "200" ] && ok "$BASE$f ($c)" || ko "$BASE$f risponde $c"
done
MAN="$(curl -s -L -m 20 "${BASE}manifest.webmanifest")"
if command -v python3 >/dev/null 2>&1; then
  echo "$MAN" | python3 -c 'import sys,json; m=json.load(sys.stdin); assert m.get("start_url") and m.get("icons") and m.get("name")' 2>/dev/null && ok "manifest valido (nome, start_url, icone)" || ko "manifest non valido"
else
  echo "$MAN" | grep -q '"start_url"' && ok "manifest con start_url" || ko "manifest non valido"
fi
PRIV="$(curl -s -L -m 20 "${BASE}privacy.html")"
echo "$PRIV" | grep -q 'INDIRIZZO-EMAIL' && ko "privacy.html contiene ancora INDIRIZZO-EMAIL" || ok "privacy.html senza segnaposto email"
AL="$(curl -s -L -m 20 "$ORIGIN/.well-known/assetlinks.json")"
if echo "$AL" | grep -q 'sha256_cert_fingerprints'; then
  ok "assetlinks.json presente sul dominio"
  echo "$AL" | grep -q 'IMPRONTA\|SOSTITUISCI' && ko "assetlinks.json contiene ancora segnaposto"
  [ -n "$PKG" ] && { echo "$AL" | grep -q "$PKG" && ok "assetlinks.json elenca $PKG" || ko "assetlinks.json non elenca $PKG"; }
else
  echo "--   assetlinks.json non ancora presente in $ORIGIN/.well-known/ (si crea al passo 7 della guida, dopo il primo caricamento)"
fi
[ "$KO" = 0 ] && echo "Tutto a posto." || { echo "Ci sono voci KO da sistemare."; exit 1; }
