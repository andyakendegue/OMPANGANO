#!/usr/bin/env bash
# Scanner horaire : indexation du dossier du RAG (/opt/embeddings) puis import de la bibliothèque (/opt/bibliotheque).
# Cron (/etc/cron.d/ompangano-scanners) : 5 * * * * root /opt/ompangano/server/scripts/scanner_horaire.sh
# - un verrou empêche deux passages en même temps (un gros dépôt peut prendre plus d'une heure) ;
# - en cas d'échec (sortie non nulle ou fichiers en erreur), un e-mail part par alertes.py --message, comme pour la veille des
#   publications et la sauvegarde. Le même ensemble d'erreurs n'est signalé qu'une fois (empreinte gardée dans /var/lib).
set -u
VERROU=/var/lock/ompangano-scanners.lock
ETAT=/var/lib/ompangano-scanners
ALERTES=/opt/ompangano/server/backup/alertes.py
CONTENEUR=ompangano-api-1
mkdir -p "$ETAT"
exec 9>"$VERROU"
if ! flock -n 9; then echo "$(date -Is) passage précédent encore en cours : rien à faire"; exit 0; fi

alerter() { # $1 nom, $2 texte
  local cle empreinte; cle=$(printf '%s' "$1" | tr -c 'a-zA-Z0-9' '_'); empreinte=$(printf '%s' "$2" | sha256sum | cut -c1-16)
  if [ "$(cat "$ETAT/$cle.empreinte" 2>/dev/null)" = "$empreinte" ]; then echo "$(date -Is) $1 : mêmes erreurs qu'au passage précédent, pas de nouvel e-mail"; return; fi
  echo "$empreinte" > "$ETAT/$cle.empreinte"
  "$ALERTES" --message "OMPANGANO — erreur du scanner : $1" "$2" || echo "$(date -Is) envoi de l'alerte impossible"
}

passer() { # $1 nom, $2… commande
  local nom=$1; shift
  local sortie code nb
  sortie=$(timeout 3h docker exec "$CONTENEUR" "$@" 2>&1); code=$?
  echo "$(date -Is) $nom (code $code) : $(printf '%s' "$sortie" | tail -c 2000)"
  # Nombre de fichiers en erreur dans le rapport JSON (dernière ligne qui commence par « { »)
  nb=$(printf '%s\n' "$sortie" | grep '^{' | tail -1 | python3 -c 'import json,sys
try: print(len(json.load(sys.stdin).get("erreurs") or []))
except Exception: print(-1)')
  if [ "$code" -ne 0 ] || [ "$nb" != "0" ]; then
    alerter "$nom" "Le scanner « $nom » a échoué ou a rencontré des fichiers en erreur (code de sortie $code, fichiers en erreur : $nb).

Serveur : $(hostname)   Heure : $(date -Is)
Journal : /var/log/ompangano-scanners.log

Fin de la sortie :
$(printf '%s' "$sortie" | tail -c 6000)"
  else
    rm -f "$ETAT/$(printf '%s' "$nom" | tr -c 'a-zA-Z0-9' '_').empreinte"   # tout va bien : la prochaine erreur sera de nouveau signalée
  fi
}

passer "RAG (/opt/embeddings)" npx tsx scripts/indexer_dossier.ts cron
passer "bibliothèque (/opt/bibliotheque)" npx tsx scripts/importer_livres.ts
