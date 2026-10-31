#!/usr/bin/env bash
# Sauvegarde quotidienne : pg_dump + copie du bucket Garage ; rotation 14 jours.
# Cron (VPS) :  15 3 * * *  cd /opt/ompangano/server && ./backup/backup.sh >> /var/log/ompangano-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
DEST="${BACKUP_DIR:-$PWD/backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST/db" "$DEST/media"

docker compose exec -T postgres pg_dump -U ompangano -Fc ompangano > "$DEST/db/ompangano-$STAMP.dump"

NET=$(docker inspect "$(docker compose ps -q garage)" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
mkdir -p "$DEST/media/current"
docker run --rm --network "$NET" -v "$DEST/media/current:/data" \
  -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" -e AWS_DEFAULT_REGION=garage \
  amazon/aws-cli s3 sync "s3://${S3_BUCKET:-ompangano}" /data --endpoint-url http://garage:3900 --only-show-errors
tar -C "$DEST/media" -czf "$DEST/media/media-$STAMP.tar.gz" current

find "$DEST/db" -name '*.dump' -mtime +14 -delete
find "$DEST/media" -name 'media-*.tar.gz' -mtime +14 -delete

# Copie hors du VPS (destination à fournir par le propriétaire : BACKUP_REMOTE dans .env)
if [ -n "${BACKUP_REMOTE:-}" ]; then rsync -a --delete "$DEST/" "$BACKUP_REMOTE/"; fi
echo "Sauvegarde $STAMP terminée."
