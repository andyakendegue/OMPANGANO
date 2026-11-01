#!/usr/bin/env bash
# Restaure une sauvegarde dans une base « ompangano_restore » (la base en service n'est pas touchée) :
#   ./backup/restore.sh /opt/ompangano/backups/db/ompangano-XXXX.dump.enc [/opt/ompangano/backups/media/media-XXXX.tar.gz.enc]
# Mise en service ensuite, à la main : arrêter l'API, renommer ompangano -> ompangano_old et ompangano_restore -> ompangano, relancer l'API.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
KEY="${BACKUP_KEY_FILE:-/opt/ompangano/secrets/backup.key}"
dec() { openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$KEY"; }
DUMP="${1:?fichier .dump.enc requis}"
docker compose exec -T postgres psql -U ompangano -d postgres -c "DROP DATABASE IF EXISTS ompangano_restore" -c "CREATE DATABASE ompangano_restore"
dec < "$DUMP" | docker compose exec -T postgres pg_restore -U ompangano -d ompangano_restore --no-owner
echo "Base restaurée dans « ompangano_restore »."
if [ -n "${2:-}" ]; then
  TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
  dec < "$2" | tar -C "$TMP" -xzf -
  NET=$(docker inspect "$(docker compose ps -q garage)" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
  docker run --rm --network "$NET" -v "$TMP:/data" \
    -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" -e AWS_DEFAULT_REGION=garage \
    amazon/aws-cli s3 sync /data "s3://${S3_BUCKET:-ompangano}" --endpoint-url http://garage:3900 --only-show-errors
  echo "Fichiers restaurés dans le bucket."
fi
