#!/bin/bash
# Lance Nkala en démonstration : API locale (SMS, achats, notifications simulés) + application.
#   ./lancer.sh          → application web sur http://localhost:5173
#   ./lancer.sh ios      → simulateur iPhone (Expo Go)
#   ./lancer.sh api      → API seule
# Connexion : numéro libre + code 000000. Administrateur : +24100000001 (console : Plus > Administration).
set -e
cd "$(dirname "$0")"
cleanup() { [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd server && npm run demo) &
API_PID=$!
for i in $(seq 1 60); do curl -fs http://localhost:3001/health >/dev/null 2>&1 && break; sleep 1; done
[ "$1" = "api" ] && wait $API_PID
cd apps/nkala
export EXPO_PUBLIC_API_URL=http://localhost:3001
if [ "$1" = "ios" ]; then npx expo start --ios; else npx expo start --web --port 5173; fi
