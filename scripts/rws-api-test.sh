#!/usr/bin/env bash
# Diagnostic: probe the new Rijkswaterstaat WaterWebservices from a GitHub runner.
# Prints status codes and trimmed responses; never fails the job so all probes run.
set -u

NEW_OBS="https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES"
NEW_META="https://ddapi20-waterwebservices.rijkswaterstaat.nl/METADATASERVICES"
OLD_OBS="https://waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES_DBO"

export TZ=Europe/Amsterdam
fmt() { date -d "$1" +%Y-%m-%dT%H:%M:%S.000%:z; }
BEGIN=$(fmt "-1 day 00:00")
END=$(fmt "+1 day 00:00")
echo "Periode: $BEGIN -> $END"

# post <label> <url> <json-body>: print HTTP status and the first 600 chars of the response
post() {
  local label="$1" url="$2" body="$3" out
  out=$(mktemp)
  local code
  code=$(curl -sS -m 60 -o "$out" -w '%{http_code}' -X POST "$url" \
    -H 'Content-Type: application/json' -d "$body" 2>&1) || code="curl-error: $code"
  echo "::group::$label -> HTTP $code"
  echo "POST $url"
  echo "$body"
  echo "--- response (first 600 chars) ---"
  head -c 600 "$out"; echo
  echo "::endgroup::"
  LAST="$out"
}

echo "=== 1. Does the classic endpoint still answer? ==="
post "classic OphalenWaarnemingen (old body)" "$OLD_OBS/OphalenWaarnemingen" \
  "{\"Locatie\":{\"Code\":\"SCHE\",\"X\":586551.020314752,\"Y\":5772806.49292637},\"AquoPlusWaarnemingMetadata\":{\"AquoMetadata\":{\"Compartiment\":{\"Code\":\"OW\"},\"Grootheid\":{\"Code\":\"WATHTE\"}}},\"Periode\":{\"Begindatumtijd\":\"$BEGIN\",\"Einddatumtijd\":\"$END\"}}"

echo "=== 2. New catalogue (locations + quantities) ==="
post "new OphalenCatalogus" "$NEW_META/OphalenCatalogus" \
  '{"CatalogusFilter":{"Compartimenten":true,"Grootheden":true}}'
CAT="$LAST"
if jq -e . "$CAT" >/dev/null 2>&1; then
  echo "::group::catalogue: top-level keys"
  jq -r 'keys[]' "$CAT"
  echo "::endgroup::"
  echo "::group::catalogue: locations matching 'scheveningen'"
  jq -c '.LocatieLijst[]? | select((.Naam // "" | test("scheveningen";"i")) or (.Code // "" | test("scheveningen|SCHE";"i")))' "$CAT" | head -20
  echo "::endgroup::"
  echo "::group::catalogue: quantities (Grootheid) matching WATHTE or getij"
  jq -c '.AquoMetadataLijst[]? | select((.Grootheid.Code // "") | test("WATHTE|GETI|ASTRO";"i"))' "$CAT" | head -20
  echo "::endgroup::"
  echo "::group::catalogue: location x quantity pairs for Scheveningen"
  jq -c '[.LocatieLijst[]? | select((.Naam // "" | test("scheveningen";"i"))) | .Locatie_MessageID] as $ids
         | .AquoMetadataLocatieLijst[]? | select(.Locatie_MessageID as $l | $ids | index($l))' "$CAT" | head -20
  echo "::endgroup::"
fi

echo "=== 3. New OphalenWaarnemingen with candidate codes ==="
codes=$(jq -r '.LocatieLijst[]? | select(.Naam // "" | test("scheveningen";"i")) | .Code' "$CAT" 2>/dev/null | sort -u)
[ -z "$codes" ] && codes="scheveningen"
for code in $codes; do
  for grootheid in WATHTE WATHTEVERWACHT; do
    post "new OphalenWaarnemingen $code / $grootheid" "$NEW_OBS/OphalenWaarnemingen" \
      "{\"Locatie\":{\"Code\":\"$code\"},\"AquoPlusWaarnemingMetadata\":{\"AquoMetadata\":{\"Compartiment\":{\"Code\":\"OW\"},\"Grootheid\":{\"Code\":\"$grootheid\"}}},\"Periode\":{\"Begindatumtijd\":\"$BEGIN\",\"Einddatumtijd\":\"$END\"}}"
  done
  post "new OphalenWaarnemingen $code / tide extremes (GETETBRKD2)" "$NEW_OBS/OphalenWaarnemingen" \
    "{\"Locatie\":{\"Code\":\"$code\"},\"AquoPlusWaarnemingMetadata\":{\"AquoMetadata\":{\"Groepering\":{\"Code\":\"GETETBRKD2\"}}},\"Periode\":{\"Begindatumtijd\":\"$BEGIN\",\"Einddatumtijd\":\"$END\"}}"
done

echo "=== 4. Old-style body (with X/Y) against the new endpoint ==="
post "new OphalenWaarnemingen, old body SCHE+X/Y" "$NEW_OBS/OphalenWaarnemingen" \
  "{\"Locatie\":{\"Code\":\"SCHE\",\"X\":586551.020314752,\"Y\":5772806.49292637},\"AquoPlusWaarnemingMetadata\":{\"AquoMetadata\":{\"Compartiment\":{\"Code\":\"OW\"},\"Grootheid\":{\"Code\":\"WATHTE\"}}},\"Periode\":{\"Begindatumtijd\":\"$BEGIN\",\"Einddatumtijd\":\"$END\"}}"
