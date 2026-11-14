#!/usr/bin/env bash
# Contrôle de sécurité avant toute mise en production (SECURITE_ISO27001.md, règle D1).
# Bloque si : secret versionné, erreur de types, test en échec, faille « high » ou « critical » dans les dépendances de production du serveur.
# Les failles de l'app et du site sont signalées (à traiter avant leur prochain build).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
echec=0
etape() { printf '\n== %s\n' "$1"; }

etape "Secrets dans les fichiers versionnés"
scripts/secrets_interdits.sh --tout || echec=1

etape "Types (serveur, app)"
(cd server && npx tsc --noEmit -p .) || echec=1
(cd apps/nkala && npx tsc --noEmit) || echec=1

etape "Tests du serveur"
journal=$(mktemp); (cd server && npm test >"$journal" 2>&1) || echec=1
grep -E '^(#|ℹ) (tests|pass|fail) |^(not ok|✖)' "$journal"; rm -f "$journal"

etape "Dépendances de production (npm audit)"
(cd server && npm audit --omit=dev --audit-level=high) >/dev/null 2>&1 || { echo "serveur : faille high/critical"; echec=1; }
(cd apps/nkala && npm audit --omit=dev --audit-level=high >/dev/null 2>&1) || echo "app : failles high/critical à traiter (npm audit --omit=dev)"
(npm audit --omit=dev --audit-level=high >/dev/null 2>&1) || echo "site : failles high/critical à traiter (npm audit --omit=dev)"

echo
if [ $echec -ne 0 ]; then echo "CONTRÔLE ÉCHOUÉ : ne pas déployer."; exit 1; fi
echo "Contrôle réussi."
