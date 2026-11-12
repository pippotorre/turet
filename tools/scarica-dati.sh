#!/usr/bin/env bash
# Scarica da OpenStreetMap l'elenco di riserva delle fontanelle di Torino e lo salva in data/fontane.json.
# L'app lo usa SOLO se tutti i server pubblici di Overpass non rispondono. Uso:  bash tools/scarica-dati.sh
# Poi carica la cartella data/ accanto a index.html sul sito. Si può rifare ogni tanto (ogni mese basta).
set -u
BBOX="44.95,7.55,45.20,7.82"          # sud,ovest,nord,est
OUT="$(dirname "$0")/../data/fontane.json"; mkdir -p "$(dirname "$OUT")"
Q="[out:json][timeout:90];(node[\"amenity\"=\"drinking_water\"]($BBOX);node[\"amenity\"=\"fountain\"][\"drinking_water\"=\"yes\"]($BBOX);node[\"man_made\"=\"water_tap\"][\"drinking_water\"=\"yes\"]($BBOX);way[\"amenity\"=\"drinking_water\"]($BBOX);rel[\"amenity\"=\"drinking_water\"]($BBOX););out center;"
for URL in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter https://overpass.kumi.systems/api/interpreter https://overpass.openstreetmap.fr/api/interpreter; do
  echo "Provo $URL ..."
  if curl -sS -m 120 --data-urlencode "data=$Q" "$URL" -o "$OUT.tmp" && grep -q '"elements"' "$OUT.tmp"; then
    mv "$OUT.tmp" "$OUT"; N=$(grep -c '"type"' "$OUT"); echo "Fatto: $OUT ($N elementi)"; exit 0
  fi
  sleep 3
done
rm -f "$OUT.tmp"; echo "Nessun server ha risposto: riprova più tardi."; exit 1
