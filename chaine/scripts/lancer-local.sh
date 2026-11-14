#!/usr/bin/env bash
# Lance les 4 validateurs Besu sur cette machine, sans Docker (Besu installé : besu dans le PATH ou BESU=/chemin/vers/besu).
# Ports : P2P 30303-30306, RPC 8545-8548 (127.0.0.1 seulement). Journaux : reseau/validateurN/besu.log.
#   scripts/lancer-local.sh        démarre
#   scripts/lancer-local.sh stop   arrête
set -euo pipefail
cd "$(dirname "$0")/.."
BESU="${BESU:-besu}"
[ -d reseau ] || { echo "Générer d'abord le réseau : node scripts/generer-reseau.mjs"; exit 1; }
if [ "${1:-}" = "stop" ]; then
  for f in reseau/validateur*/besu.pid; do [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null || true; rm -f "$f"; done
  echo "Validateurs arrêtés."; exit 0
fi
BOOT="$(cat reseau/bootnodes-local.txt)"
for i in 1 2 3 4; do
  d="reseau/validateur$i"
  [ -f "$d/besu.pid" ] && kill -0 "$(cat "$d/besu.pid")" 2>/dev/null && { echo "validateur$i tourne déjà"; continue; }
  args=(--data-path="$d/donnees" --genesis-file=reseau/genese.json --node-private-key-file="$d/cle"
        --p2p-host=127.0.0.1 --p2p-port=$((30302 + i)) --discovery-enabled=false
        --permissions-nodes-config-file-enabled=true --permissions-nodes-config-file="$d/permissions-local.toml"
        --min-gas-price=0 --rpc-http-enabled=true --rpc-http-host=127.0.0.1 --rpc-http-port=$((8544 + i))
        --rpc-http-api=ETH,NET,WEB3,QBFT --host-allowlist=localhost,127.0.0.1 --logging=INFO)
  # Les autres nœuds rejoignent le premier ; le premier se connecte aux autres par la liste statique
  [ "$i" -gt 1 ] && args+=(--bootnodes="$BOOT")
  nohup "$BESU" "${args[@]}" > "$d/besu.log" 2>&1 &
  echo $! > "$d/besu.pid"
  echo "validateur$i lancé (RPC http://127.0.0.1:$((8544 + i)))"
done
