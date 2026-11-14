#!/usr/bin/env bash
# Essai de restauration mensuel (ISO 27001 A.8.13) : la dernière sauvegarde est restaurée dans « ompangano_restore »,
# puis le nombre de comptes, de fiches et de contributions est comparé à la base en service. Résultat ajouté à
# /var/log/ompangano-restauration.log (à reporter dans _contexte/JOURNAL.md). La base en service n'est pas touchée.
# Cron : 30 4 1 * * root /opt/ompangano/server/backup/test_restauration.sh >> /var/log/ompangano-restauration.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${BACKUP_DIR:-/opt/ompangano/backups}"
DUMP=$(ls -1t "$DEST"/db/*.dump.enc | head -1)
echo "== $(date -u +%FT%TZ) essai de restauration de $(basename "$DUMP")"
./backup/restore.sh "$DUMP"
compter() { docker compose exec -T postgres psql -U ompangano -d "$1" -At -c "select (select count(*) from users)||' '||(select count(*) from items)||' '||(select count(*) from contributions)"; }
EN_SERVICE=$(compter ompangano); RESTAUREE=$(compter ompangano_restore)
echo "en service (comptes fiches contributions) : $EN_SERVICE ; restaurée : $RESTAUREE"
docker compose exec -T postgres psql -U ompangano -d postgres -c "DROP DATABASE ompangano_restore" >/dev/null
# Les chiffres de la base restaurée peuvent être un peu plus bas (activité depuis la sauvegarde) mais jamais nuls
[ -n "$RESTAUREE" ] && [ "${RESTAUREE%% *}" -gt 0 ] && echo "RÉSULTAT : restauration réussie" || { echo "RÉSULTAT : ÉCHEC"; exit 1; }
