#!/usr/bin/env bash
# Exporte les premiers inscrits de Nkala depuis la base de production (lecture seule).
# À lancer depuis le Mac :  bash server/scripts/exporter_testeurs.sh [nombre]   (défaut : 100)
# Produit dans livrables/play-store/ :
#   - premiers_inscrits.csv : date, nom, e-mail, téléphone, tribu, inscription terminée (pour toi)
#   - testeurs_play.csv     : une adresse e-mail par ligne, sans en-tête (format attendu par la Play Console)
# Les comptes créés par SMS seul n'ont pas d'e-mail : ils figurent dans le premier fichier mais pas dans le second
# (un testeur Google Play doit avoir un compte Google). Les comptes admin et validateur sont exclus.
set -euo pipefail
N="${1:-100}"
[[ "$N" =~ ^[0-9]+$ ]] || { echo "nombre invalide : $N" >&2; exit 1; }
HOTE="${HOTE:-essaka-llm}"
DEST="$(cd "$(dirname "$0")/../.." && pwd)/livrables/play-store"
mkdir -p "$DEST"

SQL="COPY (
  SELECT to_char(created_at AT TIME ZONE 'Africa/Libreville','YYYY-MM-DD HH24:MI') AS inscrit_le,
         coalesce(nullif(data->>'fullName',''), data->>'displayName', '') AS nom,
         coalesce(lower(email),'') AS email,
         coalesce(data->>'phone','') AS telephone,
         coalesce(data->>'tribe','') AS tribu,
         CASE WHEN (data->>'registrationCompleted')::boolean THEN 'oui' ELSE 'non' END AS inscription_terminee,
         role
  FROM users
  WHERE deleted_at IS NULL AND role = 'user' AND id NOT LIKE 'tel_2410000000%'
  ORDER BY created_at ASC
  LIMIT $N
) TO STDOUT WITH CSV HEADER"

ssh "$HOTE" "docker exec -i ompangano-postgres-1 psql -U ompangano -d ompangano -v ON_ERROR_STOP=1" <<<"$SQL" > "$DEST/premiers_inscrits.csv"

# Colonne e-mail (3e), adresses valides, sans doublon, ordre d'inscription conservé
tail -n +2 "$DEST/premiers_inscrits.csv" | python3 -c '
import csv, sys, re
vus = set()
for r in csv.reader(sys.stdin):
    e = r[2].strip().lower()
    if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e) and e not in vus:
        vus.add(e); print(e)
' > "$DEST/testeurs_play.csv"

echo "Inscrits exportés : $(($(wc -l < "$DEST/premiers_inscrits.csv") - 1))"
echo "Adresses pour la Play Console : $(wc -l < "$DEST/testeurs_play.csv" | tr -d ' ')"
echo "Fichiers : $DEST"
