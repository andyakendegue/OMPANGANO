#!/usr/bin/env bash
# Initialise Garage (une seule fois) : disposition du nœud, bucket, clé d'accès, CORS du bucket.
# Usage : cd server && docker compose up -d garage && ./scripts/init-garage.sh
set -euo pipefail
cd "$(dirname "$0")/.."
BUCKET="${S3_BUCKET:-ompangano}"
g() { docker compose exec -T garage /garage "$@"; }

NODE_ID=$(g node id -q | cut -d@ -f1)
if ! g layout show | grep -q "$NODE_ID"; then
  g layout assign -z dc1 -c 20G "$NODE_ID"      # capacité : à adapter au disque du VPS
  g layout apply --version 1
fi
g bucket create "$BUCKET" 2>/dev/null || true
if ! g key info ompangano-api >/dev/null 2>&1; then g key create ompangano-api; fi
g bucket allow --read --write --owner "$BUCKET" --key ompangano-api
echo
echo "Reporter dans server/.env :"
g key info ompangano-api --show-secret | grep -E "Key ID|Secret key"
echo
echo "Puis configurer le CORS du bucket (navigateur -> Garage) :  npx tsx scripts/set-bucket-cors.ts"
