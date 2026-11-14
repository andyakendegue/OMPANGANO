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
# Intégrité (le CBC seul ne détecte pas une altération) : HMAC-SHA256 du fichier chiffré, clé dérivée de backup.key ; vérifié par restore.sh
sceller() { openssl dgst -sha256 -mac HMAC -macopt "hexkey:$(openssl dgst -sha256 -r "$KEY" | cut -d' ' -f1)" -r "$1" | cut -d' ' -f1 > "$1.hmac"; }

docker compose exec -T postgres pg_dump -U ompangano -Fc ompangano | enc > "$DEST/db/ompangano-$STAMP.dump.enc"

NET=$(docker inspect "$(docker compose ps -q garage)" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
docker run --rm --network "$NET" -v "$TMP:/data" \
  -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" -e AWS_DEFAULT_REGION=garage \
  amazon/aws-cli s3 sync "s3://${S3_BUCKET:-ompangano}" /data --endpoint-url http://garage:3900 --only-show-errors
tar -C "$TMP" -czf - . | enc > "$DEST/media/media-$STAMP.tar.gz.enc"

sceller "$DEST/db/ompangano-$STAMP.dump.enc"; sceller "$DEST/media/media-$STAMP.tar.gz.enc"

find "$DEST/db" \( -name '*.enc' -o -name '*.hmac' \) -mtime +14 -delete
find "$DEST/media" \( -name '*.enc' -o -name '*.hmac' \) -mtime +14 -delete
chmod 600 "$DEST"/db/* "$DEST"/media/* 2>/dev/null || true
# Copies faites avant une mise à jour (avant-*, auto-*, db-avant-*…) : elles contiennent parfois la base en clair.
# Durée de conservation : 30 jours (SECURITE_ISO27001.md, donnees.ts DUREES), accès réservé à root.
find "$DEST" -mindepth 1 -maxdepth 1 \( -name 'avant-*' -o -name 'auto-*' -o -name '*-avant-*' -o -name '*.avant-*' \) -mtime +30 -exec rm -rf {} +
chmod -R go-rwx "$DEST" 2>/dev/null || true

# Copie hors du VPS (ISO 27001 A.8.13 : obligatoire) : rsync vers BACKUP_REMOTE (ex. user@autre-serveur:/sauvegardes/ompangano).
# Les fichiers sont déjà chiffrés et scellés ; le témoin « derniere_copie_hors_site » est surveillé par alertes.py (> 48 h = alerte).
if [ -n "${BACKUP_REMOTE:-}" ]; then
  rsync -a --delete --exclude derniere_copie_hors_site "$DEST/db" "$DEST/media" "$BACKUP_REMOTE/" && touch "$DEST/derniere_copie_hors_site"
else
  echo "ATTENTION : BACKUP_REMOTE non défini, aucune copie hors du VPS." >&2
fi
echo "Sauvegarde $STAMP terminée ($(du -h "$DEST/db/ompangano-$STAMP.dump.enc" | cut -f1) base, $(du -h "$DEST/media/media-$STAMP.tar.gz.enc" | cut -f1) fichiers)."
