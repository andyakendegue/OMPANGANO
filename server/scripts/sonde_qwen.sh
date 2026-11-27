#!/usr/bin/env bash
# Sonde de la liaison avec Qwen, sans l'application ni l'API : lancée depuis le Mac, elle interroge le relais
# runpod-openai-proxy sur le serveur (127.0.0.1:8000) et le point d'accès RunPod.
#   server/scripts/sonde_qwen.sh            1 question
#   server/scripts/sonde_qwen.sh 4          4 questions en même temps (concurrence, file d'attente)
#   server/scripts/sonde_qwen.sh 1 "Mbolo"  question choisie
# Affiche pour chaque question : code, temps total, attente dans la file RunPod (réveil compris) et calcul
# (ces deux mesures demandent le relais du dépôt, server/proxies/runpod-openai-proxy). Aucune clé n'est affichée.
set -euo pipefail
N="${1:-1}"; Q="${2:-Dis bonjour en un mot.}"; HOTE="${SONDE_HOTE:-essaka-llm}"
[[ "$N" =~ ^[1-8]$ ]] || { echo "Nombre de questions : 1 à 8." >&2; exit 2; }
CORPS=$(python3 -c 'import json,sys; print(json.dumps({"model":"runpod-vllm","temperature":0,"max_tokens":16,"messages":[{"role":"user","content":sys.argv[1]}]}))' "$Q")

ssh -o ConnectTimeout=10 "$HOTE" N="$N" CORPS="$(printf %q "$CORPS")" 'bash -s' <<'DISTANT'
set -uo pipefail
set -a; . /opt/runpod-openai-proxy/.env; set +a
echo "== Point d'accès RunPod (avant)"
curl -s -m 15 -H "Authorization: Bearer $RUNPOD_API_KEY" "https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/health"; echo
T=$(mktemp -d)
for i in $(seq 1 "$N"); do
  ( curl -s -m 620 -o "$T/r$i" -D "$T/h$i" -w '%{http_code} %{time_total}' -H 'Content-Type: application/json' \
      -d "$CORPS" http://127.0.0.1:8000/v1/chat/completions > "$T/m$i" ) &
done
echo "== Pendant (toutes les 5 s : secondes · file · en cours · workers prêts/en marche/en démarrage/bridés)"
debut=$(date +%s)
while [ -n "$(jobs -r)" ]; do
  sleep 5
  curl -s -m 10 -H "Authorization: Bearer $RUNPOD_API_KEY" "https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/health" | python3 -c 'import json,sys
try:
  j=json.load(sys.stdin); w=j.get("workers",{}); b=j.get("jobs",{})
  v=[b.get("inQueue"), b.get("inProgress"), w.get("ready"), w.get("running"), w.get("initializing"), w.get("throttled")]
  print("%4ss · file %s · en cours %s · workers %s/%s/%s/%s" % tuple([sys.argv[1]] + v))
except Exception: print("santé illisible")' "$(( $(date +%s) - debut ))"
done
wait
echo "== Réponses"
for i in $(seq 1 "$N"); do
  m=$(cat "$T/m$i" 2>/dev/null); code=${m%% *}; total=${m#* }
  h() { grep -i "^$1:" "$T/h$i" 2>/dev/null | tr -d '\r' | awk '{print $2}'; }
  texte=$(python3 -c 'import json,sys
try:
  j=json.load(open(sys.argv[1])); j=j[0] if isinstance(j,list) else j
  print((j.get("choices") or [{}])[0].get("message",{}).get("content","")[:60].replace("\n"," ") or str(j)[:120])
except Exception as e: print(open(sys.argv[1]).read()[:120])' "$T/r$i")
  echo "#$i · code $code · total ${total}s · file $(h x-runpod-delay-ms)ms · calcul $(h x-runpod-execution-ms)ms · job $(h x-runpod-job) · $texte"
done
rm -rf "$T"
echo "== Derniers travaux vus par le relais"
docker logs --since 15m runpod-openai-proxy 2>&1 | grep '"relais": "travail"' | tail -n "$N"
DISTANT
