#!/usr/bin/env bash
# Diagnostic: probe the new Rijkswaterstaat WaterWebservices from a GitHub runner.
# Prints status codes and a summary of each response; never fails the job so all probes run.
set -u

NEW_OBS="https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES"
NEW_META="https://ddapi20-waterwebservices.rijkswaterstaat.nl/METADATASERVICES"
LOC="scheveningen"

export TZ=Europe/Amsterdam
fmt() { date -d "$1" +%Y-%m-%dT%H:%M:%S.000%:z; }
BEGIN=$(fmt "-1 day 00:00")
END=$(fmt "+4 days 12:00")
echo "Periode: $BEGIN -> $END"

# post <url> <json-body>: store the response in $OUT and the HTTP status in $CODE (retries on connect errors)
post() {
  OUT=$(mktemp)
  local try
  for try in 1 2 3; do
    CODE=$(curl -sS -m 60 -o "$OUT" -w '%{http_code}' -X POST "$1" -H 'Content-Type: application/json' -d "$2" 2>/dev/null) && break
    CODE="curl-error"; sleep 3
  done
  sleep 1
}

# observation <label> <aquometadata-json>: query one series and summarise the response shape
observation() {
  local label="$1" meta="$2" body
  body="{\"Locatie\":{\"Code\":\"$LOC\"},\"AquoPlusWaarnemingMetadata\":{\"AquoMetadata\":$meta},\"Periode\":{\"Begindatumtijd\":\"$BEGIN\",\"Einddatumtijd\":\"$END\"}}"
  post "$NEW_OBS/OphalenWaarnemingen" "$body"
  echo "::group::$label -> HTTP $CODE"
  echo "$body"
  if jq -e . "$OUT" >/dev/null 2>&1; then
    echo "--- top-level keys: $(jq -c 'keys' "$OUT")"
    echo "--- number of series (WaarnemingenLijst): $(jq '.WaarnemingenLijst | length' "$OUT" 2>/dev/null)"
    jq -c '.WaarnemingenLijst[]? | {
        Locatie: .Locatie.Code,
        ProcesType: .AquoMetadata.ProcesType,
        Grootheid: .AquoMetadata.Grootheid.Code,
        Groepering: .AquoMetadata.Groepering.Code,
        Hoedanigheid: .AquoMetadata.Hoedanigheid.Code,
        Eenheid: .AquoMetadata.Eenheid.Code,
        n: (.MetingenLijst | length),
        eerste: .MetingenLijst[0].Tijdstip,
        laatste: .MetingenLijst[-1].Tijdstip,
        AquoKeys: (.AquoMetadata | keys),
        metingKeys: (.MetingenLijst[0] | keys),
        voorbeeldMeetwaarde: .MetingenLijst[0].Meetwaarde,
        voorbeeldMetadata: .MetingenLijst[0].WaarnemingMetadata
      }' "$OUT" | head -c 4000
    echo
  else
    echo "--- raw (not JSON) ---"; head -c 600 "$OUT"; echo
  fi
  echo "::endgroup::"
}

echo "=== 1. Catalogue: process types and WATHTE series ==="
post "$NEW_META/OphalenCatalogus" '{"CatalogusFilter":{"Compartimenten":true,"Grootheden":true,"ProcesTypes":true}}'
echo "HTTP $CODE; keys: $(jq -c 'keys' "$OUT" 2>/dev/null)"
echo "::group::ProcesTypeLijst / process types in AquoMetadataLijst"
jq -c '.ProcesTypeLijst // empty' "$OUT" | head -c 1500; echo
jq -c '[.AquoMetadataLijst[]? | select(.Grootheid.Code=="WATHTE")]' "$OUT" | head -c 3000; echo
echo "::endgroup::"
echo "::group::Location $LOC"
jq -c ".LocatieLijst[]? | select(.Code==\"$LOC\")" "$OUT"
echo "::endgroup::"

echo "=== 2. Observations for $LOC ==="
observation "WATHTE (no ProcesType)"           '{"Compartiment":{"Code":"OW"},"Grootheid":{"Code":"WATHTE"}}'
observation "WATHTE ProcesType=meting"         '{"Compartiment":{"Code":"OW"},"Grootheid":{"Code":"WATHTE"},"ProcesType":"meting"}'
observation "WATHTE ProcesType=verwachting"    '{"Compartiment":{"Code":"OW"},"Grootheid":{"Code":"WATHTE"},"ProcesType":"verwachting"}'
observation "WATHTE ProcesType=astronomisch"   '{"Compartiment":{"Code":"OW"},"Grootheid":{"Code":"WATHTE"},"ProcesType":"astronomisch"}'
observation "Tide extremes GETETBRKD2"         '{"Groepering":{"Code":"GETETBRKD2"}}'
