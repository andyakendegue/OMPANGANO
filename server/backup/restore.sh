#!/usr/bin/env bash
# Restaure une sauvegarde : ./backup/restore.sh backups/db/ompangano-XXXX.dump [backups/media/media-XXXX.tar.gz]
# ATTENTION : remplace le contenu de la base. Tester d'abord sur une base vide (voir README).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
DUMP="${1:?fichier .dump requis}"
docker compose exec -T postgres psql -U ompangano -d postgres -c "DROP DATABASE IF EXISTS ompangano_restore" -c "CREATE DATABASE ompangano_restore"
docker compose exec -T postgres pg_restore -U ompangano -d ompangano_restore --no-owner < "$DUMP"
echo "Base restaurée dans « ompangano_restore »."
echo "Pour la mettre en service : arrêter l'API, renommer ompangano -> ompangano_old et ompangano_restore -> ompangano, relancer l'API."
if [ -n "${2:-}" ]; then
  TMP=$(mktemp -d); tar -C "$TMP" -xzf "$2"
  NET=$(docker inspect "$(docker compose ps -q garage)" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
  docker run --rm --network "$NET" -v "$TMP/current:/data" \
    -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" -e AWS_DEFAULT_REGION=garage \
    amazon/aws-cli s3 sync /data "s3://${S3_BUCKET:-ompangano}" --endpoint-url http://garage:3900 --only-show-errors
  rm -rf "$TMP"; echo "Fichiers restaurés dans le bucket."
fi
