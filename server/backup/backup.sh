#!/usr/bin/env bash
# Sauvegarde quotidienne CHIFFRÉE : pg_dump + copie du bucket Garage ; rotation 14 jours.
# Clé de chiffrement : BACKUP_KEY_FILE (défaut /opt/ompangano/secrets/backup.key) — à garder AUSSI hors du VPS, sans elle les sauvegardes sont illisibles.
# Cron : voir README (/etc/cron.d/ompangano).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
DEST="${BACKUP_DIR:-/opt/ompangano/backups}"
KEY="${BACKUP_KEY_FILE:-/opt/ompangano/secrets/backup.key}"
[ -s "$KEY" ] || { echo "Clé de chiffrement absente : $KEY" >&2; exit 1; }
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST/db" "$DEST/media"; chmod 700 "$DEST"
enc() { openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$KEY"; }

docker compose exec -T postgres pg_dump -U ompangano -Fc ompangano | enc > "$DEST/db/ompangano-$STAMP.dump.enc"

NET=$(docker inspect "$(docker compose ps -q garage)" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
docker run --rm --network "$NET" -v "$TMP:/data" \
  -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" -e AWS_DEFAULT_REGION=garage \
  amazon/aws-cli s3 sync "s3://${S3_BUCKET:-ompangano}" /data --endpoint-url http://garage:3900 --only-show-errors
tar -C "$TMP" -czf - . | enc > "$DEST/media/media-$STAMP.tar.gz.enc"

find "$DEST/db" -name '*.enc' -mtime +14 -delete
find "$DEST/media" -name '*.enc' -mtime +14 -delete
chmod 600 "$DEST"/db/* "$DEST"/media/* 2>/dev/null || true

# Copie hors du VPS (facultatif) : rsync si BACKUP_REMOTE est défini
if [ -n "${BACKUP_REMOTE:-}" ]; then rsync -a --delete "$DEST/" "$BACKUP_REMOTE/"; fi
echo "Sauvegarde $STAMP terminée ($(du -h "$DEST/db/ompangano-$STAMP.dump.enc" | cut -f1) base, $(du -h "$DEST/media/media-$STAMP.tar.gz.enc" | cut -f1) fichiers)."
