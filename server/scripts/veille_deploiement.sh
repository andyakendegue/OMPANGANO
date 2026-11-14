#!/bin/bash
# Veille des publications : à lancer toutes les 5 minutes par cron (voir scripts/installer_veille.sh).
# Vérifie s'il y a de nouveaux commits sur la branche suivie ; si oui : sauvegarde, pull, copie, reconstruction de l'API,
# contrôle de santé, et RETOUR ARRIÈRE automatique en cas d'échec. Prévient par e-mail (alertes.py --message) dans tous les cas utiles.
# Config : /opt/ompangano/secrets/deploiement.env (DEPLOY_REPO, DEPLOY_BRANCH, DEPLOY_TOKEN facultatif).
set -uo pipefail
CONF=/opt/ompangano/secrets/deploiement.env
[ -f "$CONF" ] && . "$CONF"
REPO=${DEPLOY_REPO:-https://github.com/andyakendegue/OMPANGANO.git}
BRANCH=${DEPLOY_BRANCH:-main}
SRC=/opt/ompangano-src
APP=/opt/ompangano
LOG=/var/log/ompangano-deploiement.log
LOCK=/var/lock/ompangano-deploiement.lock
exec 9>"$LOCK"; flock -n 9 || exit 0
# Pause : tant que ce fichier existe, rien n'est déployé automatiquement (sa première ligne dit pourquoi).
# Depuis le 14/11/2026, main contient du travail validé mais pas encore mis en ligne (Nkorouna, annonces logement,
# migrations 013 et 014) : le déploiement se fait à la main, fichier par fichier, avec l'accord de Capp.
# Pour relancer la veille : rm /opt/ompangano/secrets/veille_en_pause
PAUSE=/opt/ompangano/secrets/veille_en_pause
[ -f "$PAUSE" ] && exit 0
log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }
alerte() { python3 "$APP/server/backup/alertes.py" --message "OMPANGANO — $1" "$2" >> "$LOG" 2>&1 || true; }
[ -n "${DEPLOY_TOKEN:-}" ] && REPO_AUTH=${REPO/https:\/\//https:\/\/x-access-token:${DEPLOY_TOKEN}@} || REPO_AUTH=$REPO

if [ ! -d "$SRC/.git" ]; then
  log "premier clonage de $BRANCH"
  git clone --quiet --branch "$BRANCH" "$REPO_AUTH" "$SRC" 2>>"$LOG" || { alerte "clonage impossible" "Le dépôt $REPO (branche $BRANCH) n'a pas pu être cloné : droits ou réseau."; exit 1; }
  git -C "$SRC" remote set-url origin "$REPO"      # le jeton n'est pas conservé dans la configuration du dépôt
  git -C "$SRC" rev-parse HEAD > "$APP/.version-deployee"
  log "clone prêt à $(git -C "$SRC" rev-parse --short HEAD) ; rien n'est déployé tant qu'une nouvelle publication n'arrive pas"
  exit 0
fi

git -C "$SRC" fetch --quiet "$REPO_AUTH" "$BRANCH" 2>>"$LOG" || { log "fetch impossible"; exit 1; }
NOUVEAU=$(git -C "$SRC" rev-parse FETCH_HEAD)
DEPLOYE=$(cat "$APP/.version-deployee" 2>/dev/null || git -C "$SRC" rev-parse HEAD)
[ "$NOUVEAU" = "$DEPLOYE" ] && exit 0
RESUME=$(git -C "$SRC" log --oneline "$DEPLOYE..$NOUVEAU" 2>/dev/null | head -8)
CHANGES=$(git -C "$SRC" diff --name-only "$DEPLOYE" "$NOUVEAU" 2>/dev/null)
log "nouvelle publication $DEPLOYE → $NOUVEAU"

git -C "$SRC" merge --quiet --ff-only "$NOUVEAU" 2>>"$LOG" || { alerte "publication refusée (historique modifié)" "La branche $BRANCH n'avance plus en ligne droite : déploiement automatique suspendu. Intervention nécessaire."; exit 1; }
if ! echo "$CHANGES" | grep -qE '^(server/|shared/|packages/noyau/src/|src/types/|contenu/exemples/)'; then
  echo "$NOUVEAU" > "$APP/.version-deployee"; log "aucun fichier serveur modifié : rien à déployer"; exit 0
fi

TS=$(date +%Y%m%d-%H%M%S); SAUV="$APP/backups/auto-$TS"; mkdir -p "$SAUV"
cp -a "$APP/server" "$SAUV/server"; cp -a "$APP/packages" "$SAUV/packages" 2>/dev/null || true; cp -a "$APP/shared" "$SAUV/shared"
if echo "$CHANGES" | grep -q '^server/migrations/'; then
  docker exec ompangano-postgres-1 pg_dump -U ompangano ompangano | gzip > "$SAUV/base.sql.gz" && log "base sauvegardée (migrations dans la publication)"
fi

RS="rsync -rlc --exclude node_modules --exclude '.env*' --exclude .demo-data"
eval $RS --exclude regie --exclude proxies --exclude api/src/demo.ts "$SRC/server/" "$APP/server/"
mkdir -p "$APP/packages/noyau" "$APP/contenu" "$APP/src"
eval $RS "$SRC/packages/noyau/src/" "$APP/packages/noyau/src/"; eval $RS "$SRC/shared/" "$APP/shared/"; eval $RS "$SRC/src/types/" "$APP/src/types/"; eval $RS "$SRC/contenu/exemples/" "$APP/contenu/exemples/"

retour_arriere() {
  log "ÉCHEC : retour arrière vers $DEPLOYE"
  rsync -rlc --exclude node_modules --exclude '.env*' "$SAUV/server/" "$APP/server/"; [ -d "$SAUV/packages" ] && rsync -rlc "$SAUV/packages/" "$APP/packages/"; rsync -rlc "$SAUV/shared/" "$APP/shared/"
  (cd "$APP/server" && docker compose up -d --build --no-deps api >> "$LOG" 2>&1)
  alerte "déploiement annulé ($1)" "La publication $NOUVEAU a été refusée ($1). L'ancienne version tourne de nouveau. Détail : $LOG"
}

(cd "$APP/server" && docker compose up -d --build --no-deps api >> "$LOG" 2>&1) || { retour_arriere "construction impossible"; exit 1; }
OK=0; for i in $(seq 1 30); do
  sleep 3
  ST=$(docker inspect -f '{{.State.Health.Status}}' ompangano-api-1 2>/dev/null)
  if [ "$ST" = "healthy" ] && [ "$(curl -s -o /dev/null -w '%{http_code}' https://api-ompangano.essaka.engineering/health)" = "200" ] && [ "$(curl -s -o /dev/null -w '%{http_code}' https://api-ompangano.essaka.engineering/pub/modules)" = "200" ]; then OK=1; break; fi
done
[ $OK = 1 ] || { retour_arriere "le serveur ne répond pas après la mise à jour"; exit 1; }
ERR=$(docker logs --since 1m ompangano-api-1 2>&1 | grep -c '"level":50')
[ "$ERR" -gt 3 ] && { retour_arriere "$ERR erreurs dans le journal juste après le démarrage"; exit 1; }

# Services annexes versionnés dans le dépôt : mis à jour seulement si leurs fichiers ont changé
for d in "server/proxies/runpod-embedding-proxy:/opt/runpod-embedding-proxy" "server/regie:/opt/regie"; do
  src=${d%%:*}; dst=${d##*:}
  if echo "$CHANGES" | grep -q "^$src/"; then rsync -rlc --exclude '.env*' "$SRC/$src/" "$dst/" && (cd "$dst" && docker compose up -d --build >> "$LOG" 2>&1) && log "$dst mis à jour"; fi
done
echo "$NOUVEAU" > "$APP/.version-deployee"
log "déployé : $(git -C "$SRC" rev-parse --short HEAD)"
alerte "publication déployée" "Version $(git -C "$SRC" rev-parse --short HEAD) en ligne, santé vérifiée.\n\n$RESUME\n\nSauvegarde : $SAUV"
